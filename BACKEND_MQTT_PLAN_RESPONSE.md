# Plan y sugerencias para integración MQTT y backend

## Plan resumido (4 pasos ejecutables)

1. Preparación y diseño
   - Elegir el flujo: gateway (Raspberry) publica al broker; backend se subscribe y persiste; UI se comunica solo con backend (REST + WebSocket).
   - Definir topics, QoS, retained, y patrón de comandos/acks.
   - Decidir alcance de seguridad inicial: pruebas con auth desactivada o entorno cerrado; producción con TLS + passwords + ACL.

2. Implementación mínima viable (MVP)
   - Añadir archivo de configuración para el gateway (ej. `config.yaml` o `.env`) y UI para editarlo.
   - Configurar Mosquitto en Docker Compose con auth (password file) y opcional listener websocket.
   - Implementar en backend un "MQTT worker" (management command o servicio) que suscriba y guarde lecturas en PostgreSQL; exponer endpoints DRF para datos e historial; exponer canal WebSocket para push a UI.

3. Integración UI / Backend / Gateway
   - UI: formulario para credenciales/host/puerto del gateway y sección Help que liste topics, formatos y acciones posibles.
   - Backend autentica usuarios y gestiona roles (admin/manager/operator).
   - Asegurar que la UI no se conecta directamente al broker en producción.

4. Pruebas y seguridad
   - Pruebas con hardware real (ya disponible). Validar retained messages, last-will, heartbeats y patrón comando/ack.
   - Preparar despliegue en producción: TLS con certificados, revisar ACLs y rotación de credenciales.

## Sugerencias y respuestas a las dudas

1) Configuración del gateway (Raspberry + Arduino)
- Recomendación: crear un archivo de configuración en la carpeta `control/raspberry_gateway/` (ej. `config.yaml` o `.env`) que no esté en git. Campos mínimos: `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX`, `SERIAL_PORT`, `SERIAL_BAUD`.
- UX: añadir una pequeña página en la UI (o script CLI) para editar esos valores y guardarlos en el dispositivo (por ejemplo, endpoint backend que envía config al gateway o archivo servido por backend protegido).
- Seguridad: jamás almacenar credenciales en el repo; usar `.gitignore` y pedir al usuario que copie/pegue credenciales en la Raspberry.

2) UI — sección contraseña y Help de topics
- Añadir en la UI:
  - Formulario protegido para introducir usuario/contraseña del broker (solo Admins).
  - Página Help que muestre:
    - Árbol de topics soportados (ejemplos y formato JSON esperado).
    - Ejemplo de payloads (lectura, comando, ack).
    - Recomendación de QoS y uso de mensajes retenidos.
- Ejemplo de temas: `scada/<site>/<device>/<type>/<id>/state`, `scada/<site>/<device>/cmd`, `scada/<site>/<device>/cmd/ack`.

3) Mosquitto — autenticación y cómo integrarla
- Producción: activar auth y TLS. Ejemplo de configuración (mosquitto.conf):
  - `listener 1883`
  - `listener 9001` (websockets si lo necesitas)
  - `allow_anonymous false`
  - `password_file /mosquitto/config/passwd`
  - `acl_file /mosquitto/config/acl`
- Crear usuarios: `mosquitto_passwd -c passwd username` (instrucción, no ejecutar aquí).
- ACLs: asignar permisos por usuario sobre rangos de topics para limitar quién publica/subscribe.
- Alternativa: dejar broker interno accesible solo a la red Docker y forzar que el backend actúe como puente para UI y usuarios externos.

4) Contenedores e integración (frontend, backend, DB, broker)
- En Docker Compose:
  - Asegurar que los servicios estén en la misma red (o puertos expuestos controladamente).
  - Backend debe poder conectarse al broker interno (host: `mosquitto` en Compose).
  - Si el gateway corre en Raspberry fuera de Docker, configurar su `MQTT_HOST` apuntando al host donde corre Mosquitto (IP/puerto). Si querés dockerizar gateway en Raspberry, mapear el dispositivo serial con `--device /dev/tty*`.
- Flujo recomendado: Gateway -> Broker -> Backend (suscribe) -> DB + WebSocket -> UI.

5) Guardado de datos: SQLite vs PostgreSQL
- Desarrollo / pruebas: SQLite puede valer.
- Producción: usar PostgreSQL. Modelos recomendados Django:
  - Device (id, name, type, last_seen)
  - Sensor/Actuator (device FK, type)
  - Reading (timestamp, device FK, sensor, value, raw_topic)
  - CommandLog (timestamp, device FK, command, status, correlation_id)
- Backend debe exponer endpoints para historial, estado actual, y envío de comandos (que publica al broker).

6) Cómo garantizar sincronía entre interfaz y realidad (redundancia / consistencia)
- Retained messages: publicar el estado actual con `retain=true` para que subscriptores nuevos obtengan el estado.
- Heartbeat: cada dispositivo publica periódicamente `device/<id>/heartbeat` con timestamp; backend marca `last_seen`.
- Comando/ack pattern: UI → backend → backend publica `device/<id>/cmd` con `correlation_id`; Arduino responde en `device/<id>/cmd/ack` con el mismo id. Registrar timeouts y reintentos.
- Estado de reconciliación: backend puede forzar una consulta/poll al dispositivo (ej. publicar `device/<id>/cmd/get_state`) y esperar `retained` o `ack`.
- Validaciones: backend debe validar que una acción solicitada por UI fue efectivamente ejecutada por el dispositivo antes de marcarla como completada.

7) Roles y permisos en la UI/backend
- Roles mínimos: Admin (gestiona credenciales y ACLs), Manager (puede enviar comandos a ciertos dispositivos), Operator (ver datos y ejecutar acciones limitadas).
- Implementación: usar Django Auth + Groups + permisos; exponer endpoints DRF que chequen permisos; UI oculta funcionalidades según rol.

8) Diseño de topics y buenas prácticas
- Estructura sugerida:
  - Telemetría: `scada/<site>/<device>/sensor/<sensor_id>/state`
  - Comandos: `scada/<site>/<device>/cmd`
  - Comandos ack: `scada/<site>/<device>/cmd/ack`
  - Heartbeat: `scada/<site>/<device>/heartbeat`
- QoS: lecturas -> QoS 1, comandos críticos -> QoS 1 o 2 si lo soporta.
- Retained: estado último -> retained true, telemetría periódica -> no retained.
- Evitar wildcards que den permisos excesivos en las ACLs.

9) Testing y herramientas útiles
- Local test: `mosquitto_sub` y `mosquitto_pub` para verificar topics y payloads.
- Pruebas de integración: script que simule gateway (publica mensajes) y verifique que backend persiste y UI muestra.
- Logs: habilitar logging en broker y en el gateway; agrupar logs en backend.

## Preguntas rápidas para afinar el plan
1. ¿Querés que te prepare el plan de tareas con pasos concretos y comandos para implementar (por ejemplo, snippets de `mosquitto.conf`, ejemplo `config.yaml`, modelos Django y endpoints DRF), o preferís primero confirmar el flujo y roles?
2. ¿Cuál será el primer entorno objetivo: (A) pruebas con hardware real y Mosquitto local sin TLS, (B) integración en Docker Compose local, o (C) despliegue en servidor/producción con TLS?

Si confirmás una de las opciones, armo un plan de trabajo detallado (tareas y snippets listos para implementar) y puedo luego implementarlo cuando lo autorices.
