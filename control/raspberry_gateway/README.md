# Raspberry Pi Gateway - Sistema SCADA

Sistema intermediario entre Arduino y la aplicación web mediante MQTT, reemplazando la comunicación Bluetooth original.

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐          Serial          ┌──────────────────────┐          MQTT           ┌─────────────────┐
│                 │  ────────────────────>   │                      │  ────────────────────>  │                 │
│     Arduino     │                           │   Raspberry Pi 4     │                          │   App Web       │
│   (Hardware)    │  <────────────────────   │     (Gateway)        │  <────────────────────  │   (Frontend)    │
└─────────────────┘                           └──────────────────────┘                          └─────────────────┘
                                               │                      │
                                               │  Base de Datos Local │
                                               │    (Última semana)   │
                                               └──────────────────────┘
```

## 📦 Componentes

### 1. **arduino_serial.py**
- Comunicación serial bidireccional con Arduino
- Parseo de datos del protocolo original (Sistema_SCADA)
- Reconexión automática en caso de fallo
- Buffer de comandos

### 2. **mqtt_client.py**
- Cliente MQTT (publicación/suscripción)
- Tópicos organizados por función
- Manejo de QoS y retain messages
- Reconexión automática

### 3. **data_storage.py**
- Base de datos SQLite local
- Almacenamiento de última semana
- Limpieza automática de datos antiguos
- Respaldo y consultas históricas

### 4. **system_diagnostics.py**
- Monitoreo de recursos (CPU, RAM, temperatura)
- Estado de conexiones (Serial, MQTT, Red)
- Logs del sistema
- Alertas automáticas

### 5. **gateway_main.py**
- Orquestador principal
- Gestión de hilos para componentes
- Manejo de errores y recuperación
- API REST local para configuración

## 📋 Requisitos

### Hardware
- Raspberry Pi 4 (2GB RAM mínimo)
- Arduino conectado vía USB
- Conexión a red (Ethernet o WiFi)

### Software
```bash
Python 3.9+
pyserial>=3.5
paho-mqtt>=1.6.1
fastapi>=0.104.0
uvicorn>=0.24.0
psutil>=5.9.0
sqlalchemy>=2.0.0
```

## 🚀 Instalación

### 1. Configurar Raspberry Pi
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias del sistema
sudo apt install -y python3-pip python3-venv git

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias Python
pip install -r requirements.txt
```

### 2. Configurar permisos serial
```bash
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyACM0  # o /dev/ttyUSB0
```

