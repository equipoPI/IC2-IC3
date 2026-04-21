# ============================================================================
# COMANDOS RÁPIDOS - Sistema SCADA Backend
# ============================================================================
# Este archivo contiene comandos útiles para el desarrollo
# Ejecutar desde: d:\Escuela\Proyectos\IC2-IC3\mysite\
# ============================================================================

# ----------------------------------------------------------------------------
# 1. INSTALACIÓN INICIAL
# ----------------------------------------------------------------------------

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# ----------------------------------------------------------------------------
# 2. MIGRACIONES DE BASE DE DATOS
# ----------------------------------------------------------------------------

# Ver estado de migraciones
python manage.py showmigrations

# Crear nuevas migraciones
python manage.py makemigrations

# Crear migraciones solo para la app polls
python manage.py makemigrations polls

# Aplicar migraciones
python manage.py migrate

# Aplicar migraciones de una app específica
python manage.py migrate polls

# Ver SQL de una migración
python manage.py sqlmigrate polls 0001

# Fake una migración (marcar como aplicada sin ejecutar)
python manage.py migrate polls --fake

# Revertir a una migración específica
python manage.py migrate polls 0001

# ----------------------------------------------------------------------------
# 3. SERVIDOR DE DESARROLLO
# ----------------------------------------------------------------------------

# Iniciar servidor
python manage.py runserver

# Iniciar servidor en puerto específico
python manage.py runserver 8080

# Iniciar servidor en todas las interfaces
python manage.py runserver 0.0.0.0:8000

# ----------------------------------------------------------------------------
# 4. GESTIÓN DE USUARIOS
# ----------------------------------------------------------------------------

# Crear superusuario
python manage.py createsuperuser

# Cambiar password de usuario
python manage.py changepassword usuario

# ----------------------------------------------------------------------------
# 5. SHELL Y DEPURACIÓN
# ----------------------------------------------------------------------------

# Abrir shell de Django
python manage.py shell

# Shell con extensiones (si django-extensions está instalado)
python manage.py shell_plus

# Acceder a la base de datos directamente
python manage.py dbshell

# ----------------------------------------------------------------------------
# 6. INSPECCIÓN Y VALIDACIÓN
# ----------------------------------------------------------------------------

# Verificar problemas en el proyecto
python manage.py check

# Inspeccionar estructura de base de datos
python manage.py inspectdb

# Inspeccionar una tabla específica
python manage.py inspectdb polls_fabrica

# Ver todas las URL configuradas
python manage.py show_urls

# ----------------------------------------------------------------------------
# 7. DATOS Y FIXTURES
# ----------------------------------------------------------------------------

# Exportar datos a JSON
python manage.py dumpdata polls.Fabrica > fabricas.json

# Exportar toda la app polls
python manage.py dumpdata polls > datos_polls.json

# Exportar con formato legible
python manage.py dumpdata polls --indent 2 > datos_polls.json

# Cargar datos desde fixture
python manage.py loaddata datos_polls.json

# ----------------------------------------------------------------------------
# 8. LIMPIEZA Y RESET
# ----------------------------------------------------------------------------

# ADVERTENCIA: Estos comandos eliminarán datos

# Eliminar base de datos (PowerShell)
Remove-Item db.sqlite3

# Eliminar archivos de caché de Python
Get-ChildItem -Recurse -Filter "*.pyc" | Remove-Item
Get-ChildItem -Recurse -Filter "__pycache__" | Remove-Item -Recurse

# Reset completo de migraciones (CUIDADO)
Remove-Item -Recurse -Force polls\migrations\
New-Item -ItemType Directory polls\migrations
New-Item polls\migrations\__init__.py

# ----------------------------------------------------------------------------
# 9. ADMIN DE DJANGO
# ----------------------------------------------------------------------------

# Después de iniciar el servidor, acceder a:
# http://127.0.0.1:8000/admin/

# Registrar modelos en admin.py:
# from .models import Fabrica, DispositivoSCADA, Alarma
# admin.site.register(Fabrica)
# admin.site.register(DispositivoSCADA)
# admin.site.register(Alarma)

# ----------------------------------------------------------------------------
# 10. TESTING
# ----------------------------------------------------------------------------

# Ejecutar todos los tests
python manage.py test

# Ejecutar tests de una app específica
python manage.py test polls

# Ejecutar tests con verbosidad
python manage.py test --verbosity=2

# Ejecutar tests con coverage (si está instalado)
coverage run --source='.' manage.py test
coverage report
coverage html

# ----------------------------------------------------------------------------
# 11. DJANGO REST FRAMEWORK
# ----------------------------------------------------------------------------

# Ver API navegable en:
# http://127.0.0.1:8000/api/

