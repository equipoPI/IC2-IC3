<<<<<<< HEAD
import logging

logger = logging.getLogger('scada')


class DebugCSRFMiddleware:
    """Middleware temporal para loggear información CSRF en peticiones críticas.

    Registra `X-CSRFToken`, cookies, Origin y Referer para ayudar a depurar
    por qué Django devuelve 403 en endpoints de restablecimiento.
    """

=======
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
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
<<<<<<< HEAD
        try:
            path = getattr(request, 'path', '')
            if path and '/api/v1/auth/password/reset/confirm' in path:
                logger.debug('--- DebugCSRFMiddleware START ---')
                logger.debug('Request path: %s', path)
                logger.debug('REMOTE_ADDR: %s', request.META.get('REMOTE_ADDR'))
                logger.debug('HTTP_ORIGIN: %s', request.META.get('HTTP_ORIGIN'))
                logger.debug('HTTP_REFERER: %s', request.META.get('HTTP_REFERER'))
                logger.debug('HTTP_COOKIE: %s', request.META.get('HTTP_COOKIE'))
                logger.debug('Cookie csrftoken: %s', request.COOKIES.get('csrftoken'))
                header = request.META.get('HTTP_X_CSRFTOKEN')
                logger.debug('Header X-CSRFToken: %s', header)
                # Si falta el header pero hay cookie, inyectarlo para pasar la verificación CSRF
                if not header and request.COOKIES.get('csrftoken'):
                    injected = request.COOKIES.get('csrftoken')
                    request.META['HTTP_X_CSRFTOKEN'] = injected
                    logger.debug('Inyectado HTTP_X_CSRFTOKEN desde cookie')
                logger.debug('--- DebugCSRFMiddleware END ---')
        except Exception as e:
            logger.exception('Error in DebugCSRFMiddleware: %s', e)
        return self.get_response(request)
=======
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
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
