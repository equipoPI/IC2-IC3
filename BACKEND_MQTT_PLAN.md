cosas que quiero hacer:
En la carpeta `control` están el código de la Raspberry y el Arduino, donde corre la comunicación MQTT y los actuadores. Hay una interfaz donde se debe configurar la conexión al broker para no modificar código fuente al cambiar credenciales/host.

En la UI falta un lugar para introducir la contraseña del broker y una sección "Help" que describa los topics soportados (formatos de payload, ejemplos, QoS, retained), para que quien integre dispositivos sepa cómo enviar/recibir datos.

Broker Mosquitto: en la sección de MQTT debe haber una opción para controlar seguridad y restringir conexiones a dispositivos concretos. La contraseña configurada en la UI de la Raspberry debería coincidir con la del broker Mosquitto para permitir autenticación.

Contenedores: los contenedores Docker ya están levantados; falta integrarlos (frontend ↔ backend ↔ DB ↔ broker MQTT) y validar flujo de datos end-to-end.

Revisar la documentación oficial de Django cuando sea necesario: https://docs.djangoproject.com/

Preguntas para afinar el plan
1. ¿Dispones ahora del hardware Raspberry + Arduino o quieres empezar emulado?
	 - Respuesta: pruebas con dispositivo real (código en `/control` ya funciona).
2. ¿Gateway en Docker (con device mapping) o fuera en la Raspberry/host?
	 - Respuesta: actualmente funciona fuera de Docker; se debe añadir una UI para editar y guardar la configuración (IP, puerto, usuario, contraseña) en un archivo de configuración.
3. ¿UI directa al broker (WebSockets) o vía backend (recomendado)?
	 - Recomendación: pasar todo por backend para controlar seguridad y permisos.
4. ¿Auth/TLS desde el inicio o auth desactivada para pruebas?
	 - Recomendación: pruebas locales sin TLS están bien, pero en producción activar TLS + password_file + ACL.
5. ¿DB: SQLite o PostgreSQL?
	 - Recomendación: PostgreSQL en producción.
6. Redundancia y coherencia entre UI y dispositivos:
	 - Usar retained messages, heartbeats y patrón comando/ack; backend marca `last_seen` y valida acks antes de confirmar acciones en la UI.

---
COMBINACIÓN: Plan, respuesta y diagnóstico
=========================================

He fusionado el contenido del plan original con el documento de respuesta (`BACKEND_MQTT_PLAN_RESPONSE.md`) y añadí el diagnóstico del estado actual del backend y pasos concretos a seguir. Este archivo es el punto de partida único para implementar la API, conectar el frontend y asegurar la integración MQTT.

1) Resumen del Plan (4 pasos ejecutables)

- Preparación y diseño
	- Elegir el flujo: gateway (Raspberry) publica al broker; backend se subscribe y persiste; UI se comunica solo con backend (REST + WebSocket).
	- Definir topics, QoS, retained, y patrón de comandos/acks.
	- Definir alcance de seguridad inicial: pruebas con auth desactivada o entorno cerrado; producción con TLS + passwords + ACL.

- Implementación mínima viable (MVP)
	- Añadir archivo de configuración para el gateway (ej. `config.yaml` o `.env`) y UI para editarlo.
	- Configurar Mosquitto en Docker Compose con auth (password file) y opcional listener websocket.
	- Implementar en backend un "MQTT worker" (management command o servicio) que suscriba y guarde lecturas en PostgreSQL; exponer endpoints DRF para datos e historial; exponer canal WebSocket para push a UI.

- Integración UI / Backend / Gateway
	- UI: formulario para credenciales/host/puerto del gateway y sección Help que liste topics, formatos y acciones posibles.
	- Backend autentica usuarios y gestiona roles (admin/manager/operator).
	- Evitar que la UI se conecte directamente al broker en producción.

- Pruebas y seguridad
	- Pruebas con hardware real: validar retained messages, last-will, heartbeats y patrón comando/ack.
	- Preparar despliegue en producción: TLS con certificados, revisar ACLs y rotación de credenciales.

2) Sugerencias prácticas (extracto del documento de respuesta)

- Configuración del gateway (Raspberry + Arduino)
	- Crear `control/raspberry_gateway/config.yaml` o `.env` (no versionar), con campos: `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX`, `SERIAL_PORT`, `SERIAL_BAUD`.
	- Añadir UI/CLI para editar y desplegar esa configuración en la Raspberry.

