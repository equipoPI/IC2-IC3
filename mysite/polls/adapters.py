from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    """Adapter para django-allauth que construye un enlace de confirmación
    que apunta al frontend SPA en lugar de a la vista de confirmación del
    backend. Devuelve: {FRONTEND_URL}/verify-email?key=<key>
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        key = emailconfirmation.key
        frontend = getattr(settings, 'FRONTEND_URL', None) or 'http://localhost:5173'
        return f"{frontend.rstrip('/')}/verify-email?key={key}"
