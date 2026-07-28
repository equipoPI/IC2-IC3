import json
from django.test import Client

c = Client(enforce_csrf_checks=True)
# GET to obtain csrftoken cookie
r = c.get('/admin/login/')
print('GET /admin/login/ status', r.status_code)
print('Cookies after GET:', {k: v.value for k, v in c.cookies.items()})
csrftoken = c.cookies.get('csrftoken').value if c.cookies.get('csrftoken') else None

headers = {}
if csrftoken:
    headers['HTTP_X_CSRFTOKEN'] = csrftoken

payload = {
    'username': 'testhttp',
    'email': 'httpreg@example.com',
    'password1': 'Abc12345!',
    'password2': 'Abc12345!',
    'first_name': 'H',
    'last_name': 'T',
    'registration_key': 'WRONGKEY',
}

resp = c.post('/api/v1/auth/registration/', data=json.dumps(payload), content_type='application/json', **headers)
print('POST status', resp.status_code)
print('POST resp body:', resp.content.decode())

# Now try with correct key from settings
from django.conf import settings
correct = getattr(settings, 'REGISTRATION_KEY', None)
print('settings.REGISTRATION_KEY=', correct)
if correct:
    payload['registration_key'] = correct
    resp2 = c.post('/api/v1/auth/registration/', data=json.dumps(payload), content_type='application/json', **headers)
    print('POST with correct key status', resp2.status_code)
    print('POST with correct key body:', resp2.content.decode())
else:
    print('No REGISTRATION_KEY in settings')
