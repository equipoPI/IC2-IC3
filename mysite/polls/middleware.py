import threading

_thread_locals = threading.local()

def get_current_user():
    user = getattr(_thread_locals, 'user', None)
    req = getattr(_thread_locals, 'request', None)
    if req and hasattr(req, 'user'):
        req_user = getattr(req, 'user', None)
        if req_user and not getattr(req_user, 'is_anonymous', True):
            return req_user
    if user and not getattr(user, 'is_anonymous', True):
        return user
    return None

def get_current_ip():
    return getattr(_thread_locals, 'ip', '127.0.0.1')


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        
        # Obtener IP de origen
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        _thread_locals.ip = ip

        # Almacenar usuario previo si estuviera autenticado en sesión
        user = getattr(request, 'user', None)
        if user and not getattr(user, 'is_anonymous', True):
            _thread_locals.user = user

        response = self.get_response(request)

        # Limpiar al finalizar la petición
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        if hasattr(_thread_locals, 'user'):
            del _thread_locals.user
        if hasattr(_thread_locals, 'ip'):
            del _thread_locals.ip

        return response
