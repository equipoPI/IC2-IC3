# Guía de Migración: Bluetooth → Serial + MQTT

## 📋 Resumen de Cambios

Este documento explica cómo migrar del sistema original con comunicación Bluetooth a la nueva arquitectura con Raspberry Pi como gateway.

### Arquitectura Original
```
┌─────────────┐         Bluetooth         ┌──────────────┐
│   Arduino   │ ←──────────────────────→  │  App Móvil   │
│  (Sistema   │         (HC-05)            │  (Android)   │
│   SCADA)    │                            │              │
└─────────────┘                            └──────────────┘
```

### Nueva Arquitectura
```
┌─────────────┐    Serial USB    ┌────────────────┐    MQTT     ┌──────────────┐
│   Arduino   │ ←──────────────→ │  Raspberry Pi  │ ←─────────→ │   App Web    │
│             │                   │   (Gateway)    │             │  (React +    │
│             │                   │                │             │   Django)    │
└─────────────┘                   └────────────────┘             └──────────────┘
                                   │                │
                                   │  SQLite Local  │
                                   │  (Historial)   │
                                   └────────────────┘
```

## 🔄 Cambios en el Hardware

### 1. Remover Módulo Bluetooth HC-05

**Pasos:**
1. Apagar Arduino
2. Desconectar módulo HC-05 de los pines 11 y 12
3. Estos pines quedan disponibles para otros usos

### 2. Conexión USB Arduino ↔ Raspberry Pi

**Materiales necesarios:**
- Cable USB tipo A a B (estándar Arduino)
- Raspberry Pi 4 (recomendado 2GB RAM mínimo)
- Fuente de alimentación Raspberry Pi

**Conexión:**
1. Conectar Arduino a puerto USB de Raspberry Pi
2. Verificar que aparezca como `/dev/ttyACM0` o `/dev/ttyUSB0`
3. No se necesitan pines adicionales

## 💻 Cambios en el Código Arduino

### Modificaciones Principales

#### Antes (Bluetooth):
```cpp
#include <SoftwareSerial.h>

int BT_Rx = 12;
int BT_Tx = 11;
SoftwareSerial BT(BT_Rx, BT_Tx);

void setup() {
  BT.begin(9600);
  // ...
}

void enviarDatos() {
  BT.print(dato);
  BT.println();
}

void recibirDatos() {
  if (BT.available()) {
    char c = BT.read();
  }
}
```

#### Después (Serial):
```cpp
// No necesita SoftwareSerial

#define RASPBERRY_SERIAL Serial
#define BAUD_RATE 115200

void setup() {
  RASPBERRY_SERIAL.begin(BAUD_RATE);
  RASPBERRY_SERIAL.println("ARDUINO_READY");
  // ...
}

void enviarDatos() {
  RASPBERRY_SERIAL.print(dato);
  RASPBERRY_SERIAL.println();
}

void recibirDatos() {
  if (RASPBERRY_SERIAL.available()) {
    char c = RASPBERRY_SERIAL.read();
  }
}
```

### Ventajas del Cambio

1. **Mayor velocidad**: 115200 baud vs 9600 baud
2. **Más confiable**: Conexión física USB vs inalámbrica
3. **Sin interferencias**: No hay problemas de alcance o interferencia RF
4. **Debugging más fácil**: Serial Monitor sigue disponible en Serial1
5. **Libera pines**: Los pines 11 y 12 quedan disponibles

## 🔌 Protocolo de Comunicación

### Se Mantiene Compatible

El protocolo de comunicación se mantiene **100% compatible** con el original:

#### Formato de Datos (Arduino → Raspberry):
```
average1,porcentaje1,average2,porcentaje2,average3,porcentaje3,
caudal1,caudal2,bomba1,bomba2,bombaM,mezclador,bombaR,
error,horaRest,minRest,proceso
```

#### Comandos (Raspberry → Arduino):
- `R{bombo}{valor}`: Reposición (ej: `R1050`)
- `F`: Frenar reposición
- `D`: Detener mezcla  
- `V`: Vaciar
- `A`: Continuar/Activar
- `H{valor}`: Establecer horas
- `M{valor}`: Establecer minutos
- `L1{valor}`: Líquido 1
- `L2{valor}`: Líquido 2

