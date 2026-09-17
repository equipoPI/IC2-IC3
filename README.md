# 🏭 Sistema SCADA - IC2-IC3-IC4
<<<<<<< HEAD

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

## 📚 Documentación (consolidada)

- 📘 [**INSTALACION.md**](INSTALACION.md) - Guía completa de instalación (Docker vs Virtual Env)
- 📄 [**Quickstart**](docs/quickstart.md) - Resumen rápido para levantar el sistema
- 📄 [**MQTT Spec**](docs/mqtt_spec.md) - Especificación del contrato MQTT (gateway)
- 📄 [**MQTT para dispositivos**](docs/mqtt_for_devices.md) - Guía práctica para Arduino/IoT
- 📄 [**Comandos útiles**](docs/commands.md) - Comandos consolidados para Docker, gateway y desarrollo
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
MQTT_USER=admin
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
=======

## 📋 Descripción

Sistema integral de monitorización y control SCADA (*Supervisory Control And Data Acquisition*) para gestión industrial, diseñado con arquitectura reactiva en tiempo real vía **WebSockets** y **MQTT**:
- ⚡ **Control de Procesos en Tiempo Real**: Paneles dinámicos parametrizados, sliders y dosificación de recetas en horas y minutos.
- 🔄 **WebSockets Bidireccionales (<20ms)**: Servidor ASGI Daphne + Django Channels con difusión instantánea a la interfaz web sin polling.
- 📊 **Monitorización de Sensores y Actuadores**: Diagrama P&ID industrial con 12 componentes en vivo y auto-descubrimiento.
- 🎛️ **Personalizador de Comandos**: Creación y edición de comandos, secciones y tópicos MQTT desde la UI sin modificar código.
- 🏭 **Clasificación de Sistemas**: Soporte multirrubro (`FLUIDOS`, `SOLIDOS`, `EMPAQUE`, `TEMPERATURA`, `GENERAL`).
- 📅 **Planificación de Producción**: Diagrama de Gantt, calendario mensual y ejecución automática de recetas.
- 📦 **Gestión de Almacenamiento & Bombos**: Control de reposición con selectores numéricos directos (`1, 2, 3, 4`).
- 🔐 **Seguridad & Credenciales**: Control de acceso por rangos (1-8), claves de registro y administración de usuarios Mosquitto `passwd`.
- 🌐 **Gateway IoT & Túnel Seguro**: Broker Mosquitto con autenticación y exposición remota vía Ngrok Tunnel.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DOCKER COMPOSE STACK                             │
│                                                                             │
│  ┌──────────────┐     ┌────────────────────────┐     ┌───────────────────┐  │
│  │  PostgreSQL  │     │     Django Backend     │     │     React SCADA   │  │
│  │   Database   │←───→│    (Daphne / Channels) │←───→│    (Vite / TS)    │  │
│  │    :5432     │     │         :8000          │ WS  │       :5173       │  │
│  └──────────────┘     └───────────▲────────────┘     └───────────────────┘  │
│                                   │                                         │
│                       ┌───────────▼────────────┐     ┌───────────────────┐  │
│                       │   Mosquitto Broker     │     │   Ngrok Tunnel    │  │
│                       │   (MQTT Auth :1883)    │     │  (HTTPS Seguro)   │  │
│                       └───────────▲────────────┘     └───────────────────┘  │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ MQTT (1883)
                          ┌─────────▼──────────┐
                          │  Raspberry Pi / GW │  
                          │  Gateway Telemetry │
                          └─────────▲──────────┘
                                    │ Serial USB
                          ┌─────────▼──────────┐
                          │  Hardware / PLC    │  
                          │  Arduino / Sensores│
                          └────────────────────┘
```

---

## 🚀 Inicio Rápido con Docker

```powershell
# 1. Levantar todos los servicios
docker compose up -d

# 2. Aplicar migraciones de base de datos
docker compose exec backend python manage.py migrate

