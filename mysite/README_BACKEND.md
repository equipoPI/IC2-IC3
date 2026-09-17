<<<<<<< HEAD
# Sistema SCADA - Backend Django + API REST Framework

Sistema de control y monitorización SCADA integrado con gestión empresarial, construido con Django y Django REST Framework.

## 📋 Descripción del Proyecto

Este proyecto integra:
- **Sistema SCADA**: Monitorización en tiempo real de plantas industriales, sensores, alarmas y producción
- **Gestión de Recursos Humanos**: Empleados, nóminas, vacaciones, capacitaciones
- **Gestión de Inventarios**: Control de stock, pedidos, proveedores
- **Planificación de Producción**: Órdenes de producción, recetas, plantillas
- **API REST**: Backend completo para interfaz React (scada-ui)

## 🏗️ Estructura del Proyecto

```
mysite/
├── mysite/                 # Configuración principal de Django
│   ├── settings.py        # Configuración con DRF y CORS
│   ├── urls.py            # URLs principales
│   └── wsgi.py
├── polls/                  # Aplicación principal
│   ├── models.py          # Modelos de base de datos
│   ├── serializers.py     # Serializers DRF
│   ├── views.py           # Vistas y ViewSets
│   ├── urls.py            # URLs de la API
│   └── admin.py           # Configuración del admin
├── db.sqlite3             # Base de datos SQLite
├── requirements.txt       # Dependencias Python
└── manage.py              # Gestor de Django
```

## 🗄️ Modelos de Base de Datos

### Modelos SCADA (Nuevos)

#### 1. **Fabrica** (Mejorado)
Representa plantas industriales con métricas en tiempo real:
- Información básica: nombre, ubicación, país
- Métricas SCADA: estado, producción, eficiencia, temperatura, consumo energía
- Contador de alarmas activas

#### 2. **Sistema**
Líneas de producción dentro de una planta:
- Nombre, descripción
- Relación con Fabrica
- Estado activo/inactivo

#### 3. **DispositivoSCADA**
Sensores, actuadores, máquinas y equipamiento:
- Categorías: Sensores (temperatura, presión, flujo, nivel, humedad), Motores, Bombas, Válvulas, PLC, HMI, etc.
- Estados: Online, Offline, Mantenimiento, Error
- Relaciones con Sistema, Sección, Inventario
- Configuración MQTT (topic)
- Tracking de última lectura

#### 4. **LecturaSensor**
Datos de series temporales de los dispositivos:
- Valor, unidad, timestamp
- Calidad de la lectura (GOOD, BAD, UNCERTAIN)
- Indexado para consultas rápidas

#### 5. **Alarma**
Sistema de alertas y notificaciones:
- Severidad: Alta, Media, Baja
- Estado: Abierta, Cerrada
- Relación con Fabrica y DispositivoSCADA
- Tracking de usuario que cierra y notas de resolución
- Timestamps de apertura y cierre

#### 6. **OrdenProduccion**
Órdenes de trabajo para producción:
- Código único autogenerado (OP-{AÑO}-{NUM})
- Producto, cantidad
- Planificación temporal (fecha/hora inicio y fin)
- Asignación a Fabrica, Sistema, Dispositivo
- Estado: Pendiente, En Proceso, Completada, Cancelada
- Progreso (0-100%)
- Relación con Receta

#### 7. **PlantillaProduccion**
Plantillas/recetas mejoradas:
- Tipos: Producción, Especialidad, Mantenimiento, Calibración
- Tiempo estimado (horas y minutos)
- Ingredientes en formato JSON
- Relación con Receta base

#### 8. **ConfiguracionMQTT**
Configuración de broker MQTT para IoT:
- URL broker, puerto
- Autenticación (usuario, password)
- TLS, keep alive
- Topics base

#### 9. **RegistroAuditoria**
Logs y auditoría del sistema:
- Usuario, tipo de acción
- Modelo y objeto afectado
- Descripción, timestamp, IP
- Datos adicionales en JSON

#### 10. **IngredienteAlmacenamiento**
Gestión de ingredientes:
- Stock actual y mínimo
- Unidades de medida
- Relación con BomboAlmacenamiento

