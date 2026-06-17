from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'fabricas', views.FabricaViewSet, basename='fabrica')
router.register(r'dispositivos', views.DispositivoSCADAViewSet, basename='dispositivoscada')
router.register(r'lecturas', views.LecturaSensorViewSet, basename='lecturasensor')
router.register(r'ordenes-produccion', views.OrdenProduccionViewSet, basename='ordenproduccion')

urlpatterns = [
    path("", views.index, name="index"),
    path("api/", include(router.urls)),
]