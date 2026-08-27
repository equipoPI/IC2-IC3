from django.shortcuts import render, redirect
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
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from .models import ConfiguracionMQTT
from .serializers import ConfiguracionMQTTSerializer
from .models import TopicMQTT
from .serializers import TopicMQTTSerializer
from . import models
from . import serializers
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
from .serializers import UserSerializer, ProfileSerializer
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
import logging
from allauth.account.models import EmailConfirmation, EmailAddress
from django.utils import timezone


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def api_csrf_token(request):
    """Devuelve el token CSRF actual en JSON para que la SPA lo use en headers.

    Esto evita problemas donde la cookie CSRF no es legible desde JS
    (SameSite/Secure) y permite al frontend obtener el token explícitamente.
    """
    token = get_token(request)
    try:
        logger = logging.getLogger('scada.csrf_debug')
        cookie = request.META.get('HTTP_COOKIE', '') or ''
        logger.warning('api_csrf_token called; cookie_len=%d, cookie_sample=%s, origin=%s, host=%s',
                       len(cookie), (cookie[:200] + '...') if len(cookie) > 200 else cookie,
                       request.META.get('HTTP_ORIGIN'), request.get_host())
    except Exception:
        pass
    return JsonResponse({'csrfToken': token})


def redirect_verify_email(request):
    """Redirige requests entrantes al backend hacia la ruta de verificación
    del frontend. Útil cuando el enlace recibido por el usuario apunta al
    backend (p.ej. http://localhost:8000/verify-email?key=...) y queremos
    reenviarlo al SPA en `FRONTEND_URL`.

    Devuelve 302 hacia: {FRONTEND_URL}/verify-email?key=<key>
    """
    key = request.GET.get('key', '')
    from django.conf import settings
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    target = f"{frontend.rstrip('/')}/verify-email"
    if key:
        # conservar el parámetro 'key' si existe
        target = f"{target}?key={key}"
    return redirect(target)


class UserViewSet(viewsets.ModelViewSet):
    """Exponer usuarios (solo admins pueden listar/editar)."""
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class ProfileViewSet(viewsets.ModelViewSet):
    """Exponer profiles (admins o self-view)."""
    queryset = models.Profile.objects.all().order_by('-created_at')
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]


