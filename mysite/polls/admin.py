from django.contrib import admin
from .models import Fabrica

@admin.register(Fabrica)
class FabricaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'estado', 'porcentaje_produccion', 'alarmas_activas', 'fecha_creacion')
    list_filter = ('estado', 'pais')
    search_fields = ('nombre', 'ubicacion')