### 3. Configurar como servicio (autoarranque)
```bash
sudo cp raspberry_gateway.service /etc/systemd/system/
sudo systemctl enable raspberry_gateway
sudo systemctl start raspberry_gateway

## 📁 Base de datos local (data/scada_local.db)

El gateway utiliza una base de datos SQLite local para almacenar mediciones, eventos, alarmas, diagnósticos y comandos cuando se ejecuta en la Raspberry.

- Ruta por defecto (configurable en `config.yaml`): `./data/scada_local.db`.
- Gestionada por `control/raspberry_gateway/src/data_storage.py` (tablas: `mediciones`, `eventos`, `alarmas`, `diagnostico`, `comandos`).

Recomendaciones:

- No versionar el fichero de base de datos. Está ignorado por `.gitignore` con la regla `data/*.db`.
- En Raspberry Pi se recomienda ubicar la base de datos en `control/raspberry_gateway/data/` o en `/var/lib/scada_gateway/data/` y actualizar `config.yaml` con la ruta absoluta.
- Hacer backups periódicos antes de cambios importantes. Ver `control/raspberry_gateway/scripts/backup_db.sh`.

### Backup rápido

Script de ejemplo incluido: `control/raspberry_gateway/scripts/backup_db.sh`.

Ejecutar:

```bash
bash control/raspberry_gateway/scripts/backup_db.sh
```

```

## ⚙️ Configuración

Editar `config.yaml`:

```yaml
serial:
  port: "/dev/ttyACM0"
  baudrate: 9600
  timeout: 1.0
  reconnect_delay: 5

mqtt:
  broker: "mqtt.ejemplo.com"
  port: 1883
  username: "scada_user"
  password: "secure_password"
  client_id: "raspberry_scada_gateway"
  topics:
    base: "scada/planta1"

database:
  path: "./data/scada_local.db"
  retention_days: 7
  backup_enabled: true
  backup_interval_hours: 24

diagnostics:
  enabled: true
  check_interval: 60
  temp_threshold: 70
  cpu_threshold: 80
  memory_threshold: 90

logging:
  level: "INFO"
  file: "./logs/gateway.log"
  max_size_mb: 100
  backup_count: 5
```

## 🔌 Protocolo de Comunicación

### Serial (Arduino → Raspberry)
Formato: Mismo que Sistema_SCADA original
```
average1,constrainedPorcentaje1,average2,constrainedPorcentaje2,average3,constrainedPorcentaje3,cantidad1,cantidad2,EBomba1,EBomba2,EBombaM,EMezclador,EBombaR,error,horaRest,minRest,EProceso
```

### Serial (Raspberry → Arduino)
Comandos compatibles con Sistema_SCADA:
- `R{valor}`: Reposición (ej: `R1050` = Bombo 1, 50%)
- `F`: Frenar reposición
- `D`: Detener mezcla
- `V`: Vaciar
- `A`: Continuar
- `H{hora}`: Establecer hora
- `M{minuto}`: Establecer minuto
- `L1{valor}`: Líquido 1
- `L2{valor}`: Líquido 2

### MQTT Topics

#### Estructura Estándar (Recomendada)
```
{tenant}/{gateway_id}/{seccion}/{sistema}/{variable}
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/nivel_bombo1
```

#### Publicación - Telemetría (Raspberry → App Web)
```
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/nivel_bombo1    # Nivel bombo 1
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/nivel_bombo2    # Nivel bombo 2
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/nivel_mezcla    # Nivel mezcla
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/caudal_1        # Caudal líquido 1
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/caudal_2        # Caudal líquido 2
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/bomba1        # Estado bomba 1
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/bomba2        # Estado bomba 2
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/bomba_mezcla  # Estado bomba mezcla
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/mezclador     # Estado mezclador
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/bomba_repo    # Estado bomba reposición
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/proceso/tiempo_restante  # Tiempo restante
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/alarmas                  # Alarmas y errores
Rafaela_S.A/d83add60dbb0/status                                         # Estado online/offline del gateway
```

#### Suscripción - Comandos (App Web → Raspberry)
**Formato único de comandos:**
```
Rafaela_S.A/d83add60dbb0/cmd/{seccion}/{sistema}/{accion}

Ejemplos:
Rafaela_S.A/d83add60dbb0/cmd/A1/linea_mezclado_1/reposicion     # Comando de reposición
Rafaela_S.A/d83add60dbb0/cmd/A1/linea_mezclado_1/detener        # Detener mezcla
Rafaela_S.A/d83add60dbb0/cmd/A1/linea_mezclado_1/reanudar       # Reanudar mezcla
Rafaela_S.A/d83add60dbb0/cmd/A1/linea_mezclado_1/vaciar         # Vaciar
Rafaela_S.A/d83add60dbb0/cmd/A1/linea_mezclado_1/desechar       # Desechar
```

#### Acciones Soportadas en /cmd/
```yaml
reposicion:     # Reposición de bombos (requiere: bombo, limite_porcentaje)
freno_reposicion: # Detener reposición
detener:        # Detener/pausar mezcla
reanudar:       # Reanudar mezcla
vaciar:         # Vaciar contenedor mezcla
desechar:       # Desechar mezcla
continuar:      # Alias de reanudar
frenar:         # Alias de freno_reposicion
```

#### 🚫 Topics Legacy (DEPRECADOS - No usar)
```yaml
# DESCONTINUADOS A PARTIR DE 2024:
scada/planta1/*                         # (Base legacy deshabilitada)
{tenant}/{gateway_id}/cmd/{accion}      # (Usar estructura con sector/sistema)
{tenant}/{gateway_id}/cmd/{numero_serie} # (Usar sector/sistema en su lugar)
```

## 📊 Base de Datos Local

### Tablas principales:
- `mediciones`: Todos los datos de sensores
- `eventos`: Cambios de estado, comandos ejecutados
- `alarmas`: Registro de alarmas y errores
- `diagnostico`: Estado del sistema Raspberry
- `comandos`: Log de comandos enviados al Arduino

### Ejemplo de consulta histórica:
```python
# Obtener datos de las últimas 24 horas
db.get_measurements(
    start_time=datetime.now() - timedelta(hours=24),
    end_time=datetime.now(),
    sensors=['nivel_bombo1', 'caudal_1']
)
```

## 🧪 Testing

```bash
# Test de conexión serial
python tests/test_serial.py

# Test de conexión MQTT
python tests/test_mqtt.py

# Test de base de datos
python tests/test_database.py

# Test integración completa
python tests/test_integration.py
```

## 🐛 Troubleshooting

### Arduino no detectado
```bash
# Listar puertos disponibles
ls /dev/tty*

# Ver dispositivos USB
lsusb

# Ver logs del sistema
sudo journalctl -u raspberry_gateway -f
```

### Problemas de conexión MQTT
```bash
# Test manual de MQTT con nueva estructura
mosquitto_sub -h 192.168.137.1 -t "Rafaela_S.A/d83add60dbb0/#" -v

# Enviar comando de prueba (reposición)
mosquitto_pub -h 192.168.137.1 -t "Rafaela_S.A/d83add60dbb0/cmd/A1/linea_mezclado_1/reposicion" \
  -m '{"bombo": 1, "limite_porcentaje": 75}'

# Verificar conexión del gateway
mosquitto_sub -h 192.168.137.1 -t "Rafaela_S.A/d83add60dbb0/status" -v
```

### Alto uso de CPU/Memoria
```bash
# Ver recursos
htop

# Ver temperatura
vcgencmd measure_temp

# Reiniciar servicio
sudo systemctl restart raspberry_gateway
```

## 📝 Logs

Ubicación de logs:
- Gateway principal: `./logs/gateway.log`
- Serial: `./logs/serial.log`
- MQTT: `./logs/mqtt.log`
- Base de datos: `./logs/database.log`
- Diagnóstico: `./logs/diagnostics.log`

## 🔒 Seguridad

- [ ] Cambiar credenciales MQTT por defecto
- [ ] Configurar certificados TLS para MQTT
- [ ] Firewall configurado (solo puertos necesarios)
- [ ] Usuario dedicado sin privilegios root
- [ ] Backups automáticos de base de datos
- [ ] Actualizaciones automáticas de seguridad

## 📚 Documentación Adicional

- [Migración desde Bluetooth](docs/MIGRACION_BLUETOOTH.md)
- [Protocolo MQTT detallado](docs/PROTOCOLO_MQTT.md)
- [API REST local](docs/API_LOCAL.md)
- [Guía de mantenimiento](docs/MANTENIMIENTO.md)

## 🤝 Contribución

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de desarrollo.

## 📄 Licencia

Este proyecto es parte del trabajo académico IC2-IC3.