class RegisterAPIView(generics.CreateAPIView):
    """Endpoint público para registrar cuentas. Crea usuario inactivo.

    POST payload: `username`, `email`, `password`, `first_name`, `last_name`
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = serializer.save()
        # Profile se crea automáticamente por la señal post_save
        # Aquí podríamos enviar email de confirmación (pendiente SMTP)
        return user


class ConfiguracionMQTTViewSet(viewsets.ModelViewSet):
    """CRUD para configuraciones MQTT"""
    queryset = ConfiguracionMQTT.objects.all().order_by('-id')
    serializer_class = ConfiguracionMQTTSerializer
    permission_classes = [IsAuthenticated]


class DispositivoSCADAViewSet(viewsets.ModelViewSet):
    """CRUD para dispositivos SCADA"""
    queryset = DispositivoSCADA.objects.all().order_by('numero_serie')
    serializer_class = DispositivoSCADASerializer
    permission_classes = [IsAuthenticated]

    from rest_framework.decorators import action
    import paho.mqtt.publish as publish

    @action(detail=True, methods=['post'])
    def control(self, request, pk=None):
        dispositivo = self.get_object()
        comando = request.data.get('comando') # 'abrir', 'cerrar', 'iniciar', 'detener'
        
        if not comando:
            return Response({'error': 'Comando no especificado'}, status=status.HTTP_400_BAD_REQUEST)
            
        valor_mqtt = "0"
        if comando in ['abrir', 'iniciar']:
            valor_mqtt = "1"
        elif comando in ['cerrar', 'detener']:
            valor_mqtt = "0"
            
        tenant = "scada"
        if dispositivo.seccion and dispositivo.seccion.fabrica:
            tenant = dispositivo.seccion.fabrica.nombre
        elif dispositivo.sistema and dispositivo.sistema.seccion and dispositivo.sistema.seccion.fabrica:
            tenant = dispositivo.sistema.seccion.fabrica.nombre
            
        gateway = dispositivo.gateway_id or 'gw1'
        topic = f"{tenant}/{gateway}/cmd/{dispositivo.numero_serie}"
        
        try:
            publish.single(
                topic, 
                payload=valor_mqtt, 
                hostname="mosquitto", 
                port=1883,
                client_id="django-backend-control"
            )
            
            models.RegistroAuditoria.objects.create(
                usuario=request.user,
                accion='CONTROL_MANUAL',
                modulo='SCADA',
                objeto=dispositivo.numero_serie,
                descripcion=f"Enviado comando manual '{comando}' (MQTT: {valor_mqtt}) a dispositivo {dispositivo.nombre}",
                ip_origen=request.META.get('REMOTE_ADDR') or '127.0.0.1'
            )
            
            return Response({'status': 'Comando enviado', 'topic': topic, 'valor': valor_mqtt})
        except Exception as e:
            return Response({'error': f'Error al publicar en MQTT: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LecturaSensorViewSet(viewsets.ModelViewSet):
    """CRUD para lecturas de sensores"""
    queryset = LecturaSensor.objects.all().order_by('-timestamp')
    serializer_class = LecturaSensorSerializer
    permission_classes = [IsAuthenticated]


class TopicMQTTViewSet(viewsets.ModelViewSet):
    """CRUD para topics MQTT"""
    queryset = TopicMQTT.objects.all().order_by('id')
    serializer_class = TopicMQTTSerializer
    permission_classes = [IsAuthenticated]


class MetricaConfiguracionViewSet(viewsets.ModelViewSet):
    """CRUD para la configuración conceptual de métricas"""
    queryset = models.MetricaConfiguracion.objects.all().order_by('nombre')
    serializer_class = serializers.MetricaConfiguracionSerializer
    permission_classes = [IsAuthenticated]


class VariableVinculadaViewSet(viewsets.ModelViewSet):
    """CRUD para asociar métricas a sensores reales por planta"""
    serializer_class = serializers.VariableVinculadaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = models.VariableVinculada.objects.all().order_by('id')
        fabrica_id = self.request.query_params.get('fabrica')
        if fabrica_id:
            queryset = queryset.filter(fabrica_id=fabrica_id)
        return queryset

# =============================================================================
# Vistas tradicionales
# =============================================================================
def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def api_csrf(request):
    """Endpoint simple para poner la cookie CSRF (GET).

    Útil para SPAs que necesitan que el proxy (`/api`) solicite primero
    este endpoint y así obtener la cookie `csrftoken` del backend.
    """
    try:
        logger = logging.getLogger('scada.csrf_debug')
        cookie = request.META.get('HTTP_COOKIE', '') or ''
        logger.warning('api_csrf called; cookie_len=%d, cookie_sample=%s, origin=%s, host=%s, remote_addr=%s',
                       len(cookie), (cookie[:200] + '...') if len(cookie) > 200 else cookie,
                       request.META.get('HTTP_ORIGIN'), request.get_host(), request.META.get('REMOTE_ADDR'))
    except Exception:
        pass
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
    # Usar la utilidad `from_key` de allauth; algunos entornos o versiones
    # pueden devolver None si el formato no coincide exactamente. Añadimos
    # un fallback directo por `key` para mayor robustez en el entorno dev.
    conf = EmailConfirmation.from_key(key)
    if conf is None:
        try:
            conf = EmailConfirmation.objects.filter(key=key).first()
        except Exception:
            conf = None
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
    permission_classes = [IsAuthenticated]


class OrdenProduccionViewSet(viewsets.ModelViewSet):
    """CRUD para Ordenes de Producción. Usa serializer reducido en list."""
    queryset = OrdenProduccion.objects.all().order_by('-fecha_creacion')
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = models.Empleado.objects.all().order_by('apellido')
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """Listar empleados: combinar registros de `Empleado` con usuarios activos
        que tengan `Profile` cuando no exista una fila `Empleado` asociada.

        Esto permite que usuarios que se registraron en el sistema aparezcan
        en la UI aunque aún no tengan un `Empleado` creado en la base de datos.
        """
        # Serializar empleados existentes
        empleados_qs = models.Empleado.objects.all().order_by('apellido')
        serialized = EmpleadoSerializer(empleados_qs, many=True, context={'request': request}).data

        # Recolectar documentos existentes para evitar duplicados
        existing_docs = set(emp.get('documento') for emp in serialized if emp.get('documento'))

        # Opcional: incluir usuarios activos sin Empleado si se pasa ?include_users=1
        include_users = str(request.query_params.get('include_users', '')).lower() in ['1', 'true', 'yes']
        if include_users:
            usuarios = User.objects.filter(is_active=True).exclude(profile__isnull=True)
            for u in usuarios:
                # Evitar incluir usuarios cuyo username o email ya figura como documento
                if str(u.username) in existing_docs or (u.email and u.email in existing_docs):
                    continue
                perfil = getattr(u, 'profile', None)
                if perfil is None:
                    continue
                # Construir representación compatible con el serializer frontend
                usuario_entry = {
                    'documento': u.username,
                    'nombre': u.first_name or u.username,
                    'apellido': u.last_name or '',
                    'seccion': None,
                    'seccion_nombre': '',
                    'fabrica': None,
                    'fabrica_nombre': '',
                    'rango': None,
                    'rol': perfil.get_role_display() if hasattr(perfil, 'get_role_display') else (perfil.role if perfil and perfil.role else 'Empleado'),
                    'fecha_contratacion': None,
                    'contacto': perfil.telefono if getattr(perfil, 'telefono', None) else '',
                    'direccion': '',
                    'email': u.email or '',
                    'estado': 'ACTIVO' if u.is_active else 'OTRO',
                    # Defaulting role to match previous behavior; frontend will read `rango` when available.
                    # `tipo_empleado` eliminado: no incluir clave en payload
                }
                serialized.append(usuario_entry)

        # Rellenar email en empleados existentes mediante búsqueda en User
        # (caso: Empleado created without linked User)
        for emp in serialized:
            if not emp.get('email'):
                doc = emp.get('documento')
                if not doc:
                    continue
                # Buscar por username o email igual al documento
                try:
                    user_match = User.objects.filter(models.Q(username=doc) | models.Q(email=doc)).first()
                    if user_match:
                        emp['email'] = user_match.email or ''
                except Exception:
                    # Silencioso si no se puede resolver
                    emp['email'] = emp.get('email', '')

        return Response(serialized)

    def destroy(self, request, *args, **kwargs):
        """Al borrar un Empleado, también eliminar su User y EmailAddress.

        Esto hace que la cuenta quede totalmente removida y obligue a
        recrear todo el proceso de registro si se desea volver a ingresar.
        """
        instancia = self.get_object()
        usuario = instancia.user
        # Borrar la instancia Empleado primero
        self.perform_destroy(instancia)

        # Si había un usuario asociado, eliminarlo y sus emails
        if usuario:
            try:
                # Eliminar registros de EmailAddress explícitamente por seguridad
                EmailAddress.objects.filter(user=usuario).delete()
            except Exception:
                pass
            try:
                usuario.delete()
            except Exception:
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class InventarioViewSet(viewsets.ModelViewSet):
    queryset = models.Inventario.objects.all().order_by('id')
    serializer_class = InventarioSerializer
    permission_classes = [IsAuthenticated]


class ItemInventarioViewSet(viewsets.ModelViewSet):
    queryset = models.ItemInventario.objects.all().order_by('numero_serie')
    serializer_class = ItemInventarioSerializer
    permission_classes = [IsAuthenticated]


class HistorialMovimientosViewSet(viewsets.ModelViewSet):
    queryset = models.HistorialMovimientos.objects.all().order_by('-fecha_hora')
    serializer_class = HistorialMovimientosSerializer
    permission_classes = [IsAuthenticated]


class CronogramaSeccionViewSet(viewsets.ModelViewSet):
    queryset = models.CronogramaSeccion.objects.all().order_by('fecha_inicio')
    serializer_class = CronogramaSeccionSerializer
    permission_classes = [IsAuthenticated]


class ProduccionViewSet(viewsets.ModelViewSet):
    queryset = models.Produccion.objects.all().order_by('-fecha_inicio')
    serializer_class = ProduccionSerializer
    permission_classes = [IsAuthenticated]


class RegistroMantenimientoViewSet(viewsets.ModelViewSet):
    queryset = models.RegistroMantenimiento.objects.all().order_by('-fecha_inicio')
    serializer_class = RegistroMantenimientoSerializer
    permission_classes = [IsAuthenticated]


from rest_framework.pagination import PageNumberPagination

class AuditoriaPageNumberPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

class RegistroAuditoriaViewSet(viewsets.ModelViewSet):
    """ViewSet para registros de auditoría: creación por usuarios autenticados
    y lectura por administradores.
    """
    serializer_class = serializers.RegistroAuditoriaSerializer
    pagination_class = AuditoriaPageNumberPagination
    search_fields = ['accion', 'modulo', 'descripcion', 'ip_origen', 'usuario__username']
    filterset_fields = ['modulo', 'accion']
    ordering_fields = ['timestamp', 'modulo', 'accion', 'usuario__username']

    def get_queryset(self):
        queryset = models.RegistroAuditoria.objects.all().order_by('-timestamp')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_desde:
            queryset = queryset.filter(timestamp__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(timestamp__lte=fecha_hasta)
        return queryset
    
    def get_permissions(self):
        from rest_framework.permissions import IsAdminUser
        # Crear: cualquier usuario autenticado puede reportar una acción.
        if self.action in ['create']:
            return [IsAuthenticated()]
        # List/retrieve: solo administradores
        return [IsAdminUser()]


class SistemaViewSet(viewsets.ModelViewSet):
    queryset = models.Sistema.objects.all().order_by('nombre')
    serializer_class = SistemaSerializer
    permission_classes = [IsAuthenticated]


class PlantillaProduccionViewSet(viewsets.ModelViewSet):
    queryset = models.PlantillaProduccion.objects.all().order_by('-fecha_creacion')
    serializer_class = PlantillaProduccionSerializer
    permission_classes = [IsAuthenticated]


class IngredienteAlmacenamientoViewSet(viewsets.ModelViewSet):
    queryset = models.IngredienteAlmacenamiento.objects.all().order_by('nombre')
    serializer_class = IngredienteAlmacenamientoSerializer
    permission_classes = [IsAuthenticated]


class MantenimientoProgramadoViewSet(viewsets.ModelViewSet):
    queryset = models.MantenimientoProgramado.objects.all().order_by('fecha_inicio')
    serializer_class = MantenimientoProgramadoSerializer
    permission_classes = [IsAuthenticated]


class UnidadAlmacenamientoViewSet(viewsets.ModelViewSet):
    queryset = models.UnidadAlmacenamiento.objects.all().order_by('nombre')
    serializer_class = UnidadAlmacenamientoSerializer
    permission_classes = [IsAuthenticated]


class HistorialProduccionViewSet(viewsets.ModelViewSet):
    queryset = models.HistorialProduccion.objects.all().order_by('-fecha_registro')
    serializer_class = HistorialProduccionSerializerBasic
    permission_classes = [IsAuthenticated]


class ComunicacionMQTTViewSet(viewsets.ModelViewSet):
    queryset = models.ComunicacionMQTT.objects.all().order_by('-timestamp')
    serializer_class = ComunicacionMQTTSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_root(request, format=None):
    """API root seguro.

    Por seguridad en entornos no confiables, este endpoint solo acepta GET
    y requiere autenticación. Para desarrollo local se puede relajar, pero
    no debe dejarse público en entornos accesibles.
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
        'alarmas': {
            'url': base + 'api/v1/alarmas/',
            'description': 'Lista y gestión de alarmas industriales del SCADA',
        },
    })


class AlarmaViewSet(viewsets.ModelViewSet):
    queryset = models.Alarma.objects.all().order_by('-fecha_hora')
    serializer_class = serializers.AlarmaSerializer
    filterset_fields = ['planta', 'seccion', 'estado', 'severidad']
    search_fields = ['descripcion', 'sensor_maquina']
