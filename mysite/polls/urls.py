from django.urls import path, include
from . import views
from rest_framework import routers

# Router DRF para viewsets
router = routers.DefaultRouter()
router.register(r'api/configuraciones-mqtt', views.ConfiguracionMQTTViewSet, basename='configuracionmqtt')

urlpatterns = [
    # La vista web clásica por defecto
    path('', views.index, name='index'),
    
    # Puente de datos(API)
    path('api/fabricas/', views.api_lista_fabricas, name='api_fabricas'),
    path('api/fabricas/<int:pk>/', views.api_detalle_fabrica, name='api_detalle_fabrica'),
    path('api/ordenes/', views.api_lista_ordenes, name='api_lista_ordenes'),
    path('api/ordenes/<int:pk>/', views.api_detalle_orden, name='api_detalle_orden'),
    # Rutas automáticas de DRF
    path('', include((router.urls, 'polls'), namespace='polls')),
]