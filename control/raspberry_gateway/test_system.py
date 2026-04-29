"""
Script de prueba para verificar todos los componentes del sistema
"""

import sys
import time
from loguru import logger

# Configurar logger para consola
logger.remove()
logger.add(sys.stdout, format="{time:HH:mm:ss} | {level: <8} | {message}", level="INFO")

print("=" * 60)
print("PRUEBA DE COMPONENTES DEL GATEWAY")
print("=" * 60)
print()

# Test 1: Importar módulos
print("Test 1: Importando módulos...")
try:
    from arduino_serial import ArduinoSerial
    from mqtt_client import MQTTClient
    from data_storage import DataStorage
    from system_diagnostics import SystemDiagnostics
    print("✅ Todos los módulos importados correctamente")
except ImportError as e:
    print(f"❌ Error importando módulos: {e}")
    sys.exit(1)
print()

# Test 2: Configuración
print("Test 2: Verificando configuración...")
try:
    import yaml
    with open("config.yaml", 'r') as f:
        config = yaml.safe_load(f)
    print("✅ Archivo de configuración cargado")
    print(f"   - Puerto serial: {config['serial']['port']}")
    print(f"   - Broker MQTT: {config['mqtt']['broker']}:{config['mqtt']['port']}")
    print(f"   - Base de datos: {config['database']['path']}")
except Exception as e:
    print(f"❌ Error leyendo configuración: {e}")
    sys.exit(1)
print()

# Test 3: Base de datos
print("Test 3: Probando base de datos...")
try:
    storage = DataStorage()
    
    # Guardar medición de prueba
    test_data = {
        'timestamp': time.time(),
        'nivel_bombo1': 50.0,
        'porcentaje_bombo1': 50,
        'error': 0,
        'raw': 'test'
    }
    storage.save_measurement(test_data)
    
    # Leer mediciones
    measurements = storage.get_measurements(limit=1)
    
    if len(measurements) > 0:
        print("✅ Base de datos funcionando correctamente")
        print(f"   - Registros almacenados: {len(measurements)}")
    else:
        print("⚠️  Base de datos creada pero sin datos previos")
except Exception as e:
    print(f"❌ Error en base de datos: {e}")
print()

# Test 4: Diagnósticos del sistema
print("Test 4: Probando sistema de diagnóstico...")
try:
    diagnostics = SystemDiagnostics()
    diag_data = diagnostics.get_full_diagnostic()
    
    print("✅ Sistema de diagnóstico funcionando")
    print(f"   - CPU: {diag_data['cpu']['percent']}%")
    print(f"   - Memoria: {diag_data['memory']['percent']}%")
    print(f"   - Disco: {diag_data['disk']['percent']}%")
    
    if diag_data['cpu'].get('temperature'):
        print(f"   - Temperatura: {diag_data['cpu']['temperature']}°C")
except Exception as e:
    print(f"❌ Error en diagnósticos: {e}")
print()

# Test 5: Cliente MQTT (solo verificar que se puede crear)
print("Test 5: Verificando cliente MQTT...")
try:
    mqtt_client = MQTTClient()
    print("✅ Cliente MQTT creado")
    print(f"   - Broker: {mqtt_client.broker}:{mqtt_client.port}")
    print(f"   - Base topic: {mqtt_client.base_topic}")
    print("   ⚠️  No se intenta conectar para no fallar si el broker no está disponible")
except Exception as e:
    print(f"❌ Error creando cliente MQTT: {e}")
print()

# Test 6: Comunicación serial (solo verificar que se puede crear)
print("Test 6: Verificando módulo serial...")
try:
    arduino = ArduinoSerial()
    print("✅ Módulo serial creado")
    print(f"   - Puerto configurado: {arduino.port}")
    print(f"   - Baudrate: {arduino.baudrate}")
    print("   ⚠️  No se intenta conectar para no interferir con el servicio")
except Exception as e:
    print(f"❌ Error creando módulo serial: {e}")
print()

# Test 7: Permisos
print("Test 7: Verificando permisos...")
try:
    import os
    
    # Verificar permisos de escritura en directorios
    test_dirs = ['logs', 'data', 'backups']
    for dir_name in test_dirs:
        if not os.path.exists(dir_name):
            os.makedirs(dir_name)
        
        test_file = os.path.join(dir_name, 'test.tmp')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
    
    print("✅ Permisos de escritura correctos")
except Exception as e:
    print(f"❌ Error de permisos: {e}")
print()

# Test 8: Dependencias
print("Test 8: Verificando dependencias Python...")
missing = []
try:
    import serial
    import paho.mqtt.client
    import psutil
    import sqlalchemy
    import yaml
    import loguru
    print("✅ Todas las dependencias instaladas")
except ImportError as e:
    print(f"❌ Falta dependencia: {e}")
print()

print("=" * 60)
print("PRUEBA COMPLETADA")
print("=" * 60)
print()
print("Si todos los tests pasaron, el sistema está listo para ejecutarse.")
print("Para iniciar el gateway: sudo systemctl start raspberry_gateway")
print()
