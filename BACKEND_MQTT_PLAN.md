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

## Resumen de estado — Hecho y Pendiente (actualizado 2026-07-24)

- Hecho:
	- Soporte SMTP configurado y probado dentro del contenedor (variables en `.env.smtp`, `docker-compose` y `settings.py`).
	- Integración de registro/confirmación por email con `django-allauth` + `dj-rest-auth` (endpoints `/api/v1/auth/registration/` y `/api/v1/auth/registration/verify-email/`).
	- `api_root` actualizado para exponer rutas de autenticación y descripciones cortas por recurso.
	- Migraciones aplicadas y `Site` creado (fixture `initial_site.json` cargada).
	- `collectstatic` ejecutado y backend reiniciado con respuestas 200 en `/api/v1/`.

- Pendiente / Por verificar:
	- Crear commit que agrupe estos cambios (recomendado antes de refactorizaciones mayores).
	- Flujo de recuperación de contraseña: endpoints existen pero falta ajustar plantillas de email y UX en frontend.
	- Plantillas y URLs de redirección (`ACCOUNT_EMAIL_CONFIRMATION_*`) deben apuntar al frontend (configurar valores definitivos).
	- Mover `SECRET_KEY` a variable de entorno y revisar `ALLOWED_HOSTS` (producción) si no está hecho.
	- Revisar y confirmar `STATIC_ROOT` en `settings.py` y volver a ejecutar `collectstatic` en despliegue final si se modifica.
	- Implementar formularios/páginas en `scada-ui` para registro, verificación y recuperación.
	- Pruebas E2E (registro → email → confirmación → login) pendientes.
	- Normalización definitiva `tenant`→`fabrica` en `control/raspberry_gateway/config.yaml` (en progreso) y sincronizar docs/UI.

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