- UI — sección contraseña y Help de topics
	- Añadir formulario protegido (solo Admins) para gestionar credenciales del broker.
	- Documentar los topics y formatos de payload en la sección Help de la UI.

- Mosquitto — autenticación y cómo integrarla
	- En producción: `allow_anonymous false`, `password_file /mosquitto/config/passwd`, `acl_file /mosquitto/config/acl`, listeners apropiados (1883 y opcional websocket).
	- Crear usuarios con `mosquitto_passwd` y gestionar ACLs por usuario.

- Contenedores e integración
	- Asegurar que backend, db y mosquitto estén en la misma red de Compose.
	- Backend debe conectarse a broker interno (`mosquitto` en Compose). Si gateway está fuera de Docker, ajustar host/puerto.

3) Diagnóstico rápido del backend (estado actual y problemas detectados)

- Lo que ya está listo
	- Django + DRF instalados (`rest_framework` en `INSTALLED_APPS`).
	- Endpoints básicos en `polls` y serializers parciales (`Fabrica`, `OrdenProduccion`, `Receta`).
	- Superuser creado y migraciones aplicadas según logs.
	- CORS y token auth configurados; logging y modelos `polls` completos.

- Problemas detectados (a corregir antes de exponer API en producción)
	1. `STATIC_ROOT` no está definido → `collectstatic` falla. Añadir `STATIC_ROOT = BASE_DIR / 'staticfiles'`.
	2. `ALLOWED_HOSTS = []` → `DisallowedHost` con `host.docker.internal`. En dev añadir `['localhost','127.0.0.1','host.docker.internal']`.
	3. `DEBUG = True` ahora; en producción usar `False` y separar settings.
	4. `SECRET_KEY` en claro → mover a variable de entorno / `key.env`.
	5. `mysite/urls.py` tiene `urlpatterns` duplicado — limpiar.
	6. Muchos serializers/commentarios están comentados; implementar los serializers que se vayan a exponer.
	7. Elegir estrategia de auth para la API: JWT recomendado para SPA.
	8. `CORS_ALLOW_ALL_ORIGINS = True` solo para dev; en producción restringir.
	9. Gestionar credenciales MQTT fuera del repo.

4) Recomendaciones y pasos ordenados antes de exponer API

- Entorno & configuración (rápido)
	- Añadir `STATIC_ROOT` y crear carpeta; ejecutar `collectstatic`.
	- Ajustar `ALLOWED_HOSTS` para desarrollo.
	- Mover `SECRET_KEY` y credenciales a variables de entorno.

- Asegurar integridad DB
	- `showmigrations`, `makemigrations`, `migrate` dentro del backend.

- API design y seguridad
	- Decidir auth (JWT recomendado). Implementar `simplejwt` si se opta por JWT.
	- Crear prefijo `api/v1/` y usar `ViewSet` + `Router`.
	0.  - Establecer permisos por endpoint: `IsAuthenticated`, `IsAdminUser`.

- Serializers y endpoints mínimos (priorizar)
	- Implementar serializers y ViewSets para: `Fabrica`, `Seccion`, `Empleado`, `DispositivoSCADA`, `LecturaSensor`, `OrdenProduccion`, `ConfiguracionMQTT` (password write_only).

- Autenticación y frontend
	- Para SPA usar JWT + refresh tokens; documentar flujo para frontend.

- Documentación automática
	- Habilitar `drf-spectacular` y exponer `/api/schema/` y Swagger UI.

5) Comandos útiles inmediatos

-- Ver migraciones
```bash
docker compose -f IC2-IC3/docker-compose.yml exec -T backend python manage.py showmigrations
```

-- Ejecutar migraciones
```bash
docker compose -f IC2-IC3/docker-compose.yml exec -T backend python manage.py makemigrations
docker compose -f IC2-IC3/docker-compose.yml exec -T backend python manage.py migrate
```

-- Añadir STATIC_ROOT y ejecutar collectstatic (tras editar `settings.py`)
```bash
docker compose -f IC2-IC3/docker-compose.yml exec -T backend python manage.py collectstatic --noinput
```

-- Reiniciar backend
```bash
docker compose -f IC2-IC3/docker-compose.yml restart backend
```

6) Próximos pasos recomendados (elige uno)

- (A) Aplico cambios mínimos en `settings.py` (`STATIC_ROOT`, `ALLOWED_HOSTS`, mover `SECRET_KEY` a env) y ejecuto `collectstatic` y reinicio el backend.
- (B) Genero `ViewSet` y `Router` para los modelos prioritarios (`Fabrica`, `Empleado`, `DispositivoSCADA`, `LecturaSensor`, `OrdenProduccion`) y añado `api/v1/` en `mysite/urls.py` para comenzar a integrar el frontend.

