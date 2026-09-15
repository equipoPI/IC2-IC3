import json
import logging
import re
import time
import threading
import datetime
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.db.models import Q
from django.utils import timezone
import paho.mqtt.client as mqtt

from polls.models import DispositivoSCADA, LecturaSensor, Fabrica, Seccion, ConfiguracionMQTT

logger = logging.getLogger(__name__)

def broadcast_ws_update(payload_data):
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'scada_telemetry',
                {
                    'type': 'scada_update',
                    'data': payload_data
                }
            )
    except Exception as e:
        logger.debug(f"WS Broadcast error (non-fatal): {e}")


def get_categoria_from_variable(variable):
    var = variable.lower()
    if 'temp' in var or 'temperatura' in var:
        return 'SENSOR_TEMPERATURA'
    elif 'pres' in var or 'presion' in var:
        return 'SENSOR_PRESION'
    elif 'fluj' in var or 'caudal' in var or 'flujo' in var:
        return 'SENSOR_FLUJO'
    elif 'nivel' in var:
        return 'SENSOR_NIVEL'
    elif 'hum' in var or 'humedad' in var:
        return 'SENSOR_HUMEDAD'
    elif 'mot' in var or 'motor' in var:
        return 'MOTOR'
    elif 'bomb' in var or 'bomba' in var:
        return 'BOMBA'
    elif 'valv' in var or 'valvula' in var:
        return 'VALVULA'
    elif 'plc' in var:
        return 'PLC'
    elif 'hmi' in var:
        return 'HMI'
    return 'OTRO'

def get_unidad_from_variable(variable):
    var = variable.lower()
    if 'temp' in var or 'temperatura' in var:
        return '°C'
    elif 'pres' in var or 'presion' in var:
        return 'bar'
    elif 'fluj' in var or 'caudal' in var or 'flujo' in var:
        return 'L/min'
    elif 'nivel' in var:
        if 'porcentaje' in var or 'porc' in var:
            return '%'
        return 'cm'
    elif 'hum' in var or 'humedad' in var:
        return '%'
    return ''

