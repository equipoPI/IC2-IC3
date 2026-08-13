from django.conf import settings
import time
from dj_rest_auth.registration.serializers import RegisterSerializer as DefaultRegisterSerializer
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import RegistrationConfig
from django.utils import timezone


class CustomRegisterSerializer(DefaultRegisterSerializer):
    registration_key = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(write_only=True, required=True)
    last_name = serializers.CharField(write_only=True, required=True)

    def validate_registration_key(self, value):
        # Primero, intentar obtener la clave activa desde la base de datos (editable por admin)
        db_key = RegistrationConfig.get_current_key()
        if db_key:
            expected = db_key
        else:
            expected = getattr(settings, 'REGISTRATION_KEY', None)

        if expected is None:
            raise serializers.ValidationError('El sistema no permite registros en este momento.')

        if value != expected:
            raise serializers.ValidationError('Clave de registro incorrecta.')
        return value

    def validate_email(self, value):
        # Mensaje claro en español si el correo ya está registrado
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Correo ya existente.')
        return value

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        # registration_key is only used for validation, not stored
        data.pop('registration_key', None)
        # Asegurar que se incluyan nombres y apellidos en los datos limpios
        data['first_name'] = self.validated_data.get('first_name', '')
        data['last_name'] = self.validated_data.get('last_name', '')
        # Asegurar que exista `username` — usar la parte local del email si falta
        if not data.get('username'):
            email = data.get('email', '')
            username = email.split('@')[0] if email else f'user_{int(time.time())}'
            data['username'] = username
        return data
"""
Serializers para Django REST Framework - Sistema SCADA
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    # Modelos base
    Fabrica,
    OrdenProduccion, 
    Receta, 
    DetalleReceta, 
    EjecucionReceta, 
    HistorialProduccion
    #, Seccion, Empleado, TipoTarifa,
    
    # Inventario
    #Inventario, ItemInventario, Proveedor,
    
    # SCADA
    #Sistema, DispositivoSCADA, Alarma, LecturaSensor,
    #OrdenProduccion, PlantillaProduccion, ConfiguracionMQTT,
    #RegistroAuditoria, IngredienteAlmacenamiento,
    
    # Producción
    #Receta, DetalleReceta, EjecucionReceta, Produccion,
)
from .models import ConfiguracionMQTT, DispositivoSCADA, LecturaSensor
from . import models
from allauth.account.models import EmailAddress


# =========================
# Serializers para usuarios
# =========================


class ProfileSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = models.Profile
        fields = ['id', 'user', 'user_username', 'role', 'telefono', 'email_confirmed', 'last_seen', 'created_at']
        read_only_fields = ['created_at', 'last_seen']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_active', 'profile']
        extra_kwargs = {'is_active': {'read_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password')
        username = validated_data.get('username')
        email = validated_data.get('email')
        # Crear usuario inactivo por defecto; se activará tras confirmación por email
        user = User(**validated_data)
        user.username = username
        user.email = email
        user.is_active = False
        user.set_password(password)
        user.save()
        return user



# =============================================================================
# Serializers Básicos
# =============================================================================

class FabricaSerializer(serializers.ModelSerializer):
    """Serializer para Plantas/Fábricas con métricas SCADA"""
    from datetime import datetime as _datetime
    fecha_creacion = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Fabrica
        fields = '__all__'

    def get_fecha_creacion(self, obj):
        val = getattr(obj, 'fecha_creacion', None)
        if val is None:
            return None
        # Aceptar date o datetime
        try:
            if isinstance(val, self._meta.model._meta.get_field('fecha_creacion').__class__):
                # fallback
                return str(val)
        except Exception:
            pass
        # Si es datetime, devolver la parte date formateada
        import datetime as _dt
        if isinstance(val, _dt.datetime):
            return val.date().isoformat()
        return val.isoformat() if hasattr(val, 'isoformat') else str(val)


# class SeccionSerializer(serializers.ModelSerializer):
#     """Serializer para Secciones"""
#     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    
#     class Meta:
#         model = Seccion
#         fields = '__all__'


# class EmpleadoSerializer(serializers.ModelSerializer):
#     """Serializer para Empleados"""
#     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
#     seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    
#     class Meta:
#         model = Empleado
#         fields = '__all__'


# class EmpleadoListSerializer(serializers.ModelSerializer):
#     """Serializer reducido para listado de empleados"""
#     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
#     seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    
#     class Meta:
#         model = Empleado
#         fields = ['documento', 'nombre', 'apellido', 'rango', 'email', 
#                   'fabrica_nombre', 'seccion_nombre', 'estado']


# # =============================================================================
# # Serializers SCADA
# # =============================================================================

# class SistemaSerializer(serializers.ModelSerializer):
#     """Serializer para Sistemas de Producción"""
#     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    
#     class Meta:
#         model = Sistema
#         fields = '__all__'


class DispositivoSCADASerializer(serializers.ModelSerializer):
    """Serializer para Dispositivos SCADA (sensores, actuadores, máquinas)"""
    sistema_nombre = serializers.CharField(source='sistema.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    inventario_nombre = serializers.CharField(source='inventario.nombre', read_only=True)

    class Meta:
        model = models.DispositivoSCADA
        fields = '__all__'


class DispositivoSCADAListSerializer(serializers.ModelSerializer):
    """Serializer reducido para listado de dispositivos"""
    class Meta:
        model = models.DispositivoSCADA
        fields = ['numero_serie', 'nombre', 'categoria', 'estado', 'ultima_lectura']


class LecturaSensorSerializer(serializers.ModelSerializer):
    """Serializer para lecturas de sensores"""
    dispositivo_nombre = serializers.CharField(source='dispositivo.nombre', read_only=True)

    class Meta:
        model = models.LecturaSensor
        fields = '__all__'


class LecturaSensorCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear lecturas (simplificado)"""
    class Meta:
        model = models.LecturaSensor
        fields = ['dispositivo', 'valor', 'unidad', 'calidad']


