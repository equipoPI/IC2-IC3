from django.contrib import admin
from django.apps import apps
from .models import (
    Fabrica, Seccion, Empleado, DispositivoSCADA,
)
from .models import ConfiguracionMQTT


@admin.register(Fabrica)
class FabricaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'estado', 'porcentaje_produccion', 'alarmas_activas', 'fecha_creacion')
    list_filter = ('estado', 'pais')
    search_fields = ('nombre', 'ubicacion')


@admin.register(Seccion)
class SeccionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'fabrica', 'capacidad_trabajadores')
    search_fields = ('nombre', 'fabrica__nombre')


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'documento', 'fabrica', 'seccion', 'estado', 'email')
    search_fields = ('nombre', 'apellido', 'documento', 'email')
    list_filter = ('estado', 'rango', 'tipo_empleado')


@admin.register(DispositivoSCADA)
class DispositivoAdmin(admin.ModelAdmin):
    list_display = ('numero_serie', 'nombre', 'categoria', 'sistema', 'estado', 'topic_mqtt')
    search_fields = ('numero_serie', 'nombre', 'topic_mqtt', 'sistema__nombre')
    list_filter = ('categoria', 'estado')


# Registrar automáticamente el resto de modelos de la app `polls` que no hayan sido registrados arriba
app_models = apps.get_app_config('polls').get_models()
for model in app_models:
    try:
        if model not in admin.site._registry:
            admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass


# Registrar explícitamente ConfiguracionMQTT con configuración básica
class ConfiguracionMQTTAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'broker_url', 'puerto', 'activo')
    search_fields = ('nombre', 'broker_url')
    list_filter = ('activo', 'usar_tls')

# Registrar solo si no fue registrado por el registro automático anterior
if ConfiguracionMQTT not in admin.site._registry:
    admin.site.register(ConfiguracionMQTT, ConfiguracionMQTTAdmin)