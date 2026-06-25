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
