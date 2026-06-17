"""Helpers de permisos y roles para la app polls.

Incluir aquí funciones reutilizables para asignar grupos, comprobar permisos por objeto,
mapear roles a permisos, y wrappers para usar en vistas/serializers.
"""

from django.contrib.auth.models import Group, Permission


def asignar_rol(user, rol_name):
    g, _ = Group.objects.get_or_create(name=rol_name)
    user.groups.add(g)
    return g


def tiene_rol(user, rol_name):
    return user.groups.filter(name=rol_name).exists()


def asegurar_permisos_basicos():
    # ejemplo: crear grupos y permisos iniciales (ejecutar en migration o adminsetup)
    pass
