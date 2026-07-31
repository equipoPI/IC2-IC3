#!/bin/sh
# Init script para el contenedor Mosquitto que asegura que exista /mosquitto/config/passwd

set -e

PASSFILE=/mosquitto/config/passwd

echo "[init] Comprobando archivo de contraseñas: $PASSFILE"
if [ ! -f "$PASSFILE" ]; then
  echo "[init] No existe passwd. Creando directorio y passwd con usuario admin (contraseña: admin)"
  mkdir -p $(dirname "$PASSFILE")
  # Crear el archivo passwd (usar -c para crear fichero nuevo)
  if ! mosquitto_passwd -b -c $PASSFILE admin admin 2>/dev/null; then
    if ! mosquitto_passwd -b $PASSFILE admin admin 2>/dev/null; then
      echo "[init] Warning: mosquitto_passwd no pudo crear $PASSFILE — se continúa para permitir arranque (revisar permisos del bind-mount)"
      ls -la $(dirname "$PASSFILE") || true
    fi
  fi
  chmod 640 $PASSFILE || true
else
  echo "[init] Archivo passwd ya existe. No se modifica."
fi

echo "[init] Lanzando mosquitto con configuración: /mosquitto/config/mosquitto.conf"
exec mosquitto -c /mosquitto/config/mosquitto.conf
