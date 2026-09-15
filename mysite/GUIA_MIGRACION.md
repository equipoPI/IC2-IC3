# Guía de Migración - Sistema SCADA

## ⚠️ ANTES DE EMPEZAR

**Si ya tienes datos en la base de datos**, es MUY importante hacer un backup:

```powershell
# Hacer copia de seguridad de la base de datos
Copy-Item db.sqlite3 db.sqlite3.backup
```

## 🔄 Opciones de Migración

### Opción 1: Migración Limpia (Recomendado para desarrollo)

Si estás en desarrollo y no te importa perder los datos actuales:

```powershell
# 1. Eliminar la base de datos actual
Remove-Item db.sqlite3

# 2. Eliminar archivos de migración antiguos (CUIDADO)
Remove-Item polls\migrations\0*.py

# 3. Crear nuevas migraciones
python manage.py makemigrations polls

# 4. Aplicar migraciones
python manage.py migrate

# 5. Crear superusuario
python manage.py createsuperuser
```

### Opción 2: Migración Conservando Datos

Si necesitas mantener los datos existentes:

```powershell
# 1. Crear migraciones
python manage.py makemigrations polls

# 2. Revisar las migraciones generadas
# Abrir: polls/migrations/0XXX_*.py

# 3. Aplicar migraciones
python manage.py migrate polls

# 4. Si hay errores, ver sección de resolución de problemas
```

### Opción 3: Migración Manual con SQL

Si tienes conflictos complejos:

```powershell
# Ver SQL que se ejecutará
python manage.py sqlmigrate polls 0001

# Aplicar migración específica
python manage.py migrate polls 0001

# Ver estado de migraciones
python manage.py showmigrations
```

## 🐛 Resolución de Problemas Comunes

### Error: "No migrations to apply"

```powershell
# Forzar recreación de migraciones
python manage.py makemigrations polls --empty
python manage.py makemigrations polls
```

### Error: "Column already exists"

Esto ocurre cuando tratas de agregar una columna que ya existe.

**Solución**: Editar el archivo de migración y eliminar esa operación específica.

### Error: "Table already exists"

```powershell
# Opción 1: Fake la migración inicial
python manage.py migrate polls --fake-initial

# Opción 2: Marcar todas como aplicadas (CUIDADO)
python manage.py migrate polls --fake
```

### Error: "Cannot add field to table"

Ocurre cuando agregas un campo NOT NULL a una tabla con datos.

**Solución**: 
1. Agregar el campo como nullable primero
2. Llenar los datos
3. Cambiar a NOT NULL

### Conflicto con modelo Fabrica

Si el modelo `Fabrica` ya existía con campos diferentes:

1. **Ver campos actuales**:
```powershell
python manage.py inspectdb Fabrica
```

2. **Crear migración de datos**:
```python
# En polls/migrations/XXXX_migrate_fabrica.py
from django.db import migrations

def forward_func(apps, schema_editor):
    Fabrica = apps.get_model('polls', 'Fabrica')
    db_alias = schema_editor.connection.alias
    
    # Actualizar todos los registros con valores por defecto
    Fabrica.objects.using(db_alias).update(
        estado='OPERATIVO',
        porcentaje_produccion=0,
        porcentaje_eficiencia=0,
        temperatura_promedio=0,
        consumo_energia=0,
        alarmas_activas=0
    )

class Migration(migrations.Migration):
    dependencies = [
        ('polls', 'XXXX_previous_migration'),
    ]
    
    operations = [
        migrations.RunPython(forward_func),
    ]
```

## ✅ Verificación Post-Migración

Después de migrar, verifica:

```powershell
# 1. Ver todas las tablas creadas
python manage.py dbshell
.tables
.exit

# 2. Ver estructura de una tabla específica
python manage.py dbshell
.schema polls_dispositivoscada
.exit

# 3. Verificar en el admin de Django
python manage.py runserver
# Visitar: http://127.0.0.1:8000/admin/
```

## 📊 Crear Datos de Prueba

Después de migrar, puedes crear datos de prueba:

```python
# En manage.py shell
python manage.py shell

# Importar modelos
from polls.models import Fabrica, Sistema, DispositivoSCADA, Alarma
from django.contrib.auth.models import User

# Crear fábrica
fabrica = Fabrica.objects.create(
    nombre="Planta Norte",
    ubicacion="Madrid, España",
    pais="España",
    estado="OPERATIVO",
    porcentaje_produccion=87,
    porcentaje_eficiencia=94,
    temperatura_promedio=42,
    consumo_energia=2450,
    alarmas_activas=0
)

# Crear sistema
sistema = Sistema.objects.create(
    nombre="Sistema de Mezcla A",
    fabrica=fabrica,
    descripcion="Sistema principal de mezcla"
)

# Crear dispositivo
dispositivo = DispositivoSCADA.objects.create(
    numero_serie="TEMP-001",
    nombre="Sensor Temp. Horno 1",
    categoria="SENSOR_TEMPERATURA",
    sistema=sistema,
    estado="ONLINE"
)

# Crear alarma
usuario = User.objects.first()
alarma = Alarma.objects.create(
    fabrica=fabrica,
    dispositivo=dispositivo,
    descripcion="Temperatura elevada en horno principal",
    severidad="ALTA"
)

print("✅ Datos de prueba creados!")
```

## 🔧 Script Automático de Datos de Prueba

Crear archivo: `polls/management/commands/crear_datos_prueba.py`

```python
from django.core.management.base import BaseCommand
from polls.models import Fabrica, Sistema, DispositivoSCADA, Alarma
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Crea datos de prueba para el sistema SCADA'

    def handle(self, *args, **kwargs):
        # Código de creación de datos aquí
        self.stdout.write(self.style.SUCCESS('✅ Datos de prueba creados'))
```

Ejecutar:
```powershell
python manage.py crear_datos_prueba
```

## 📝 Checklist Final

- [ ] Backup de base de datos realizado
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Migraciones creadas (`makemigrations`)
- [ ] Migraciones aplicadas (`migrate`)
- [ ] Superusuario creado
- [ ] Servidor funcionando sin errores
- [ ] Admin de Django accesible
- [ ] Modelos visibles en admin
- [ ] Datos de prueba creados (opcional)

## 🆘 Si Todo Falla

```powershell
# Reset completo (PERDERÁS TODOS LOS DATOS)
Remove-Item db.sqlite3
Remove-Item -Recurse -Force polls\migrations\
New-Item -ItemType Directory polls\migrations
New-Item polls\migrations\__init__.py

python manage.py makemigrations polls
python manage.py migrate
python manage.py createsuperuser
```

## 📞 Recursos Adicionales

- Documentación Django Migrations: https://docs.djangoproject.com/en/5.1/topics/migrations/
- Django REST Framework: https://www.django-rest-framework.org/
- README_BACKEND.md: Documentación completa del proyecto
