# 🚀 Guía de Instalación - Proyecto IC2-IC3 SCADA

## 📋 Índice
1. [Opción A: Docker (Recomendado)](#opción-a-docker-recomendado)
2. [Opción B: Entorno Virtual Python](#opción-b-entorno-virtual-python)
3. [Raspberry Pi Gateway](#raspberry-pi-gateway)
4. [¿Docker o Entorno Virtual?](#docker-vs-entorno-virtual)

---

## 🐳 Opción A: Docker (Recomendado)

### ✅ Ventajas de Docker
- ✅ No necesitas instalar Python, PostgreSQL, Node.js manualmente
- ✅ Mismo entorno en desarrollo y producción
- ✅ No hay conflictos de versiones
- ✅ Todo se instala automáticamente
- ✅ Fácil de compartir y desplegar

### Requisitos Previos
```bash
# Instalar Docker Desktop
# Windows: https://www.docker.com/products/docker-desktop
# Linux: https://docs.docker.com/engine/install/
# Mac: https://www.docker.com/products/docker-desktop

# Verificar instalación
docker --version
docker-compose --version
```

### Instalación con Docker

```bash
# 1. Clonar el proyecto
cd d:\Escuela\Proyectos\IC2-IC3

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Crear superusuario Django (primera vez)
docker-compose exec backend python manage.py createsuperuser

# 4. Aplicar migraciones (primera vez)
docker-compose exec backend python manage.py migrate

# 5. Verificar que todo está corriendo
docker-compose ps
```

### Servicios Disponibles
- **Frontend React**: http://localhost:5173
- **Backend Django**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin
- **PostgreSQL**: localhost:5432

### Comandos Útiles Docker
```bash
# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (⚠️ elimina la base de datos)
docker-compose down -v

# Reconstruir imágenes
docker-compose up --build

# Entrar al contenedor backend
docker-compose exec backend bash

# Ejecutar comandos Django
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py shell
```

### ⚠️ Con Docker NO necesitas:
- ❌ Crear entorno virtual Python
- ❌ Instalar requirements.txt manualmente
- ❌ Instalar PostgreSQL
- ❌ Instalar Node.js
- ❌ Configurar puertos manualmente

---

## 🐍 Opción B: Entorno Virtual Python (Sin Docker)

### ⚠️ Cuándo usar esta opción
- Solo para desarrollo local sin Docker
- Debugging más directo
- Menos recursos del sistema

### Requisitos Previos
```bash
# Instalar Python 3.10+
python --version  # Debe ser >= 3.10

# Instalar PostgreSQL 15
# Windows: https://www.postgresql.org/download/windows/
# Linux: sudo apt install postgresql-15

# Instalar Node.js 18+
node --version  # Debe ser >= 18
npm --version
```

### Instalación Backend Django

```bash
# 1. Crear entorno virtual
cd d:\Escuela\Proyectos\IC2-IC3\mysite
python -m venv venv

# 2. Activar entorno virtual
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar base de datos PostgreSQL
# Crear base de datos:
# psql -U postgres
# CREATE DATABASE ic3_db;
# \q

# 5. Editar mysite/settings.py para PostgreSQL (o usar SQLite por defecto)

# 6. Aplicar migraciones
python manage.py makemigrations
python manage.py migrate

# 7. Crear superusuario
python manage.py createsuperuser

# 8. Iniciar servidor
python manage.py runserver
```

### Instalación Frontend React

```bash
# 1. Ir a la carpeta frontend
cd d:\Escuela\Proyectos\IC2-IC3\scada-ui

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

### Servicios Disponibles (Sin Docker)
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **Admin**: http://localhost:8000/admin

---

## 🤖 Raspberry Pi Gateway

**IMPORTANTE**: El gateway se ejecuta DIRECTAMENTE en la Raspberry Pi (NO en Docker)

### Instalación en Raspberry Pi

```bash
# 1. Conectar por SSH a la Raspberry Pi
ssh pi@raspberry.local

# 2. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 3. Instalar Python 3.9+
sudo apt install -y python3 python3-pip python3-venv

# 4. Clonar el proyecto
cd ~
git clone https://github.com/tu-usuario/IC2-IC3.git
cd IC2-IC3/control/raspberry_gateway

# 5. Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# 6. Instalar dependencias
pip install -r requirements.txt

# 7. Configurar permisos serial
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyACM0

# 8. Editar configuración
cp .env.example .env
nano .env  # Configurar MQTT broker, puerto serial, etc.

# 9. Probar sistema
python test_system.py

# 10. Instalar como servicio (autoarranque)
sudo cp raspberry_gateway.service /etc/systemd/system/
sudo systemctl enable raspberry_gateway
sudo systemctl start raspberry_gateway

# 11. Ver logs
sudo journalctl -u raspberry_gateway -f
```

### Dependencias Raspberry Pi
Ver: `control/raspberry_gateway/requirements.txt`
- pyserial (comunicación con Arduino)
- paho-mqtt (comunicación con backend)
- FastAPI (API REST local)
- SQLite (almacenamiento local)
- psutil (monitoreo del sistema)

---

## ⚖️ Docker vs Entorno Virtual

### 🐳 Usa Docker si:
- ✅ Quieres desplegar en producción
- ✅ Trabajas en equipo (mismo entorno para todos)
- ✅ No quieres instalar PostgreSQL/Node.js manualmente
- ✅ Quieres portabilidad (funciona igual en Windows/Linux/Mac)
- ✅ Prefieres comandos simples (`docker-compose up`)

### 🐍 Usa Entorno Virtual si:
- ✅ Solo desarrollas localmente
- ✅ Prefieres debugging directo (sin capas de contenedores)
- ✅ Tienes recursos limitados (Docker consume más RAM)
- ✅ Ya tienes PostgreSQL/Node.js instalados
- ✅ Prefieres control total del entorno

### 📊 Comparación

| Aspecto | Docker | Entorno Virtual |
|---------|--------|-----------------|
| **Instalación inicial** | Rápida (`docker-compose up`) | Manual (Python, PostgreSQL, Node.js) |
| **Portabilidad** | ✅ Excelente | ⚠️ Depende del SO |
| **Consumo recursos** | ⚠️ Alto (2-4 GB RAM) | ✅ Bajo (<1 GB RAM) |
| **Configuración** | ✅ Automática | ⚠️ Manual |
| **Debugging** | ⚠️ Requiere entrar a contenedor | ✅ Directo |
| **Producción** | ✅ Ideal | ❌ No recomendado |
| **Desarrollo local** | ✅ Bueno | ✅ Bueno |

### 🎯 Recomendación Final

```
┌─────────────────────────────────────────────────────────┐
│  RECOMENDACIÓN:                                         │
│                                                          │
│  ✅ Backend + Frontend: DOCKER                          │
│     (docker-compose up)                                 │
│                                                          │
│  ✅ Raspberry Pi Gateway: ENTORNO VIRTUAL               │
│     (se ejecuta en hardware físico)                     │
│                                                          │
│  ❌ NO necesitas entorno virtual si usas Docker         │
└─────────────────────────────────────────────────────────┘
```

### 🔧 Arquitectura del Sistema Completo

```
┌──────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │   Django   │  │   React    │            │
│  │   (DB)     │←─│  Backend   │←─│  Frontend  │            │
│  │ :5432      │  │  :8000     │  │  :5173     │            │
│  └────────────┘  └─────▲──────┘  └────────────┘            │
└─────────────────────────┼──────────────────────────────────┘
                          │ MQTT
                          │
                ┌─────────▼──────────┐
                │  Raspberry Pi      │  ← Entorno Virtual
                │  Gateway (FastAPI) │
                └─────────▲──────────┘
                          │ Serial
                ┌─────────▼──────────┐
                │     Arduino        │  ← Firmware
                │  Sistema SCADA     │
                └────────────────────┘
```

---

## 📝 Resumen de Archivos

```
IC2-IC3/
├── docker-compose.yml              # ✅ Para Docker (Backend + Frontend + DB)
├── requirements.txt                # ⚠️ Solo si NO usas Docker
│
├── mysite/                         # Backend Django
│   ├── Dockerfile                  # ✅ Para Docker
│   ├── requirements.txt            # Dependencias Python
│   └── manage.py
│
├── scada-ui/                       # Frontend React
│   ├── Dockerfile                  # ✅ Para Docker
│   ├── package.json                # Dependencias Node.js
│   └── src/
│
└── control/
    └── raspberry_gateway/          # Gateway Raspberry Pi
        ├── requirements.txt        # ✅ Entorno virtual (SIEMPRE)
        ├── .env.example
        └── src/
```

---

## 🆘 Solución de Problemas

### Docker no inicia
```bash
# Verificar que Docker Desktop esté corriendo
docker ps

# Reiniciar Docker Desktop

# Eliminar contenedores huérfanos
docker-compose down
docker-compose up --build
```

### Error de puertos ocupados
```bash
# Ver qué usa el puerto 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Linux/Mac

# Cambiar puerto en docker-compose.yml:
# ports:
#   - "8001:8000"  # Puerto externo diferente
```

### Raspberry Pi no se conecta
```bash
# Verificar puerto serial
ls /dev/tty*  # Buscar /dev/ttyACM0 o /dev/ttyUSB0

# Dar permisos
sudo chmod 666 /dev/ttyACM0

# Ver logs del gateway
journalctl -u raspberry_gateway -f
```

---

**¿Dudas?** Revisa los README específicos:
- Backend: `mysite/README_BACKEND.md`
- Frontend: `scada-ui/README.md`
- Gateway: `control/raspberry_gateway/README.md`
