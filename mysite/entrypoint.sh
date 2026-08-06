#!/usr/bin/env bash
set -e

echo "Starting entrypoint..."

# Esperar a que la base de datos esté disponible
echo "Waiting for database..."
COUNTER=0
while ! pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
  COUNTER=$((COUNTER+1))
  echo "Waiting for db... ($COUNTER)"
  sleep 1
  if [ $COUNTER -gt 60 ]; then
    echo "Database did not become ready in time"
    exit 1
  fi
done

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Running provisioning (superuser + registration config) if first run"
# Ejecutar provision_init solo la primera vez; usamos un fichero lock para evitar ejecuciones repetidas
PROVISION_LOCK_FILE=/app/.provisioned
if [ ! -f "$PROVISION_LOCK_FILE" ]; then
  echo "First-time provisioning: running provision_init"
  python manage.py provision_init || true
  # Marcar como provisionado para futuras inicializaciones
  touch "$PROVISION_LOCK_FILE"
else
  echo "Provisioning already run; skipping"
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Entrypoint finished, exec: $@"
exec "$@"
