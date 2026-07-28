"""
URL configuration for mysite project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from polls.auth_views import LoginView, LogoutView, UserDetailsView, RegisterView
from polls.views import api_csrf
from polls.views import api_csrf_token

urlpatterns = [
    path('admin/', admin.site.urls),
    # Montar la API de la app `polls` bajo /api/v1/
    path('api/v1/', include('polls.urls')),
    # Endpoint auxiliar para que SPA obtenga cookie CSRF a través del proxy '/api'
    path('api/csrf/', api_csrf),
    path('api/csrf-token/', api_csrf_token),
    # Auth: registramos vistas clave con documentación en español y delegamos
    path('api/v1/auth/login/', LoginView.as_view(), name='rest_login'),
    path('api/v1/auth/logout/', LogoutView.as_view(), name='rest_logout'),
    path('api/v1/auth/user/', UserDetailsView.as_view(), name='rest_user_details'),
    path('api/v1/auth/registration/', RegisterView.as_view(), name='rest_register'),
    # Resto de endpoints de dj-rest-auth (password reset, etc.)
    path('api/v1/auth/', include('dj_rest_auth.urls')),
    path('api/v1/auth/registration/', include('dj_rest_auth.registration.urls')),
    # Endpoints web de allauth (útiles para confirmación por email)
    path('accounts/', include('allauth.urls')),
]

# Añadir soporte para archivos de medios en modo DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
