from dj_rest_auth.views import LoginView as _LoginView, LogoutView as _LogoutView
from dj_rest_auth.views import UserDetailsView as _UserDetailsView
from dj_rest_auth.registration.views import RegisterView as _RegisterView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import CustomRegisterSerializer


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
    # En despliegues privados, deshabilitamos el registro público. El login
    # debe permanecer accesible para usuarios que aún no tienen sesión.
    permission_classes = [IsAuthenticated]
