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

echo "Running provisioning (superuser + registration config)"
python manage.py provision_init || python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); username='${DJANGO_SUPERUSER_USERNAME:-admin}'; email='${DJANGO_SUPERUSER_EMAIL:-admin@example.com}'; password='${DJANGO_SUPERUSER_PASSWORD:-admin}';
if not User.objects.filter(username=username).exists():
  User.objects.create_superuser(username=username, email=email, password=password)
  print('Superuser created')
else:
  print('Superuser already exists')"

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Entrypoint finished, exec: $@"
exec "$@"
