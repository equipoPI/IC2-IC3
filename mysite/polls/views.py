from django.shortcuts import render
from django.http import HttpResponse

# --- Importaciones nuevas para tu API (Django REST Framework) ---
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Fabrica
from .serializers import FabricaSerializer

# =============================================================================
# Vistas tradicionales
# =============================================================================
def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")

# =============================================================================
# Vistas de la API (Endpoints para React)
# =============================================================================
@api_view(['GET'])
def api_lista_fabricas(request):
    """
    Endpoint para que React consuma el estado de las fábricas.
    """
    # 1. Buscamos todas las fábricas en la base de datos
    fabricas = Fabrica.objects.all()
    
    # 2. Las pasamos por el "traductor" (many=True porque puede haber más de una)
    serializer = FabricaSerializer(fabricas, many=True)
    
    # 3. Devolvemos el JSON listo
    return Response(serializer.data)