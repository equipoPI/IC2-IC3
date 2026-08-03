from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from polls.models import RegistrationConfig
import os


class Command(BaseCommand):
    help = 'Provision initial data: create superuser and RegistrationConfig from REGISTRATION_KEY env'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin')

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created'))
        else:
            self.stdout.write(f'Superuser "{username}" already exists')

        rk = os.environ.get('REGISTRATION_KEY')
        if rk:
            obj = RegistrationConfig.objects.filter(clave=rk, activo=True).first()
            if not obj:
                RegistrationConfig.objects.create(clave=rk, activo=True)
                self.stdout.write(self.style.SUCCESS('RegistrationConfig created from REGISTRATION_KEY'))
            else:
                self.stdout.write('Active RegistrationConfig for env key already exists')
        else:
            self.stdout.write('No REGISTRATION_KEY in environment; skipping RegistrationConfig creation')
