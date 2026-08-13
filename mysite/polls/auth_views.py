from dj_rest_auth.views import LoginView as _LoginView, LogoutView as _LogoutView
from dj_rest_auth.views import UserDetailsView as _UserDetailsView
from dj_rest_auth.registration.views import RegisterView as _RegisterView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import CustomRegisterSerializer
from dj_rest_auth.views import PasswordResetView as _PasswordResetView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User


class LoginView(_LoginView):
    """Inicio de sesión.

    Comprueba las credenciales y devuelve el token REST si son válidas.
    Parámetros POST aceptados: `username` o `email` y `password`.
    Respuesta: objeto token con la clave para autenticar futuras llamadas.
    """
    permission_classes = [AllowAny]


class LogoutView(_LogoutView):
    """Cerrar sesión.

    Revoca la sesión o token actual según la estrategia configurada.
    """
    pass


class UserDetailsView(_UserDetailsView):
    """Detalles del usuario autenticado.

    Devuelve información del usuario actual (email, nombre, apellidos, id).
    """
    pass


class RegisterView(_RegisterView):
    """Registro de usuario (crea usuario inactivo y envía email de verificación).

    Campos esperados (POST): `username`, `email`, `password1`, `password2`,
    `first_name`, `last_name`, `registration_key`.
    El usuario se crea inactivo y se activará tras confirmar el email.
    """
    # Forzar el uso del serializer personalizado que valida `registration_key`.
    serializer_class = CustomRegisterSerializer
    # En despliegues privados, puede desearse deshabilitar el registro público.
    # Para la SPA de desarrollo permitimos el acceso público a este endpoint.
    permission_classes = [AllowAny]


class PasswordResetView(_PasswordResetView):
    """Override del envío de password-reset para validar existencia del email.

    Por defecto muchas implementaciones devuelven siempre 200 para evitar
    enumeración de usuarios; aquí validamos explícitamente y devolvemos 400
    si el email no está registrado (opcional, según política de seguridad).
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '')
        if not email:
            return Response({'email': 'Se requiere un correo electrónico.'}, status=status.HTTP_400_BAD_REQUEST)
        if not User.objects.filter(email__iexact=email).exists():
            return Response({'email': 'No existe ningún usuario con ese correo.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().post(request, *args, **kwargs)