# 3. Acceder al sistema
# Frontend SCADA: http://localhost:5173
# Backend API & Admin: http://localhost:8000/admin
```

---

## 📁 Estructura del Repositorio

```
IC2-IC3/
├── 📄 docker-compose.yml          # Orquestación (PostgreSQL, Backend, Frontend, Mosquitto, Ngrok)
├── 📄 requirements.txt             # Dependencias de Python consolidadas
├── 📘 INSTALACION.md               # Guía completa de instalación y configuración
│
├── 🐍 mysite/                      # Backend Django REST Framework + Channels
│   ├── Dockerfile
│   ├── requirements.txt            # Daphne, Channels, DRF, Paho-MQTT, psycopg2
│   ├── manage.py
│   ├── mysite/                     # Configuración Django (settings.py, asgi.py, wsgi.py)
│   └── polls/                      # Modelos, Vistas, Consumers WS y Worker MQTT
│       ├── models.py               # Modelos SCADA, MapeoAccionMQTT, Empleado, etc.
│       ├── consumers.py            # Consumer WebSocket para /ws/scada/
│       ├── routing.py              # Enrutador WebSocket de Django Channels
│       ├── views.py                # Endpoints API REST optimizados (<100ms)
│       └── management/commands/
│           └── mqtt_worker.py      # Daemon de ingesta MQTT y difusión WebSocket
│
├── ⚛️ scada-ui/                    # Frontend React 18 + Vite + TypeScript + Tailwind
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── pages/
│       │   ├── VisualizacionSCADA.tsx    # Diagrama P&ID, tipo de sistema y controles dinámicos
│       │   ├── GuiaSistema.tsx           # Documentación interactiva del sistema
│       │   ├── PlanificacionProduccion.tsx# Gantt, calendario y recetas
│       │   ├── MonitorizacionSCADA.tsx   # Gráficos de telemetría y alarmas en vivo
│       │   ├── AdministracionAlmacenamiento.tsx # Tanques y reposición
│       │   ├── CredencialesPermisos.tsx  # Claves, passwd y matriz de roles 1-8
│       │   └── ...
│       ├── components/scada/
│       │   ├── DynamicScadaPanels.tsx    # Motor de controles y sliders parametrizados
│       │   ├── GestorComandosModal.tsx   # Personalizador de comandos y secciones
│       │   └── ScadaFlowDiagram.tsx      # Diagrama de flujo SVG animado
│       └── hooks/
│           └── useScadaWebSocket.ts      # Hook de conexión WebSocket en tiempo real
│
├── 📡 mosquitto/                   # Broker MQTT Eclipse Mosquitto
│   ├── config/mosquitto.conf
│   └── README.md
│
├── 📚 docs/                        # Especificaciones y guías complementarias
│   ├── mqtt_spec.md                # Especificación del contrato y tópicos MQTT
│   ├── commands.md                 # Comandos útiles de administración
│   └── quickstart.md               # Resumen de inicio rápido
│
└── 🤖 control/                     # Código de Gateways y hardware IoT
```

---

## 🛠️ Stack Tecnológico

### Backend & Comunicaciones
- **Django 5.1+ & Django REST Framework**: API REST optimizada con consultas atómicas.
- **Django Channels & Daphne (ASGI)**: WebSockets en tiempo real (`/ws/scada/`).
- **PostgreSQL 15**: Base de datos relacional con integridad referencial.
- **Eclipse Mosquitto**: Broker MQTT con autenticación mediante archivo `passwd`.
- **Paho MQTT**: Ingesta automatizada y auto-descubrimiento en segundo plano (`mqtt_worker.py`).

### Frontend
- **React 18 & TypeScript**: Interfaz reactiva y tipado estricto.
- **Vite**: Empaquetado y recarga ultrarrápida.
- **shadcn/ui & Tailwind CSS**: Componentes modernos y paleta visual oscura SCADA.
- **Recharts**: Visualización de series temporales y tendencias.
- **Lucide React**: Iconografía industrial estandarizada.

---

## 🌐 Arquitectura Multi-Tenant y Multi-Gateway

El sistema implementa desacoplamiento total a nivel de pasarela y modelo de datos para permitir la coexistencia simultánea de múltiples fábricas físicas y simuladas (ej. `rafaela_sa` con maqueta física Arduino y `sunchales_sa` mediante gateway Raspberry Pi o simulador):

1. **Jerarquía Flexible de Tópicos MQTT**:
   ```
   <tenant>/<gateway>/<seccion>/<sistema>/<categoria>/<dispositivo>
   ```
   *Ejemplo*: `sunchales_sa/sim_gateway_test/A3/linea_ensamblado_3/nivel/sensor_nivel_bombo1`

2. **Scoping Determinista por Tenant**:
   - **Planta Canónica (`rafaela_sa`)**: Conserva los identificadores originales (`tank-1`, `pump-1`, `sensor_nivel_bombo1`), garantizando 100% retrocompatibilidad con el hardware de Rafaela.
   - **Plantas Adicionales (`sunchales_sa`, etc.)**: Generan automáticamente identificadores prefijados (`sunchales_sa_tank-1`, `sunchales_sa_pump-1`), resolviendo la unicidad en PostgreSQL (`UnidadAlmacenamiento.node_id` y `DispositivoSCADA.numero_serie`).

3. **Monitoreo en Tiempo Real del Worker MQTT**:
   ```powershell
   # Visualizar telemetría de todas las plantas con colores ANSI diferenciados:
   docker compose logs -f mqtt_worker
   ```
   - `[Nivel SCADA]` (Verde): Tanques, volúmenes en litros y porcentajes de llenado.
   - `[Caudal SCADA]` (Verde): Flujo de líquido instantáneo en L/min.
   - `[Actuador SCADA]` (Cian): Estados operativos de bombas, electroválvulas y mezcladores.
   - `[Telemetría SCADA]` (Blanco): Sensores genéricos (temperatura, presión).

4. **Visualización Aislada en `/scada`**:
   - Al seleccionar una fábrica y sistema, la interfaz filtra rigurosamente las variables de dicho sistema.
   - El mapeo canónico (`getCanonicalNodeId`) enlaza automáticamente los dispositivos prefijados con la topología del diagrama P&ID.

---

## 🧪 Comandos Útiles

```powershell
# Verificación de tipos TypeScript en Frontend
cd scada-ui && npx tsc --noEmit

# Chequeo de consistencia de Django Backend
docker compose exec backend python manage.py check

# Monitorear todo el tráfico MQTT en consola
docker compose exec mosquitto mosquitto_sub -u admin -P admin -t "#" -v

# Ver registros en vivo del Worker MQTT
docker compose logs -f mqtt_worker

# Reiniciar el worker tras cambios
docker compose restart mqtt_worker
```

>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
