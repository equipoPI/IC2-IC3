import requests
import json

s = requests.Session()
# Obtener csrftoken desde una GET pública (admin login)
r = s.get('http://127.0.0.1:8000/admin/login/')
print('GET /admin/login/ status', r.status_code)
print('cookies after GET:', s.cookies.get_dict())
csrftoken = s.cookies.get('csrftoken')
print('csrftoken:', csrftoken)

headers = {'Content-Type': 'application/json'}
if csrftoken:
    headers['X-CSRFToken'] = csrftoken

payload = {
    'username': 'frontuser',
    'email': 'frontuser@example.com',
    'password1': 'Abc12345!',
    'password2': 'Abc12345!',
    'first_name': 'Front',
    'last_name': 'User',
    'registration_key': 'WRONGKEY',
}

post = s.post('http://127.0.0.1:8000/api/v1/auth/registration/', headers=headers, data=json.dumps(payload))
print('POST status', post.status_code)
print('POST body', post.text)

# Ahora intentar con clave correcta desde settings via endpoint no DB
from django.conf import settings
correct = getattr(settings, 'REGISTRATION_KEY', None)
print('settings.REGISTRATION_KEY=', correct)
if correct:
    payload['registration_key'] = correct
    post2 = s.post('http://127.0.0.1:8000/api/v1/auth/registration/', headers=headers, data=json.dumps(payload))
    print('POST with correct key status', post2.status_code)
    print('POST with correct key body', post2.text)
else:
    print('No REGISTRATION_KEY configured in settings')
