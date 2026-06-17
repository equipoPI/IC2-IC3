from django.urls import path
from . import views

urlpatterns = [
    # La vista web clásica por defecto
    path('', views.index, name='index'),
    
    # Puente de datos(API)
    path('api/fabricas/', views.api_lista_fabricas, name='api_fabricas'),
    path('api/fabricas/<int:pk>/', views.api_detalle_fabrica, name='api_detalle_fabrica'),
]