## 📱 Cambios en la Interfaz de Usuario

### Antes: App Móvil Android (MIT App Inventor)
- Conexión Bluetooth directa
- Control local
- Sin historial persistente
- Alcance limitado (10-15 metros)

### Después: App Web (React + Django)
- Conexión MQTT (Internet)
- Control remoto desde cualquier lugar
- Historial en base de datos
- Múltiples usuarios simultáneos
- Gráficos y analytics avanzados

### Funcionalidades Nuevas

✨ **Lo que se gana:**
- Acceso remoto vía Internet
- Historial de datos (última semana en Raspberry, completo en backend)
- Múltiples usuarios con autenticación
- Gráficos en tiempo real
- Alertas y notificaciones push
- Dashboard con métricas
- Exportación de datos (CSV, Excel)
- API REST para integraciones

❌ **Lo que se pierde:**
- Conexión sin Internet (solucionable con red local)
- App móvil nativa (se puede usar PWA)

## 🚀 Proceso de Migración Paso a Paso

### Fase 1: Preparación (30 minutos)

1. **Backup del sistema actual**
   ```bash
   # En Arduino: Guardar código actual
   # En App: Exportar archivo .aia
   ```

2. **Preparar Raspberry Pi**
   ```bash
   # Instalar Raspberry Pi OS
   # Conectar a red
   # Actualizar sistema
   sudo apt update && sudo apt upgrade -y
   ```

### Fase 2: Instalación Raspberry (20 minutos)

1. **Copiar archivos a Raspberry**
   ```bash
   scp -r raspberry_gateway/ pi@192.168.1.X:/home/pi/
   ```

2. **Ejecutar instalación**
   ```bash
   cd /home/pi/raspberry_gateway
   chmod +x install.sh
   sudo ./install.sh
   ```

3. **Configurar**
   ```bash
   sudo nano /opt/scada_gateway/config.yaml
   # Ajustar broker MQTT, puerto serial, etc.
   ```

### Fase 3: Modificar Arduino (15 minutos)

1. **Cargar nuevo código**
   - Abrir `Sistema_SCADA_Serial.ino`
   - Copiar funciones del código original (nivel, caudal, mezcla, etc.)
   - Compilar y cargar

2. **Verificar conexión**
   ```bash
   # En Raspberry Pi
   ls -la /dev/ttyACM0
   sudo chmod 666 /dev/ttyACM0
   ```

### Fase 4: Pruebas (30 minutos)

1. **Test de componentes**
   ```bash
   cd /opt/scada_gateway
   source venv/bin/activate
   python test_system.py
   ```

2. **Iniciar gateway**
   ```bash
   sudo systemctl start raspberry_gateway
   sudo systemctl status raspberry_gateway
   ```

3. **Verificar logs**
   ```bash
   sudo journalctl -u raspberry_gateway -f
   ```

4. **Test MQTT**
   ```bash
   mosquitto_sub -t "scada/planta1/#" -v
   ```

### Fase 5: Integrar Backend Django (1 hora)

Ver sección de integración con Django más abajo.

## 🔧 Configuración del Broker MQTT

### Opción 1: Mosquitto Local (Raspberry Pi)

```bash
# Ya instalado por install.sh
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# Crear usuario
sudo mosquitto_passwd -c /etc/mosquitto/passwd scada_user

# Configurar
sudo nano /etc/mosquitto/mosquitto.conf
```

Contenido de `mosquitto.conf`:
```conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
```

### Opción 2: Broker en la Nube

Servicios recomendados:
- **HiveMQ Cloud** (gratuito hasta 100 conexiones)
- **CloudMQTT** (gratuito con limitaciones)
- **AWS IoT Core** (pago)

## 🔗 Integración con Backend Django

### 1. Instalar Cliente MQTT en Django

```bash
cd mysite
source venv/bin/activate
pip install paho-mqtt
```

