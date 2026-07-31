#!/bin/sh
# Crea un usuario en el contenedor Mosquitto con password generado y actualiza la config del gateway

set -e

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose no encontrado. Ejecuta este script en la máquina donde esté Docker Compose."
  exit 1
fi

if [ "$#" -ge 1 ]; then
  USERNAME="$1"
else
  USERNAME="gateway_user"
fi

# Generar password fuerte
PASSWORD=$(head /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 24)

echo "Usuario: $USERNAME"
echo "Generando contraseña fuerte..."

# Levantar mosquitto si está detenido
docker-compose up -d mosquitto
sleep 2

echo "Creando/actualizando usuario dentro del contenedor (passwd)..."
# -b permite pasar usuario y password en línea
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd "$USERNAME" "$PASSWORD"

echo "Asegurando permisos del archivo de contraseñas..."
docker-compose exec mosquitto sh -c 'chmod 640 /mosquitto/config/passwd || true'

echo "Reiniciando mosquitto para aplicar cambios..."
docker-compose restart mosquitto

# Actualizar config del gateway en el repo (archivo local)
GATEWAY_CONFIG="control/raspberry_gateway/config.yaml"
if [ -f "$GATEWAY_CONFIG" ]; then
  echo "Actualizando $GATEWAY_CONFIG con las nuevas credenciales..."
  # Usar yq si disponible, sino fallback a sed (nota: sed no es seguro para YAML complejo)
  if command -v yq >/dev/null 2>&1; then
    yq eval ".mqtt.username = \"$USERNAME\" | .mqtt.password = \"$PASSWORD\"" -i "$GATEWAY_CONFIG"
  else
    # sed-based naive replace
    sed -i.bak -E "s/^(\s*username:\s*).*/\1$USERNAME/; s/^(\s*password:\s*).*/\1$PASSWORD/" "$GATEWAY_CONFIG" || true
  fi
  echo "Gateway config actualizada en: $GATEWAY_CONFIG"
else
  echo "Archivo $GATEWAY_CONFIG no encontrado; omitiendo actualización del repo."
fi

echo "Usuario creado: $USERNAME"
echo "Password generado: $PASSWORD"
echo "Guarda la contraseña de forma segura."

exit 0
