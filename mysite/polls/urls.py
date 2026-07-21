from django.urls import path, include
from . import views
from rest_framework import routers

# Router DRF para viewsets — rutas relativas al include en project urls
router = routers.DefaultRouter()
router.register(r'configuraciones-mqtt', views.ConfiguracionMQTTViewSet, basename='configuracionmqtt')
router.register(r'dispositivos', views.DispositivoSCADAViewSet, basename='dispositivo')
router.register(r'lecturas', views.LecturaSensorViewSet, basename='lectura')
router.register(r'mqtt-topics', views.TopicMQTTViewSet, basename='mqtttopic')
router.register(r'fabricas', views.FabricaViewSet, basename='fabrica')
router.register(r'ordenes', views.OrdenProduccionViewSet, basename='ordenproduccion')

urlpatterns = [
    # Rutas automáticas de DRF (registradas en router) — raíz de la API de la app
    path('', include((router.urls, 'polls'), namespace='polls')),

    # Endpoints CRUD expuestos por DRF router

    # La vista web clásica queda en 'web/' para no interferir con la raíz de la API
    path('web/', views.index, name='index'),
]