# class AlarmaSerializer(serializers.ModelSerializer):
#     """Serializer para Alarmas SCADA"""
#     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
#     dispositivo_nombre = serializers.CharField(source='dispositivo.nombre', read_only=True)
#     usuario_cierre_nombre = serializers.CharField(source='usuario_cierre.username', read_only=True)
    
#     class Meta:
#         model = Alarma
#         fields = '__all__'


# class AlarmaCreateSerializer(serializers.ModelSerializer):
#     """Serializer para crear alarmas"""
#     class Meta:
#         model = Alarma
#         fields = ['fabrica', 'dispositivo', 'descripcion', 'severidad']


# class AlarmaUpdateSerializer(serializers.ModelSerializer):
#     """Serializer para cerrar/actualizar alarmas"""
#     class Meta:
#         model = Alarma
#         fields = ['estado', 'notas_resolucion']


# # =============================================================================
# # Serializers de Producción
# # =============================================================================

class RecetaSerializer(serializers.ModelSerializer):
     """Serializer para Recetas"""
     class Meta:
         model = Receta
         fields = '__all__'


class DetalleRecetaSerializer(serializers.ModelSerializer):
     """Serializer para ingredientes de recetas"""
     ingrediente_nombre = serializers.CharField(source='ingrediente.nombre', read_only=True)
    
     class Meta:
         model = DetalleReceta
         fields = '__all__'


class HistorialProduccionSerializer(serializers.ModelSerializer):
    """Serializer para los registros históricos al finalizar"""
    producto_nombre = serializers.CharField(source='orden_produccion.producto', read_only=True)

    class Meta:
        model = HistorialProduccion
        fields = '__all__'


class OrdenProduccionSerializer(serializers.ModelSerializer):
     """Serializer para Órdenes de Producción"""
     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
     sistema_nombre = serializers.CharField(source='sistema.nombre', read_only=True)
     dispositivo_nombre = serializers.CharField(source='dispositivo.nombre', read_only=True)
     receta_nombre = serializers.CharField(source='receta.nombre', read_only=True)
     creado_por_nombre = serializers.CharField(source='creado_por.username', read_only=True)
    
     class Meta:
        model = OrdenProduccion
        fields = ['id', 'codigo', 'producto', 'cantidad', 'estado', 'fecha_inicio']


