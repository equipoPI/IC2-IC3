# /bin/sh
# Script para crear usuario 'admin' en el contenedor Mosquitto y habilitar auth

set -e

echo "Creando usuario 'admin' con contraseña 'admin' en el contenedor Mosquitto..."

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose no encontrado en PATH. Ejecuta este script desde la raíz del repo donde docker-compose.yml está disponible."
  exit 1
fi

# Levantar contenedor si no está corriendo
docker-compose up -d mosquitto

sleep 2

echo "Creando/actualizando archivo de contraseñas..."
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd admin admin

echo "Asegurando permisos del archivo de contraseñas..."
docker-compose exec mosquitto sh -c 'chmod 640 /mosquitto/config/passwd || true'

echo "Reiniciando mosquitto para aplicar configuración..."
docker-compose restart mosquitto

echo "Hecho. Usuario 'admin' creado/actualizado. Prueba conexión con:"
echo "mosquitto_sub -h localhost -p 1883 -u admin -P admin -t 'scada/#' -v"

exit 0
