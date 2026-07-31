import logging

logger = logging.getLogger('scada')


class DebugCSRFMiddleware:
    """Middleware temporal para loggear información CSRF en peticiones críticas.

    Registra `X-CSRFToken`, cookies, Origin y Referer para ayudar a depurar
    por qué Django devuelve 403 en endpoints de restablecimiento.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
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