### 2. Crear Servicio MQTT en Django

Crear `mysite/polls/mqtt_service.py`:

```python
import paho.mqtt.client as mqtt
import json
from .models import Fabrica, DispositivoSCADA

class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        
    def connect(self, broker, port, username, password):
        self.client.username_pw_set(username, password)
        self.client.connect(broker, port)
        self.client.loop_start()
    
    def on_connect(self, client, userdata, flags, rc):
        client.subscribe("scada/planta1/#")
    
    def on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = json.loads(msg.payload)
        
        # Guardar en base de datos
        # ... lógica de guardado
```

### 3. Iniciar Servicio en Django

En `mysite/mysite/apps.py`:

```python
from django.apps import AppConfig

class MysiteConfig(AppConfig):
    name = 'mysite'
    
    def ready(self):
        from polls.mqtt_service import MQTTService
        mqtt = MQTTService()
        mqtt.connect('localhost', 1883, 'scada_user', 'password')
```

## 📊 Migración de Datos Históricos

### Si tienes datos guardados en la App:

1. **Exportar desde App** (si es posible)
2. **Importar a Django**:

```python
# Script de importación
import csv
from polls.models import DispositivoSCADA

with open('datos_historicos.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Crear registros en Django
        ...
```

## 🔒 Seguridad

### Cambios de Seguridad

✅ **Mejoras:**
- Autenticación de usuarios
- Credenciales MQTT
- Cifrado TLS/SSL (opcional)
- Control de acceso por roles

⚠️ **Consideraciones:**
- Cambiar contraseñas por defecto
- Configurar firewall en Raspberry Pi
- Usar HTTPS en producción
- Credenciales en variables de entorno

## 📈 Monitoreo y Mantenimiento

### Comandos Útiles

```bash
# Estado del servicio
sudo systemctl status raspberry_gateway

# Ver logs en tiempo real
sudo journalctl -u raspberry_gateway -f

# Reiniciar
sudo systemctl restart raspberry_gateway

# Diagnóstico completo
./check_status.sh

# Backup de base de datos
cp /opt/scada_gateway/data/scada_local.db ~/backup_$(date +%Y%m%d).db
```

## 🐛 Troubleshooting

### Problema: Arduino no detectado

```bash
# Listar dispositivos USB
lsusb
ls -la /dev/tty*

# Verificar permisos
sudo usermod -a -G dialout $USER
newgrp dialout
```

### Problema: MQTT no conecta

```bash
# Verificar Mosquitto
sudo systemctl status mosquitto

# Test manual
mosquitto_pub -t test -m "hello"
mosquitto_sub -t test
```

### Problema: Gateway no inicia

```bash
# Ver errores
sudo journalctl -u raspberry_gateway -n 50

# Test manual
cd /opt/scada_gateway
source venv/bin/activate
python src/gateway_main.py
```

## 📚 Recursos Adicionales

- [Documentación MQTT](https://mqtt.org/)
- [Paho MQTT Python](https://www.eclipse.org/paho/index.php?page=clients/python/index.php)
- [Django Channels (WebSockets)](https://channels.readthedocs.io/)
- [React MQTT](https://github.com/mqttjs/MQTT.js)

## ✅ Checklist de Migración

- [ ] Backup del código Arduino original
- [ ] Backup de la app móvil (.aia)
- [ ] Raspberry Pi configurada y actualizada
- [ ] Gateway instalado en Raspberry Pi
- [ ] Código Arduino modificado y cargado
- [ ] Conexión Serial verificada
- [ ] Broker MQTT configurado
- [ ] Gateway iniciado y funcionando
- [ ] Backend Django conectado a MQTT
- [ ] Frontend React funcionando
- [ ] Pruebas de extremo a extremo exitosas
- [ ] Documentación actualizada
- [ ] Sistema en producción

## 🎉 Conclusión

Una vez completada la migración, tendrás un sistema SCADA moderno, escalable y con capacidades IoT completas, manteniendo toda la funcionalidad original y agregando muchas funcionalidades nuevas.

**Tiempo estimado total de migración: 2-3 horas**
