# Script de verificación rápida para backend
from polls.models import Empleado
from polls.serializers import EmpleadoSerializer

print('RANGO_CHOICES:')
print(Empleado._meta.get_field('rango').choices)

s = EmpleadoSerializer()
print('\nVALIDATE_RANGO mapping for "Administrador":')
print(s.validate_rango('Administrador'))
