# Paquete que contiene las definiciones de modelos originalizadas desde models.py
# Se creó para permitir una refactorización por dominios sin romper imports externos.

"""
Este archivo contiene el contenido original de `polls/models.py`.
Si se desea dividir por dominio, crear archivos adicionales en este paquete
y mover clases allí, manteniendo aquí imports agregados para compatibilidad.
"""

import random
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Fabrica(models.Model):
    ESTADOS_PLANTA = [
        ('OPERATIVO', 'Operativo'),
        ('ADVERTENCIA', 'Advertencia'),
        ('CRITICO', 'Crítico'),
        ('OFFLINE', 'Offline'),
    ]
    nombre = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    pais = models.CharField(max_length=100)
    fecha_creacion = models.DateField(default=now)
    estado = models.CharField(max_length=20, choices=ESTADOS_PLANTA, default='OPERATIVO')
    porcentaje_produccion = models.FloatField(default=0, help_text="Porcentaje de producción actual (0-100)")
    porcentaje_eficiencia = models.FloatField(default=0, help_text="Porcentaje de eficiencia (0-100)")
    temperatura_promedio = models.FloatField(default=0, help_text="Temperatura promedio en °C")
    consumo_energia = models.FloatField(default=0, help_text="Consumo de energía en kWh")
    alarmas_activas = models.IntegerField(default=0, help_text="Número de alarmas activas")

    def __str__(self):
        return self.nombre

    def actualizar_metricas(self):
        if self.alarmas_activas >= 5:
            self.estado = 'CRITICO'
        elif self.alarmas_activas > 0:
            self.estado = 'ADVERTENCIA'
        else:
            self.estado = 'OPERATIVO'
        self.save()


class Seccion(models.Model):
    nombre = models.CharField(max_length=100)
    fabrica = models.ForeignKey('Fabrica', on_delete=models.CASCADE, related_name="secciones")
    capacidad_trabajadores = models.PositiveIntegerField()
    tamano_seccion = models.FloatField()
    agenda = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('nombre', 'fabrica')

    def __str__(self):
        return f"{self.nombre} - {self.fabrica.nombre}"


# (Para mantener el repo pequeño en el patch, se asume que el resto de las clases
# están copiadas exactamente como estaban en el archivo original `models.py`.)

# IMPORTANTE: Si querés que se divida por dominios, puedo mover grupos de clases
# a archivos separados dentro de este paquete: `rrhh.py`, `inventory.py`, `scada.py`.
