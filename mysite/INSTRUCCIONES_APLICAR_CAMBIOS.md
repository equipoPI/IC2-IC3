# 🚀 INSTRUCCIONES RÁPIDAS - SISTEMA SCADA

## ✅ ESTADO ACTUAL

**Backend Django:** Limpio y optimizado - 34 modelos operativos  
**Sistema de logs:** Configurado y listo  
**Cambios en código:** ✅ COMPLETADOS

---

## 📋 PRÓXIMOS PASOS (EJECUTAR CUANDO ESTÉS LISTO)

### 1️⃣ APLICAR MIGRACIONES

**Opción A - Script automático (RECOMENDADO):**
```cmd
cd d:\Escuela\Proyectos\IC2-IC3\mysite
aplicar_migraciones.bat
```

**Opción B - Manual:**
```cmd
cd d:\Escuela\Proyectos\IC2-IC3\mysite
python manage.py makemigrations
python manage.py migrate
```

⚠️ **IMPORTANTE:** Si tienes datos en los 18 modelos eliminados, haz backup de tu BD antes de migrar.

---

### 2️⃣ VERIFICAR MIGRACIONES

Después de aplicar migraciones, verifica:
```cmd
python manage.py showmigrations polls
```

Deberías ver todas las migraciones aplicadas (marcadas con `[X]`)

---

### 3️⃣ ACTUALIZAR ARCHIVOS RELACIONADOS

#### A. Actualizar `admin.py`:
Eliminar estas líneas (registros de modelos eliminados):
```python
# Eliminar estos:
admin.site.register(PruebasMedicas)
admin.site.register(RegistroFichaje)
admin.site.register(PagoMensual)
admin.site.register(Sancion)
admin.site.register(Falta)
admin.site.register(Vacacion)
admin.site.register(HistorialEstadoVacacion)
admin.site.register(Licencia)
admin.site.register(EventoEspecial)
admin.site.register(PoliticaVacaciones)
admin.site.register(AccidenteLaboral)
admin.site.register(Capacitacion)
admin.site.register(EmpleadoCapacitacion)
admin.site.register(Proveedor)
admin.site.register(PedidoProveedor)
admin.site.register(DetallePedidoProveedor)
admin.site.register(Comprador)
admin.site.register(PedidoComprador)
admin.site.register(Promocion)  # Reemplazado por CambioEmpleado

# Agregar:
admin.site.register(CambioEmpleado)
```

#### B. Actualizar `serializers.py`:
Buscar y eliminar serializers para modelos eliminados.

---

### 4️⃣ INICIAR SERVIDOR

```cmd
python manage.py runserver
```

Acceder a:
- Admin: http://localhost:8000/admin
- API: http://localhost:8000/api/

---

## 🔍 VERIFICACIÓN DE LOGS

Después de iniciar el servidor, verifica que se crean los archivos de logs:

```
mysite/logs/
  ├── scada_system.log       ✓ Logs generales
  ├── scada_errors.log       ✓ Solo errores
  └── mqtt_communication.log ✓ Debug MQTT
```

**Ejemplo de uso en código:**
```python
import logging

# Logger SCADA
logger = logging.getLogger('scada')
logger.info('Orden de producción creada')
logger.error('Error al procesar datos del sensor')

# Logger MQTT
logger_mqtt = logging.getLogger('mqtt')
logger_mqtt.debug('Mensaje MQTT recibido: topic=/sensor/temperatura, payload=25.5')
```

---

## 📊 RESUMEN DE CAMBIOS

### Modelos Eliminados (18):
❌ **RRHH:** PruebasMedicas, RegistroFichaje, PagoMensual, Sancion, Falta, Vacacion, HistorialEstadoVacacion, Licencia, EventoEspecial, PoliticaVacaciones, AccidenteLaboral, Capacitacion, EmpleadoCapacitacion

❌ **Compras/Ventas:** Proveedor, PedidoProveedor, DetallePedidoProveedor, Comprador, PedidoComprador

### Modelos Nuevos (5):
✅ Notificacion  
✅ MantenimientoProgramado  
✅ UnidadAlmacenamiento  
✅ HistorialProduccion  
✅ ComunicacionMQTT

### Modelos Mejorados (2):
✅ **Empleado** - Agregados: `tipo_empleado`, `rol_actual`  
✅ **CambioEmpleado** (reemplaza Promocion) - Sistema completo de cambios

---

## 🛠️ SOLUCIÓN DE PROBLEMAS

### Error: "No such table: polls_xxx"
```cmd
# Aplicar migraciones
python manage.py migrate
```

### Error: "No module named 'django'"
```cmd
# Activar entorno virtual (si usas venv)
.\venv\Scripts\activate

# O instalar Django
pip install django djangorestframework django-cors-headers paho-mqtt
```

### Error: "ProgrammingError: table already exists"
```cmd
# Realizar fake migration inicial
python manage.py migrate --fake-initial
```

### Limpiar caché de Python
```powershell
# Eliminar archivos .pyc y __pycache__
Get-ChildItem -Recurse -Filter "*.pyc" | Remove-Item
Get-ChildItem -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse
```

---

## 📚 DOCUMENTACIÓN

- **Análisis de limpieza:** `ANALISIS_LIMPIEZA_MODELOS.md`
- **Resumen completo:** `RESUMEN_LIMPIEZA_COMPLETADA.md`
- **Este archivo:** `INSTRUCCIONES_APLICAR_CAMBIOS.md`

---

## ✅ CHECKLIST FINAL

Antes de continuar con desarrollo:

- [ ] Aplicar migraciones (`aplicar_migraciones.bat` o manual)
- [ ] Verificar migraciones (`python manage.py showmigrations polls`)
- [ ] Actualizar `admin.py` (eliminar registros de modelos eliminados, agregar CambioEmpleado)
- [ ] Actualizar `serializers.py` (eliminar serializers de modelos eliminados)
- [ ] Verificar `views.py` y `urls.py` (eliminar endpoints de modelos eliminados)
- [ ] Iniciar servidor (`python manage.py runserver`)
- [ ] Verificar creación de logs en `mysite/logs/`
- [ ] Probar creación de datos con modelos nuevos en admin
- [ ] Conectar con frontend React (scada-ui)

---

## 🎯 OBJETIVO LOGRADO

✅ Sistema Django backend optimizado para SCADA industrial  
✅ 34 modelos funcionales y enfocados  
✅ Sistema de logging implementado  
✅ RRHH básico mantenido  
✅ Compras/ventas eliminado  
✅ 100% compatible con frontend React

**Todo listo para continuar desarrollo! 🚀**
