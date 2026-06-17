import json
import logging
from django.shortcuts import render
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Fabrica, Seccion, Sistema, DispositivoSCADA, 
    LecturaSensor, OrdenProduccion, Receta, 
    EjecucionReceta, ComunicacionMQTT, ConfiguracionMQTT
)
from .serializers import (
    FabricaSerializer, SeccionSerializer, DispositivoSCADASerializer,
    LecturaSensorSerializer, OrdenProduccionSerializer, RecetaSerializer,
    ConfiguracionMQTTSerializer
)
from .mqtt_services import MQTTBackendManager

logger = logging.getLogger(__name__)

def index(request):
    return HttpResponse("Hola, mundo. Estás en el índice de la API SCADA (polls).")


# =============================================================================
# ViewSets para la API REST conectada al Frontend
# =============================================================================

class FabricaViewSet(viewsets.ModelViewSet):
    """ViewSet para Plantas/Fábricas con soporte para habilitar/deshabilitar control remoto"""
    queryset = Fabrica.objects.all()
    serializer_class = FabricaSerializer

    @action(detail=True, methods=['get'])
    def estado_control(self, request, pk=None):
        """Retorna si la planta está activa en MQTT y permite recibir órdenes/comandos"""
        fabrica = self.get_object()
        
        # Consultar si el gateway de esta planta se reportó en el diagnóstico más reciente
        config_mqtt = ConfiguracionMQTT.objects.filter(activo=True).first()
        
        ultima_comunicacion = ComunicacionMQTT.objects.filter(
            topic__icontains=f"planta{fabrica.id}"
        ).order_by('-timestamp').first()
        
        permite_control = True  # Podría ser gestionado por un campo de la tabla Fábrica
        online = False
        
        if ultima_comunicacion and (now() - ultima_comunicacion.timestamp).total_seconds() < 30:
            online = True
            
        return Response({
            "planta_id": fabrica.id,
            "nombre": fabrica.nombre,
            "permite_control": permite_control,
            "gateway_online": online,
            "ultimo_latido": ultima_comunicacion.timestamp if ultima_comunicacion else None
        })


class DispositivoSCADAViewSet(viewsets.ModelViewSet):
    """ViewSet para Dispositivos SCADA con soporte para emisión directa de comandos"""
    queryset = DispositivoSCADA.objects.all()
    serializer_class = DispositivoSCADASerializer

    @action(detail=True, methods=['post'])
    def enviar_comando(self, request, pk=None):
        """
        Envía un comando MQTT directo al actuador/bomba (ej: encender/apagar o pausar).
        
        POST Payload esperado:
        {
            "comando": "PAUSA" | "BOMBA1_ON" | "BOMBA1_OFF" | "MEZCLAR" | "PARAR",
            "valor": 1 | 0
        }
        """
        dispositivo = self.get_object()
        comando = request.data.get("comando")
        valor = request.data.get("valor", 0)
        
        if not comando:
            return Response(
                {"error": "Debe especificar el campo 'comando' en el payload"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        topic = dispositivo.topic_mqtt
        if not topic:
            topic = f"scada/planta1/comando"
            
        payload = {
            "cmd": "control",
            "action": comando,
            "value": valor,
            "timestamp": now().timestamp()
        }
        
        mqtt_mgr = MQTTBackendManager()
        exito = mqtt_mgr.publish_command(topic=topic, payload=payload, dispositivo=dispositivo)
        
        if exito:
            return Response({
                "mensaje": f"Comando '{comando}' publicado exitosamente en topic '{topic}'",
                "topic": topic,
                "payload": payload,
                "status": "PUBLICADO"
            })
        else:
            return Response({
                "error": "El broker de mensajería no está disponible o el comando falló al enviarse",
                "status": "FALLIDO"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class LecturaSensorViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para leer los datos de telemetría de sensores históricos y en vivo"""
    queryset = LecturaSensor.objects.all()
    serializer_class = LecturaSensorSerializer
    
    def get_queryset(self):
        queryset = LecturaSensor.objects.all()
        planta_id = self.request.query_params.get('planta', None)
        dispositivo_id = self.request.query_params.get('dispositivo', None)
        
        if planta_id:
            queryset = queryset.filter(dispositivo__seccion__fabrica_id=planta_id)
        if dispositivo_id:
            queryset = queryset.filter(dispositivo_id=dispositivo_id)
            
        limit = self.request.query_params.get('limit', 100)
        try:
            limit = int(limit)
            queryset = queryset[:limit]
        except ValueError:
            pass
            
        return queryset


class OrdenProduccionViewSet(viewsets.ModelViewSet):
    """ViewSet para órdenes de producción con acciones de control de ciclo de vida"""
    queryset = OrdenProduccion.objects.all()
    serializer_class = OrdenProduccionSerializer

    @action(detail=True, methods=['post'])
    def control_orden(self, request, pk=None):
        """
        Dispara comandos de control del proceso (Pausar, Reanudar, Cancelar) de la Receta activa.
        
        POST Payload:
        {
            "accion": "PAUSAR" | "REANUDAR" | "INICIAR" | "DETENER"
        }
        """
        orden = self.get_object()
        accion = request.data.get("accion")
        
        if accion not in ["PAUSAR", "REANUDAR", "INICIAR", "DETENER"]:
            return Response(
                {"error": "Acción no válida. Opciones permitidas: PAUSAR, REANUDAR, INICIAR, DETENER"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        gateway_prefix = "rafaela/d83add60dbb0/ala_este/linea_mezclado_1"
        topic_comando = f"{gateway_prefix}/cmd/control"
        
        mqtt_payload = {
            "cmd": "control",
            "action": accion,
            "timestamp": now().timestamp()
        }
        
        if accion == "INICIAR" and orden.receta:
            mqtt_payload = {
                "cmd": "mezcla",
                "receta": orden.receta.nombre,
                "ingredientes": [
                    {"nombre": det.ingrediente.nombre, "cantidad": det.cantidad, "unidad": det.unidad}
                    for det in orden.receta.detalles.all()
                ],
                "timestamp": now().timestamp()
            }
            orden.estado = 'EN_PROCESO'
            orden.save()
            
            EjecucionReceta.objects.create(
                receta=orden.receta,
                seccion=orden.dispositivo.seccion if orden.dispositivo else Seccion.objects.first(),
                estado='EN_PROGRESO'
            )

        elif accion == "PAUSAR":
            mqtt_payload["action"] = "PAUSAR"
            
        elif accion == "REANUDAR":
            mqtt_payload["action"] = "DETENER"
            
        mqtt_mgr = MQTTBackendManager()
        exito = mqtt_mgr.publish_command(topic=topic_comando, payload=mqtt_payload, dispositivo=orden.dispositivo)
        
        if exito:
            return Response({
                "mensaje": f"Orden {orden.codigo}: Acción '{accion}' enviada con éxito.",
                "topic": topic_comando,
                "mqtt_payload": mqtt_payload
            })
        else:
            return Response({
                "error": "Error al comunicar la acción al Broker de mensajería MQTT."
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
