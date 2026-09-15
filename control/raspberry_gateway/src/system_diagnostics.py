"""
Sistema de diagnóstico para Raspberry Pi
Monitorea CPU, memoria, temperatura, disco y estado de conexiones
Envía alertas cuando se superan umbrales configurados
"""

import psutil
import time
import threading
from typing import Optional, Dict, Any, Callable
from datetime import datetime
from loguru import logger
import yaml


class SystemDiagnostics:
    """
    Monitoreo y diagnóstico del sistema Raspberry Pi
    """
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Inicializa el sistema de diagnóstico
        
        Args:
            config_path: Ruta al archivo de configuración
        """
        # Cargar configuración
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.diag_config = self.config['diagnostics']
        
        # Estado del sistema
        self.enabled = self.diag_config.get('enabled', True)
        self.check_interval = self.diag_config.get('check_interval', 60)
        self.publish_interval = self.diag_config.get('publish_interval', 300)
        
        # Umbrales de alerta
        self.thresholds = self.diag_config.get('thresholds', {})
        
        # Estado de conexiones externas
        self.serial_connected = False
        self.mqtt_connected = False
        
        # Tiempo de inicio
        self.start_time = time.time()
        
        # Thread de monitoreo
        self.monitor_thread: Optional[threading.Thread] = None
        self.running = False
        
        # Callbacks
        self.alert_callback: Optional[Callable] = None
        self.publish_callback: Optional[Callable] = None
        
        # Última publicación
        self.last_publish = 0
        
        # Estadísticas
        self.stats = {
            'checks_performed': 0,
            'alerts_sent': 0,
            'last_check_time': None
        }
        
        logger.info("SystemDiagnostics inicializado")
    
    def get_cpu_info(self) -> Dict[str, Any]:
        """
        Obtiene información de CPU
        
        Returns:
            Diccionario con datos de CPU
        """
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_freq = psutil.cpu_freq()
            cpu_count = psutil.cpu_count()
            
            # Obtener temperatura (específico para Raspberry Pi)
            try:
                with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                    cpu_temp = float(f.read()) / 1000.0
            except:
                cpu_temp = None
            
            return {
                'percent': round(cpu_percent, 2),
                'temperature': round(cpu_temp, 2) if cpu_temp else None,
                'frequency_mhz': round(cpu_freq.current, 2) if cpu_freq else None,
                'count': cpu_count
            }
        
        except Exception as e:
            logger.error(f"Error obteniendo info de CPU: {e}")
            return {}
    
    def get_memory_info(self) -> Dict[str, Any]:
        """
        Obtiene información de memoria RAM
        
        Returns:
            Diccionario con datos de memoria
        """
        try:
            memory = psutil.virtual_memory()
            
            return {
                'percent': round(memory.percent, 2),
                'total_mb': round(memory.total / (1024 * 1024), 2),
                'available_mb': round(memory.available / (1024 * 1024), 2),
                'used_mb': round(memory.used / (1024 * 1024), 2)
            }
        
        except Exception as e:
            logger.error(f"Error obteniendo info de memoria: {e}")
            return {}
    
    def get_disk_info(self) -> Dict[str, Any]:
        """
        Obtiene información de disco
        
        Returns:
            Diccionario con datos de disco
        """
        try:
            disk = psutil.disk_usage('/')
            
            return {
                'percent': round(disk.percent, 2),
                'total_gb': round(disk.total / (1024 ** 3), 2),
                'free_gb': round(disk.free / (1024 ** 3), 2),
                'used_gb': round(disk.used / (1024 ** 3), 2)
            }
        
        except Exception as e:
            logger.error(f"Error obteniendo info de disco: {e}")
            return {}
    
    def get_network_info(self) -> Dict[str, Any]:
        """
        Obtiene información de red
        
        Returns:
            Diccionario con datos de red
        """
        try:
            net_io = psutil.net_io_counters()
            
            # Obtener direcciones IP
            interfaces = psutil.net_if_addrs()
            ip_addresses = {}
            for interface_name, addresses in interfaces.items():
                for addr in addresses:
                    if addr.family == 2:  # AF_INET (IPv4)
                        ip_addresses[interface_name] = addr.address
            
            return {
                'bytes_sent_mb': round(net_io.bytes_sent / (1024 * 1024), 2),
                'bytes_recv_mb': round(net_io.bytes_recv / (1024 * 1024), 2),
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv,
                'ip_addresses': ip_addresses
            }
        
        except Exception as e:
            logger.error(f"Error obteniendo info de red: {e}")
            return {}
    
    def get_uptime(self) -> Dict[str, Any]:
        """
        Obtiene tiempo de funcionamiento
        
        Returns:
            Diccionario con uptime
        """
        uptime_seconds = time.time() - self.start_time
        
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        seconds = int(uptime_seconds % 60)
        
        return {
            'seconds': round(uptime_seconds, 2),
            'formatted': f"{days}d {hours}h {minutes}m {seconds}s",
            'days': days,
            'hours': hours,
            'minutes': minutes
        }
    
    def get_full_diagnostic(self) -> Dict[str, Any]:
        """
        Obtiene diagnóstico completo del sistema
        
        Returns:
            Diccionario con todos los datos de diagnóstico
        """
        return {
            'timestamp': time.time(),
            'fecha_hora': datetime.now().isoformat(),
            'cpu': self.get_cpu_info(),
            'memory': self.get_memory_info(),
            'disk': self.get_disk_info(),
            'network': self.get_network_info(),
            'uptime': self.get_uptime(),
            'connections': {
                'serial': self.serial_connected,
                'mqtt': self.mqtt_connected
            }
        }
    
    def check_thresholds(self, diagnostic: Dict[str, Any]) -> list:
        """
        Verifica si se han superado umbrales y genera alertas
        
        Args:
            diagnostic: Diccionario con datos de diagnóstico
            
        Returns:
            Lista de alertas generadas
        """
        alerts = []
        
        # Verificar temperatura CPU
        cpu_temp = diagnostic.get('cpu', {}).get('temperature')
        if cpu_temp:
            temp_warning = self.thresholds.get('temperature_warning', 70)
            temp_critical = self.thresholds.get('temperature_critical', 80)
            
            if cpu_temp >= temp_critical:
                alerts.append({
                    'level': 'CRITICAL',
                    'type': 'cpu_temperature',
                    'message': f"Temperatura CPU crítica: {cpu_temp}°C",
                    'value': cpu_temp,
                    'threshold': temp_critical
                })
            elif cpu_temp >= temp_warning:
                alerts.append({
                    'level': 'WARNING',
                    'type': 'cpu_temperature',
                    'message': f"Temperatura CPU alta: {cpu_temp}°C",
                    'value': cpu_temp,
                    'threshold': temp_warning
                })
        
        # Verificar uso de CPU
        cpu_percent = diagnostic.get('cpu', {}).get('percent')
        if cpu_percent:
            cpu_warning = self.thresholds.get('cpu_warning', 80)
            cpu_critical = self.thresholds.get('cpu_critical', 95)
            
            if cpu_percent >= cpu_critical:
                alerts.append({
                    'level': 'CRITICAL',
                    'type': 'cpu_usage',
                    'message': f"Uso de CPU crítico: {cpu_percent}%",
                    'value': cpu_percent,
                    'threshold': cpu_critical
                })
            elif cpu_percent >= cpu_warning:
                alerts.append({
                    'level': 'WARNING',
                    'type': 'cpu_usage',
                    'message': f"Uso de CPU alto: {cpu_percent}%",
                    'value': cpu_percent,
                    'threshold': cpu_warning
                })
        
        # Verificar memoria
        memory_percent = diagnostic.get('memory', {}).get('percent')
        if memory_percent:
            mem_warning = self.thresholds.get('memory_warning', 85)
            mem_critical = self.thresholds.get('memory_critical', 95)
            
            if memory_percent >= mem_critical:
                alerts.append({
                    'level': 'CRITICAL',
                    'type': 'memory_usage',
                    'message': f"Uso de memoria crítico: {memory_percent}%",
                    'value': memory_percent,
                    'threshold': mem_critical
                })
            elif memory_percent >= mem_warning:
                alerts.append({
                    'level': 'WARNING',
                    'type': 'memory_usage',
                    'message': f"Uso de memoria alto: {memory_percent}%",
                    'value': memory_percent,
                    'threshold': mem_warning
                })
        
        # Verificar disco
        disk_percent = diagnostic.get('disk', {}).get('percent')
        if disk_percent:
            disk_warning = self.thresholds.get('disk_warning', 85)
            disk_critical = self.thresholds.get('disk_critical', 95)
            
            if disk_percent >= disk_critical:
                alerts.append({
                    'level': 'CRITICAL',
                    'type': 'disk_usage',
                    'message': f"Uso de disco crítico: {disk_percent}%",
                    'value': disk_percent,
                    'threshold': disk_critical
                })
            elif disk_percent >= disk_warning:
                alerts.append({
                    'level': 'WARNING',
                    'type': 'disk_usage',
                    'message': f"Uso de disco alto: {disk_percent}%",
                    'value': disk_percent,
                    'threshold': disk_warning
                })
        
        # Verificar conexiones
        if not self.serial_connected:
            alerts.append({
                'level': 'ERROR',
                'type': 'serial_connection',
                'message': 'Arduino no conectado',
                'value': False
            })
        
        if not self.mqtt_connected:
            alerts.append({
                'level': 'ERROR',
                'type': 'mqtt_connection',
                'message': 'MQTT desconectado',
                'value': False
            })
        
        return alerts
    
    def start(self):
        """
        Inicia el monitoreo del sistema
        """
        if not self.enabled:
            logger.warning("Diagnósticos deshabilitados en configuración")
            return False
        
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        logger.info("Monitoreo del sistema iniciado")
        return True
    
    def stop(self):
        """
        Detiene el monitoreo del sistema
        """
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("Monitoreo del sistema detenido")
    
    def _monitor_loop(self):
        """
        Loop principal de monitoreo
        """
        logger.info("Loop de monitoreo iniciado")
        
        while self.running:
            try:
                # Obtener diagnóstico completo
                diagnostic = self.get_full_diagnostic()
                
                # Actualizar estadísticas
                self.stats['checks_performed'] += 1
                self.stats['last_check_time'] = time.time()
                
                # Verificar umbrales
                alerts = self.check_thresholds(diagnostic)
                
                # Procesar alertas
                if alerts:
                    for alert in alerts:
                        logger.warning(f"Alerta: {alert['message']}")
                        
                        if self.alert_callback:
                            self.alert_callback(alert)
                        
                        self.stats['alerts_sent'] += 1
                
                # Publicar diagnóstico si es tiempo
                current_time = time.time()
                if current_time - self.last_publish >= self.publish_interval:
                    if self.publish_callback:
                        self.publish_callback(diagnostic)
                    
                    self.last_publish = current_time
                    logger.debug("Diagnóstico publicado")
                
                # Esperar antes del próximo check
                time.sleep(self.check_interval)
            
            except Exception as e:
                logger.error(f"Error en loop de monitoreo: {e}")
                time.sleep(5)
    
    def set_serial_status(self, connected: bool):
        """
        Actualiza estado de conexión serial
        
        Args:
            connected: True si está conectado
        """
        if self.serial_connected != connected:
            self.serial_connected = connected
            status = "conectado" if connected else "desconectado"
            logger.info(f"Estado serial actualizado: {status}")
    
    def set_mqtt_status(self, connected: bool):
        """
        Actualiza estado de conexión MQTT
        
        Args:
            connected: True si está conectado
        """
        if self.mqtt_connected != connected:
            self.mqtt_connected = connected
            status = "conectado" if connected else "desconectado"
            logger.info(f"Estado MQTT actualizado: {status}")
    
    def set_alert_callback(self, callback: Callable):
        """
        Establece callback para alertas
        
        Args:
            callback: Función a llamar con las alertas
        """
        self.alert_callback = callback
    
    def set_publish_callback(self, callback: Callable):
        """
        Establece callback para publicar diagnósticos
        
        Args:
            callback: Función a llamar con el diagnóstico
        """
        self.publish_callback = callback
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas del sistema de diagnóstico
        
        Returns:
            Diccionario con estadísticas
        """
        return {
            **self.stats,
            'enabled': self.enabled,
            'running': self.running
        }
    
    def get_summary(self) -> str:
        """
        Obtiene un resumen del estado del sistema
        
        Returns:
            String con resumen formateado
        """
        diagnostic = self.get_full_diagnostic()
        
        cpu = diagnostic['cpu']
        memory = diagnostic['memory']
        disk = diagnostic['disk']
        uptime = diagnostic['uptime']
        
        summary = f"""
╔══════════════════════════════════════════════════════════╗
║         DIAGNÓSTICO SISTEMA RASPBERRY PI                 ║
╠══════════════════════════════════════════════════════════╣
║ CPU:         {cpu.get('percent', 0):5.1f}%   Temp: {cpu.get('temperature', 0):4.1f}°C          ║
║ Memoria:     {memory.get('percent', 0):5.1f}%   Libre: {memory.get('available_mb', 0):6.0f} MB      ║
║ Disco:       {disk.get('percent', 0):5.1f}%   Libre: {disk.get('free_gb', 0):6.2f} GB      ║
║ Uptime:      {uptime.get('formatted', 'N/A'):35s}    ║
║ Serial:      {'✓ Conectado' if self.serial_connected else '✗ Desconectado':35s}    ║
║ MQTT:        {'✓ Conectado' if self.mqtt_connected else '✗ Desconectado':35s}    ║
╚══════════════════════════════════════════════════════════╝
        """
        
        return summary.strip()


# Ejemplo de uso
if __name__ == "__main__":
    logger.add("logs/diagnostics.log", rotation="10 MB")
    
    # Crear instancia
    diagnostics = SystemDiagnostics()
    
    # Callbacks
    def on_alert(alert):
        print(f"⚠️  ALERTA: {alert['message']}")
    
    def on_publish(diagnostic):
        print("📊 Diagnóstico publicado")
    
    diagnostics.set_alert_callback(on_alert)
    diagnostics.set_publish_callback(on_publish)
    
    # Simular conexiones
    diagnostics.set_serial_status(True)
    diagnostics.set_mqtt_status(True)
    
    # Iniciar monitoreo
    diagnostics.start()
    
    try:
        while True:
            # Mostrar resumen cada 10 segundos
            print(diagnostics.get_summary())
            time.sleep(10)
    
    except KeyboardInterrupt:
        print("\nDeteniendo...")
        diagnostics.stop()
