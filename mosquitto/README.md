# Mosquitto MQTT Broker - Sistema SCADA

Broker MQTT centralizado para comunicación entre Raspberry Pi Gateway y la aplicación web.

## 🚀 Inicio Rápido

### Levantar el broker
```bash
docker-compose up -d mosquitto
```

### Ver logs
```bash
docker-compose logs -f mosquitto
```

### Verificar estado
```bash
docker-compose ps mosquitto
```

---

## 📡 Conexión desde Raspberry Pi

### 1. Averiguar IP de la PC
```bash
# Windows
ipconfig

# Linux/Mac
ip addr show
# o
ifconfig
```

**Ejemplo:** `192.168.1.100`

### 2. Actualizar configuración del Gateway

Editar `control/raspberry_gateway/config.yaml`:

```yaml
mqtt:
  broker: "192.168.1.100"  # IP de tu PC
  port: 1883
  username: ""  # Vacío si allow_anonymous=true
  password: ""
```

### 3. Reiniciar Gateway
```bash
sudo systemctl restart raspberry_gateway
```

---

## 🔒 Habilitar Autenticación (Recomendado para producción)

### 1. Crear usuario y contraseña
```bash
# Crear usuario 'scada_user' con contraseña
docker-compose exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd scada_user

# Agregar más usuarios (sin -c para no sobrescribir)
docker-compose exec mosquitto mosquitto_passwd /mosquitto/config/passwd otro_usuario
```

### 2. Editar mosquitto.conf
Descomentar estas líneas en `mosquitto/config/mosquitto.conf`:
```conf
allow_anonymous false
password_file /mosquitto/config/passwd
```

### 3. Reiniciar broker
```bash
docker-compose restart mosquitto
```

### 4. Actualizar clientes
Actualizar `config.yaml` en Raspberry Pi:
```yaml
mqtt:
  broker: "192.168.1.100"
  username: "scada_user"
  password: "tu_contraseña_segura"
```

---

## 🧪 Probar conexión

### Desde la PC (usando mosquitto_pub/sub)

**Instalar cliente (opcional):**
```bash
# Windows (con Chocolatey)
choco install mosquitto

# Linux
sudo apt install mosquitto-clients

# Mac
brew install mosquitto
```

**Suscribirse a todos los topics:**
```bash
mosquitto_sub -h localhost -p 1883 -t '#' -v
```

**Publicar mensaje de prueba:**
```bash
mosquitto_pub -h localhost -p 1883 -t 'test/mensaje' -m 'Hola SCADA'
```

**Con autenticación:**
```bash
mosquitto_sub -h localhost -p 1883 -u scada_user -P tu_contraseña -t '#' -v
```

### Desde Raspberry Pi

**Verificar conectividad:**
```bash
# Ping a la PC
ping 192.168.1.100

# Probar puerto MQTT
nc -zv 192.168.1.100 1883
```

**Publicar desde Raspberry:**
```bash
mosquitto_pub -h 192.168.1.100 -p 1883 -t 'scada/planta1/test' -m 'Hola desde RPi'
```

---

## 📊 Topics SCADA

### Estructura de topics
```
scada/
└── planta1/
    ├── sensores/
    │   ├── nivel/
    │   │   ├── bombo1
    │   │   ├── bombo2
    │   │   └── mezcla
    │   ├── caudal/
    │   │   ├── 1
    │   │   └── 2
    │   └── temperatura/
    │       └── mezcla
    ├── actuadores/
    │   ├── bomba1
    │   ├── bomba2
    │   ├── bomba_mezcla
    │   ├── mezclador
    │   └── bomba_reposicion
    ├── comandos/
    │   ├── reposicion
    │   ├── mezcla
    │   └── control
    ├── alarmas
    ├── estado/
    │   └── general
    └── diagnostico
```

### Ejemplos de mensajes

**Raspberry → App (Publicación):**
```json
// Topic: scada/planta1/sensores/nivel/bombo1
{
  "valor": 75.5,
  "unidad": "%",
  "timestamp": "2026-05-01T14:30:00Z"
}
```

**App → Raspberry (Comando):**
```json
// Topic: scada/planta1/comandos/reposicion
{
  "accion": "iniciar",
  "bombo": 1,
  "cantidad": 500,
  "unidad": "L"
}
```

---

## 🛠️ Troubleshooting

### El broker no inicia
```bash
# Ver logs detallados
docker-compose logs mosquitto

# Verificar permisos
sudo chown -R 1883:1883 mosquitto/data mosquitto/log
```

### Raspberry no se conecta
```bash
# Verificar firewall en PC
# Windows: Permitir puerto 1883 en Firewall
# Linux:
sudo ufw allow 1883/tcp

# Verificar IP
docker-compose exec mosquitto cat /mosquitto/config/mosquitto.conf | grep listener
```

### Problemas de autenticación
```bash
# Listar usuarios
docker-compose exec mosquitto cat /mosquitto/config/passwd

# Resetear contraseña
docker-compose exec mosquitto mosquitto_passwd /mosquitto/config/passwd scada_user
```

---

## 📈 Monitoreo

### Ver estadísticas del broker
```bash
# Suscribirse a topics de sistema
mosquitto_sub -h localhost -p 1883 -t '$SYS/#' -v

# Ver clientes conectados
mosquitto_sub -h localhost -p 1883 -t '$SYS/broker/clients/connected' -v

# Ver tasa de mensajes
mosquitto_sub -h localhost -p 1883 -t '$SYS/broker/messages/sent' -v
```

### WebSocket (puerto 9001)
Puedes conectarte desde el navegador usando librerías como MQTT.js:
```javascript
const client = mqtt.connect('ws://localhost:9001', {
  clientId: 'web-client-' + Math.random().toString(16).substr(2, 8)
});
```

---

## 🔐 Seguridad en Producción

1. **Habilitar autenticación** (ver sección arriba)
2. **Usar TLS/SSL:**
   ```conf
   listener 8883
   cafile /mosquitto/config/certs/ca.crt
   certfile /mosquitto/config/certs/server.crt
   keyfile /mosquitto/config/certs/server.key
   ```
3. **Configurar ACL** para control de acceso por topic
4. **Firewall:** Limitar acceso solo a IPs conocidas
5. **Cambiar puerto por defecto** si es accesible desde internet

---

## 📚 Referencias

- [Mosquitto Documentation](https://mosquitto.org/documentation/)
- [MQTT Protocol](https://mqtt.org/)
- [Eclipse Mosquitto Docker](https://hub.docker.com/_/eclipse-mosquitto)
