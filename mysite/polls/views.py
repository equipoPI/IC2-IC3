from django.shortcuts import render
from django.http import HttpResponse

# --- Importaciones de Django REST Framework ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# --- Importaciones de Modelos y Serializers ---
# ACÁ AGREGAMOS ORDENPRODUCCION
from .models import Fabrica, OrdenProduccion, Receta, HistorialProduccion
from .serializers import (
    FabricaSerializer,
    OrdenProduccionSerializer, 
    OrdenProduccionListSerializer,
    RecetaSerializer
) 

# =============================================================================
# Vistas tradicionales
# =============================================================================
def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")


# =============================================================================
# Vistas de la API - MÓDULO DE FÁBRICAS
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def api_lista_fabricas(request):
    """
    Endpoint para listar todas las fábricas o crear una nueva.
    """
    if request.method == 'GET':
        fabricas = Fabrica.objects.all()
        serializer = FabricaSerializer(fabricas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = FabricaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_detalle_fabrica(request, pk):
    """
    Endpoint para editar o borrar una fábrica específica usando su ID.
    """
    try:
        fabrica = Fabrica.objects.get(pk=pk)
    except Fabrica.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = FabricaSerializer(fabrica, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        fabrica.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Vistas de la API - MÓDULO DE PRODUCCIÓN
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def api_lista_ordenes(request):
    """Listar todas las órdenes (formato resumido) o crear una nueva"""
    if request.method == 'GET':
        ordenes = OrdenProduccion.objects.all().order_by('-fecha_creacion')
        serializer = OrdenProduccionListSerializer(ordenes, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = OrdenProduccionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_detalle_orden(request, pk):
    """Ver detalles completos, editar progreso/estado o borrar una orden específica"""
    try:
        orden = OrdenProduccion.objects.get(pk=pk)
    except OrdenProduccion.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = OrdenProduccionSerializer(orden)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = OrdenProduccionSerializer(orden, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        orden.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)