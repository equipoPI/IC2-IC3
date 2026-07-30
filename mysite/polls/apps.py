from django.apps import AppConfig
from django.conf import settings


def _password_reset_url_generator(request, user, temp_key):
    """Generador de URL para restablecer contraseña que apunta al frontend SPA.

    Usa la plantilla `PASSWORD_RESET_CONFIRM_URL` en settings, con placeholders
    `{uid}` y `{token}`. Esto evita el reverse('password_reset_confirm') que
    no existe en este proyecto SPA-backed.
    """
    try:
        # Si usamos django-allauth, generar el uid con su utilitario
        # (usa base36/representación adecuada para el campo esperado).
        if 'allauth' in settings.INSTALLED_APPS:
            from allauth.account.utils import user_pk_to_url_str
            uid = user_pk_to_url_str(user)
        else:
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            uid = urlsafe_base64_encode(force_bytes(user.pk))
    except Exception:
        return settings.PASSWORD_RESET_CONFIRM_URL.format(uid='', token=temp_key)

    return settings.PASSWORD_RESET_CONFIRM_URL.format(uid=uid, token=temp_key)


class PollsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'polls'

    def ready(self):
        # Parchear el generador de URL por defecto usado por dj-rest-auth
        try:
            import dj_rest_auth.forms as _dj_forms
            _dj_forms.default_url_generator = _password_reset_url_generator
        except Exception:
            # No bloquear el arranque si por alguna razón dj_rest_auth no está
            # disponible en tiempo de importación.
            pass