# Generar documentación OpenAPI/Swagger (si drf-spectacular está configurado)
python manage.py spectacular --file schema.yml

# ----------------------------------------------------------------------------
# 12. DATOS DE PRUEBA RÁPIDOS
# ----------------------------------------------------------------------------

# Crear datos de prueba desde shell
python manage.py shell

# Luego ejecutar:
"""
from polls.models import Fabrica, Sistema, DispositivoSCADA
from django.contrib.auth.models import User

# Crear fábrica
f = Fabrica.objects.create(
    nombre="Planta Norte",
    ubicacion="Madrid",
    pais="España",
    estado="OPERATIVO",
    porcentaje_produccion=87,
    porcentaje_eficiencia=94
)

# Crear sistema
s = Sistema.objects.create(
    nombre="Sistema de Mezcla A",
    fabrica=f
)

# Crear dispositivo
d = DispositivoSCADA.objects.create(
    numero_serie="TEMP-001",
    nombre="Sensor Temperatura 1",
    categoria="SENSOR_TEMPERATURA",
    sistema=s,
    estado="ONLINE"
)

print("✅ Datos creados!")
"""

# ----------------------------------------------------------------------------
# 13. COMANDOS DE MANTENIMIENTO
# ----------------------------------------------------------------------------

# Limpiar sesiones expiradas
python manage.py clearsessions

# Compilar mensajes de traducción (si se usa i18n)
python manage.py compilemessages

# Recopilar archivos estáticos
python manage.py collectstatic

# ----------------------------------------------------------------------------
# 14. BACKUP Y RESTORE
# ----------------------------------------------------------------------------

# Backup completo de base de datos
Copy-Item db.sqlite3 "backups\db_$(Get-Date -Format 'yyyyMMdd_HHmmss').sqlite3"

# Backup de datos en JSON
python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 2 > "backups\datos_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

# Restore desde backup JSON
python manage.py loaddata backups\datos_20240415_120000.json

# ----------------------------------------------------------------------------
# 15. INFORMACIÓN DEL SISTEMA
# ----------------------------------------------------------------------------

# Ver versión de Django
python -m django --version

# Ver todas las apps instaladas
python manage.py diffsettings

# Ver configuración de base de datos
python manage.py dbshell
# Dentro de SQLite:
# .databases
# .tables
# .schema polls_fabrica
# .exit

# ----------------------------------------------------------------------------
# 16. DEVELOPMENT SERVER CON FRONTEND
# ----------------------------------------------------------------------------

# Terminal 1: Backend Django
python manage.py runserver

# Terminal 2: Frontend React (desde carpeta scada-ui)
cd ..\scada-ui
npm run dev

# El frontend estará en: http://localhost:5173
# El backend estará en: http://localhost:8000
# La API estará en: http://localhost:8000/api/

# ----------------------------------------------------------------------------
# 17. INSTALACIÓN DE DEPENDENCIAS ADICIONALES
# ----------------------------------------------------------------------------

# Instalar una dependencia nueva y agregarla a requirements.txt
pip install nombre-paquete
pip freeze > requirements.txt

# Actualizar todas las dependencias
pip install --upgrade -r requirements.txt

# Ver dependencias instaladas
pip list

# Ver dependencias desactualizadas
pip list --outdated

# ----------------------------------------------------------------------------
# 18. COMANDOS GIT (para control de versiones)
# ----------------------------------------------------------------------------

# Inicializar repositorio (si no está inicializado)
git init

# Ver estado
git status

# Agregar archivos
git add .

# Commit
git commit -m "Agregar modelos SCADA y configuración DRF"

# Ver historial
git log --oneline

# ----------------------------------------------------------------------------
# 19. CONFIGURACIÓN DE VARIABLES DE ENTORNO
# ----------------------------------------------------------------------------

# Crear archivo .env (no subir a git)
"""
DEBUG=True
SECRET_KEY=tu-secret-key-aqui
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
"""

# Agregar .env a .gitignore
echo ".env" >> .gitignore
echo "*.pyc" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "db.sqlite3" >> .gitignore
echo "media/" >> .gitignore
echo "venv/" >> .gitignore

# ----------------------------------------------------------------------------
# 20. TROUBLESHOOTING COMÚN
# ----------------------------------------------------------------------------

# Si hay error de módulos no encontrados
pip install -r requirements.txt

# Si hay error de migraciones
python manage.py migrate --run-syncdb

# Si el servidor no arranca
python manage.py check --deploy

# Ver errores detallados
python manage.py runserver --traceback

# Limpiar caché de Python
Get-ChildItem -Recurse -Filter "*.pyc" | Remove-Item
Get-ChildItem -Recurse -Filter "__pycache__" | Remove-Item -Recurse

# ============================================================================
# FIN DE COMANDOS RÁPIDOS
# ============================================================================