Autenticación, roles y flujos de cuenta (registro, confirmación y recuperación)

	- Recomendación: implementar gestión de cuentas y roles desde el inicio para soportar niveles de acceso (superuser, jefe, empleado).
	- Roles mínimos propuestos:
		- `Superuser`: control total (panel admin, gestión de usuarios, creación/edición de recetas y sistemas).
		- `Jefe` (role `manager`): permisos para crear/editar `Receta`, `Sistema`, `PlantillaProduccion`, `ConfiguracionMQTT` y aprobar/gestionar `OrdenProduccion`.
		- `Empleado` (role `operator`): permisos limitados a operar objetos existentes (consultar y ejecutar órdenes, crear lecturas si corresponde).
	- Implementación recomendada:
		- Añadir un `Profile` o `Role` model relacionado con `django.contrib.auth.User` si se necesitan metadatos de usuario.
		- Usar `django-guardian` (per-object) o permisos por grupo/role estándar de Django para mapear capacidades.
		- Definir permisos a nivel de ViewSet con clases personalizadas que verifiquen `request.user.groups` o `request.user.profile.role`.
	- Flujo de cuenta (recomendado):
		1. Registro desde frontend: POST a `auth/register/` (datos básicos: email, password, nombre).
		2. Backend crea usuario inactivo y envía email de confirmación con token (link con `uid` + `token`).
		3. Usuario confirma y backend activa la cuenta; opcionalmente asigna role por defecto (`Empleado`).
		4. Login: obtener `access`/`refresh` (SimpleJWT) o session auth según elección.
		5. Recuperación de contraseña: endpoint `password/reset/` que envía email con token y `password/reset/confirm/` para cambiar contraseña.
	- Librerías recomendadas para acelerar: `dj-rest-auth` + `django-allauth` (registro+confirmación+social), o `django-rest-registration` si prefieres menos acoplamiento. Todas soportan envío de emails y endpoints de confirmación/recovery; con SimpleJWT se puede integrar el login/token.
	- Email: configurar backend SMTP mediante variables de entorno (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`). Para desarrollo puede usarse `console.EmailBackend`.
	- Seguridad y UX:
		- `password` siempre `write_only` en serializers.
		- Verificar confirmación por email antes de permitir acciones sensibles.
		- Opcional: MFA o verificación adicional para `Jefe`/`Superuser`.

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

Estado: SMTP y pruebas de correo
--------------------------------

- **Configuración aplicada:** Se añadió un fichero local de variables de entorno de ejemplo `.env.smtp.example` y se creó un `.env.smtp` (ignorado por git) con las credenciales de `scadav1.3@gmail.com`.
- **Carga en Docker Compose:** `docker-compose.yml` fue actualizado para incluir `.env.smtp` en `env_file`, de modo que el servicio `backend` carga las variables SMTP al arrancar.
- **Ajustes en Django:** `mysite/mysite/settings.py` ya lee las variables de entorno para `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` y `DJANGO_DEFAULT_FROM`.
- **Prueba realizada:** Ejecuté un script de prueba dentro del contenedor (`scripts/send_email_test.py`) y el backend reportó `emails_sent=1`. Se verificó que las variables se cargaron correctamente en el contenedor.

Estado actual (actualizado 2026-07-24)
------------------------------------

- Soporte SMTP: implementado y verificado dentro del contenedor. `.env.smtp` es cargado por `docker-compose` y `settings.py` usa las variables para `EMAIL_BACKEND` y credenciales.
- Integración de registro/confirmación: instalé e integré `django-allauth` + `dj-rest-auth`, aplicaron migraciones y creé el `Site` (id=1). El endpoint de registro `/api/v1/auth/registration/` y confirmación `/api/v1/auth/registration/verify-email/` están disponibles y envían el email de verificación.
- `api_root` actualizado: añadí las rutas de auth y descripciones en `/api/v1/` (ahora devuelve `url` + `description` por recurso).
- Ajustes menores ya aplicados: `collectstatic` se ejecutó (archivos estáticos recogidos), el backend fue reiniciado y funciona (logs muestran arranque y respuestas 200 para `/api/v1/`).

Pendientes importantes
----------------------

- Recuperación de contraseña (reset): los endpoints existen vía `dj-rest-auth`, pero falta comprobar/ajustar plantillas de email y flujos front-end para completar la UX.
- Verificar/ajustar plantillas de email y URLs de redirección (`ACCOUNT_EMAIL_CONFIRMATION_*`) para que apunten al front-end (opcional, recomendado).
- Frontend (`scada-ui`): falta implementar componentes/páginas para registro, verificación automática por `key`, login y recuperación de contraseña.
- Commit de cambios: todavía no se ha registrado un commit que agrupe estas modificaciones (lo crearé ahora según indicaste).

Siguientes pasos acordados
-------------------------

1. Crear commit con mensaje corto indicando que se añadió soporte SMTP y flujo de registro/confirmación.
2. Opción C: Normalizar `tenant` → `fabrica` en `control/raspberry_gateway/config.yaml` y actualizar documentación en la UI/README (esta acción se ejecutará a continuación).
3. Opción A: Aplicar cambios mínimos en `settings.py` si quedan (confirmar `STATIC_ROOT`, `ALLOWED_HOSTS`, mover `SECRET_KEY` a env si aún es necesario), ejecutar `collectstatic` y reiniciar backend.

Marcaré estas tareas en el TODO y luego procederé con C seguido de A.

Dónde está la configuración (archivos relevantes)
- `.env.smtp` — archivo local con credenciales SMTP (no versionado). Ejemplo: [IC2-IC3/.env.smtp.example](IC2-IC3/.env.smtp.example)
- `docker-compose.yml` — incluye `.env.smtp` vía `env_file` para el servicio `backend`: [IC2-IC3/docker-compose.yml](IC2-IC3/docker-compose.yml)
- `settings.py` — Django lee las variables y configura `EMAIL_BACKEND` y demás parámetros: [mysite/mysite/settings.py](mysite/mysite/settings.py)

Cómo se integraría en los flujos de usuario (resumen técnico)
- **Registro / confirmación de cuenta:** el `RegisterAPIView` debe crear el `User` con `is_active=False`, generar un token de activación (ej. `uid`+`token` o JWT de propósito único) y enviar un email con un enlace de activación que apunte al endpoint de confirmación. El envío se realiza con `django.core.mail.send_mail` o con `EmailMultiAlternatives` para HTML.
- **Recuperación de contraseña:** usar los endpoints de Django (`PasswordResetView`/`PasswordResetConfirmView`) o librerías como `dj-rest-auth`/`django-rest-registration` que construyen los emails automáticamente. Estos endpoints envían un correo con token/uid y permiten confirmar y cambiar la contraseña.
- **Notificaciones operativas y administración:** cualquier acción que requiera notificación (aprobación de orden, alertas de alarma) puede usar el mismo `send_mail`/plantillas y obtener `From` de `DJANGO_DEFAULT_FROM`.
- **Recomendaciones de implementación:** usar librerías probadas (`dj-rest-auth` + `django-allauth` o `django-rest-registration`) para ahorrar tiempo; usar tokens con expiración; enviar emails en background (Celery/RQ) en producción; mantener plantillas de correo en `templates/`.

Próximos pasos sugeridos (corto plazo)
- Confirmar plantillas de email (texto y HTML) y ubicación (`templates/emails/`).
- Implementar endpoint de confirmación y enlazarlo con el `RegisterAPIView` existente (`polls/views.py`).
- Implementar endpoints de password reset (o integrar `dj-rest-auth`) y probar el flujo end-to-end usando la cuenta `peladocrack19@gmail.com` como destino.
- Pasar el envío de mails a una tarea asíncrona antes de producción (Celery + broker) para no bloquear peticiones.
 - Añadir endpoint administrativo para modificar el `role`/`profile` de un usuario (ej. `PATCH /api/v1/users/{id}/role/`) y UI para que admins puedan elevar/restringir privilegios.

Notas de seguridad
- Nunca versionar `.env.smtp` ni credenciales en el repositorio. Usar `.env.smtp` local (ya está en `.gitignore`).
- Para Gmail en producción usar App Passwords y revisar el panel de seguridad de la cuenta.






