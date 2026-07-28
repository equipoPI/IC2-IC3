from django.shortcuts import render
from django.http import HttpResponse

# --- Importaciones de Django REST Framework ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# --- Importaciones de Modelos y Serializers ---
# ACÁ AGREGAMOS ORDENPRODUCCION
from .models import Fabrica, OrdenProduccion, Receta, HistorialProduccion, DispositivoSCADA, LecturaSensor
from .serializers import (
    FabricaSerializer,
    OrdenProduccionSerializer, 
    OrdenProduccionListSerializer,
    RecetaSerializer,
    DispositivoSCADASerializer,
    LecturaSensorSerializer,
) 
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from .models import ConfiguracionMQTT
from .serializers import ConfiguracionMQTTSerializer
from .models import TopicMQTT
from .serializers import TopicMQTTSerializer
from . import models
from .serializers import (
    SeccionSerializer,
    EmpleadoSerializer,
    InventarioSerializer,
    ItemInventarioSerializer,
    HistorialMovimientosSerializer,
    CronogramaSeccionSerializer,
    ProduccionSerializer,
    RegistroMantenimientoSerializer,
    SistemaSerializer,
    PlantillaProduccionSerializer,
    IngredienteAlmacenamientoSerializer,
    MantenimientoProgramadoSerializer,
    UnidadAlmacenamientoSerializer,
    HistorialProduccionSerializerBasic,
    ComunicacionMQTTSerializer,
)
from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer, ProfileSerializer
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from allauth.account.models import EmailConfirmation
from django.utils import timezone


@ensure_csrf_cookie
def api_csrf_token(request):
    """Devuelve el token CSRF actual en JSON para que la SPA lo use en headers.

    Esto evita problemas donde la cookie CSRF no es legible desde JS
    (SameSite/Secure) y permite al frontend obtener el token explícitamente.
    """
    token = get_token(request)
    return JsonResponse({'csrfToken': token})


class UserViewSet(viewsets.ModelViewSet):
    """Exponer usuarios (solo admins pueden listar/editar)."""
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class ProfileViewSet(viewsets.ModelViewSet):
    """Exponer profiles (admins o self-view)."""
    queryset = models.Profile.objects.all().order_by('-created_at')
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class RegisterAPIView(generics.CreateAPIView):
    """Endpoint público para registrar cuentas. Crea usuario inactivo.

    POST payload: `username`, `email`, `password`, `first_name`, `last_name`
    """
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        # Profile se crea automáticamente por la señal post_save
        # Aquí podríamos enviar email de confirmación (pendiente SMTP)
        return user


class ConfiguracionMQTTViewSet(viewsets.ModelViewSet):
    """CRUD para configuraciones MQTT"""
    queryset = ConfiguracionMQTT.objects.all().order_by('-id')
    serializer_class = ConfiguracionMQTTSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class DispositivoSCADAViewSet(viewsets.ModelViewSet):
    """CRUD para dispositivos SCADA"""
    queryset = DispositivoSCADA.objects.all().order_by('numero_serie')
    serializer_class = DispositivoSCADASerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class LecturaSensorViewSet(viewsets.ModelViewSet):
    """CRUD para lecturas de sensores"""
    queryset = LecturaSensor.objects.all().order_by('-timestamp')
    serializer_class = LecturaSensorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class TopicMQTTViewSet(viewsets.ModelViewSet):
    """CRUD para topics MQTT"""
    queryset = TopicMQTT.objects.all().order_by('id')
    serializer_class = TopicMQTTSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# =============================================================================
# Vistas tradicionales
# =============================================================================
def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")


@ensure_csrf_cookie
def api_csrf(request):
    """Endpoint simple para poner la cookie CSRF (GET).

    Útil para SPAs que necesitan que el proxy (`/api`) solicite primero
    este endpoint y así obtener la cookie `csrftoken` del backend.
    """
    return JsonResponse({'ok': True})



@csrf_exempt
def verify_email_get(request):
    """Confirmar email vía GET con parámetro `key`.

    Útil como fallback cuando la verificación por POST falla por CSRF
    en SPAs de desarrollo. Devuelve 200 {'detail':'ok'} o 404.
    """
    key = request.GET.get('key')
    if not key:
        return JsonResponse({'detail': 'No encontrado.'}, status=404)
    conf = EmailConfirmation.from_key(key)
    if not conf:
        return JsonResponse({'detail': 'No encontrado.'}, status=404)
    try:
        # Algunos objetos EmailConfirmation creados por pruebas no tienen
        # el campo `sent` inicializado; Confirm requiere `sent` no-null.
        if getattr(conf, 'sent', None) is None:
            conf.sent = timezone.now()
            conf.save()
        conf.confirm(request)
        return JsonResponse({'detail': 'ok'})
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)


