import threading

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

def get_current_ip():
    return getattr(_thread_locals, 'ip', '127.0.0.1')


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Obtener IP de origen primero
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        _thread_locals.ip = ip

        # Almacenar el usuario en el hilo
        user = getattr(request, 'user', None)
        if not user or user.is_anonymous:
            # Intentar autenticar manualmente mediante Token de cabeceras HTTP
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Token '):
                try:
                    token_key = auth_header.split(' ')[1]
                    from rest_framework.authtoken.models import Token
                    token = Token.objects.select_related('user').get(key=token_key)
                    user = token.user
                except Exception:
                    pass
        _thread_locals.user = user

        response = self.get_response(request)

        # Limpiar al finalizar la petición para evitar fugas de memoria
        if hasattr(_thread_locals, 'user'):
            del _thread_locals.user
        if hasattr(_thread_locals, 'ip'):
            del _thread_locals.ip

        return response