### Modelos de Recursos Humanos (Existentes)
- **Empleado**: Información personal, rango, tarifa, estado
- **TipoTarifa**: Tarifas por hora y extras
- **RegistroFichaje**: Control de horarios
- **PagoMensual**: Nóminas mensuales
- **Vacacion, Licencia, Sancion, Promocion**: Gestión de RRHH
- **Capacitacion**: Formación de empleados

### Modelos de Inventario (Existentes)
- **Inventario**: Almacenes por fábrica
- **ItemInventario**: Items con categorías diversas
- **Proveedor**: Proveedores de materiales
- **PedidoProveedor, PedidoComprador**: Gestión de pedidos

### Modelos de Producción (Existentes)
- **Receta**: Recetas de producción
- **DetalleReceta**: Ingredientes de recetas
- **EjecucionReceta**: Ejecuciones de recetas
- **Produccion**: Registro de producciones

## 🔌 Relación con la Interfaz SCADA-UI

El modelo se diseñó para soportar todos los componentes de la UI React:

### Páginas y Componentes UI → Modelos Backend

| Componente UI | Modelos Relacionados |
|---------------|---------------------|
| **MonitorizacionSCADA** | Fabrica, DispositivoSCADA, Alarma |
| **Dashboard** | Fabrica, Empleado, DispositivoSCADA, Alarma |
| **GestionPlantas** | Fabrica |
| **GestionSensores** | DispositivoSCADA, Sistema, Inventario, Seccion |
| **GestionAlarmas** | Alarma, Fabrica, DispositivoSCADA |
| **GestionEmpleados** | Empleado, Seccion, TipoTarifa |
| **PlanificacionProduccion** | OrdenProduccion, Sistema, DispositivoSCADA, Receta |
| **GestionPlantillas** | PlantillaProduccion, IngredienteAlmacenamiento, Receta |
| **ConfiguracionMQTT** | ConfiguracionMQTT |
| **Auditoria** | RegistroAuditoria |

## 🚀 Instalación y Configuración

### Requisitos Previos
- Python 3.9+
- pip
- virtualenv (recomendado)

### Pasos de Instalación

1. **Crear y activar entorno virtual**
```powershell
# Crear entorno virtual
python -m venv venv

# Activar (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

2. **Instalar dependencias**
```powershell
pip install -r requirements.txt
```

3. **Realizar migraciones**
```powershell
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate
```

4. **Crear superusuario**
```powershell
python manage.py createsuperuser
```

5. **Cargar datos de prueba (opcional)**
```powershell
python manage.py loaddata datos_iniciales.json
```

6. **Ejecutar servidor de desarrollo**
```powershell
python manage.py runserver
```

El servidor estará disponible en: `http://127.0.0.1:8000/`

## 📡 API REST Framework

### Configuración DRF

- **Autenticación**: Token + Session
- **Paginación**: 50 items por página
- **Filtros**: SearchFilter, OrderingFilter

### Endpoints Principales (a implementar en views.py y urls.py)

```
/api/fabricas/              # Plantas/Fábricas
/api/secciones/             # Secciones
/api/sistemas/              # Sistemas de producción
/api/dispositivos/          # Dispositivos SCADA
/api/lecturas/              # Lecturas de sensores
/api/alarmas/               # Alarmas
/api/ordenes-produccion/    # Órdenes de producción
/api/plantillas/            # Plantillas de producción
/api/empleados/             # Empleados
/api/inventarios/           # Inventarios
/api/recetas/               # Recetas
/api/configuracion-mqtt/    # Config MQTT
/api/auditoria/             # Logs de auditoría
```

## 🔧 Configuración CORS

El proyecto está configurado para permitir peticiones del frontend React:

```python
# Durante desarrollo
CORS_ALLOW_ALL_ORIGINS = True

# En producción, especificar origins:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
]
```

## 📊 Próximos Pasos

1. **Implementar Views y ViewSets**
   - Crear ViewSets para cada modelo
   - Implementar acciones personalizadas
   - Agregar filtros y búsquedas

2. **Configurar URLs de la API**
   - Definir rutas en `polls/urls.py`
   - Incluir en `mysite/urls.py`

