"""Funciones relacionadas con la gestión y validación de `Receta`.

Ejemplos de funciones que deberían vivir en `services` y no en `models`:
- `validar_receta_para_empleado(user, receta_data)`
- `crear_receta(user, receta_data)` (incluye permisos y transacciones)
- `calcular_coste_receta(receta)`
"""

from django.db import transaction
from django.contrib.auth.models import Group
from ..models import Receta


def calcular_coste_receta(receta):
    # ejemplo simple: sumar cantidades o usar campos en ingredientes
    return 0.0


def puede_crear_receta(user):
    # ejemplo: miembros del grupo 'Empleado' no pueden crear, 'Jefe' sí
    if user.is_superuser or user.is_staff:
        return True
    return user.groups.filter(name__in=['Jefe','Gerente','Administrador']).exists()

@transaction.atomic
def crear_receta(user, data):
    if not puede_crear_receta(user):
        raise PermissionError('No autorizado')
    receta = Receta.objects.create(**data)
    return receta