---
Documento fusionado: `IC2-IC3/BACKEND_MQTT_PLAN.md` (actualizado)


Qué falta para integrar con el backend Django (opciones prácticas):

- Confirmar/normalizar los strings en `control/raspberry_gateway/config.yaml` (tenant, gateway_id, publish/subscribe mappings).
- Implementar en el backend un worker MQTT (ej.: comando de management o servicio separado) que se suscriba a los mismos topics (p. ej. {tenant}/+/+/+/+/+ o filtros concretos) y traduzca mensajes a modelos/serializers para persistir.
- Mapear topics → modelos (mediciones, eventos, alarmas) y documentar payloads esperados (ya hay payloads JSON en el gateway).
- Alternativa: exponer una API donde el gateway POSTee datos en lugar de MQTT (menos ideal si ya hay broker).

**Vinculación interfaz ↔ backend — arquitectura propuesta**

- **API REST (DRF)**: crear ViewSets/Serializers y rutas bajo `api/v1/` para `Fabrica`, `Seccion`, `DispositivoSCADA`, `LecturaSensor`, `Evento` y `ConfiguracionMQTT` (credenciales y `topic_prefix`). La UI consumirá esta API para CRUD y para mostrar la sección Help.
- **Modelo `ConfiguracionMQTT`**: campos mínimos: `host`, `port`, `user`, `password` (write_only), `topic_prefix`, `use_tls`, `active` y `last_updated`. Gestionable desde la UI (solo Admins).
- **Worker MQTT (backend)**: servicio/`management command` (`mqtt_worker`) que:
	- lee la configuración desde `ConfiguracionMQTT` o `settings`,
	- se conecta al broker con `paho-mqtt`/`gmqtt`,
	- se suscribe a patrones acordados (ej. `{fabrica}/+/+/+/+/+`),
	- parsea payloads JSON, normaliza campos (timestamp, gateway_id, fabrica, sistema, variable) y persiste en modelos (`LecturaSensor`, `Evento`, `Alarma`).
- **Autenticación y permisos**: usar JWT (`djangorestframework-simplejwt`) para la SPA; endpoints de gestión protegidos con `IsAdminUser`.
- **UI / Help**: añadir formulario para `ConfiguracionMQTT` y una página Help que documente topics, payloads de ejemplo, QoS y uso de retained/last-will.
- **Realtime**: opcionalmente exponer WebSocket/Channels para push desde el worker al frontend (alternativa: el frontend hace polling o usa SSE).

**Pasos concretos a implementar (orden sugerido)**
1. Crear el modelo `ConfiguracionMQTT` en la app `polls` y generar migración.
2. Exponer `ConfiguracionMQTT` vía ViewSet + Serializer y añadir la ruta en `api/v1/`.
3. Scaffold del `mqtt_worker` como `management/commands/mqtt_worker.py` con conexión y logging básico.
4. Normalizar nomenclatura: decidir `fabrica` (recomendado) y actualizar `control/raspberry_gateway/config.yaml` y la documentación.
5. Implementar Serializers y ViewSets para `LecturaSensor` y `DispositivoSCADA`.
6. Añadir `simplejwt` y configurar permisos para la UI.

**Criterios para mantener coherencia**
- Usar un `topic_prefix` configurable (no hardcodear `tenant`/`fabrica`).
- No permitir que la UI se conecte directamente al broker en producción; pasar todo por backend.
- Documentar ejemplos de payload y tests E2E para cada tipo de mensaje.
- Implementar heartbeats/last_seen y comando/ack para acciones desde la UI.

**Opciones prioritarias — elige por dónde arrancamos**
- (A) Crear `ConfiguracionMQTT` + API (migración + endpoint). Esto permite que la UI gestione credenciales.
- (B) Scaffold y test básico del `mqtt_worker` (recibir y loguear mensajes). Esto valida persistencia y flujo broker→backend.
- (C) Normalizar `tenant`→`fabrica` en `control/raspberry_gateway/config.yaml` y actualizar docs.
- (D) Implementar ViewSets/Serializers para `LecturaSensor` y `DispositivoSCADA` y exponer `api/v1/`.
- (E) Añadir auth JWT (`simplejwt`) y configurar permisos en el backend.

Anotá cuál opción preferís y la implemento: A / B / C / D / E.

