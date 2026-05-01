# 🚀 Inicio Rápido - Sistema SCADA Completo

Guía rápida para levantar el sistema SCADA completo: Raspberry Pi Gateway + Backend + Frontend + MQTT Broker.

---

## 📋 Arquitectura del Sistema

```
┌─────────────┐      USB Serial      ┌──────────────────┐
│   Arduino   │ ◄──────────────────► │  Raspberry Pi 4  │
│  (Hardware) │                       │    (Gateway)     │
└─────────────┘                       └────────┬─────────┘
                                               │
                                          MQTT (1883)
                                               │
                                               ▼
                     ┌─────────────────────────────────────────┐
                     │         PC/Servidor (Docker)            │
                     │  ┌──────────────────────────────────┐   │
                     │  │      Mosquitto MQTT Broker       │   │
                     │  │         (puerto 1883)            │   │
                     │  └───────────┬──────────────────────┘   │
                     │              │                           │
                     │  ┌───────────┴─────────┬────────────┐   │
                     │  │                     │            │   │
                     │  ▼                     ▼            ▼   │
                     │ Backend            Frontend     PostgreSQL │
                     │ Django             React          (DB)   │
                     │ (8000)            (5173)        (5432)   │
                     └─────────────────────────────────────────┘
```

---

## 🖥️ PARTE 1: PC/Servidor (Docker)

### 1.1 Prerequisitos
```bash
# Instalar Docker Desktop
# Windows: https://www.docker.com/products/docker-desktop/
# Linux: sudo apt install docker.io docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

### 1.2 Configurar Mosquitto MQTT
```powershell
# Ejecutar script de configuración (Windows)
cd D:\Escuela\Proyectos\IC2-IC3
.\mosquitto\setup.ps1

# Linux/Mac
chmod +x mosquitto/setup.sh
./mosquitto/setup.sh
```

**Anotar la IP mostrada**, ejemplo: `192.168.1.100`

### 1.3 Levantar todos los servicios
```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar servicios
docker-compose ps
```

### 1.4 Verificar servicios activos
```bash
✅ Frontend:  http://localhost:5173
✅ Backend:   http://localhost:8000
✅ Admin:     http://localhost:8000/admin
✅ MQTT:      localhost:1883
✅ PostgreSQL: localhost:5432
```

---

## 🔧 PARTE 2: Raspberry Pi 4 (Gateway)

### 2.1 Prerequisitos en Raspberry Pi
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python 3.9+
python3 --version
```

### 2.2 Instalar Gateway automáticamente
```bash
cd /home/pi
git clone https://github.com/TU_USUARIO/IC2-IC3.git
cd IC2-IC3/control/raspberry_gateway

# Ejecutar instalador
sudo ./install.sh
```

### 2.3 Configurar conexión MQTT
```bash
# Editar configuración
sudo nano /opt/scada_gateway/config.yaml
```

**Actualizar con la IP de tu PC:**
```yaml
mqtt:
  broker: "192.168.1.100"  # ← IP de tu PC (de paso 1.2)
  port: 1883
  username: "scada_user"   # Si habilitaste autenticación
  password: "tu_password"  # Si habilitaste autenticación
```

### 2.4 Iniciar Gateway
```bash
# Iniciar servicio
sudo systemctl start raspberry_gateway

# Ver estado
sudo systemctl status raspberry_gateway

# Ver logs en tiempo real
sudo journalctl -u raspberry_gateway -f

# Habilitar autoarranque
sudo systemctl enable raspberry_gateway
```

### 2.5 Verificar conexión
```bash
# Verificar conectividad con PC
ping 192.168.1.100

# Probar puerto MQTT
nc -zv 192.168.1.100 1883

# Debe mostrar: Connection to 192.168.1.100 1883 port [tcp/*] succeeded!
```

---

## 🧪 PARTE 3: Verificación del Sistema

### 3.1 Probar comunicación MQTT

**En la PC:**
```bash
# Suscribirse a todos los topics
mosquitto_sub -h localhost -p 1883 -t '#' -v

# Deberías ver mensajes del Gateway llegando
```

