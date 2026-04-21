"""
Serializers para Django REST Framework - Sistema SCADA
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    # Modelos base
    Fabrica, Seccion, Empleado, TipoTarifa,
    
    # Inventario
    Inventario, ItemInventario, Proveedor,
    
    # SCADA
    Sistema, DispositivoSCADA, Alarma, LecturaSensor,
    OrdenProduccion, PlantillaProduccion, ConfiguracionMQTT,
    RegistroAuditoria, IngredienteAlmacenamiento,
    
    # Producción
    Receta, DetalleReceta, EjecucionReceta, Produccion,
)


# =============================================================================
# Serializers Básicos
# =============================================================================

class FabricaSerializer(serializers.ModelSerializer):
    """Serializer para Plantas/Fábricas con métricas SCADA"""
    class Meta:
        model = Fabrica
        fields = '__all__'


class SeccionSerializer(serializers.ModelSerializer):
    """Serializer para Secciones"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    
    class Meta:
        model = Seccion
        fields = '__all__'


class EmpleadoSerializer(serializers.ModelSerializer):
    """Serializer para Empleados"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    
    class Meta:
        model = Empleado
        fields = '__all__'


class EmpleadoListSerializer(serializers.ModelSerializer):
    """Serializer reducido para listado de empleados"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    
    class Meta:
        model = Empleado
        fields = ['documento', 'nombre', 'apellido', 'rango', 'email', 
                  'fabrica_nombre', 'seccion_nombre', 'estado']


# =============================================================================
# Serializers SCADA
# =============================================================================

class SistemaSerializer(serializers.ModelSerializer):
    """Serializer para Sistemas de Producción"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    
    class Meta:
        model = Sistema
        fields = '__all__'


class DispositivoSCADASerializer(serializers.ModelSerializer):
    """Serializer para Dispositivos SCADA (sensores, actuadores, máquinas)"""
    sistema_nombre = serializers.CharField(source='sistema.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    inventario_nombre = serializers.CharField(source='inventario.nombre', read_only=True)
    
    class Meta:
        model = DispositivoSCADA
        fields = '__all__'


class DispositivoSCADAListSerializer(serializers.ModelSerializer):
    """Serializer reducido para listado de dispositivos"""
    class Meta:
        model = DispositivoSCADA
        fields = ['numero_serie', 'nombre', 'categoria', 'estado', 'ultima_lectura']


class LecturaSensorSerializer(serializers.ModelSerializer):
    """Serializer para lecturas de sensores"""
    dispositivo_nombre = serializers.CharField(source='dispositivo.nombre', read_only=True)
    
    class Meta:
        model = LecturaSensor
        fields = '__all__'


class LecturaSensorCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear lecturas (simplificado)"""
    class Meta:
        model = LecturaSensor
        fields = ['dispositivo', 'valor', 'unidad', 'calidad']


class AlarmaSerializer(serializers.ModelSerializer):
    """Serializer para Alarmas SCADA"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    dispositivo_nombre = serializers.CharField(source='dispositivo.nombre', read_only=True)
    usuario_cierre_nombre = serializers.CharField(source='usuario_cierre.username', read_only=True)
    
    class Meta:
        model = Alarma
        fields = '__all__'


class AlarmaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear alarmas"""
    class Meta:
        model = Alarma
        fields = ['fabrica', 'dispositivo', 'descripcion', 'severidad']


class AlarmaUpdateSerializer(serializers.ModelSerializer):
    """Serializer para cerrar/actualizar alarmas"""
    class Meta:
        model = Alarma
        fields = ['estado', 'notas_resolucion']


# =============================================================================
# Serializers de Producción
# =============================================================================

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


class RecetaConDetallesSerializer(serializers.ModelSerializer):
    """Serializer de receta con todos sus ingredientes"""
    detalles = DetalleRecetaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Receta
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
        fields = '__all__'
        read_only_fields = ['codigo', 'fecha_creacion']


class OrdenProduccionListSerializer(serializers.ModelSerializer):
    """Serializer reducido para listado de órdenes"""
    fabrica_nombre = serializers.CharField(source='fabrica.nombre', read_only=True)
    
    class Meta:
        model = OrdenProduccion
        fields = ['codigo', 'producto', 'cantidad', 'estado', 'progreso',
                  'fecha_inicio', 'fecha_fin', 'fabrica_nombre']


class PlantillaProduccionSerializer(serializers.ModelSerializer):
    """Serializer para Plantillas de Producción"""
    tiempo_estimado_texto = serializers.CharField(source='tiempo_estimado', read_only=True)
    
    class Meta:
        model = PlantillaProduccion
        fields = '__all__'


class IngredienteAlmacenamientoSerializer(serializers.ModelSerializer):
    """Serializer para Ingredientes"""
    bombo_nombre = serializers.CharField(source='bombo.nombre', read_only=True)
    
    class Meta:
        model = IngredienteAlmacenamiento
        fields = '__all__'


# =============================================================================
# Serializers de Configuración
# =============================================================================

class ConfiguracionMQTTSerializer(serializers.ModelSerializer):
    """Serializer para configuración MQTT"""
    class Meta:
        model = ConfiguracionMQTT
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}  # No exponer password en lectura
        }


# =============================================================================
# Serializers de Auditoría
# =============================================================================

class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    """Serializer para registros de auditoría"""
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    
    class Meta:
        model = RegistroAuditoria
        fields = '__all__'


# =============================================================================
# Serializers de Dashboard/Estadísticas
# =============================================================================

class FabricaEstadisticasSerializer(serializers.ModelSerializer):
    """Serializer con estadísticas ampliadas para dashboard"""
    total_dispositivos = serializers.IntegerField(read_only=True)
    dispositivos_online = serializers.IntegerField(read_only=True)
    total_empleados = serializers.IntegerField(read_only=True)
    ordenes_activas = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Fabrica
        fields = '__all__'


class EstadisticasGeneralesSerializer(serializers.Serializer):
    """Serializer para estadísticas generales del sistema"""
    plantas_activas = serializers.IntegerField()
    plantas_total = serializers.IntegerField()
    empleados_en_turno = serializers.IntegerField()
    sensores_online = serializers.IntegerField()
    sensores_total = serializers.IntegerField()
    alarmas_activas = serializers.IntegerField()
    ordenes_pendientes = serializers.IntegerField()
    ordenes_en_proceso = serializers.IntegerField()