class Command(BaseCommand):
    help = "Inicia el worker MQTT para ingesta de telemetría, Auto-Discovery y Heartbeats LWT"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Iniciando MQTT Worker de Django..."))

        # Cargar configuración desde la base de datos o usar valores de fallback robustos
        config = ConfiguracionMQTT.objects.filter(activo=True).first()
        if config:
            broker_url = config.broker_url
            puerto = config.puerto
            usuario = config.usuario
            password = config.password
            self.stdout.write(f"Cargada configuración activa: {config.nombre} ({broker_url}:{puerto})")
        else:
            broker_url = "mosquitto"
            puerto = 1883
            usuario = None
            password = None
            self.stdout.write(self.style.WARNING("No se encontró configuración activa en DB. Usando fallback default (mosquitto:1883)"))

        client = mqtt.Client(client_id="django_mqtt_worker")

        if usuario and password:
            client.username_pw_set(usuario, password)

        # Configurar callbacks
        client.on_connect = self.on_connect
        client.on_message = self.on_message
        client.on_disconnect = self.on_disconnect

        # Intentar conectar con reintentos
        connected = False
        while not connected:
            try:
                client.connect(broker_url, puerto, keepalive=60)
                connected = True
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error al conectar al broker {broker_url}:{puerto}. Reintentando en 5s... Detalles: {e}"))
                time.sleep(5)

        # Iniciar watcher de inactividad para marcar dispositivos OFFLINE tras 60s
        self._start_offline_watcher()

        # Loop infinito
        try:
            client.loop_forever()
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("Deteniendo MQTT Worker de forma segura..."))
            client.disconnect()

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.stdout.write(self.style.SUCCESS("Conectado exitosamente al broker MQTT"))
            # Suscribirse a todos los tópicos para no perder ningún mensaje
            client.subscribe("#", qos=1)
            self.stdout.write("Suscrito a todos los tópicos (#) de control y telemetría SCADA")
        else:
            self.stdout.write(self.style.ERROR(f"Conexión MQTT fallida con código de retorno: {rc}"))

    def on_disconnect(self, client, userdata, rc):
        self.stdout.write(self.style.WARNING(f"Desconectado del broker MQTT (rc={rc})"))

    def _start_offline_watcher(self):
        def watch_offline():
            while True:
                time.sleep(3)
                try:
                    close_old_connections()
                    # Si han pasado más de 12 segundos sin ninguna actividad global del gateway, marcar offline
                    last_seen = getattr(self, '_last_gateway_message_time', None)
                    if last_seen and (time.time() - last_seen > 12):
                        offline_count = DispositivoSCADA.objects.filter(estado='ONLINE').update(estado='OFFLINE')
                        if offline_count > 0:
                            self.stdout.write(self.style.WARNING(f"[Gateway Watcher] Gateway inactivo (>12s sin telemetría). {offline_count} dispositivos marcados como OFFLINE."))
                            broadcast_ws_update({
                                'type': 'system_status',
                                'event': 'gateway_status',
                                'status': 'offline',
                                'online_count': 0
                            })
                except Exception as ex:
                    logger.debug(f"Offline watcher error: {ex}")

        t = threading.Thread(target=watch_offline, daemon=True)
        t.start()

    def on_message(self, client, userdata, msg):
        try:
            close_old_connections()
            self._last_gateway_message_time = time.time()
            topic = msg.topic
            payload_str = msg.payload.decode('utf-8').strip()
            telemetria_parts = topic.split('/')

            # 0. Procesar Estado LWT de Gateway (Will / shutdown limpio de Raspberry Pi)
            if topic.endswith('/status'):
                status_val = payload_str.lower()
                gw_id = telemetria_parts[1] if len(telemetria_parts) > 1 else 'd83add60dbb0'
                if 'offline' in status_val:
                    DispositivoSCADA.objects.filter(
                        Q(gateway_id=gw_id) | Q(gateway_id='') | Q(gateway_id__isnull=True)
                    ).update(estado='OFFLINE')
                    self.stdout.write(self.style.WARNING(f"[Gateway LWT] Gateway {gw_id} reportó OFFLINE. Todos los dispositivos marcados como OFFLINE (0/12)."))
                    broadcast_ws_update({
                        'type': 'system_status',
                        'event': 'gateway_status',
                        'gateway_id': gw_id,
                        'status': 'offline',
                        'online_count': 0
                    })
                    return
                elif 'online' in status_val:
                    online_updated = DispositivoSCADA.objects.filter(
                        Q(gateway_id=gw_id) | Q(gateway_id='') | Q(gateway_id__isnull=True)
                    ).update(estado='ONLINE')
                    self.stdout.write(self.style.SUCCESS(f"[Gateway LWT] Gateway {gw_id} reportó ONLINE. Dispositivos marcados como ONLINE ({online_updated})."))
                    broadcast_ws_update({
                        'type': 'system_status',
                        'event': 'gateway_status',
                        'gateway_id': gw_id,
                        'status': 'online',
                        'online_count': online_updated
                    })
                    return

            # 1. Procesar Alarmas enviadas por el Gateway
            if topic.endswith('/alarmas') or '/alarmas' in topic:
                try:
                    payload_dict = json.loads(payload_str)
                except Exception:
                    payload_dict = {'mensaje': payload_str, 'nivel': 'CRITICO'}
                
                from polls.models import Alarma, Fabrica
                parts = topic.split('/')
                tenant_name = parts[0] if len(parts) > 0 else 'rafaela_sa'
                fabrica = Fabrica.objects.filter(nombre__iexact=tenant_name).first() or Fabrica.objects.first()
                
                msg_txt = payload_dict.get('mensaje') or payload_dict.get('alarma') or payload_str
                nivel_txt = str(payload_dict.get('nivel', 'CRITICO')).upper()
                if nivel_txt not in ['INFO', 'ADVERTENCIA', 'CRITICO']:
                    nivel_txt = 'CRITICO'

                Alarma.objects.create(
                    fabrica=fabrica,
                    titulo=f"Alarma Gateway {parts[1] if len(parts) > 1 else ''}",
                    descripcion=msg_txt,
                    nivel=nivel_txt,
                    estado='ACTIVA'
                )
                self.stdout.write(self.style.WARNING(f"[Alarma SCADA] {topic} -> {msg_txt} ({nivel_txt})"))
                return

            # 2. Procesar Estado General y Diagnóstico (incluyendo /diagnostico/alertas)
            if '/diagnostico' in topic or topic.endswith('/estado/general'):
                try:
                    payload_dict = json.loads(payload_str)
                except Exception:
                    payload_dict = {'estado': payload_str}
                
                from polls.models import Fabrica
                parts = topic.split('/')
                tenant_name = parts[0] if len(parts) > 0 else 'rafaela_sa'
                fabrica = Fabrica.objects.filter(nombre__iexact=tenant_name).first() or Fabrica.objects.first()
                if fabrica:
                    if 'estado' in payload_dict and payload_dict['estado'] in ['OPERATIVO', 'ADVERTENCIA', 'CRITICO', 'OFFLINE']:
                        fabrica.estado = payload_dict['estado']
                    if 'porcentaje_produccion' in payload_dict:
                        fabrica.porcentaje_produccion = float(payload_dict['porcentaje_produccion'])
                    if 'temperatura_promedio' in payload_dict:
                        fabrica.temperatura_promedio = float(payload_dict['temperatura_promedio'])
                    fabrica.save(update_fields=['estado', 'porcentaje_produccion', 'temperatura_promedio'])
                broadcast_ws_update({'type': 'diagnostico', 'topic': topic, 'data': payload_dict})
                self.stdout.write(f"[Diagnóstico SCADA] {topic} -> {payload_dict}")
                return

            # =========================================================================
            # 3. PROCESADOR UNIFICADO DE TELEMETRÍA Y CONTROL SCADA
            # =========================================================================
            if len(telemetria_parts) >= 3:
                # 3.1. Parsing robusto de payload JSON o valor directo
                try:
                    payload_dict = json.loads(payload_str)
                except json.JSONDecodeError:
                    try:
                        # Reparar llaves sin comillas ({estado: true} -> {"estado": true})
                        repaired = re.sub(r'([{\s,])([a-zA-Z0-9_]+)\s*:', r'\1"\2":', payload_str)
                        repaired = repaired.replace("True", "true").replace("False", "false")
                        payload_dict = json.loads(repaired)
                    except Exception:
                        try:
                            val_float = float(payload_str)
                            payload_dict = {'valor': val_float, 'value': val_float}
                        except ValueError:
                            if payload_str.lower() in ['true', 'open', 'on']:
                                payload_dict = {'estado': 1}
                            elif payload_str.lower() in ['false', 'close', 'off']:
                                payload_dict = {'estado': 0}
                            else:
                                logger.warning(f"Payload no procesable en {topic}: {payload_str}")
                                return

                if not isinstance(payload_dict, dict):
                    payload_dict = {'valor': payload_dict}

                from polls.models import Fabrica, Seccion, Sistema, UnidadAlmacenamiento, OrdenProduccion, Inventario

                # 3.2. Extracción dinámica de tenant, gateway, sector, sistema y device
                tenant = telemetria_parts[0]
                gateway_id = telemetria_parts[1] if len(telemetria_parts) > 1 else 'd83add60dbb0'

                # Función helper para aislar IDs por tenant y sistema sin colisión de unicidad
                def get_scoped_id(base_id, tenant_name, system_name=None):
                    # Preservar identificadores canónicos para Rafaela en su línea principal
                    if tenant_name.lower() in ['rafaela_sa', 'rafaela', 'planta principal'] and (
                        not system_name or system_name.lower() in ['linea_mezclado_1', 'sistema de mezcla a1', 'sistema_principal']
                    ):
                        return base_id
                    clean_tenant = re.sub(r'[^a-zA-Z0-9_]', '_', tenant_name.lower())
                    clean_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_id)
                    if system_name:
                        clean_sys = re.sub(r'[^a-zA-Z0-9_]', '_', system_name.lower())
                        if clean_sys.startswith('linea_'):
                            clean_sys = clean_sys[6:]
                        scoped = f"{clean_tenant}_{clean_sys}_{clean_base}"
                        return scoped[:50]
                    scoped = f"{clean_tenant}_{clean_base}"
                    return scoped[:50]

                # Detección dinámica de categoría por palabras clave
                cat_keywords = {'sensores', 'actuadores', 'proceso', 'nivel', 'caudal', 'alarmas', 'diagnostico'}
                cat_idx = None
                for idx, p in enumerate(telemetria_parts):
                    if p.lower() in cat_keywords:
                        cat_idx = idx
                        break

                if cat_idx is not None:
                    category = telemetria_parts[cat_idx].lower()
                    mid_parts = telemetria_parts[2:cat_idx]
                    if len(mid_parts) >= 2:
                        sector = mid_parts[0]
                        system = mid_parts[1]
                    elif len(mid_parts) == 1:
                        sector = 'general'
                        system = mid_parts[0]
                    else:
                        sector = 'a1' if tenant.lower() in ['rafaela_sa', 'rafaela'] else 'general'
                        system = 'linea_mezclado_1' if tenant.lower() in ['rafaela_sa', 'rafaela'] else 'sistema_principal'
                else:
                    category = telemetria_parts[-2].lower() if len(telemetria_parts) >= 2 else 'general'
                    if len(telemetria_parts) >= 6:
                        sector = telemetria_parts[2]
                        system = telemetria_parts[3]
                    elif len(telemetria_parts) == 5:
                        sector = 'general'
                        system = telemetria_parts[2]
                    else:
                        sector = 'a1' if tenant.lower() in ['rafaela_sa', 'rafaela'] else 'general'
                        system = 'linea_mezclado_1' if tenant.lower() in ['rafaela_sa', 'rafaela'] else 'sistema_principal'

                device_id = telemetria_parts[-1].lower()

                # Resolver Fábrica, Sección y Sistema
                fabrica, _ = Fabrica.objects.get_or_create(
                    nombre=tenant,
                    defaults={
                        'pais': 'Argentina',
                        'ubicacion': 'No especificada',
                        'estado': 'OPERATIVO'
                    }
                )
                
                seccion, _ = Seccion.objects.get_or_create(
                    nombre=sector,
                    fabrica=fabrica,
                    defaults={
                        'capacidad_trabajadores': 10,
                        'tamano_seccion': 100.0,
                        'agenda': "Configuración inicial"
                    }
                )
                
                sistema, _ = Sistema.objects.get_or_create(
                    nombre=system,
                    fabrica=fabrica,
                    defaults={
                        'descripcion': f"Sistema {system} auto-detectado",
                        'tipo_sistema': 'FLUIDOS'
                    }
                )

                def get_or_create_device(num_serie, name_default, cat_default):
                    dev, created = DispositivoSCADA.objects.get_or_create(
                        numero_serie=num_serie,
                        defaults={
                            'nombre': name_default,
                            'categoria': cat_default,
                            'estado': 'ONLINE',
                            'gateway_id': gateway_id,
                            'topic_mqtt': topic,
                            'seccion': seccion,
                            'sistema': sistema,
                            'descripcion': f"Dispositivo detectado automáticamente por MQTT en: {topic}"
                        }
                    )
                    updated = []
                    if dev.seccion is None and seccion is not None:
                        dev.seccion = seccion
                        updated.append('seccion')
                    if dev.sistema is None and sistema is not None:
                        dev.sistema = sistema
                        updated.append('sistema')
                    if dev.gateway_id != gateway_id:
                        dev.gateway_id = gateway_id
                        updated.append('gateway_id')
                    if not dev.topic_mqtt:
                        dev.topic_mqtt = topic
                        updated.append('topic_mqtt')
                    
                    dev.ultima_lectura = timezone.now()
                    dev.estado = "ONLINE"
                    updated.extend(['ultima_lectura', 'estado'])
                    dev.save(update_fields=updated)
                    return dev

                def registrar_actuador(base_serie, base_name, cat, val_num):
                    scoped_serie = get_scoped_id(base_serie, tenant, system)
                    disp_name = f"{base_name} ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else base_name
                    dev = get_or_create_device(scoped_serie, disp_name, cat)
                    if not hasattr(self, '_last_actuator_state'):
                        self._last_actuator_state = {}
                    last_val = self._last_actuator_state.get(scoped_serie)
                    has_reading = dev.lecturas.exists()
                    if not has_reading or last_val is None or abs(last_val - val_num) > 0.001:
                        self._last_actuator_state[scoped_serie] = val_num
                        LecturaSensor.objects.create(
                            dispositivo=dev,
                            valor=val_num,
                            unidad='',
                            calidad='BUENA'
                        )
                    dev.valor_lectura = val_num
                    dev.unidad_lectura = ''
                    dev.ultima_lectura = timezone.now()
                    dev.estado = 'ONLINE'
                    dev.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])

                    # Salida de consola formateada y coloreada para actuadores
                    self.stdout.write(self.style.HTTP_INFO(
                        f"[Actuador SCADA] {tenant}/{gateway_id} | {dev.nombre} [{scoped_serie}] -> Estado: {val_num} | Tópico: '{topic}'"
                    ))
                    return dev

                # -------------------------------------------------------------
                # A. TANQUES DE ALMACENAMIENTO Y SENSORES DE NIVEL
                # -------------------------------------------------------------
                tank_aliases = {
                    'bombo1': ('tank-1', 'sensor_nivel_bombo1', 'Sensor Nivel Bombo 1', 'Tanque A (Aceite)', 'Aceite de Oliva', 1000.0),
                    'sensor_nivel_bombo1': ('tank-1', 'sensor_nivel_bombo1', 'Sensor Nivel Bombo 1', 'Tanque A (Aceite)', 'Aceite de Oliva', 1000.0),
                    'nivel_bombo1': ('tank-1', 'sensor_nivel_bombo1', 'Sensor Nivel Bombo 1', 'Tanque A (Aceite)', 'Aceite de Oliva', 1000.0),
                    'tanque_a': ('tank-1', 'sensor_nivel_bombo1', 'Sensor Nivel Bombo 1', 'Tanque A (Aceite)', 'Aceite de Oliva', 1000.0),
                    'tank-1': ('tank-1', 'sensor_nivel_bombo1', 'Sensor Nivel Bombo 1', 'Tanque A (Aceite)', 'Aceite de Oliva', 1000.0),

                    'bombo2': ('tank-2', 'sensor_nivel_bombo2', 'Sensor Nivel Bombo 2', 'Tanque B (Agua)', 'Agua Destilada', 800.0),
                    'sensor_nivel_bombo2': ('tank-2', 'sensor_nivel_bombo2', 'Sensor Nivel Bombo 2', 'Tanque B (Agua)', 'Agua Destilada', 800.0),
                    'nivel_bombo2': ('tank-2', 'sensor_nivel_bombo2', 'Sensor Nivel Bombo 2', 'Tanque B (Agua)', 'Agua Destilada', 800.0),
                    'tanque_b': ('tank-2', 'sensor_nivel_bombo2', 'Sensor Nivel Bombo 2', 'Tanque B (Agua)', 'Agua Destilada', 800.0),
                    'tank-2': ('tank-2', 'sensor_nivel_bombo2', 'Sensor Nivel Bombo 2', 'Tanque B (Agua)', 'Agua Destilada', 800.0),

                    'mezcla': ('tank-3', 'sensor_nivel_mezcla', 'Sensor Nivel Mezcla', 'Tanque Salida (Mezcla)', 'Mezcla de Jabón', 1500.0),
                    'sensor_nivel_mezcla': ('tank-3', 'sensor_nivel_mezcla', 'Sensor Nivel Mezcla', 'Tanque Salida (Mezcla)', 'Mezcla de Jabón', 1500.0),
                    'nivel_mezcla': ('tank-3', 'sensor_nivel_mezcla', 'Sensor Nivel Mezcla', 'Tanque Salida (Mezcla)', 'Mezcla de Jabón', 1500.0),
                    'tanque_mezcla': ('tank-3', 'sensor_nivel_mezcla', 'Sensor Nivel Mezcla', 'Tanque Salida (Mezcla)', 'Mezcla de Jabón', 1500.0),
                    'tanque_salida': ('tank-3', 'sensor_nivel_mezcla', 'Sensor Nivel Mezcla', 'Tanque Salida (Mezcla)', 'Mezcla de Jabón', 1500.0),
                    'tank-3': ('tank-3', 'sensor_nivel_mezcla', 'Sensor Nivel Mezcla', 'Tanque Salida (Mezcla)', 'Mezcla de Jabón', 1500.0),
                }

                if device_id in tank_aliases:
                    raw_node_id, raw_sensor_serie, sensor_nombre, tank_nombre, tank_mat, tank_cap = tank_aliases[device_id]
                    scoped_node_id = get_scoped_id(raw_node_id, tenant, system)
                    scoped_sensor_serie = get_scoped_id(raw_sensor_serie, tenant, system)
                    disp_tank_nombre = f"{tank_nombre} ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else tank_nombre
                    disp_sensor_nombre = f"{sensor_nombre} ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else sensor_nombre

                    porcentaje = payload_dict.get('porcentaje', payload_dict.get('percent'))
                    nivel = payload_dict.get('nivel', payload_dict.get('valor', payload_dict.get('value')))

                    if porcentaje is None and nivel is not None:
                        try:
                            n_val = float(nivel)
                            if payload_dict.get('unidad') == '%' or (0 <= n_val <= 100 and ('porcentaje' in topic or 'porc' in topic)):
                                porcentaje = n_val
                        except (ValueError, TypeError):
                            pass

                    es_invalido = False
                    if nivel is not None:
                        try:
                            n_val = float(nivel)
                            if n_val < 0.0 or n_val >= 999.0:
                                es_invalido = True
                        except (ValueError, TypeError):
                            es_invalido = True

                    if es_invalido:
                        return

                    tank = None
                    if porcentaje is not None:
                        try:
                            inventario, _ = Inventario.objects.get_or_create(
                                fabrica=fabrica,
                                defaults={
                                    'nombre': f"Inventario General {fabrica.nombre}",
                                    'capacidad_m2': 500.0,
                                }
                            )
                            tank, _ = UnidadAlmacenamiento.objects.get_or_create(
                                node_id=scoped_node_id,
                                defaults={
                                    'inventario': inventario,
                                    'nombre': disp_tank_nombre,
                                    'tipo': 'TANK',
                                    'contenido': tank_mat,
                                    'capacidad': tank_cap,
                                    'volumen_actual': 0,
                                    'unidad': 'L',
                                    'estado': 'ACTIVE',
                                    'seccion': seccion,
                                    'sistema': sistema,
                                }
                            )
                            tank_updated = ['volumen_actual']
                            tank.volumen_actual = round(tank.capacidad * (float(porcentaje) / 100.0), 2)
                            if tank.seccion is None and seccion is not None:
                                tank.seccion = seccion
                                tank_updated.append('seccion')
                            if tank.sistema is None and sistema is not None:
                                tank.sistema = sistema
                                tank_updated.append('sistema')
                            tank.save(update_fields=tank_updated)
                        except Exception as ex:
                            logger.error(f"Error actualizando UnidadAlmacenamiento {scoped_node_id}: {ex}")

                    if nivel is not None or porcentaje is not None:
                        try:
                            val_to_store = float(nivel if nivel is not None else porcentaje)
                            unidad_to_store = 'cm' if (nivel is not None and payload_dict.get('unidad') != '%') else '%'
                            sensor_dev = get_or_create_device(scoped_sensor_serie, disp_sensor_nombre, 'SENSOR_NIVEL')
                            sensor_dev.valor_lectura = val_to_store
                            sensor_dev.unidad_lectura = unidad_to_store
                            sensor_dev.ultima_lectura = timezone.now()
                            sensor_dev.estado = 'ONLINE'
                            sensor_dev.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])
                            LecturaSensor.objects.create(
                                dispositivo=sensor_dev,
                                valor=val_to_store,
                                unidad=unidad_to_store,
                                calidad='BUENA'
                            )
                            if tank and not tank.dispositivo_sensor:
                                tank.dispositivo_sensor = sensor_dev
                                tank.save(update_fields=['dispositivo_sensor'])
                        except (ValueError, TypeError):
                            pass

                    # Salida formateada y coloreada en consola
                    vol_txt = f"{getattr(tank, 'volumen_actual', 0)} L" if tank else ""
                    self.stdout.write(self.style.SUCCESS(
                        f"[Nivel SCADA] {tenant}/{gateway_id} | {disp_tank_nombre} [{scoped_node_id}] -> {porcentaje}% {vol_txt} | Tópico: '{topic}'"
                    ))
                    broadcast_ws_update({
                        'type': 'telemetry_update',
                        'topic': topic,
                        'device_id': device_id,
                        'tenant': tenant,
                        'sistema_id': sistema.id,
                        'node_id': scoped_node_id,
                        'porcentaje': porcentaje
                    })
                    return

                # -------------------------------------------------------------
                # B. CAUDALÍMETROS / SENSORES DE FLUJO
                # -------------------------------------------------------------
                if device_id == 'caudal':
                    caudal_1 = payload_dict.get('caudal_1')
                    caudal_2 = payload_dict.get('caudal_2')
                    if caudal_1 is not None:
                        try:
                            scoped_c1 = get_scoped_id('sensor-3', tenant, system)
                            disp_c1 = f"Sensor de Flujo Tubería A ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else 'Sensor de Flujo Tubería A'
                            dev1 = get_or_create_device(scoped_c1, disp_c1, 'SENSOR_FLUJO')
                            dev1.valor_lectura = float(caudal_1)
                            dev1.unidad_lectura = 'L'
                            dev1.ultima_lectura = timezone.now()
                            dev1.estado = 'ONLINE'
                            dev1.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])
                            LecturaSensor.objects.create(dispositivo=dev1, valor=float(caudal_1), unidad='L', calidad='BUENA')
                            self.stdout.write(self.style.SUCCESS(
                                f"[Caudal SCADA] {tenant}/{gateway_id} | {disp_c1} [{scoped_c1}] -> {caudal_1} L/min | Tópico: '{topic}'"
                            ))
                        except (ValueError, TypeError):
                            pass
                    if caudal_2 is not None:
                        try:
                            scoped_c2 = get_scoped_id('sensor_caudal_02', tenant, system)
                            disp_c2 = f"Sensor de Flujo Tubería B ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else 'Sensor de Flujo Tubería B'
                            dev2 = get_or_create_device(scoped_c2, disp_c2, 'SENSOR_FLUJO')
                            dev2.valor_lectura = float(caudal_2)
                            dev2.unidad_lectura = 'L'
                            dev2.ultima_lectura = timezone.now()
                            dev2.estado = 'ONLINE'
                            dev2.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])
                            LecturaSensor.objects.create(dispositivo=dev2, valor=float(caudal_2), unidad='L', calidad='BUENA')
                            self.stdout.write(self.style.SUCCESS(
                                f"[Caudal SCADA] {tenant}/{gateway_id} | {disp_c2} [{scoped_c2}] -> {caudal_2} L/min | Tópico: '{topic}'"
                            ))
                        except (ValueError, TypeError):
                            pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': device_id, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                if device_id in ['sensor-3', 'caudal_1', 'sensor_caudal_01', 'flujo_a']:
                    val_c1 = payload_dict.get('caudal_1', payload_dict.get('valor', payload_dict.get('value', 0.0)))
                    scoped_c1 = get_scoped_id('sensor-3', tenant, system)
                    disp_c1 = f"Sensor de Flujo Tubería A ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else 'Sensor de Flujo Tubería A'
                    try:
                        dev1 = get_or_create_device(scoped_c1, disp_c1, 'SENSOR_FLUJO')
                        dev1.valor_lectura = float(val_c1)
                        dev1.unidad_lectura = 'L'
                        dev1.ultima_lectura = timezone.now()
                        dev1.estado = 'ONLINE'
                        dev1.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])
                        LecturaSensor.objects.create(dispositivo=dev1, valor=float(val_c1), unidad='L', calidad='BUENA')
                        self.stdout.write(self.style.SUCCESS(
                            f"[Caudal SCADA] {tenant}/{gateway_id} | {disp_c1} [{scoped_c1}] -> {val_c1} L/min | Tópico: '{topic}'"
                        ))
                    except (ValueError, TypeError):
                        pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': 'sensor-3', 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                if device_id in ['sensor_caudal_02', 'caudal_2', 'flujo_b']:
                    val_c2 = payload_dict.get('caudal_2', payload_dict.get('valor', payload_dict.get('value', 0.0)))
                    scoped_c2 = get_scoped_id('sensor_caudal_02', tenant, system)
                    disp_c2 = f"Sensor de Flujo Tubería B ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else 'Sensor de Flujo Tubería B'
                    try:
                        dev2 = get_or_create_device(scoped_c2, disp_c2, 'SENSOR_FLUJO')
                        dev2.valor_lectura = float(val_c2)
                        dev2.unidad_lectura = 'L'
                        dev2.ultima_lectura = timezone.now()
                        dev2.estado = 'ONLINE'
                        dev2.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])
                        LecturaSensor.objects.create(dispositivo=dev2, valor=float(val_c2), unidad='L', calidad='BUENA')
                        self.stdout.write(self.style.SUCCESS(
                            f"[Caudal SCADA] {tenant}/{gateway_id} | {disp_c2} [{scoped_c2}] -> {val_c2} L/min | Tópico: '{topic}'"
                        ))
                    except (ValueError, TypeError):
                        pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': 'sensor_caudal_02', 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                # -------------------------------------------------------------
                # C. ACTUADORES: BOMBAS, VÁLVULAS, MEZCLADOR
                # -------------------------------------------------------------
                bombas_map = {
                    'bomba1': ('pump-1', 'Bomba Principal P1', 'BOMBA'),
                    'pump-1': ('pump-1', 'Bomba Principal P1', 'BOMBA'),
                    'bomba2': ('pump-2', 'Bomba P2', 'BOMBA'),
                    'pump-2': ('pump-2', 'Bomba P2', 'BOMBA'),
                    'bomba_mezcla': ('bomba_mezcla', 'Bomba de Mezcla', 'BOMBA'),
                    'bomba_reposicion': ('bomba_reposicion', 'Bomba de Reposición', 'BOMBA'),
                }
                if device_id == 'bombas':
                    for var_name, var_value in payload_dict.items():
                        if var_name in bombas_map:
                            try:
                                val = float(var_value)
                                serie, name, cat = bombas_map[var_name]
                                registrar_actuador(serie, name, cat, val)
                            except (ValueError, TypeError):
                                pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': device_id, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                if device_id in bombas_map:
                    try:
                        val = float(payload_dict.get('estado', payload_dict.get('value', payload_dict.get('valor', 0))))
                        serie, name, cat = bombas_map[device_id]
                        registrar_actuador(serie, name, cat, val)
                    except (ValueError, TypeError):
                        pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': device_id, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                valvulas_map = {
                    'electrovalvula1': ('electrovalvula-1', 'Válvula Rep. A', 'VALVULA'),
                    'electrovalvula-1': ('electrovalvula-1', 'Válvula Rep. A', 'VALVULA'),
                    'valvula_bombo1': ('electrovalvula-1', 'Válvula Rep. A', 'VALVULA'),
                    'valvula_1': ('electrovalvula-1', 'Válvula Rep. A', 'VALVULA'),
                    'electrovalvula2': ('electrovalvula-2', 'Válvula Rep. B', 'VALVULA'),
                    'electrovalvula-2': ('electrovalvula-2', 'Válvula Rep. B', 'VALVULA'),
                    'valvula_bombo2': ('electrovalvula-2', 'Válvula Rep. B', 'VALVULA'),
                    'valvula_2': ('electrovalvula-2', 'Válvula Rep. B', 'VALVULA'),
                }
                if device_id == 'electrovalvulas':
                    for var_name, var_value in payload_dict.items():
                        if var_name in valvulas_map:
                            try:
                                val = float(var_value)
                                serie, name, cat = valvulas_map[var_name]
                                registrar_actuador(serie, name, cat, val)
                            except (ValueError, TypeError):
                                pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': device_id, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                if device_id in valvulas_map:
                    try:
                        val = float(payload_dict.get('estado', payload_dict.get('value', payload_dict.get('valor', 0))))
                        serie, name, cat = valvulas_map[device_id]
                        registrar_actuador(serie, name, cat, val)
                    except (ValueError, TypeError):
                        pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': device_id, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                if device_id in ['mezclador', 'mixer-1', 'mixer', 'mezclado'] or topic.endswith('/proceso/mezclado'):
                    estado = payload_dict.get('estado')
                    if estado is None:
                        estado = payload_dict.get('mezclador', payload_dict.get('value', payload_dict.get('valor', 0)))
                    try:
                        val = float(estado)
                        registrar_actuador('mixer-1', 'Mezclador M1', 'MEZCLADORA', val)
                    except (ValueError, TypeError):
                        pass
                    broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'device_id': 'mixer-1', 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                # -------------------------------------------------------------
                # D. PROCESO / TIEMPO RESTANTE / REPOSICIÓN / PROGRESO
                # -------------------------------------------------------------
                if device_id == 'reposicion' or topic.endswith('/reposicion'):
                    val_repo = payload_dict.get('estado', payload_dict.get('valor', 0))
                    broadcast_ws_update({
                        'type': 'process_status',
                        'topic': topic,
                        'event': 'reposicion_status',
                        'estado': val_repo,
                        'tenant': tenant,
                        'sistema_id': sistema.id
                    })
                    return

                if device_id == 'tiempo_restante' or topic.endswith('/proceso/tiempo_restante'):
                    horas = payload_dict.get('horas', 0)
                    minutos = payload_dict.get('minutos', 0)
                    try:
                        total_minutos = int(horas) * 60 + int(minutos)
                    except (ValueError, TypeError):
                        total_minutos = 0

                    active_orden = OrdenProduccion.objects.filter(estado__in=['EN_PROCESO', 'en_proceso']).first()
                    if active_orden and ('progreso' in payload_dict or 'porcentaje' in payload_dict):
                        try:
                            val_p = float(payload_dict.get('progreso', payload_dict.get('porcentaje', 0)))
                            active_orden.progreso_porcentaje = min(max(val_p, 0.0), 100.0)
                            active_orden.save(update_fields=['progreso_porcentaje'])
                        except Exception:
                            pass
                    broadcast_ws_update({'topic': topic, 'device_id': 'tiempo_restante', 'tiempo_restante_min': total_minutos, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                if '/proceso' in topic or category == 'proceso':
                    broadcast_ws_update({'type': 'process_status', 'topic': topic, 'data': payload_dict, 'tenant': tenant, 'sistema_id': sistema.id})
                    return

                # Ignorar comandos de control para no crear dispositivos SCADA fantasmas
                if device_id in ['desechar', 'descartar', 'reanudar', 'detener', 'frenar', 'vaciar', 'proceso', 'control', 'alertas']:
                    return

                # -------------------------------------------------------------
                # E. DISPOSITIVOS GENÉRICOS ADICIONALES (Estrictamente sensores o actuadores)
                # -------------------------------------------------------------
                if category not in ['sensores', 'actuadores']:
                    # Tópicos informativos, de proceso o de diagnóstico no se dan de alta como dispositivos
                    return

                scoped_gen_serie = get_scoped_id(device_id, tenant, system)
                disp_gen_name = f"Auto-detected {device_id} ({system})" if tenant.lower() not in ['rafaela_sa', 'rafaela'] else f"Auto-detected {device_id}"
                cat_gen = get_categoria_from_variable(device_id)
                dispositivo = get_or_create_device(
                    scoped_gen_serie,
                    disp_gen_name,
                    cat_gen
                )
                for var_name, var_value in payload_dict.items():
                    try:
                        val = float(var_value)
                    except (ValueError, TypeError):
                        continue
                    
                    dispositivo.valor_lectura = val
                    dispositivo.unidad_lectura = get_unidad_from_variable(var_name)
                    dispositivo.ultima_lectura = timezone.now()
                    dispositivo.estado = 'ONLINE'
                    dispositivo.save(update_fields=['valor_lectura', 'unidad_lectura', 'ultima_lectura', 'estado'])

                    LecturaSensor.objects.create(
                        dispositivo=dispositivo,
                        valor=val,
                        unidad=get_unidad_from_variable(var_name),
                        calidad='BUENA'
                    )
                self.stdout.write(self.style.SUCCESS(
                    f"[Telemetría SCADA] {tenant}/{gateway_id} | {dispositivo.nombre} [{scoped_gen_serie}] -> {payload_dict} | Tópico: '{topic}'"
                ))
                broadcast_ws_update({'type': 'telemetry_update', 'topic': topic, 'tenant': tenant, 'sistema_id': sistema.id})

        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT en el worker: {e}", exc_info=True)


