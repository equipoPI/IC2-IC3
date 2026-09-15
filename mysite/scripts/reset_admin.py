#!/usr/bin/env python3
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
import django
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

u = User.objects.filter(username='admin').first() or User.objects.filter(email='admin@example.com').first()
if not u:
    print('NO_SUPERUSER')
    sys.exit(1)

print('FOUND', u.username, u.email, 'is_superuser', u.is_superuser)
u.set_password('admin')
u.save()
print('PASSWORD_SET')
