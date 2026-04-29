"""
Cliente MQTT para comunicación con la aplicación web
Gestiona publicación de datos de sensores y suscripción a comandos
"""

import paho.mqtt.client as mqtt
import json
import time
import threading
from typing import Optional, Dict, Any, Callable
from queue import Queue
from loguru import logger
import yaml


class MQTTClient:
    """
    Cliente MQTT para comunicación bidireccional con la app web
    """
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Inicializa el cliente MQTT
        
        Args:
            config_path: Ruta al archivo de configuración
        """
        # Cargar configuración
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.mqtt_config = self.config['mqtt']
        
        # Configuración MQTT
        self.broker = self.mqtt_config['broker']
        self.port = self.mqtt_config['port']
        self.username = self.mqtt_config.get('username')
        self.password = self.mqtt_config.get('password')
        self.client_id = self.mqtt_config['client_id']
        self.keepalive = self.mqtt_config.get('keepalive', 60)
        self.qos = self.mqtt_config.get('qos', 1)
        
        # Topics
        self.base_topic = self.mqtt_config['topics']['base']
        self.publish_topics = self.mqtt_config['topics']['publish']
        self.subscribe_topics = self.mqtt_config['topics']['subscribe']
        
        # Cliente MQTT
        self.client: Optional[mqtt.Client] = None
        self.connected = False
        self.running = False
        
        # Cola de mensajes a publicar
        self.publish_queue = Queue()
        
        # Callbacks personalizados
        self.command_callbacks: Dict[str, Callable] = {}
        
        # Estadísticas
        self.stats = {
            'messages_published': 0,
            'messages_received': 0,
            'errors': 0,
            'last_publish_time': None,
            'last_receive_time': None
        }
        
        logger.info(f"MQTTClient inicializado para {self.broker}:{self.port}")
    
    def _on_connect(self, client, userdata, flags, rc):
        """
        Callback cuando se conecta al broker MQTT
        """
        if rc == 0:
            self.connected = True
            logger.success(f"Conectado al broker MQTT: {self.broker}")
            
            # Suscribirse a todos los topics de comandos
            self._subscribe_to_topics()
        else:
            self.connected = False
            error_messages = {
                1: "Protocolo incorrecto",
                2: "Client ID rechazado",
                3: "Servidor no disponible",
                4: "Usuario/contraseña incorrectos",
                5: "No autorizado"
            }
            logger.error(f"Error conectando a MQTT: {error_messages.get(rc, f'Error {rc}')}")
    
    def _on_disconnect(self, client, userdata, rc):
        """
        Callback cuando se desconecta del broker MQTT
        """
        self.connected = False
        if rc != 0:
            logger.warning(f"Desconexión inesperada del broker MQTT (rc={rc})")
        else:
            logger.info("Desconectado del broker MQTT")
    
    def _on_message(self, client, userdata, msg):
        """
        Callback cuando se recibe un mensaje MQTT
        """
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.debug(f"Mensaje recibido en {topic}: {payload}")
            
            # Parsear JSON si es posible
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                data = {'raw': payload}
            
            # Actualizar estadísticas
            self.stats['messages_received'] += 1
            self.stats['last_receive_time'] = time.time()
            
            # Determinar tipo de comando según topic
            relative_topic = topic.replace(f"{self.base_topic}/", "")
            
            # Ejecutar callback correspondiente
            for command_type, callback in self.command_callbacks.items():
                if command_type in relative_topic:
                    callback(data, topic)
                    break
            
        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT: {e}")
            self.stats['errors'] += 1
    
    def _on_publish(self, client, userdata, mid):
        """
        Callback cuando se publica un mensaje exitosamente
        """
        logger.debug(f"Mensaje publicado (mid={mid})")
    
    def _subscribe_to_topics(self):
        """
        Suscribe a todos los topics configurados
        """
        for topic_name, topic_path in self.subscribe_topics.items():
            full_topic = f"{self.base_topic}/{topic_path}"
            self.client.subscribe(full_topic, qos=self.qos)
            logger.info(f"Suscrito a topic: {full_topic}")
    
    def connect(self) -> bool:
        """
        Conecta al broker MQTT
        
        Returns:
            True si la conexión fue exitosa
        """
        try:
            # Crear cliente MQTT
            self.client = mqtt.Client(client_id=self.client_id)
            
            # Configurar callbacks
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            self.client.on_publish = self._on_publish
            
            # Configurar credenciales si existen
            if self.username and self.password:
                self.client.username_pw_set(self.username, self.password)
            
            # Configurar TLS si está habilitado
            tls_config = self.mqtt_config.get('tls', {})
            if tls_config.get('enabled', False):
                import ssl
                self.client.tls_set(
                    ca_certs=tls_config.get('ca_certs'),
                    certfile=tls_config.get('certfile'),
                    keyfile=tls_config.get('keyfile'),
                    tls_version=ssl.PROTOCOL_TLSv1_2
                )
            
            # Configurar will (mensaje de última voluntad)
            will_topic = f"{self.base_topic}/estado/gateway"
            self.client.will_set(
                will_topic,
                payload=json.dumps({'online': False, 'timestamp': time.time()}),
                qos=self.qos,
                retain=True
            )
            
            # Conectar
            self.client.connect(self.broker, self.port, self.keepalive)
            
            # Iniciar loop en thread separado
            self.client.loop_start()
            
            # Esperar conexión
            timeout = 10
            start_time = time.time()
            while not self.connected and time.time() - start_time < timeout:
                time.sleep(0.1)
            
            if self.connected:
                # Publicar estado online
                self.publish('estado/gateway', {
                    'online': True,
                    'timestamp': time.time(),
                    'client_id': self.client_id
                }, retain=True)
                
                return True
            else:
                logger.error("Timeout esperando conexión MQTT")
                return False
        
        except Exception as e:
            logger.error(f"Error conectando a MQTT: {e}")
            return False
    
    def disconnect(self):
        """
        Desconecta del broker MQTT
        """
        if self.client:
            # Publicar estado offline
            self.publish('estado/gateway', {
                'online': False,
                'timestamp': time.time()
            }, retain=True)
            
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
            logger.info("Desconectado del broker MQTT")
    
    def publish(self, topic_name: str, data: Any, retain: bool = False, qos: Optional[int] = None) -> bool:
        """
        Publica datos en un topic MQTT
        
        Args:
            topic_name: Nombre del topic (relativo o completo)
            data: Datos a publicar (dict se convierte a JSON)
            retain: Si el mensaje debe ser retenido por el broker
            qos: Quality of Service (None usa el configurado)
            
        Returns:
            True si la publicación fue exitosa
        """
        try:
            if not self.connected:
                logger.warning(f"No conectado a MQTT, mensaje descartado: {topic_name}")
                return False
            
            # Construir topic completo si es necesario
            if not topic_name.startswith(self.base_topic):
                # Verificar si está en publish_topics
                if topic_name in self.publish_topics:
                    topic_path = self.publish_topics[topic_name]
                    full_topic = f"{self.base_topic}/{topic_path}"
                else:
                    full_topic = f"{self.base_topic}/{topic_name}"
            else:
                full_topic = topic_name
            
            # Convertir a JSON si es dict
            if isinstance(data, dict):
                payload = json.dumps(data)
            else:
                payload = str(data)
            
            # Publicar
            result = self.client.publish(
                full_topic,
                payload,
                qos=qos if qos is not None else self.qos,
                retain=retain
            )
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                self.stats['messages_published'] += 1
                self.stats['last_publish_time'] = time.time()
                logger.debug(f"Publicado en {full_topic}: {payload[:100]}")
                return True
            else:
                logger.error(f"Error publicando en {full_topic}: {result.rc}")
                self.stats['errors'] += 1
                return False
        
        except Exception as e:
            logger.error(f"Error en publish: {e}")
            self.stats['errors'] += 1
            return False
    
    def publish_sensor_data(self, sensor_data: Dict[str, Any]):
        """
        Publica datos de sensores en los topics correspondientes
        
        Args:
            sensor_data: Diccionario con datos del Arduino parseados
        """
        try:
            # Publicar estado general
            general_state = {
                'timestamp': sensor_data.get('timestamp'),
                'conectado': True,
                'error': sensor_data.get('error', 0)
            }
            self.publish('estado_general', general_state)
            
            # Publicar niveles de bombos
            self.publish('nivel_bombo1', {
                'nivel': sensor_data.get('nivel_bombo1'),
                'porcentaje': sensor_data.get('porcentaje_bombo1'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('nivel_bombo2', {
                'nivel': sensor_data.get('nivel_bombo2'),
                'porcentaje': sensor_data.get('porcentaje_bombo2'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('nivel_mezcla', {
                'nivel': sensor_data.get('nivel_mezcla'),
                'porcentaje': sensor_data.get('porcentaje_mezcla'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            # Publicar caudales
            self.publish('caudal_1', {
                'caudal': sensor_data.get('caudal_1'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('caudal_2', {
                'caudal': sensor_data.get('caudal_2'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            # Publicar estados de actuadores
            self.publish('bomba1', {
                'estado': sensor_data.get('estado_bomba1'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('bomba2', {
                'estado': sensor_data.get('estado_bomba2'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('bomba_mezcla', {
                'estado': sensor_data.get('estado_bomba_mezcla'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('mezclador', {
                'estado': sensor_data.get('estado_mezclador'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            self.publish('bomba_repo', {
                'estado': sensor_data.get('estado_bomba_repo'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            # Publicar tiempo restante
            self.publish('tiempo_restante', {
                'horas': sensor_data.get('hora_restante'),
                'minutos': sensor_data.get('min_restante'),
                'timestamp': sensor_data.get('timestamp')
            })
            
            # Publicar alarmas si hay error
            if sensor_data.get('error', 0) != 0:
                self.publish('alarmas', {
                    'codigo_error': sensor_data.get('error'),
                    'timestamp': sensor_data.get('timestamp'),
                    'activa': True
                })
        
        except Exception as e:
            logger.error(f"Error publicando datos de sensores: {e}")
            self.stats['errors'] += 1
    
    def register_command_callback(self, command_type: str, callback: Callable):
        """
        Registra un callback para un tipo de comando
        
        Args:
            command_type: Tipo de comando (reposicion, mezcla, control, etc.)
            callback: Función a llamar cuando se reciba el comando
        """
        self.command_callbacks[command_type] = callback
        logger.info(f"Callback registrado para comando: {command_type}")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas del cliente MQTT
        
        Returns:
            Diccionario con estadísticas
        """
        return {
            **self.stats,
            'connected': self.connected,
            'broker': self.broker,
            'base_topic': self.base_topic
        }


