# 🏭 Sistema SCADA - IC2-IC3-IC4

## 📋 Descripción

Proyecto integrador que combina conceptos de 3 materias de Ingeniería en Computación:
- **IC2**: Control Industrial y SCADA
- **IC3**: Desarrollo Web y Bases de Datos
- **IC4**: IoT y Comunicaciones

Sistema completo de monitorización y control SCADA (Supervisory Control And Data Acquisition) para gestión industrial con:
- ✅ Control de procesos en tiempo real
- ✅ Monitorización de sensores y actuadores
- ✅ Planificación de producción
- ✅ Gestión de personal y almacenamiento
- ✅ Comunicación MQTT con hardware Arduino
- ✅ Gateway Raspberry Pi para integración IoT

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │   Django   │  │   React    │            │
│  │    DB      │←─│  Backend   │←─│  Frontend  │            │
│  │   :5432    │  │   :8000    │  │   :5173    │            │
│  └────────────┘  └─────▲──────┘  └────────────┘            │
└─────────────────────────┼──────────────────────────────────┘
                          │ MQTT
                ┌─────────▼──────────┐
                │  Raspberry Pi      │  
                │  Gateway (FastAPI) │
                └─────────▲──────────┘
                          │ Serial USB
                ┌─────────▼──────────┐
                │     Arduino        │  
                │  Sistema SCADA     │
                │  + Sensores        │
                └────────────────────┘
```

---

## 🚀 Inicio Rápido

### Con Docker (Recomendado) 🐳

```powershell
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/IC2-IC3.git
cd IC2-IC3

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Aplicar migraciones (primera vez)
docker-compose exec backend python manage.py migrate

# 4. Crear superusuario (primera vez)
docker-compose exec backend python manage.py createsuperuser

# 5. Abrir en el navegador
# Frontend: http://localhost:5173
# Backend Admin: http://localhost:8000/admin
```

**¡Listo!** El sistema está corriendo.

---

## 📁 Estructura del Proyecto

```
IC2-IC3/
├── 📄 docker-compose.yml          # Orquestación de servicios
├── 📄 requirements.txt             # Dependencias consolidadas
├── 📘 INSTALACION.md               # Guía completa de instalación
├── 📘 COMANDOS_RAPIDOS.md          # Comandos útiles
│
├── 🐍 mysite/                      # Backend Django + DRF
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── mysite/                     # Configuración Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── polls/                      # App principal
│       ├── models.py               # 27 modelos SCADA
│       ├── serializers.py          # Serializers DRF
│       ├── views.py                # API endpoints
│       └── urls.py
│
├── ⚛️ scada-ui/                    # Frontend React + TypeScript
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── pages/                  # 18 páginas
│       │   ├── Dashboard.tsx
│       │   ├── GestionPlantas.tsx
│       │   ├── GestionSensores.tsx
│       │   ├── GestionAlarmas.tsx
│       │   ├── PlanificacionProduccion.tsx
│       │   ├── VisualizacionSCADA.tsx
│       │   └── ...
│       ├── components/             # Componentes reutilizables
│       ├── contexts/               # Estado global
│       └── hooks/                  # Custom hooks
│
└── 🤖 control/                     # Control Hardware
    ├── raspberry_gateway/          # Gateway MQTT
    │   ├── requirements.txt
    │   ├── config.yaml
    │   ├── test_system.py
    │   └── src/
    │       ├── gateway_main.py
    │       ├── arduino_serial.py
    │       ├── mqtt_client.py
    │       ├── data_storage.py
    │       └── system_diagnostics.py
    │
    └── Sistema_SCADA/              # Firmware Arduino
        ├── Sistema_SCADA.ino
        ├── Bluetooth.ino
        ├── control_bombas.ino
        └── ...