# =============================================================================
# Vistas de la API - MÓDULO DE FÁBRICAS
# =============================================================================
class FabricaViewSet(viewsets.ModelViewSet):
    """CRUD para Fabricas/Plantas"""
    queryset = Fabrica.objects.all()
    serializer_class = FabricaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class OrdenProduccionViewSet(viewsets.ModelViewSet):
    """CRUD para Ordenes de Producción. Usa serializer reducido en list."""
    queryset = OrdenProduccion.objects.all().order_by('-fecha_creacion')
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return OrdenProduccionListSerializer
        return OrdenProduccionSerializer


# -----------------------------------------------------------------------------
# ViewSets adicionales: Exponer manualmente los modelos restantes para CRUD
# Permisos: `IsAuthenticatedOrReadOnly` permite desarrollo SPA sin login
# pero protege cambios cuando se requiera cambiar por `IsAdminUser`.
# -----------------------------------------------------------------------------


class SeccionViewSet(viewsets.ModelViewSet):
    queryset = models.Seccion.objects.all().order_by('nombre')
    serializer_class = SeccionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = models.Empleado.objects.all().order_by('apellido')
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class InventarioViewSet(viewsets.ModelViewSet):
    queryset = models.Inventario.objects.all().order_by('id')
    serializer_class = InventarioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ItemInventarioViewSet(viewsets.ModelViewSet):
    queryset = models.ItemInventario.objects.all().order_by('numero_serie')
    serializer_class = ItemInventarioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class HistorialMovimientosViewSet(viewsets.ModelViewSet):
    queryset = models.HistorialMovimientos.objects.all().order_by('-fecha_hora')
    serializer_class = HistorialMovimientosSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class CronogramaSeccionViewSet(viewsets.ModelViewSet):
    queryset = models.CronogramaSeccion.objects.all().order_by('fecha_inicio')
    serializer_class = CronogramaSeccionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProduccionViewSet(viewsets.ModelViewSet):
    queryset = models.Produccion.objects.all().order_by('-fecha_inicio')
    serializer_class = ProduccionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class RegistroMantenimientoViewSet(viewsets.ModelViewSet):
    queryset = models.RegistroMantenimiento.objects.all().order_by('-fecha_inicio')
    serializer_class = RegistroMantenimientoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class SistemaViewSet(viewsets.ModelViewSet):
    queryset = models.Sistema.objects.all().order_by('nombre')
    serializer_class = SistemaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class PlantillaProduccionViewSet(viewsets.ModelViewSet):
    queryset = models.PlantillaProduccion.objects.all().order_by('-fecha_creacion')
    serializer_class = PlantillaProduccionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class IngredienteAlmacenamientoViewSet(viewsets.ModelViewSet):
    queryset = models.IngredienteAlmacenamiento.objects.all().order_by('nombre')
    serializer_class = IngredienteAlmacenamientoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class MantenimientoProgramadoViewSet(viewsets.ModelViewSet):
    queryset = models.MantenimientoProgramado.objects.all().order_by('fecha_inicio')
    serializer_class = MantenimientoProgramadoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class UnidadAlmacenamientoViewSet(viewsets.ModelViewSet):
    queryset = models.UnidadAlmacenamiento.objects.all().order_by('nombre')
    serializer_class = UnidadAlmacenamientoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class HistorialProduccionViewSet(viewsets.ModelViewSet):
    queryset = models.HistorialProduccion.objects.all().order_by('-fecha_registro')
    serializer_class = HistorialProduccionSerializerBasic
    permission_classes = [IsAuthenticatedOrReadOnly]


class ComunicacionMQTTViewSet(viewsets.ModelViewSet):
    queryset = models.ComunicacionMQTT.objects.all().order_by('-timestamp')
    serializer_class = ComunicacionMQTTSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


