<<<<<<< HEAD
"""
Comandos útiles consolidados (fusionado desde comandos.txt y COMANDOS_RAPIDOS.md)
"""

# Comandos Útiles para el Proyecto

## Docker y Docker Compose

docker compose up -d
docker compose up -d --build
docker compose ps
docker compose down
docker compose down -v
docker compose logs -f
docker compose logs --tail 100 -f backend
docker compose restart
docker compose exec backend bash

## Operaciones dentro del backend (Django)

docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec -d backend sh -c "python -u manage.py mqtt_listener > /app/mqtt_worker.log 2>&1"
docker compose exec backend cat /app/mqtt_worker.log
docker compose exec backend python manage.py shell

## Frontend (local)

cd scada-ui
npm install
npm run dev
npm run build

## Raspberry Gateway (resumen)

cd control/raspberry_gateway
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -u src/gateway_main.py
nohup python -u src/gateway_main.py > gateway.log 2>&1 &

## Limpieza

find . -type d -name "__pycache__" -exec rm -r {} +
find . -type f -name "*.pyc" -delete
cd scada-ui && rm -rf node_modules
docker system prune -a --volumes
=======
# 🛠️ Catálogo de Comandos Útiles del Proyecto

## 🐳 Docker Compose

```powershell
# Levantar el stack completo en segundo plano
docker compose up -d

# Reconstruir imágenes y levantar
docker compose up -d --build

# Ver estado de los contenedores
docker compose ps

# Detener el stack
docker compose down

# Ver logs en vivo del backend
docker compose logs -f backend

# Reiniciar backend tras cambios en models o signals
docker compose restart backend
```

---

## 🐍 Backend Django & Channels

```powershell
# Aplicar migraciones
docker compose exec backend python manage.py migrate

# Crear nuevas migraciones
docker compose exec backend python manage.py makemigrations

# Chequeo de consistencia del sistema Django
docker compose exec backend python manage.py check

# Crear superusuario
docker compose exec backend python manage.py createsuperuser

# Ejecutar el Worker MQTT manualmente
docker compose exec backend python manage.py mqtt_worker

# Abrir shell interactiva de Django
docker compose exec backend python manage.py shell
```

---

## ⚛️ Frontend React & Vite (`scada-ui`)

```powershell
cd scada-ui

# Instalar paquetes
npm install

# Iniciar servidor de desarrollo
npm run dev

# Verificación de tipos TypeScript
npx tsc --noEmit

# Compilar bundle de producción
npm run build
```

---

## 📡 Broker MQTT Mosquitto

```powershell
# Escuchar todo el tráfico MQTT en vivo
docker compose exec mosquitto mosquitto_sub -u admin -P admin -t "#" -v

# Publicar un comando de prueba
docker compose exec mosquitto mosquitto_pub -u admin -P admin -t "rafaela_sa/d83add60dbb0/a1/linea_mezclado_1/reposicion" -m '{"bombo": 1, "limite_porcentaje": 80}'
```
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