```

---

## 🛠️ Stack Tecnológico

### Backend
- **Django 5.1+**: Framework web
- **Django REST Framework**: API REST
- **PostgreSQL 15**: Base de datos
- **Paho MQTT**: Comunicación IoT
- **SQLAlchemy**: ORM para gateway

### Frontend
- **React 18**: UI Framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **shadcn/ui**: Componentes UI
- **Tailwind CSS**: Estilos
- **Recharts**: Gráficos

### Hardware/IoT
- **Arduino**: Control de hardware
- **Raspberry Pi 4**: Gateway MQTT
- **FastAPI**: API REST en gateway
- **Serial/USB**: Comunicación con Arduino

---

## 📚 Documentación

- 📘 [**INSTALACION.md**](INSTALACION.md) - Guía completa de instalación (Docker vs Virtual Env)
- ⚡ [**COMANDOS_RAPIDOS.md**](COMANDOS_RAPIDOS.md) - Comandos útiles para desarrollo
- 🐍 [**Backend README**](mysite/README_BACKEND.md) - Documentación del backend Django
- ⚛️ [**Frontend README**](scada-ui/README.md) - Documentación del frontend React
- 🤖 [**Gateway README**](control/raspberry_gateway/README.md) - Documentación del gateway

---

## 🎯 Funcionalidades

### Gestión Industrial
- ✅ Gestión de plantas/fábricas
- ✅ Gestión de sistemas y máquinas
- ✅ Gestión de sensores y dispositivos
- ✅ Gestión de alarmas y eventos
- ✅ Gestión de empleados

### Planificación
- ✅ Planificación de producción (Gantt + Calendario)
- ✅ Plantillas de recetas
- ✅ Órdenes de producción
- ✅ Mantenimiento programado
- ✅ Gestión de ingredientes

### Monitorización SCADA
- ✅ Visualización en tiempo real
- ✅ Gráficos de sensores
- ✅ Históricos de datos
- ✅ Control de actuadores
- ✅ Dashboard con métricas

### Almacenamiento
- ✅ Gestión de unidades de almacenamiento
- ✅ Control de inventario
- ✅ Trazabilidad de ingredientes
- ✅ Alertas de stock bajo

### Administración
- ✅ Auditoría de acciones
- ✅ Configuración MQTT
- ✅ Gestión de usuarios
- ✅ Logs del sistema

---

## 🔧 Configuración

### Variables de Entorno

**Backend** (`mysite/.env`):
```env
DEBUG=1
SECRET_KEY=tu-secret-key
DATABASE_URL=postgresql://postgres:postgres@db:5432/ic3_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Gateway** (`control/raspberry_gateway/.env`):
```env
MQTT_BROKER=mqtt.ejemplo.com
MQTT_PORT=1883
MQTT_USER=scada_user
MQTT_PASSWORD=secure_password
SERIAL_PORT=/dev/ttyACM0
SERIAL_BAUDRATE=9600
```

---

## 🧪 Testing

```powershell
# Backend
docker-compose exec backend python manage.py test

# Frontend
cd scada-ui
npm run test

# Gateway (en Raspberry Pi)
cd control/raspberry_gateway
python test_system.py
```

---

## 📊 Base de Datos

### Modelos Principales (27 en total)

- `Fabrica`, `Sistema`, `DispositivoSCADA`
- `Alarma`, `LogEvento`
- `Empleado`, `RegistroFichaje`
- `OrdenProduccion`, `PlantillaProduccion`, `MantenimientoProgramado`
- `IngredienteAlmacenamiento`, `UnidadAlmacenamiento`
- `CapacidadProduccion`
- `Notificacion`, `AuditoriaAccion`
- Y más...

---

## 🌐 Endpoints API

### Principales
- `GET/POST /api/fabricas/`
- `GET/POST /api/sistemas/`
- `GET/POST /api/dispositivos/`
- `GET/POST /api/alarmas/`
- `GET/POST /api/empleados/`
- `GET/POST /api/ordenes-produccion/`
- `GET/POST /api/plantillas/`
- `GET/POST /api/ingredientes/`

**Documentación completa**: http://localhost:8000/api/schema/swagger-ui/

---

## 🔐 Seguridad

- ✅ Autenticación JWT
- ✅ CORS configurado
- ✅ Validación de datos
- ✅ Auditoría de acciones
- ✅ Permisos por rol

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📞 Soporte

¿Problemas? Consulta:
- [INSTALACION.md](INSTALACION.md) - Solución de problemas comunes
- [Issues en GitHub](https://github.com/tu-usuario/IC2-IC3/issues)

---

## 📖 Referencias y Recursos

### Documentación Oficial
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

### Tutoriales Útiles
- [Django Tutorial](https://docs.djangoproject.com/en/5.2/intro/tutorial01/)
- [React + DRF Integration](https://www.youtube.com/watch?v=38XWpyEK8IY)
- [Django Notifications](https://www.youtube.com/watch?v=XPa_duOg2Ko)

### Recursos del Proyecto
- [Docs de Programación](https://drive.google.com/drive/folders/1E04hpJAeRc3TZzfJkJFEUtlSdUn1ALi3?usp=sharing)
- [Requerimientos del Proyecto](https://docs.google.com/document/d/1IDLadW9VSbGHwzSxpdI8EzgbaOA4BEi7/edit?usp=sharing&ouid=100700553391405918094&rtpof=true&sd=true)

---

## 📄 Licencia

Este proyecto es parte de un trabajo académico de Ingeniería en Computación.

---

## ✨ Estado del Proyecto

- ✅ Backend Django + API REST
- ✅ Frontend React + TypeScript
- ✅ Gateway Raspberry Pi
- ✅ Firmware Arduino
- ✅ Docker Compose
- ✅ Documentación completa
- 🔄 En desarrollo: Integración completa MQTT
- 📅 Pendiente: Despliegue en producción

---

**Desarrollado con ❤️ para IC2-IC3-IC4**

### *Ejempos de node.js*
Ejemplos practicos de proyectos con node.js
Links:
https://www.youtube.com/playlist?list=PLL0TiOXBeDairhQkzlawZNYnYEX45kDJP

## *Donde ospedar o provar el proyecto*
Hostiger(tiene una ia para verificar) o netlify