@api_view(['GET','POST','PUT','PATCH','DELETE','OPTIONS'])
@permission_classes([AllowAny])
def api_root(request, format=None):
    """API root que acepta todos los métodos para facilitar pruebas desde UI.

    Dev: este endpoint devuelve un resumen simple de rutas registradas.
    En producción se recomienda limitar métodos y autenticar.
    """
    # Construimos manualmente un índice enriquecido (nombre => {url, description})
    base = request.build_absolute_uri('/')
    return Response({
        'fabricas': {
            'url': base + 'api/v1/fabricas/',
            'description': 'CRUD de fábricas/plantas',
        },
        'secciones': {
            'url': base + 'api/v1/secciones/',
            'description': 'Secciones dentro de una fábrica',
        },
        'empleados': {
            'url': base + 'api/v1/empleados/',
            'description': 'Gestión de empleados',
        },
        'dispositivos': {
            'url': base + 'api/v1/dispositivos/',
            'description': 'Dispositivos SCADA registrados',
        },
        'lecturas': {
            'url': base + 'api/v1/lecturas/',
            'description': 'Lecturas de sensores (time series)',
        },
        'configuraciones_mqtt': {
            'url': base + 'api/v1/configuraciones-mqtt/',
            'description': 'Credenciales y prefijos MQTT',
        },
        'mqtt_topics': {
            'url': base + 'api/v1/mqtt-topics/',
            'description': 'Listado y reglas para topics MQTT',
        },
        'ordenes': {
            'url': base + 'api/v1/ordenes/',
            'description': 'Órdenes de producción (CRUD)',
        },
        'recetas': {
            'url': base + 'api/v1/recetas/',
            'description': 'Recetas y fórmulas de producción',
        },
        'producciones': {
            'url': base + 'api/v1/producciones/',
            'description': 'Registros de producción',
        },
        'inventarios': {
            'url': base + 'api/v1/inventarios/',
            'description': 'Inventarios por almacén',
        },
        'items_inventario': {
            'url': base + 'api/v1/items-inventario/',
            'description': 'Items individuales en inventario',
        },
        'movimientos': {
            'url': base + 'api/v1/movimientos/',
            'description': 'Movimientos de stock',
        },
        'cronogramas': {
            'url': base + 'api/v1/cronogramas/',
            'description': 'Cronogramas por sección',
        },
        'registros_mantenimiento': {
            'url': base + 'api/v1/registros-mantenimiento/',
            'description': 'Historial de mantenimiento',
        },
        'sistemas': {
            'url': base + 'api/v1/sistemas/',
            'description': 'Sistemas y subsistemas gestionados',
        },
        'plantillas': {
            'url': base + 'api/v1/plantillas/',
            'description': 'Plantillas de producción',
        },
        'ingredientes': {
            'url': base + 'api/v1/ingredientes/',
            'description': 'Ingredientes y materias primas',
        },
        'mantenimientos_programados': {
            'url': base + 'api/v1/mantenimientos-programados/',
            'description': 'Tareas de mantenimiento programadas',
        },
        'unidades_almacenamiento': {
            'url': base + 'api/v1/unidades-almacenamiento/',
            'description': 'Unidades físicas de almacenamiento',
        },
        'historial_produccion': {
            'url': base + 'api/v1/historial-produccion/',
            'description': 'Historial agregado de producción',
        },
        'comunicaciones_mqtt': {
            'url': base + 'api/v1/comunicaciones-mqtt/',
            'description': 'Mensajes y eventos MQTT registrados',
        },
        # Auth endpoints (dj-rest-auth / allauth)
        'auth_login': {
            'url': base + 'api/v1/auth/login/',
            'description': 'Inicio de sesión (email + password)',
        },
        'auth_logout': {
            'url': base + 'api/v1/auth/logout/',
            'description': 'Cerrar sesión (token/session)',
        },
        'auth_user': {
            'url': base + 'api/v1/auth/user/',
            'description': 'Detalle del usuario autenticado',
        },
        'auth_registration': {
            'url': base + 'api/v1/auth/registration/',
            'description': 'Registro de usuario y solicitud de verificación',
        },
        'auth_verify_email': {
            'url': base + 'api/v1/auth/registration/verify-email/',
            'description': 'Verificación de email (POST con key)',
        },
        'auth_password_reset': {
            'url': base + 'api/v1/auth/password/reset/',
            'description': 'Solicitud de reseteo de contraseña (envía email)',
        },
        'auth_password_reset_confirm': {
            'url': base + 'api/v1/auth/password/reset/confirm/',
            'description': 'Confirmación de reseteo (token + new password)',
        },
    })
