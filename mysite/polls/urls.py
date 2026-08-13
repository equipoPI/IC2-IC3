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
router.register(r'secciones', views.SeccionViewSet, basename='seccion')
router.register(r'empleados', views.EmpleadoViewSet, basename='empleado')
router.register(r'inventarios', views.InventarioViewSet, basename='inventario')
router.register(r'items-inventario', views.ItemInventarioViewSet, basename='iteminventario')
router.register(r'movimientos', views.HistorialMovimientosViewSet, basename='movimientos')
router.register(r'cronogramas', views.CronogramaSeccionViewSet, basename='cronogramas')
router.register(r'producciones', views.ProduccionViewSet, basename='producciones')
router.register(r'registros-mantenimiento', views.RegistroMantenimientoViewSet, basename='registros_mantenimiento')
router.register(r'sistemas', views.SistemaViewSet, basename='sistema')
router.register(r'plantillas', views.PlantillaProduccionViewSet, basename='plantillas')
router.register(r'ingredientes', views.IngredienteAlmacenamientoViewSet, basename='ingredientes')
router.register(r'mantenimientos-programados', views.MantenimientoProgramadoViewSet, basename='mantenimientos')
router.register(r'unidades-almacenamiento', views.UnidadAlmacenamientoViewSet, basename='unidades')
router.register(r'historial-produccion', views.HistorialProduccionViewSet, basename='historial_produccion')
router.register(r'comunicaciones-mqtt', views.ComunicacionMQTTViewSet, basename='comunicaciones_mqtt')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'auditoria', views.RegistroAuditoriaViewSet, basename='auditoria')

urlpatterns = [
    # Rutas automáticas de DRF (registradas en router) — raíz de la API de la app
    # API root personalizado: mostrar un índice ampliado en la raíz /api/v1/
    # Colocado antes del include para que `/api/v1/` muestre `api_root`.
    path('', views.api_root, name='api_root'),
    path('', include((router.urls, 'polls'), namespace='polls')),

    # Endpoints CRUD expuestos por DRF router

    # La vista web clásica queda en 'web/' para no interferir con la raíz de la API
    path('web/', views.index, name='index'),
    # Registro público
    path('auth/register/', views.RegisterAPIView.as_view(), name='auth_register'),
    # Fallback para confirmación de email desde SPA (GET, sin CSRF)
    path('auth/registration/verify-email-get/', views.verify_email_get, name='auth_verify_email_get'),
]