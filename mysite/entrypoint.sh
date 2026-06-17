#!/bin/sh
set -e

echo "Starting entrypoint..."

# Wait for the database to be ready
echo "Waiting for database..."
RETRY=0
until [ $RETRY -ge 30 ]
do
  if python manage.py dbshell >/dev/null 2>&1; then
    echo "Database is ready"
    break
  fi
  RETRY=$((RETRY+1))
  echo "Waiting for db... ($RETRY)"
  sleep 1
done

echo "Applying migrations..."
cd /app || true
python manage.py migrate --noinput

# Create superuser if env vars are set and user doesn't exist
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  echo "Ensuring superuser exists: $DJANGO_SUPERUSER_USERNAME"
  cd /app || true
  python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); username='${DJANGO_SUPERUSER_USERNAME}'; email='${DJANGO_SUPERUSER_EMAIL}'; password='${DJANGO_SUPERUSER_PASSWORD}';
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password);
    print('Superuser created:', username)
else:
    print('Superuser already exists:', username)"
else
  echo "DJANGO_SUPERUSER_* variables not set; skipping superuser creation"
fi

# Exec the container command (from docker-compose)
exec "$@"
