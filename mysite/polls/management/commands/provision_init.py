from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from polls.models import RegistrationConfig
from allauth.account.models import EmailAddress
from polls.models import Profile
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

        # Asegurar que la cuenta de correo esté registrada en allauth y verificada
        try:
            user = User.objects.get(username=username)
            ea, created = EmailAddress.objects.get_or_create(user=user, email=user.email, defaults={'verified': True, 'primary': True})
            if not created:
                changed = False
                if not ea.verified:
                    ea.verified = True
                    changed = True
                if not ea.primary:
                    ea.primary = True
                    changed = True
                if changed:
                    ea.save()

            # Marcar profile.email_confirmed si existe o crear profile
            try:
                profile = user.profile
                profile.email_confirmed = True
                profile.save()
            except Exception:
                # Crear profile si no existe
                try:
                    Profile.objects.create(user=user, email_confirmed=True)
                except Exception:
                    pass
            self.stdout.write(self.style.SUCCESS(f'EmailAddress for "{username}" ensured and verified'))
        except Exception:
            self.stdout.write('Could not ensure EmailAddress/profile for superuser')

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
