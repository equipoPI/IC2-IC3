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
