"""
Gateway principal - Orquestador del sistema Raspberry Pi
Integra Arduino Serial, MQTT, almacenamiento local y diagnósticos
"""

import sys
import signal
import time
from typing import Dict, Any
from loguru import logger
import yaml

# Importar módulos del sistema
from control.raspberry_gateway.src.arduino_serial import ArduinoSerial
from control.raspberry_gateway.src.mqtt_client import MQTTClient
from control.raspberry_gateway.src.data_storage import DataStorage
from control.raspberry_gateway.src.system_diagnostics import SystemDiagnostics


class SCADAGateway:
    """
    Clase principal que orquesta todos los componentes del gateway
    """
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Inicializa el gateway SCADA
        
        Args:
            config_path: Ruta al archivo de configuración
        """
        logger.info("=" * 60)
        logger.info("Inicializando SCADA Gateway")
        logger.info("=" * 60)
        
        # Cargar configuración
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Configurar logging
        self._configure_logging()
        
        # Inicializar componentes
        self.arduino: Optional[ArduinoSerial] = None
        self.mqtt: Optional[MQTTClient] = None
        self.storage: Optional[DataStorage] = None
        self.diagnostics: Optional[SystemDiagnostics] = None
        
        # Estado
        self.running = False
        
        # Estadísticas
        self.stats = {
            'start_time': time.time(),
            'messages_processed': 0,
            'commands_sent': 0,
            'errors': 0
        }
        
        # Inicializar componentes
        self._init_components()
        
        logger.success("Gateway inicializado correctamente")
    
    def _configure_logging(self):
        """
        Configura el sistema de logging
        """
        log_config = self.config.get('logging', {})
        
        # Remover handler por defecto
        logger.remove()
        
        # Agregar handler para consola
        logger.add(
            sys.stderr,
            format=log_config.get('format', "{time} | {level} | {message}"),
            level=log_config.get('level', 'INFO')
        )
        
        # Agregar handler para archivo principal
        main_log = log_config.get('main', {})
        if main_log:
            logger.add(
                main_log.get('file', 'logs/gateway.log'),
                rotation=main_log.get('rotation', '100 MB'),
                retention=main_log.get('retention', '30 days'),
                compression=main_log.get('compression', 'zip'),
                level=main_log.get('level', 'INFO')
            )
    
    def _init_components(self):
        """
        Inicializa todos los componentes del sistema
        """
        try:
            # Almacenamiento
            logger.info("Inicializando sistema de almacenamiento...")
            self.storage = DataStorage()
            self.storage.save_event('system', 'Gateway iniciado')
            
            # Arduino Serial
            logger.info("Inicializando comunicación con Arduino...")
            self.arduino = ArduinoSerial()
            self.arduino.set_data_callback(self._on_arduino_data)
            self.arduino.set_error_callback(self._on_arduino_error)
            
            # Cliente MQTT
            logger.info("Inicializando cliente MQTT...")
            self.mqtt = MQTTClient()
            self.mqtt.register_command_callback('reposicion', self._on_command_reposicion)
            self.mqtt.register_command_callback('mezcla', self._on_command_mezcla)
            self.mqtt.register_command_callback('control', self._on_command_control)
            self.mqtt.register_command_callback('configuracion', self._on_command_config)
            self.mqtt.register_command_callback('consultas', self._on_query_historico)
            
            # Diagnósticos
            logger.info("Inicializando sistema de diagnóstico...")
            self.diagnostics = SystemDiagnostics()
            self.diagnostics.set_alert_callback(self._on_diagnostic_alert)
            self.diagnostics.set_publish_callback(self._on_diagnostic_publish)
            
        except Exception as e:
            logger.critical(f"Error inicializando componentes: {e}")
            raise
    
    def start(self) -> bool:
        """
        Inicia el gateway y todos sus componentes
        
        Returns:
            True si se inició correctamente
        """
        try:
            logger.info("Iniciando gateway...")
            
            # Iniciar comunicación serial
            if not self.arduino.start():
                logger.error("No se pudo iniciar comunicación con Arduino")
                return False
            
            # Conectar MQTT
            if not self.mqtt.connect():
                logger.error("No se pudo conectar a MQTT")
                return False
            
            # Iniciar limpieza automática de datos
            self.storage.start_auto_cleanup()
            
            # Iniciar diagnósticos
            self.diagnostics.start()
            
            # Actualizar estado de conexiones en diagnósticos
            self.diagnostics.set_serial_status(self.arduino.connected)
            self.diagnostics.set_mqtt_status(self.mqtt.connected)
            
            self.running = True
            
            # Guardar evento de inicio
            self.storage.save_event('system', 'Gateway iniciado y operativo')
            
            logger.success("Gateway iniciado correctamente")
            return True
        
        except Exception as e:
            logger.critical(f"Error iniciando gateway: {e}")
            return False
    
    def stop(self):
        """
        Detiene el gateway y todos sus componentes
        """
        logger.info("Deteniendo gateway...")
        
        self.running = False
        
        # Guardar evento de parada
        if self.storage:
            self.storage.save_event('system', 'Gateway detenido')
        
        # Detener componentes
        if self.diagnostics:
            self.diagnostics.stop()
        
        if self.storage:
            self.storage.stop_auto_cleanup()
        
        if self.mqtt:
            self.mqtt.disconnect()
        
        if self.arduino:
            self.arduino.stop()
        
        logger.info("Gateway detenido")
    
    def _on_arduino_data(self, data: Dict[str, Any]):
        """
        Callback cuando se reciben datos del Arduino
        
        Args:
            data: Datos parseados del Arduino
        """
        try:
            # Guardar en base de datos
            self.storage.save_measurement(data)
            
            # Publicar en MQTT
            self.mqtt.publish_sensor_data(data)
            
            # Actualizar estadísticas
            self.stats['messages_processed'] += 1
            
            # Verificar errores
            error_code = data.get('error', 0)
            if error_code != 0:
                self._handle_arduino_error(error_code)
            
        except Exception as e:
            logger.error(f"Error procesando datos de Arduino: {e}")
            self.stats['errors'] += 1
    
    def _on_arduino_error(self, error_info: Dict[str, Any]):
        """
        Callback para errores de comunicación con Arduino
        
        Args:
            error_info: Información del error
        """
        logger.error(f"Error en Arduino: {error_info}")
        self.storage.save_event('error', f"Error serial: {error_info.get('error')}", error_info)
        self.diagnostics.set_serial_status(False)
    
    def _handle_arduino_error(self, error_code: int):
        """
        Maneja códigos de error del Arduino
        
        Args:
            error_code: Código de error reportado por Arduino
        """
        error_descriptions = {
            1: "Error en sensor de nivel Bombo 1",
            2: "Error en sensor de nivel Bombo 2",
            3: "Error en sensor de nivel Mezcla",
            4: "Error en caudalímetro 1",
            5: "Error en caudalímetro 2",
            10: "Nivel crítico bajo - Bombo 1",
            11: "Nivel crítico bajo - Bombo 2",
            20: "Sobrecalentamiento motor mezclador",
            99: "Error general del sistema"
        }
        
        descripcion = error_descriptions.get(error_code, f"Error desconocido: {error_code}")
        
        # Guardar alarma
        alarm_id = self.storage.save_alarm(error_code, descripcion)
        logger.warning(f"Alarma #{alarm_id}: {descripcion}")
        
        # Publicar alarma en MQTT
        self.mqtt.publish('alarmas', {
            'id': alarm_id,
            'codigo': error_code,
            'descripcion': descripcion,
            'timestamp': time.time(),
            'activa': True
        })
    
    def _on_command_reposicion(self, data: Dict[str, Any], topic: str):
        """
        Procesa comandos de reposición desde MQTT
        
        Args:
            data: Datos del comando
            topic: Topic MQTT de origen
        """
        try:
            bombo = data.get('bombo', 1)
            valor = data.get('valor', 50)
            
            # Formatear comando para Arduino: R{bombo}{valor}
            # Ej: R1050 = Bombo 1, 50%
            comando_valor = f"{bombo}{valor:03d}"
            
            # Enviar comando al Arduino
            if self.arduino.send_command('reposicion', bombo=bombo, valor=f"{valor:03d}"):
                logger.info(f"Comando reposición enviado: Bombo {bombo}, {valor}%")
                
                # Guardar en base de datos
                self.storage.save_command(f"R{comando_valor}", data, 'mqtt')
                self.storage.save_event('comando', f'Reposición bombo {bombo} al {valor}%', data, 'mqtt')
                
                self.stats['commands_sent'] += 1
            else:
                logger.error("Error enviando comando de reposición")
        
        except Exception as e:
            logger.error(f"Error procesando comando de reposición: {e}")
    
    def _on_command_mezcla(self, data: Dict[str, Any], topic: str):
        """
        Procesa comandos de mezcla desde MQTT
        
        Args:
            data: Datos del comando
            topic: Topic MQTT de origen
        """
        try:
            # Comandos de mezcla
            liquido_1 = data.get('liquido_1')
            liquido_2 = data.get('liquido_2')
            hora = data.get('hora')
            minuto = data.get('minuto')
            
            # Enviar configuración de líquidos
            if liquido_1 is not None:
                self.arduino.send_command('liquido_1', valor=int(liquido_1))
                logger.info(f"Cantidad líquido 1 configurada: {liquido_1}")
            
            if liquido_2 is not None:
                self.arduino.send_command('liquido_2', valor=int(liquido_2))
                logger.info(f"Cantidad líquido 2 configurada: {liquido_2}")
            
            # Enviar tiempo de mezcla
            if hora is not None:
                self.arduino.send_command('hora', valor=int(hora))
                logger.info(f"Horas de mezcla configuradas: {hora}")
            
            if minuto is not None:
                self.arduino.send_command('minuto', valor=int(minuto))
                logger.info(f"Minutos de mezcla configurados: {minuto}")
            
            # Guardar evento
            self.storage.save_event('comando', 'Configuración de mezcla', data, 'mqtt')
            self.stats['commands_sent'] += 1
        
        except Exception as e:
            logger.error(f"Error procesando comando de mezcla: {e}")
    
    def _on_command_control(self, data: Dict[str, Any], topic: str):
        """
        Procesa comandos de control general desde MQTT
        
        Args:
            data: Datos del comando
            topic: Topic MQTT de origen
        """
        try:
            accion = data.get('accion', '').upper()
            
            command_map = {
                'CONTINUAR': 'continuar',
                'PARAR': 'frenar',
                'DETENER': 'detener',
                'VACIAR': 'vaciar'
            }
            
            if accion in command_map:
                comando = command_map[accion]
                if self.arduino.send_command(comando):
                    logger.info(f"Comando de control enviado: {accion}")
                    self.storage.save_event('comando', f'Control: {accion}', data, 'mqtt')
                    self.stats['commands_sent'] += 1
            else:
                logger.warning(f"Acción de control desconocida: {accion}")
        
        except Exception as e:
            logger.error(f"Error procesando comando de control: {e}")
    
    def _on_command_config(self, data: Dict[str, Any], topic: str):
        """
        Procesa cambios de configuración desde MQTT
        
        Args:
            data: Datos de configuración
            topic: Topic MQTT de origen
        """
        logger.info(f"Configuración recibida: {data}")
        self.storage.save_event('config', 'Configuración actualizada', data, 'mqtt')
    
    def _on_query_historico(self, data: Dict[str, Any], topic: str):
        """
        Procesa consultas de datos históricos desde MQTT
        
        Args:
            data: Parámetros de la consulta
            topic: Topic MQTT de origen
        """
        try:
            from datetime import datetime, timedelta
            
            # Parsear rango de tiempo
            horas_atras = data.get('horas', 24)
            limit = data.get('limit', 1000)
            
            start_time = datetime.now() - timedelta(hours=horas_atras)
            
            # Obtener datos
            mediciones = self.storage.get_measurements(start_time=start_time, limit=limit)
            
            # Publicar respuesta
            response_topic = data.get('response_topic', 'scada/planta1/consultas/respuesta')
            self.mqtt.publish(response_topic, {
                'query': data,
                'count': len(mediciones),
                'data': mediciones[:100]  # Limitar para no saturar MQTT
            })
            
            logger.info(f"Consulta histórica procesada: {len(mediciones)} registros")
        
        except Exception as e:
            logger.error(f"Error procesando consulta histórica: {e}")
    
    def _on_diagnostic_alert(self, alert: Dict[str, Any]):
        """
        Procesa alertas del sistema de diagnóstico
        
        Args:
            alert: Información de la alerta
        """
        # Guardar evento
        self.storage.save_event('alerta_sistema', alert['message'], alert)
        
        # Publicar en MQTT
        self.mqtt.publish('diagnostico/alertas', alert)
    
    def _on_diagnostic_publish(self, diagnostic: Dict[str, Any]):
        """
        Publica datos de diagnóstico
        
        Args:
            diagnostic: Datos de diagnóstico completos
        """
        # Guardar en base de datos
        self.storage.save_diagnostic({
            'cpu_percent': diagnostic['cpu']['percent'],
            'cpu_temp': diagnostic['cpu']['temperature'],
            'memory_percent': diagnostic['memory']['percent'],
            'memory_available_mb': diagnostic['memory']['available_mb'],
            'disk_percent': diagnostic['disk']['percent'],
            'disk_free_gb': diagnostic['disk']['free_gb'],
            'serial_connected': diagnostic['connections']['serial'],
            'mqtt_connected': diagnostic['connections']['mqtt'],
            'uptime_seconds': diagnostic['uptime']['seconds']
        })
        
        # Publicar en MQTT
        self.mqtt.publish('diagnostico', diagnostic)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas del gateway
        
        Returns:
            Diccionario con estadísticas completas
        """
        uptime = time.time() - self.stats['start_time']
        
        return {
            **self.stats,
            'uptime_seconds': uptime,
            'running': self.running,
            'arduino': self.arduino.get_stats() if self.arduino else {},
            'mqtt': self.mqtt.get_stats() if self.mqtt else {},
            'diagnostics': self.diagnostics.get_stats() if self.diagnostics else {}
        }
    
    def print_status(self):
        """
        Imprime el estado actual del gateway
        """
        stats = self.get_stats()
        
        print("\n" + "=" * 60)
        print("ESTADO DEL GATEWAY")
        print("=" * 60)
        print(f"Estado: {'🟢 Activo' if self.running else '🔴 Inactivo'}")
        print(f"Uptime: {stats['uptime_seconds'] / 3600:.2f} horas")
        print(f"Mensajes procesados: {stats['messages_processed']}")
        print(f"Comandos enviados: {stats['commands_sent']}")
        print(f"Errores: {stats['errors']}")
        print()
        print(f"Arduino: {'✓' if stats['arduino'].get('connected') else '✗'} Conectado")
        print(f"MQTT: {'✓' if stats['mqtt'].get('connected') else '✗'} Conectado")
        print("=" * 60 + "\n")


def signal_handler(signum, frame):
    """
    Manejador de señales para cierre graceful
    """
    global gateway
    logger.info(f"Señal {signum} recibida, cerrando gateway...")
    if gateway:
        gateway.stop()
    sys.exit(0)


# Variable global para el gateway
gateway: Optional[SCADAGateway] = None


def main():
    """
    Función principal
    """
    global gateway
    
    # Registrar manejador de señales
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Crear y iniciar gateway
        gateway = SCADAGateway()
        
        if gateway.start():
            logger.success("Gateway operativo")
            
            # Loop principal
            while gateway.running:
                time.sleep(10)
                gateway.print_status()
        else:
            logger.error("No se pudo iniciar el gateway")
            sys.exit(1)
    
    except Exception as e:
        logger.critical(f"Error fatal: {e}")
        if gateway:
            gateway.stop()
        sys.exit(1)


if __name__ == "__main__":
    main()
