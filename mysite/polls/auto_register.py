from django.apps import apps
from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny


def register_all_models(router):
    """Registra dinámicamente todos los modelos de la app `polls` en el router.

    Se crean Serializers y ModelViewSets básicos (fields='__all__') para cada
    modelo y se registran bajo su nombre de modelo. Se omiten modelos de
    terceros y los que ya estén registrados en el router.
    """
    poll_models = apps.get_app_config('polls').get_models()

    # Obtener prefijos ya registrados para evitar duplicados
    existing_prefixes = {entry[0] for entry in getattr(router, 'registry', [])}

    skip_models = {'contenttype', 'permission'}

    for model in poll_models:
        name = model._meta.model_name
        if name in skip_models:
            continue
        if name in existing_prefixes:
            continue

        # Crear Meta dinámico para el serializer
        Meta = type('Meta', (), {'model': model, 'fields': '__all__'})

        SerializerClass = type(f'{model.__name__}Serializer', (serializers.ModelSerializer,), {
            'Meta': Meta,
        })

        ViewSetClass = type(f'{model.__name__}ViewSet', (viewsets.ModelViewSet,), {
            'queryset': model.objects.all(),
            'serializer_class': SerializerClass,
            'permission_classes': [AllowAny],
        })

        router.register(name, ViewSetClass, basename=name)