# Ejemplo de uso
if __name__ == "__main__":
    # Configurar logger
    logger.add("logs/mqtt.log", rotation="10 MB")
    
    # Crear cliente MQTT
    mqtt_client = MQTTClient()
    
    # Definir callbacks para comandos
    def on_reposicion(data, topic):
        print(f"Comando de reposición recibido: {data}")
    
    def on_mezcla(data, topic):
        print(f"Comando de mezcla recibido: {data}")
    
    def on_control(data, topic):
        print(f"Comando de control recibido: {data}")
    
    # Registrar callbacks
    mqtt_client.register_command_callback('reposicion', on_reposicion)
    mqtt_client.register_command_callback('mezcla', on_mezcla)
    mqtt_client.register_command_callback('control', on_control)
    
    # Conectar
    if mqtt_client.connect():
        print("Conectado a MQTT. Presiona Ctrl+C para salir...")
        
        try:
            # Publicar datos de prueba
            while True:
                # Simular datos de sensores
                test_data = {
                    'timestamp': time.time(),
                    'nivel_bombo1': 45.5,
                    'porcentaje_bombo1': 45,
                    'nivel_bombo2': 60.2,
                    'porcentaje_bombo2': 60,
                    'nivel_mezcla': 30.1,
                    'porcentaje_mezcla': 30,
                    'caudal_1': 5.5,
                    'caudal_2': 4.2,
                    'estado_bomba1': False,
                    'estado_bomba2': False,
                    'estado_bomba_mezcla': False,
                    'estado_mezclador': True,
                    'estado_bomba_repo': False,
                    'error': 0,
                    'hora_restante': 2,
                    'min_restante': 30
                }
                
                mqtt_client.publish_sensor_data(test_data)
                
                stats = mqtt_client.get_stats()
                print(f"Stats: {stats}")
                
                time.sleep(5)
        
        except KeyboardInterrupt:
            print("\nDeteniendo...")
            mqtt_client.disconnect()
    else:
        print("No se pudo conectar a MQTT")
