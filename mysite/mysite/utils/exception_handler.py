from rest_framework.views import exception_handler

# Mapeo básico de mensajes en inglés -> español
TRANSLATIONS = {
    'This field is required.': 'Este campo es obligatorio.',
    'A user with that username already exists.': 'Usuario ya existente.',
    'A user is already registered with this e-mail address.': 'Ya existe un usuario con este correo.',
    'Enter a valid email address.': 'Ingrese una dirección de correo válida.',
    'Invalid credentials': 'Credenciales incorrectas.',
    'Unable to log in with provided credentials.': 'No se puede iniciar sesión con las credenciales proporcionadas.',
    'CSRF Failed: CSRF token missing.': 'Fallo de CSRF: falta el token CSRF.',
    'CSRF Failed: Origin checking failed': 'Fallo de CSRF: verificación de origen fallida.',
}


def translate_value(val):
    if isinstance(val, str):
        # Traducción exacta
        if val in TRANSLATIONS:
            return TRANSLATIONS[val]
        # Traducción para mensajes que empiezan con ciertos prefijos (p.ej. CSRF)
        if val.startswith('CSRF Failed'):
            return TRANSLATIONS.get('CSRF Failed: Origin checking failed', 'Fallo de CSRF.')
        return TRANSLATIONS.get(val, val)
    if isinstance(val, list):
        return [translate_value(v) for v in val]
    if isinstance(val, dict):
        return {k: translate_value(v) for k, v in val.items()}
    return val


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None and hasattr(response, 'data'):
        response.data = translate_value(response.data)
    return response
