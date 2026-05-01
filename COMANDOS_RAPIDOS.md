# ⚡ Comandos Rápidos - Proyecto IC2-IC3 SCADA

## 🐳 Docker (Recomendado)

```powershell
# Iniciar todo el sistema
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver solo logs del backend
docker-compose logs -f backend

# Ver solo logs del frontend
docker-compose logs -f frontend

# Detener todo
docker-compose down

# Reiniciar un servicio específico
docker-compose restart backend
docker-compose restart frontend

# Reconstruir imágenes (después de cambiar requirements.txt o package.json)
docker-compose up --build

# Ejecutar comandos Django
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell

# Entrar al contenedor backend
docker-compose exec backend bash

# Ver base de datos
docker-compose exec db psql -U postgres -d ic3_db

# Eliminar todo (incluyendo volúmenes de base de datos) ⚠️
docker-compose down -v

# Ver estado de los servicios
docker-compose ps
```

## 🐍 Sin Docker (Desarrollo Local)

### Backend Django
```powershell
# Activar entorno virtual (ejecutar SIEMPRE primero)
cd mysite
venv\Scripts\Activate.ps1

# Instalar/actualizar dependencias
pip install -r requirements.txt

# Migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor (http://localhost:8000)
python manage.py runserver

# Shell interactivo
python manage.py shell

# Crear app nueva
python manage.py startapp nombre_app

# Recolectar archivos estáticos
python manage.py collectstatic
```

### Frontend React
```powershell
# Instalar dependencias
cd scada-ui
npm install

# Iniciar servidor desarrollo (http://localhost:5173)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

## 🤖 Raspberry Pi Gateway

```bash
# SSH a la Raspberry Pi
ssh pi@raspberry.local

# Activar entorno virtual
cd ~/IC2-IC3/control/raspberry_gateway
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Probar sistema
python test_system.py

# Ver estado del servicio
sudo systemctl status raspberry_gateway

# Iniciar servicio
sudo systemctl start raspberry_gateway

# Detener servicio
sudo systemctl stop raspberry_gateway

# Reiniciar servicio
sudo systemctl restart raspberry_gateway

# Ver logs en tiempo real
sudo journalctl -u raspberry_gateway -f

# Ver logs de hoy
sudo journalctl -u raspberry_gateway --since today

# Habilitar autoarranque
sudo systemctl enable raspberry_gateway

# Deshabilitar autoarranque
sudo systemctl disable raspberry_gateway

# Editar configuración
nano .env
nano config.yaml

# Ver estado serial
ls /dev/tty*
sudo chmod 666 /dev/ttyACM0
```

## 🗄️ Base de Datos

### PostgreSQL (con Docker)
```powershell
# Entrar a PostgreSQL
docker-compose exec db psql -U postgres -d ic3_db

# Backup
docker-compose exec db pg_dump -U postgres ic3_db > backup.sql

# Restore
docker-compose exec -T db psql -U postgres ic3_db < backup.sql

# Ver todas las tablas
docker-compose exec db psql -U postgres -d ic3_db -c "\dt"

# Eliminar base de datos y recrear
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

### SQLite (sin Docker)
```powershell
# Ver la base de datos
cd mysite
sqlite3 db.sqlite3

# Dentro de SQLite:
.tables                    # Ver todas las tablas
.schema nombre_tabla       # Ver estructura
SELECT * FROM auth_user;   # Consulta
.quit                      # Salir
```

## 🔍 Debugging

### Backend
```powershell
# Ver todos los errores
docker-compose logs backend | Select-String "ERROR"

# Ver últimas 100 líneas
docker-compose logs --tail=100 backend

# Shell de Django (para probar queries)
docker-compose exec backend python manage.py shell
```

### Frontend
```powershell
# Ver errores de compilación
docker-compose logs frontend | Select-String "ERROR"

# Abrir herramientas de desarrollo del navegador
# F12 en el navegador → Consola
```

### Raspberry Pi
```bash
# Ver errores del gateway
sudo journalctl -u raspberry_gateway -p err

# Ver solo errores de conexión MQTT
sudo journalctl -u raspberry_gateway | grep -i mqtt

# Ver solo errores de serial
sudo journalctl -u raspberry_gateway | grep -i serial

# Monitorear uso de recursos
htop  # o: top

# Temperatura de la CPU
vcgencmd measure_temp

# Estado de red
ip addr show
ping 8.8.8.8
```

## 🧹 Limpieza

```powershell
# Limpiar caché Python
find . -type d -name "__pycache__" -exec rm -r {} +
find . -type f -name "*.pyc" -delete

# Limpiar node_modules
cd scada-ui
Remove-Item -Recurse -Force node_modules

# Limpiar Docker (libera espacio)
docker system prune -a --volumes  # ⚠️ Elimina todo lo no usado
docker system prune               # Solo contenedores/imágenes no usadas
```

## 🚀 Despliegue Producción

### Con Docker
```bash
# Servidor (Linux)
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## 📊 URLs Importantes

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin
- API Docs (Swagger): http://localhost:8000/api/schema/swagger-ui/
- PostgreSQL: localhost:5432

## ⚠️ Solución de Problemas Comunes

```powershell
# Error: Puerto 8000 ocupado
netstat -ano | findstr :8000
# Matar el proceso o cambiar puerto en docker-compose.yml

# Error: "No module named 'polls'"
docker-compose exec backend python manage.py migrate
docker-compose restart backend

# Error: CORS en frontend
# Verificar ALLOWED_HOSTS y CORS_ALLOWED_ORIGINS en settings.py

# Error: No se conecta a PostgreSQL
docker-compose down
docker-compose up -d db
# Esperar 10 segundos
docker-compose up -d backend

# Error: Frontend no actualiza
docker-compose restart frontend
# O limpiar caché del navegador (Ctrl+Shift+R)

# Error: Raspberry Pi no se conecta
sudo systemctl status raspberry_gateway
# Ver logs y verificar config.yaml
```

## 📝 Notas

- Usa Docker para desarrollo/producción (más fácil)
- El gateway de Raspberry Pi SIEMPRE va con entorno virtual (hardware físico)
- Haz backup de la base de datos antes de migraciones grandes
- Usa `docker-compose down -v` solo si quieres eliminar TODOS los datos
