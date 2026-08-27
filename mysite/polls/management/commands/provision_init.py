from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from polls.models import RegistrationConfig, Profile, Fabrica, Seccion, Empleado
from allauth.account.models import EmailAddress
import os


class Command(BaseCommand):
    help = 'Provision initial data: create superuser, default Fabrica/Seccion, linked Empleado and RegistrationConfig'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin')

        # 1. Crear o recuperar Fabrica y Seccion por defecto
        fab, _ = Fabrica.objects.get_or_create(
            nombre='Planta Principal',
            defaults={'pais': 'Argentina', 'ubicacion': 'Sede Central', 'estado': 'OPERATIVO'}
        )
        sec, _ = Seccion.objects.get_or_create(
            nombre='Administración',
            fabrica=fab,
            defaults={'capacidad_trabajadores': 10, 'tamano_seccion': 100.0}
        )
        self.stdout.write(self.style.SUCCESS(f'Default Fabrica ("{fab.nombre}") and Seccion ("{sec.nombre}") ensured'))

        # 2. Crear o recuperar Superusuario
        user, created = User.objects.get_or_create(username=username, defaults={'email': email})
        if created:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created'))
        else:
            if email and user.email != email:
                user.email = email
                user.save()
            self.stdout.write(f'Superuser "{username}" already exists')

        # 3. Asegurar cuenta de correo en allauth y verificarla
        try:
            ea, ea_created = EmailAddress.objects.get_or_create(user=user, email=user.email, defaults={'verified': True, 'primary': True})
            if not ea_created:
                changed = False
                if not ea.verified:
                    ea.verified = True
                    changed = True
                if not ea.primary:
                    ea.primary = True
                    changed = True
                if changed:
                    ea.save()

            profile, _ = Profile.objects.get_or_create(user=user)
            if not profile.email_confirmed:
                profile.email_confirmed = True
                profile.save()

            self.stdout.write(self.style.SUCCESS(f'EmailAddress for "{username}" ensured and verified'))
        except Exception as e:
            self.stdout.write(f'Could not ensure EmailAddress/profile for superuser: {e}')

        # 4. Crear o asociar registro Empleado para el superusuario
        try:
            emp = Empleado.objects.filter(user=user).first()
            if not emp:
                emp = Empleado.objects.filter(documento=username).first()
                if emp:
                    emp.user = user
                    emp.email = user.email
                    emp.rango = '8'
                    emp.save()
                else:
                    emp = Empleado.objects.create(
                        user=user,
                        nombre=user.first_name or 'Admin',
                        apellido=user.last_name or 'Sistema',
                        documento=username,
                        fabrica=fab,
                        seccion=sec,
                        rango='8',  # Administrador
                        fecha_contratacion=now().date(),
                        contacto='',
                        direccion='',
                        email=user.email,
                        estado='ACTIVO'
                    )
                self.stdout.write(self.style.SUCCESS(f'Empleado record linked for superuser "{username}"'))
            else:
                if emp.email != user.email:
                    emp.email = user.email
                    emp.save()
                self.stdout.write(f'Empleado record for "{username}" already exists')
        except Exception as e:
            self.stdout.write(f'Could not ensure Empleado record for superuser: {e}')

        # 5. RegistrationConfig
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

