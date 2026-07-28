from django.http import JsonResponse, HttpResponseForbidden


def csrf_failure(request, reason=""):
    """Vista personalizada para fallos CSRF que devuelve mensaje en español.

    Devuelve JSON con `detail` cuando la petición espera JSON (AJAX/fetch),
    o un `HttpResponseForbidden` con texto plano en otro caso.
    """
    origin = request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER', '')
    origin_text = f" - {origin}" if origin else ''
    msg = f"Fallo de CSRF: verificación de origen fallida{origin_text}. Asegúrese de que el frontend está usando el origen correcto y que '{origin}' está en CSRF_TRUSTED_ORIGINS."

    accept = request.META.get('HTTP_ACCEPT', '')
    xrw = request.META.get('HTTP_X_REQUESTED_WITH', '')
    if 'application/json' in accept or xrw == 'XMLHttpRequest':
        return JsonResponse({'detail': msg}, status=403)

    return HttpResponseForbidden(msg)