3. **Implementar Websockets (opcional)**
   - Para datos en tiempo real
   - Usar Django Channels + Redis

4. **Integración MQTT**
   - Servicios para conectar con broker MQTT
   - Guardar lecturas de sensores automáticamente

5. **Tests**
   - Tests unitarios de modelos
   - Tests de API endpoints

6. **Documentación API**
   - Usar drf-spectacular para OpenAPI/Swagger
   - Generar documentación interactiva

## 🔐 Seguridad

- No subir archivo `.env` con credenciales
- Cambiar `SECRET_KEY` en producción
- Configurar `DEBUG = False` en producción
- Usar HTTPS en producción
- Implementar rate limiting
- Validar todas las entradas de usuario

## 📝 Notas Importantes

1. **Migraciones**: El archivo `models.py` ha sido significativamente modificado. Es necesario:
   - Borrar migraciones anteriores si causan conflictos
   - Crear nuevas migraciones limpias
   - Considerar crear un fixture con datos de prueba

2. **Base de Datos**: 
   - Actualmente usa SQLite (desarrollo)
   - Para producción, se recomienda PostgreSQL o MySQL

3. **Compatibilidad**: 
   - Los modelos están diseñados para ser 100% compatibles con la UI React SCADA
   - Todos los campos requeridos por los formularios UI están presentes

## 👥 Contribución

Este proyecto es parte de IC2-IC3 (Proyectos de Ingeniería).

## 📄 Licencia

[Especificar licencia]
=======
# 🐍 Backend Django REST Framework + Channels (SCADA)

Servidor central de control SCADA, persistencia en PostgreSQL, WebSockets en tiempo real y comunicación IoT vía MQTT.

---

## 🏗️ Arquitectura del Backend

- **Django 5.1+**: Core del servidor web.
- **Django REST Framework**: Endpoints de API REST optimizados (<100ms con `select_related`).
- **Daphne & Django Channels (ASGI)**: Servidor WebSocket en `/ws/scada/` para difusión en tiempo real a clientes web sin sobrecarga de polling.
- **Paho MQTT & `mqtt_worker.py`**: Daemon de ingesta en segundo plano para procesar telemetría y disparar actualizaciones reactivas.
- **PostgreSQL 15**: Base de datos relacional con claves foráneas, restricciones de unicidad y auditoría.

---

## 🗄️ Modelos Principales (`polls/models.py`)

1. **`Fabrica` / `Seccion` / `Sistema`**: Jerarquía de plantas industriales con asignación de tipos de proceso (`FLUIDOS`, `SOLIDOS`, `EMPAQUE`, `TEMPERATURA`, `GENERAL`).
2. **`DispositivoSCADA` / `LecturaSensor`**: Catálogo de 12 sensores/actuadores industriales con registro de series temporales.
3. **`MapeoAccionMQTT`**: Comandos dinámicos parametrizados con soporte para `BOTON`, `SLIDER`, `NUMERICO`, `PARAMETRIZADO` y `RECETA`.
4. **`OrdenProduccion` / `PlantillaProduccion` / `Receta`**: Planificación de producción, dosificación con horas y minutos, y seguimiento en tiempo real.
5. **`Empleado` / `HistorialEstadoEmpleado`**: Gestión de personal, cálculo automático de antigüedad y vinculación con `User.is_active`.
6. **`ConfiguracionMQTT` / `RegistroAuditoria`**: Parametrización del broker y trazabilidad de operaciones de usuarios.

---

## 📡 WebSockets y Consumers (`polls/consumers.py` & `polls/routing.py`)

- **Ruta WS**: `ws://localhost:8000/ws/scada/`
- **Grupo Channels**: `scada_telemetry`
- **Eventos Emitidos**:
  - `telemetry_update`: Nueva lectura de sensor procesada por el worker.
  - `model_change`: Cambios de estado en dispositivos o almacenamiento.

---

## 🚀 Comandos de Gestión

```powershell
# Aplicar migraciones en PostgreSQL
python manage.py migrate

# Crear nuevas migraciones
python manage.py makemigrations

# Iniciar el Worker MQTT de ingesta
python manage.py mqtt_worker

# Validar integridad del sistema Django
python manage.py check
```
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