**En la Raspberry Pi:**
```bash
# Publicar mensaje de prueba
mosquitto_pub -h 192.168.1.100 -p 1883 -t 'scada/planta1/test' -m 'Hola desde RPi'
```

### 3.2 Verificar Arduino
```bash
# En Raspberry Pi - Ver puerto serial
ls -l /dev/ttyACM* /dev/ttyUSB*

# Ver logs del gateway para confirmar conexión
sudo journalctl -u raspberry_gateway -f | grep -i "serial\|arduino"
```

### 3.3 Ver datos en Frontend
1. Abrir navegador: `http://localhost:5173` (o IP de tu PC)
2. Verificar dashboard muestra datos en tiempo real
3. Verificar conexión MQTT activa (indicador verde)

---

## 🛠️ Troubleshooting

### Problema: Raspberry Pi no se conecta al MQTT

**Verificar firewall en PC:**
```powershell
# Windows - Permitir puerto 1883
# Panel de Control → Firewall → Reglas de entrada
# Agregar regla: Puerto TCP 1883

# Linux
sudo ufw allow 1883/tcp
sudo ufw reload
```

**Verificar IP correcta:**
```bash
# En PC
ipconfig          # Windows
ip addr show      # Linux
```

### Problema: Arduino no detectado

```bash
# Ver dispositivos USB
lsusb

# Dar permisos
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyACM0

# Reiniciar servicio
sudo systemctl restart raspberry_gateway
```

### Problema: Frontend no carga datos

```bash
# Verificar backend está corriendo
docker-compose ps backend

# Ver logs de backend
docker-compose logs backend

# Verificar conexión MQTT del backend
docker-compose logs mosquitto
```

---

## 📊 Comandos Útiles

### Docker (PC)
```bash
# Detener todo
docker-compose down

# Reiniciar un servicio
docker-compose restart backend

# Ver logs específicos
docker-compose logs -f mosquitto

# Limpiar todo y reconstruir
docker-compose down -v
docker-compose up -d --build
```

### Raspberry Pi
```bash
# Ver estado del gateway
sudo systemctl status raspberry_gateway

# Reiniciar gateway
sudo systemctl restart raspberry_gateway

# Ver logs
sudo journalctl -u raspberry_gateway -n 100

# Editar configuración
sudo nano /opt/scada_gateway/config.yaml

# Después de editar, reiniciar
sudo systemctl restart raspberry_gateway
```

---

## 📚 Documentación Adicional

- **Backend Django:** `mysite/README_BACKEND.md`
- **Frontend React:** `scada-ui/README.md`
- **Gateway Raspberry:** `control/raspberry_gateway/README.md`
- **MQTT Broker:** `mosquitto/README.md`
- **Protocolo MQTT:** `control/raspberry_gateway/docs/PROTOCOLO_MQTT.md`

---

## ✅ Checklist de Inicio

- [ ] Docker instalado y corriendo
- [ ] `docker-compose up -d` ejecutado exitosamente
- [ ] Mosquitto configurado (setup.ps1/setup.sh ejecutado)
- [ ] IP del PC anotada
- [ ] Raspberry Pi conectada a la red
- [ ] Gateway instalado en Raspberry (`install.sh`)
- [ ] `config.yaml` actualizado con IP correcta
- [ ] Servicio `raspberry_gateway` iniciado
- [ ] Arduino conectado a Raspberry vía USB
- [ ] Frontend accesible en http://localhost:5173
- [ ] Backend accesible en http://localhost:8000
- [ ] Datos llegando desde Raspberry visible en MQTT/Frontend

---

## 🚀 ¡Listo!

Si completaste todos los pasos, tu sistema SCADA debería estar:
- ✅ Recibiendo datos del Arduino
- ✅ Procesando en Raspberry Pi
- ✅ Enviando vía MQTT al servidor
- ✅ Mostrando en tiempo real en la interfaz web

**¡Felicidades! Tu sistema SCADA está operativo.**
