import json
import logging
from django.utils.timezone import now
from .models import DispositivoSCADA, LecturaSensor, ComunicacionMQTT, ConfiguracionMQTT, Receta, EjecucionReceta

logger = logging.getLogger(__name__)

class MQTTBackendManager:
    """
    Gestiona la conexión del backend Django con el Broker MQTT.
    Permite publicar comandos y escuchar sensores/respuestas para persistirlos en la DB.
    """
    def __init__(self):
        self.client = None
        self.connected = False
        
    def get_client(self):
        """Inicializa y retorna el cliente paho-mqtt"""
        import paho.mqtt.client as mqtt
        
        if self.client is not None:
            return self.client
            
        # Obtener configuración activa de la DB
        try:
            config = ConfiguracionMQTT.objects.filter(activo=True).first()
        except Exception:
            config = None
            
        import os
        broker_host = "mosquitto" if os.environ.get("DATABASE_URL") else "127.0.0.1"
        broker_port = 1883
        keepalive = 60
        username = None
        password = None
        
        if config:
            broker_host = config.broker_url
            broker_port = config.puerto
            keepalive = config.keep_alive
            username = config.usuario
            password = config.password
            
        self.client = mqtt.Client(client_id="django_scada_backend")
        
        if username and password:
            self.client.username_pw_set(username, password)
            
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.connected = True
                logger.info(f"Django backend conectado exitosamente al Broker MQTT en {broker_host}:{broker_port}")
                # Suscribirse tanto a topics legacy como estándar
                client.subscribe("scada/#")
                client.subscribe("+/+/+/+/+/+")  # Estándar: tenant/gateway/sector/system/device/variable
            else:
                self.connected = False
                logger.error(f"Error al conectar con el Broker. Código de retorno: {rc}")
                
        def on_disconnect(client, userdata, rc):
            self.connected = False
            logger.warning("Django backend desconectado de MQTT Broker")
            
        def on_message(client, userdata, msg):
            try:
                topic = msg.topic
                payload_str = msg.payload.decode('utf-8')
                self.process_incoming_message(topic, payload_str)
            except Exception as e:
                logger.error(f"Error procesando mensaje entrante en topic {msg.topic}: {e}")
                
        self.client.on_connect = on_connect
        self.client.on_disconnect = on_disconnect
        self.client.on_message = on_message
        
        try:
            self.client.connect(broker_host, broker_port, keepalive)
        except Exception as e:
            logger.error(f"Imposible conectar al Broker MQTT en {broker_host}:{broker_port}: {e}")
            
        return self.client

    def start_listener_loop(self):
        """Inicia el loop de escucha en bloqueo (para correr como comando de administración/worker)"""
        client = self.get_client()
        logger.info("Iniciando loop de Django MQTT Listener...")
        client.loop_forever()

    def publish_command(self, topic, payload, dispositivo=None):
        """Publica un comando MQTT y lo almacena en la tabla ComunicacionMQTT"""
        client = self.get_client()
        payload_str = json.dumps(payload) if isinstance(payload, dict) else str(payload)
        
        # Registrar en DB (ComunicacionMQTT)
        config = ConfiguracionMQTT.objects.filter(activo=True).first()
        comunicacion = ComunicacionMQTT.objects.create(
            configuracion=config,
            topic=topic,
            payload=payload_str,
            direccion='PUBLICADO',
            qos=1,
            dispositivo=dispositivo,
            exitoso=False
        )
        
        if not self.connected:
            # Intento de reconexión rápida
            try:
                client.reconnect()
            except Exception:
                pass
                
        try:
            info = client.publish(topic, payload_str, qos=1)
            info.wait_for_publish()
            comunicacion.exitoso = True
            comunicacion.save()
            logger.info(f"Comando publicado en topic {topic}: {payload_str}")
            return True
        except Exception as e:
            logger.error(f"Fallo al publicar comando en topic {topic}: {e}")
            comunicacion.mensaje_error = str(e)
            comunicacion.save()
            return False

    def process_incoming_message(self, topic, payload_str):
        """Procesa, clasifica y almacena en la base de datos la telemetría o respuesta recibida"""
        # Registrar comunicación entrante en ComunicacionMQTT
        config = ConfiguracionMQTT.objects.filter(activo=True).first()
        
        # Buscar dispositivo asociado basándose en el topic
        dispositivo = DispositivoSCADA.objects.filter(topic_mqtt=topic).first()
        if not dispositivo:
            # Búsqueda difusa para topics parecidos si es telemetría legacy
            if "sensores/" in topic:
                partes = topic.split('/')
                dispositivo_id = partes[-1]
                dispositivo = DispositivoSCADA.objects.filter(numero_serie__icontains=dispositivo_id).first()
        
        ComunicacionMQTT.objects.create(
            configuracion=config,
            topic=topic,
            payload=payload_str,
            direccion='RECIBIDO',
            dispositivo=dispositivo,
            exitoso=True
        )
        
        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError:
            payload = payload_str

        # 1. TRATAMIENTO DE TELEMETRÍA/SENSADO LEGACY (scada/planta1/sensores/...)
        if topic.startswith("scada/") and "sensores/" in topic:
            self._handle_legacy_sensor_data(topic, payload, dispositivo)
            
        # 2. TRATAMIENTO DE TELEMETRÍA ESTÁNDAR (tenant/gateway/sector/system/device/variable)
        elif not topic.startswith("scada/") and any(kw in topic for msg in ["valor_cm", "porcentaje", "caudal_l"]):
            self._handle_standard_sensor_data(topic, payload_str, dispositivo)

        # 3. TRATAMIENTO DE ESTADOS DE ACTUADORES / BOMBAS (scada/planta1/actuadores/...)
        elif topic.startswith("scada/") and "actuadores/" in topic:
            self._handle_legacy_actuator_state(topic, payload, dispositivo)

        # 4. TRATAMIENTO DE RESPUESTAS A COMANDOS/RECETAS (resp/)
        elif "/resp/" in topic or "respuesta" in topic:
            self._handle_command_response(topic, payload)

    def _handle_legacy_sensor_data(self, topic, payload, dispositivo):
        """Guarda datos de sensores en formato legacy en la DB"""
        partes = topic.split('/')
        sensor_tipo = partes[-2] # ej: 'nivel' o 'caudal'
        sensor_nombre = partes[-1] # ej: 'bombo1', 'mezcla', '1'
        
        valor = 0.0
        unidad = "N/A"
        
        if isinstance(payload, dict):
            valor = payload.get("nivel") or payload.get("caudal") or payload.get("valor", 0.0)
            unidad = "cm" if sensor_tipo == "nivel" else "L/s"
        else:
            try:
                valor = float(payload)
            except ValueError:
                return
                
        # Asegurar que el dispositivo SCADA existe para poder linkear
        if not dispositivo:
            dispositivo, _ = DispositivoSCADA.objects.get_or_create(
                numero_serie=f"LEGACY-{sensor_tipo}-{sensor_nombre}".upper()[:50],
                defaults={
                    'nombre': f"Sensor {sensor_tipo.capitalize()} {sensor_nombre.capitalize()}",
                    'categoria': f"SENSOR_{sensor_tipo.upper()}",
                    'estado': 'ONLINE',
                    'topic_mqtt': topic
                }
            )
            
        LecturaSensor.objects.create(
            dispositivo=dispositivo,
            valor=float(valor),
            unidad=unidad,
            calidad="GOOD"
        )
        dispositivo.estado = 'ONLINE'
        dispositivo.ultima_lectura = now()
        dispositivo.save()

    def _handle_standard_sensor_data(self, topic, payload_str, dispositivo):
        """Guarda datos de sensores estructurados multi-planta (AURA)"""
        partes = topic.split('/')
        # tenant/gateway/sector/system/device/variable
        variable = partes[-1]
        device_id = partes[-2]
        
        try:
            valor = float(payload_str)
        except ValueError:
            return
            
        unit = "cm" if "nivel" in device_id or "valor_cm" in variable else "L/min" if "caudal" in device_id else "N/A"
        categoria = "SENSOR_NIVEL" if "nivel" in device_id else "SENSOR_FLUJO" if "caudal" in device_id else "OTRO"
        
        if not dispositivo:
            dispositivo, _ = DispositivoSCADA.objects.get_or_create(
                numero_serie=device_id.upper()[:50],
                defaults={
                    'nombre': f"{device_id.replace('_', ' ').capitalize()}",
                    'categoria': categoria,
                    'estado': 'ONLINE',
                    'topic_mqtt': topic
                }
            )
            
        LecturaSensor.objects.create(
            dispositivo=dispositivo,
            valor=valor,
            unidad=unit,
            calidad="GOOD"
        )
        dispositivo.estado = 'ONLINE'
        dispositivo.ultima_lectura = now()
        dispositivo.save()

    def _handle_legacy_actuator_state(self, topic, payload, dispositivo):
        """Guarda estado de bombas/motores"""
        partes = topic.split('/')
        actuador_nombre = partes[-1]
        
        estado_flag = False
        if isinstance(payload, dict):
            estado_flag = payload.get("estado", False)
        else:
            estado_flag = str(payload).lower() in ["true", "1", "on"]
            
        if not dispositivo:
            dispositivo, _ = DispositivoSCADA.objects.get_or_create(
                numero_serie=f"LEGACY-BOMBA-{actuador_nombre.upper()}"[:50],
                defaults={
                    'nombre': f"Bomba {actuador_nombre.capitalize()}",
                    'categoria': 'BOMBA',
                    'estado': 'ONLINE',
                    'topic_mqtt': topic
                }
            )
            
        LecturaSensor.objects.create(
            dispositivo=dispositivo,
            valor=1.0 if estado_flag else 0.0,
            unidad="ON/OFF",
            calidad="GOOD"
        )
        dispositivo.estado = 'ONLINE'
        dispositivo.ultima_lectura = now()
        dispositivo.save()

    def _handle_command_response(self, topic, payload):
        """Actualiza el estado de las órdenes o ejecuciones según el ACK/RESP del gateway"""
        if not isinstance(payload, dict):
            return
            
        status = payload.get("status")
        command = payload.get("command") or payload.get("cmd")
        
        if command == "control" or command == "pausa":
            # Buscar la ejecución más reciente en progreso
            ejecucion = EjecucionReceta.objects.filter(estado='EN_PROGRESO').order_on_time = '-tiempo_inicio'
            first_ej = ejecucion.first() if hasattr(ejecucion, 'first') else None
            
            if first_ej:
                action = payload.get("action")
                if action == "PAUSAR" and status == "ACK":
                    first_ej.estado = "EN_PROGRESO"  # o agregar un estado PAUSADO si existiera
                    first_ej.save()
                    logger.info(f"Ejecución {first_ej.id} registrada en pausa por MQTT")