Estado actual (actualizado):
- Normalización `tenant` aplicada en el gateway: `control/raspberry_gateway` usa ahora exclusivamente `tenant` (la GUI muestra el valor de `tenant` como nombre de fábrica).

Siguiente recomendación: proceder con la opción (A) para estabilizar configuración del backend (`STATIC_ROOT`, `ALLOWED_HOSTS`, mover `SECRET_KEY` a env`) antes de exponer APIs.

## Registro - elementos añadidos tras revisar video de CRUD

Los siguientes pasos se agregaron al plan después de revisar el video de implementación de una API REST CRUD (Modelo → Serializer → ViewSet → Router) para dejar constancia y guiar la implementación:

- Implementar CRUD completo para recursos clave: crear `Modelo`, `Serializer`, `ModelViewSet` y registrar `Router`/URL.
- Registrar el modelo en `admin.py` para gestión desde el panel de Django.
- Generar migraciones y aplicarlas (`makemigrations` / `migrate`).
- Añadir pruebas unitarias e integración que cubran create/read/update/delete para cada endpoint crítico.
- Marcar campos sensibles como `write_only` (ej. `password`) y asegurar que credenciales no queden versionadas.
- Habilitar paginación, filtros y búsqueda (DRF paginator + `django-filter`).
- Publicar documentación automática de la API (ej. `drf-spectacular` / Swagger) y ejemplos `curl`/Postman.
- Añadir validaciones en serializers y manejo de errores consistente (códigos HTTP correctos, mensajes claros).
- Planificar permisos y autenticación (preparar `simplejwt` para JWT cuando se active la opción de seguridad).

Este bloque es un registro de decisiones/pendientes y debe mantenerse sincronizado con las tareas concretas en el TODO.

### Cambios añadidos tras revisar el repositorio

- Asegurar secretos y despliegue:
	- Mover `SECRET_KEY` a variable de entorno (`DJANGO_SECRET_KEY`) y no versionar `key.env`.
	- Confirmar `ALLOWED_HOSTS` vía `DJANGO_ALLOWED_HOSTS` en `key.env` o variables CI.
	- `STATIC_ROOT` ya presente; ejecutar `collectstatic` en el contenedor antes de servir estáticos en producción.

- API y autenticación:
	- Añadir `REST_FRAMEWORK` en `settings.py` con `DEFAULT_AUTHENTICATION_CLASSES` apuntando a `Simple JWT`.
	- Instalar/configurar `djangorestframework-simplejwt` y añadir rutas `token/` y `token/refresh/` en `mysite/urls.py`.
	- Decidir permiso por defecto (`IsAuthenticated`) y declarar endpoints públicos con `AllowAny` donde convenga.

- Serializers / ViewSets / Migrations:
	- Implementar/activar serializers para `ConfiguracionMQTT`, `TopicMQTT`, `DispositivoSCADA`, `LecturaSensor`, `Fabrica`, `OrdenProduccion`, `Receta`.
	- Registrar todos los ViewSets en `polls/urls.py` (router) y probar `makemigrations` / `migrate`.
	- Marcar campos sensibles `write_only` (p.ej. `password`) en los serializers.

- Frontend:
	- Añadir login SPA (obtener tokens), guardar token/refresh y enviar `Authorization` en todos los `fetch`.
	- Actualizar `scada-ui` para mapear nombres de campos backend (p.ej. `broker_url`), manejar 401 y refresh.

- MQTT worker y control:
	- Crear `management/commands/mqtt_worker.py` o un servicio/contenedor separado que use `paho-mqtt` y persista `LecturaSensor`.
	- Diseñar endpoints de control (POST `devices/{id}/actions/`) que validen permisos y publiquen comandos al broker.
	- Registrar comunicaciones en un modelo `ComunicacionMQTT` para auditoría y seguimiento.

- Observabilidad y tests:
	- Añadir healthchecks y logs para `mqtt_worker` y mosquitto (Compose healthcheck ya definido para mosquitto).
	- Añadir tests básicos CRUD e integración para control y mqtt ingestion.
	- Habilitar `drf-spectacular` para documentación OpenAPI/Swagger.

Orden recomendado de trabajo:
1. Settings + secrets + collectstatic + reinicio contenedores.
2. Serializers + ViewSets + Router + migraciones.
3. JWT (SimpleJWT) + permisos globales + frontend login.
4. MQTT worker + endpoints de control + pruebas end-to-end.
5. Observabilidad, tests y documentación (Swagger).





