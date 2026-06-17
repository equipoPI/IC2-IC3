from django.shortcuts import render
from django.http import HttpResponse

# --- Importaciones de Django REST Framework ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Fabrica
from .serializers import FabricaSerializer

# =============================================================================
# Vistas tradicionales
# =============================================================================
def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")

# =============================================================================
# Vistas de la API (Endpoints para React y Arduino)
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny]) # <-- Esto quita el error de autenticación
def api_lista_fabricas(request):
    """
    Endpoint para listar todas las fábricas o crear una nueva.
    """
    if request.method == 'GET':
        fabricas = Fabrica.objects.all()
        serializer = FabricaSerializer(fabricas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Recibe los datos de React, los valida y los guarda
        serializer = FabricaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        # Si falta un dato obligatorio, devuelve el error exacto
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
        # partial=True permite actualizar solo algunos campos sin romper el resto
        serializer = FabricaSerializer(fabrica, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        fabrica.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)