class OrdenProduccionListSerializer(serializers.ModelSerializer):
     """Serializer reducido para listado de órdenes"""
     fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    
     class Meta:
         model = OrdenProduccion
         fields = ['codigo', 'producto', 'cantidad', 'unidad', 'estado', 'progreso',
                   'fecha_inicio', 'fecha_fin', 'fabrica_nombre']


# -----------------------------------------------------------------------------
# Serializers adicionales (exponer manualmente modelos restantes)
# Comentarios: mantener explícito y sencillo para facilitar pruebas desde el
# frontend; marcamos campos sensibles como `write_only` cuando corresponda.
# -----------------------------------------------------------------------------


class SeccionSerializer(serializers.ModelSerializer):
    """Serializer para `Seccion` con nombre de fábrica incluido"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)

    class Meta:
        model = models.Seccion
        fields = '__all__'


class EmpleadoSerializer(serializers.ModelSerializer):
    """Serializer para `Empleado` que admite creación/actualización parcial desde la SPA.

    - Usa `fabrica` y `seccion` como claves primarias (IDs).
    - `rol_actual` expone el rol lógico (Empleado/Jefe/Administrador) separado del campo interno `rango`.
    - Si faltan campos obligatorios en creación, intenta rellenar valores por defecto mínimos.
    """
    fabrica = serializers.PrimaryKeyRelatedField(queryset=models.Fabrica.objects.all(), required=False, allow_null=True)
    seccion = serializers.PrimaryKeyRelatedField(queryset=models.Seccion.objects.all(), required=False, allow_null=True)
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    fecha_contratacion = serializers.DateField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    # Controla si el email debe marcarse como verificado al crear el empleado
    email_verified = serializers.BooleanField(write_only=True, required=False, default=False)

    # Campos calculados expuestos por la API
    ultimo_fichaje = serializers.SerializerMethodField(read_only=True)
    ultimo_inicio_sesion = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = models.Empleado
        # Excluir contacto del API: el sistema no debe depender del teléfono
        fields = [
            'documento', 'nombre', 'apellido', 'seccion', 'seccion_nombre', 'fabrica', 'fabrica_nombre',
            'rango', 'rol_actual', 'fecha_contratacion', 'direccion', 'email', 'estado', 'tipo_empleado',
            'ultimo_fichaje', 'ultimo_inicio_sesion', 'email_verified'
        ]
        extra_kwargs = {
            'documento': {'required': False},
            'rango': {'required': False},
            'rol_actual': {'required': False},
            'contacto': {'required': False},
            'direccion': {'required': False},
            'email': {'required': False},
        }

    def validate_email(self, value):
        # Permitir email opcional, pero validar unicidad si se provee
        if value:
            qs = models.Empleado.objects.filter(email__iexact=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError('Email ya registrado.')
        return value

    def create(self, validated_data):
        # Generar documento si falta
        if not validated_data.get('documento'):
            import time
            validated_data['documento'] = f'AUTO-{int(time.time())}'

        # Fecha de contratación por defecto hoy si no se envía
        from django.utils.timezone import now
        if not validated_data.get('fecha_contratacion'):
            validated_data['fecha_contratacion'] = now().date()

        # Asignar fábrica/ sección por defecto si faltan
        if not validated_data.get('fabrica'):
            fab = models.Fabrica.objects.first()
            if fab:
                validated_data['fabrica'] = fab

        if not validated_data.get('seccion') and validated_data.get('fabrica'):
            sec = models.Seccion.objects.filter(fabrica=validated_data['fabrica']).first()
            if sec:
                validated_data['seccion'] = sec

        # Asegurar clave única
        if not validated_data.get('clave'):
            import random, string
            chars = string.ascii_uppercase + string.digits
            clave = ''.join(random.choices(chars, k=8))
            while models.Empleado.objects.filter(clave=clave).exists():
                clave = ''.join(random.choices(chars, k=8))
            validated_data['clave'] = clave

        # Extraer flags auxiliares que no forman parte del modelo
        email_verified = bool(validated_data.pop('email_verified', False))

        # Validaciones mínimas y creación
        if not validated_data.get('fabrica'):
            raise serializers.ValidationError({'fabrica': 'No existe ninguna fábrica en el sistema. Crea una fábrica primero o proporciona el campo `fabrica`.'})
        if not validated_data.get('seccion'):
            raise serializers.ValidationError({'seccion': 'La sección es obligatoria. Proporciona `seccion` o crea al menos una sección en la fábrica seleccionada.'})

        empleado = models.Empleado.objects.create(**validated_data)

        # Intentar crear usuario y EmailAddress asociado sin bloquear el flujo
        try:
            email = (validated_data.get('email') or '').strip()
            username = str(validated_data.get('documento'))

            user = None
            if username:
                user = User.objects.filter(username=username).first()
            if not user and email:
                user = User.objects.filter(email__iexact=email).first()

            if not user:
                user = User.objects.create_user(username=username or f'user_{int(time.time())}', email=email or '')
                user.set_unusable_password()
                user.is_active = True if email_verified else False
                user.first_name = validated_data.get('nombre', '') or ''
                user.last_name = validated_data.get('apellido', '') or ''
                user.save()

            # Asociar user al empleado
            try:
                if not getattr(empleado, 'user', None):
                    empleado.user = user
                    empleado.save()
            except Exception:
                pass

            if email:
                ea = EmailAddress.objects.filter(user=user, email__iexact=email).first()
                if not ea:
                    EmailAddress.objects.create(user=user, email=email, primary=True, verified=email_verified)
                else:
                    if ea.verified != email_verified:
                        ea.verified = email_verified
                        ea.primary = True
                        ea.save()

            try:
                if email_verified and not user.is_active:
                    user.is_active = True
                    user.save()
            except Exception:
                pass

            try:
                profile = getattr(user, 'profile', None)
                if profile and not getattr(profile, 'email_confirmed', False):
                    profile.email_confirmed = True
                    profile.save()
            except Exception:
                pass
        except Exception:
            pass

        return empleado

    def validate_rango(self, value):
        MAP = {
            'EMPLEADO': '6', 'JEFE': '3', 'ADMIN': '2', 'DIRECTOR': '1', 'GERENTE': '2',
            'JEFE DE SECCIÓN': '3', 'ADMINISTRADOR': '2',
        }
        if value is None:
            return value
        v = str(value).strip().upper()
        if v in MAP:
            return MAP[v]
        if v.isdigit() and v in {str(i) for i in range(1,9)}:
            return v
        for k in MAP:
            if k in v:
                return MAP[k]
        raise serializers.ValidationError('Rango inválido')

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def get_ultimo_fichaje(self, obj):
        try:
            last = None
            try:
                last = obj.fichajes.order_by('-fecha', '-id').first()
            except Exception:
                last = None
            if last:
                fecha = getattr(last, 'fecha', None)
                hora = getattr(last, 'hora_entrada', None)
                if fecha and hora:
                    return f"{fecha.isoformat()} {hora.isoformat()}"
                if fecha:
                    return fecha.isoformat()
            try:
                inicio = self.get_ultimo_inicio_sesion(obj)
                if inicio:
                    return inicio
            except Exception:
                pass
            return ''
        except Exception:
            return ''

    def get_ultimo_inicio_sesion(self, obj):
        try:
            doc = getattr(obj, 'documento', None)
            if not doc:
                return ''
            from django.contrib.auth.models import User
            from django.db.models import Q
            user = User.objects.filter(Q(username=doc) | Q(email=doc)).first()
            if user:
                if getattr(user, 'last_login', None):
                    return user.last_login.isoformat()
                profile = getattr(user, 'profile', None)
                if profile and getattr(profile, 'last_seen', None):
                    return profile.last_seen.isoformat()
            return ''
        except Exception:
            return ''


class InventarioSerializer(serializers.ModelSerializer):
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)

    class Meta:
        model = models.Inventario
        fields = '__all__'


class ItemInventarioSerializer(serializers.ModelSerializer):
    inventario_nombre = serializers.CharField(source='inventario.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)

    class Meta:
        model = models.ItemInventario
        fields = '__all__'


class HistorialMovimientosSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)

    class Meta:
        model = models.HistorialMovimientos
        fields = '__all__'


class CronogramaSeccionSerializer(serializers.ModelSerializer):
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)

    class Meta:
        model = models.CronogramaSeccion
        fields = '__all__'


class ProduccionSerializer(serializers.ModelSerializer):
    receta_nombre = serializers.CharField(source='receta.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)

    class Meta:
        model = models.Produccion
        fields = '__all__'


class RegistroMantenimientoSerializer(serializers.ModelSerializer):
    componente_nombre = serializers.CharField(source='componente.nombre', read_only=True)

    class Meta:
        model = models.RegistroMantenimiento
        fields = '__all__'


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = models.RegistroAuditoria
        fields = ['id', 'usuario', 'usuario_username', 'accion', 'modulo', 'objeto', 'descripcion', 'datos', 'ip_origen', 'timestamp']
        read_only_fields = ['timestamp', 'usuario_username']


class SistemaSerializer(serializers.ModelSerializer):
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)

    class Meta:
        model = models.Sistema
        fields = '__all__'


class PlantillaProduccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PlantillaProduccion
        fields = '__all__'


class IngredienteAlmacenamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.IngredienteAlmacenamiento
        fields = '__all__'


class MantenimientoProgramadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.MantenimientoProgramado
        fields = '__all__'


class UnidadAlmacenamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.UnidadAlmacenamiento
        fields = '__all__'


class HistorialProduccionSerializerBasic(serializers.ModelSerializer):
    class Meta:
        model = models.HistorialProduccion
        fields = '__all__'


class ComunicacionMQTTSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ComunicacionMQTT
        fields = '__all__'


class EjecucionRecetaSerializer(serializers.ModelSerializer):
    """Serializer para el seguimiento de la ejecución en tiempo real"""
    receta_nombre = serializers.CharField(source='receta.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)

    class Meta:
        model = EjecucionReceta
        fields = '__all__'


# class IngredienteAlmacenamientoSerializer(serializers.ModelSerializer):
#     """Serializer para Ingredientes"""
#     bombo_nombre = serializers.CharField(source='bombo.nombre', read_only=True)
    
#     class Meta:
#         model = IngredienteAlmacenamiento
#         fields = '__all__'


# # =============================================================================
# # Serializers de Configuración
# # =============================================================================

# class ConfiguracionMQTTSerializer(serializers.ModelSerializer):
#     """Serializer para configuración MQTT"""
#     class Meta:
#         model = ConfiguracionMQTT
#         fields = '__all__'
#         extra_kwargs = {
#             'password': {'write_only': True}  # No exponer password en lectura
#         }


class ConfiguracionMQTTSerializer(serializers.ModelSerializer):
    """Serializer para configuración MQTT"""
    class Meta:
        model = ConfiguracionMQTT
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }


class TopicMQTTSerializer(serializers.ModelSerializer):
    """Serializer para Topics MQTT vinculados a una configuración"""
    configuracion_nombre = serializers.CharField(source='configuracion.nombre', read_only=True)

    class Meta:
        model = models.TopicMQTT
        fields = ['id', 'configuracion', 'configuracion_nombre', 'topic', 'tipo', 'tipo_dato', 'descripcion', 'activo']


# # =============================================================================
# # Serializers de Auditoría
# # =============================================================================

# class RegistroAuditoriaSerializer(serializers.ModelSerializer):
#     """Serializer para registros de auditoría"""
#     usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    
#     class Meta:
#         model = RegistroAuditoria
#         fields = '__all__'


# # =============================================================================
# # Serializers de Dashboard/Estadísticas
# # =============================================================================

# class FabricaEstadisticasSerializer(serializers.ModelSerializer):
#     """Serializer con estadísticas ampliadas para dashboard"""
#     total_dispositivos = serializers.IntegerField(read_only=True)
#     dispositivos_online = serializers.IntegerField(read_only=True)
#     total_empleados = serializers.IntegerField(read_only=True)
#     ordenes_activas = serializers.IntegerField(read_only=True)
    
#     class Meta:
#         model = Fabrica
#         fields = '__all__'


# class EstadisticasGeneralesSerializer(serializers.Serializer):
#     """Serializer para estadísticas generales del sistema"""
#     plantas_activas = serializers.IntegerField()
#     plantas_total = serializers.IntegerField()
#     empleados_en_turno = serializers.IntegerField()
#     sensores_online = serializers.IntegerField()
#     sensores_total = serializers.IntegerField()
#     alarmas_activas = serializers.IntegerField()
#     ordenes_pendientes = serializers.IntegerField()
#     ordenes_en_proceso = serializers.IntegerField()
