import json
import logging
import re
import time
from django.core.management.base import BaseCommand
from django.utils import timezone
import paho.mqtt.client as mqtt

from polls.models import DispositivoSCADA, LecturaSensor, Fabrica, Seccion, ConfiguracionMQTT

logger = logging.getLogger(__name__)

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

        # Loop infinito
        try:
            client.loop_forever()
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("Deteniendo MQTT Worker de forma segura..."))
            client.disconnect()

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.stdout.write(self.style.SUCCESS("Conectado exitosamente al broker MQTT"))
            # Suscribirse a disponibilidad de gateways
            client.subscribe("+/+/status", qos=1)
            # Suscribirse a telemetría estructurada
            client.subscribe("+/+/+/+/+/+", qos=1)
            self.stdout.write("Suscrito a los tópicos de control y telemetría estructurada")
        else:
            self.stdout.write(self.style.ERROR(f"Conexión MQTT fallida con código de retorno: {rc}"))

    def on_disconnect(self, client, userdata, rc):
        self.stdout.write(self.style.WARNING(f"Desconectado del broker MQTT (rc={rc})"))

    def on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload_str = msg.payload.decode('utf-8').strip()
            # logger.info(f"Mensaje recibido en {topic}: {payload_str}")

            # 1. Procesar Heartbeat / Disponibilidad
            # Formato: tenant/gateway_id/status
            status_match = re.match(r"^([^/]+)/([^/]+)/status$", topic)
            if status_match:
                tenant, gateway_id = status_match.groups()
                estado_dispo = "ONLINE" if payload_str.lower() == "online" else "OFFLINE"
                
                # Actualizar el estado de todos los sensores vinculados a este gateway
                updated = DispositivoSCADA.objects.filter(gateway_id=gateway_id).update(
                    estado=estado_dispo,
                    ultima_lectura=timezone.now()
                )
                if updated > 0:
                    self.stdout.write(f"[Heartbeat] Gateway '{gateway_id}' -> {payload_str}. {updated} dispositivos marcados como {estado_dispo}.")
                return

            # 2. Procesar Telemetría
            # Formato: tenant/gateway_id/sector/system/device/variable
            telemetria_parts = topic.split('/')
            if len(telemetria_parts) == 6:
                tenant, gateway_id, sector, system, device, variable = telemetria_parts
                
                try:
                    # El payload de telemetría estructurada suele ser un valor plano (ej: 23.5)
                    # o un JSON que contiene un campo 'value' o 'valor'.
                    try:
                        parsed = json.loads(payload_str)
                        valor_lectura = float(parsed.get('value') or parsed.get('valor') or payload_str)
                    except (json.JSONDecodeError, ValueError, TypeError):
                        valor_lectura = float(payload_str)
                except ValueError:
                    # Si no se puede castear a float, ignoramos esta lectura para no romper el worker
                    logger.warning(f"Ignorando lectura no numérica en {topic}: {payload_str}")
                    return

                # Buscar o crear dispositivo (Auto-Discovery)
                dispositivo, created = DispositivoSCADA.objects.get_or_create(
                    numero_serie=device,
                    defaults={
                        'nombre': f"Auto-detected {device}",
                        'categoria': get_categoria_from_variable(variable),
                        'estado': 'OFFLINE',  # Comienza offline hasta que se apruebe o se asigne
                        'gateway_id': gateway_id,
                        'topic_mqtt': topic,
                        'descripcion': f"Dispositivo detectado automáticamente por telemetría MQTT en el tópico: {topic}"
                    }
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(f"[Auto-Discovery] Nuevo dispositivo detectado y registrado: {device} (Gateway: {gateway_id})"))
                
                # Si el dispositivo existe pero no tenía gateway_id o topic_mqtt, se los asignamos
                updated_fields = []
                if not dispositivo.gateway_id:
                    dispositivo.gateway_id = gateway_id
                    updated_fields.append('gateway_id')
                if not dispositivo.topic_mqtt:
                    dispositivo.topic_mqtt = topic
                    updated_fields.append('topic_mqtt')
                
                # Actualizar última lectura y marcarlo como ONLINE al recibir datos activos
                dispositivo.ultima_lectura = timezone.now()
                dispositivo.estado = "ONLINE"
                updated_fields.extend(['ultima_lectura', 'estado'])
                dispositivo.save(update_fields=updated_fields)

                # Registrar la lectura del sensor
                LecturaSensor.objects.create(
                    dispositivo=dispositivo,
                    valor=valor_lectura,
                    unidad=get_unidad_from_variable(variable),
                    calidad='BUENA'
                )
                
                # self.stdout.write(f"[Telemetría] {device} -> {valor_lectura} {get_unidad_from_variable(variable)}")

        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT en el worker: {e}", exc_info=True)
