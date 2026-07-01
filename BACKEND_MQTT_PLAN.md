# Plan de trabajo: Levantar contenedores y conectar MQTT (broker, gateway, backend, DB, UI)

Resumen rápido
- Objetivo: (1) levantar y validar los contenedores Docker, (2) diagnosticar y solucionar fallos si aparecen, y (3) revisar/implementar el conexionado MQTT entre Mosquitto (broker), gateway Raspberry y la pila (backend, base de datos, UI).
- Enfoque: Docker-first para integración completa; el gateway puede ejecutarse en la Raspberry real o emulado/localmente.

Fases y pasos

1) Preparación (10–30 min)
- Verificar archivos y variables clave:
  - `docker-compose.yml` (raíz): nombres de servicios (ej. backend, db, frontend, mosquitto).
  - `mysite/.env` o `mysite/README_BACKEND.md`: variables necesarias (DATABASE_URL, SECRET_KEY, MQTT_*).
  - `control/raspberry_gateway/README.md` y `control/raspberry_gateway/.env` de ejemplo (SERIAL_PORT, MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS).
  - `mosquitto/` config (puertos, auth, websockets).
- Comandos de inspección (solo lectura):
  - `docker compose config`  # valida y expande la configuración
  - `docker compose ls`      # lista proyectos locales
- Criterio de éxito: confirmados nombres de servicios y localizados los .env o variables a proporcionar.

2) Levantar contenedores Docker (10–20 min)
- Desde la raíz: `docker compose up -d`
- Validaciones rápidas:
  - `docker compose ps`                 # confirmar contenedores en estado Up
  - `docker compose logs -f backend`    # ver logs del backend
  - `docker compose logs -f mosquitto`  # ver logs del broker
  - `docker compose logs -f frontend`   # si existe servicio frontend
- Criterio de éxito: servicios críticos en Up; backend puede aplicar migraciones o no muestra errores fatales.

3) Diagnóstico y solución de fallos durante el arranque
- Contenedor crash-loop: `docker compose logs <servicio>` y buscar errores de variables faltantes o traceback.
- Errores de conexión a DB: comprobar credenciales en `docker-compose.yml` y que el servicio `db` esté Up; probar `docker compose exec backend python manage.py migrate`.
- Puerto en uso: error al bindear puerto; cambiar puerto local o detener servicio que lo usa.
- Errores Mosquitto (auth): revisar `mosquitto/config` y usuarios/contraseñas.
- Problemas con dispositivos seriales: mapear `/dev/tty*` y permisos, o ejecutar el gateway fuera de Docker en la Raspberry.
- Herramientas de logs: `docker compose logs -f <servicio>` y `docker compose exec <servicio> sh -c 'tail -n 200 /ruta/log'` si aplica.

4) Verificar y probar el broker MQTT
- Puertos típicos:
  - MQTT TCP: `1883`
  - MQTT sobre WebSockets: `9001` (o el configurado)
- Pruebas desde host:
  - Suscribir: `mosquitto_sub -h localhost -p 1883 -t 'test/topic' -v`
  - Publicar: `mosquitto_pub -h localhost -p 1883 -t 'test/topic' -m '{"sensor":"T","value":23.4}'`
  - Si hay auth: `-u user -P pass`.
- Logs: `docker compose logs -f mosquitto`.
- Criterio de éxito: broker acepta conexiones y se puede publicar/suscribir mensajes.

5) Revisar e implementar la integración MQTT (pasos concretos)

Recomendación arquitectónica
- Gateway (Raspberry) → Mosquitto (broker) → Backend (consumer) → DB → UI (REST/WS).
- Alternativa: UI se conecta al broker vía WebSockets (solo si aceptable por seguridad).

Pasos concretos
A) Revisar código existente
- Revisar `control/raspberry_gateway/` para la implementación MQTT actual y variables esperadas.
- Revisar el backend (`mysite/` y apps) para ver si ya existe un consumidor MQTT o modelos relevantes (DispositivoSCADA, LecturaSensor, ConfiguracionMQTT).
- Buscar paquetes/strings: `paho`, `mqtt`, `mosquitto`, `paho-mqtt`.

B) Si no existe consumidor en backend — opciones
- Opción 1 (recomendada): servicio/worker independiente (`mqtt_consumer`) con `paho-mqtt` que suscriba topics y escriba en DB (vía ORM o llamadas internas).
- Opción 2: Django management command que se ejecute en un contenedor separado y mantenga conexión MQTT.
- Opción 3 (rápida): gateway POSTea a un endpoint REST del backend al recibir mensajes.

C) Diseño de topics y payload
- Ejemplos de topics:
  - `sensores/<fabrica>/<dispositivo>/lectura`
  - `actuadores/<fabrica>/<dispositivo>/comando`
- Payload JSON estándar:
  - `{ "device_id":"dev-01", "ts":"2026-06-29T12:34:56Z", "values": { "temp":23.4 } }`
- Documentar QoS (0/1/2) y retención.

D) Implementación mínima viable del consumidor
- Añadir `paho-mqtt` a `requirements.txt` del servicio correspondiente.
- Escribir `mqtt_consumer.py` que:
  - Conecte al broker con credenciales desde variables de entorno.
  - Se suscriba a topics relevantes.
  - En callback valide/parseé y guarde en modelos (LecturaSensor u otro).
  - Maneje reconexiones y logging.
- Añadir servicio `mqtt_consumer` al `docker-compose.yml` (basado en la imagen del backend o una imagen Python con el código montado).
- Para pruebas locales, ejecutar `mqtt_consumer` en un virtualenv sin rebuild de Docker.

E) Seguridad
- No usar broker sin autenticación en producción.
- Si se habilitan WebSockets para la UI, proteger con TLS y auth.
- Guardar credenciales en secrets/variables de entorno, no en el repo.

6) Integración con base de datos y UI
- Backend:
  - Confirmar modelos: DispositivoSCADA, LecturaSensor, ConfiguracionMQTT.
  - Aplicar migraciones: `docker compose exec backend python manage.py migrate`.
  - Asegurarse de que el consumidor crea objetos correctamente.
- UI:
  - Recomendada: UI consulta endpoints REST o usa WebSocket del backend para notificaciones.
  - Alternativa: UI se conecta al broker via MQTT-WS (si soportado y seguro).
- Pruebas E2E:
  - Simular publicación con `mosquitto_pub`.
  - Verificar que el consumidor escribe en DB (`docker compose exec backend python manage.py shell` y consultas).
  - Verificar que la UI muestra los datos (abrir en :5173 o el puerto configurado).

7) Pruebas, verificación y métricas
- Casos de prueba clave:
  - Publicación válida → registro en DB → disponible en API → mostrado por UI.
  - Mensaje malformado → consumidor no debe fallar; loguear y descartar.
  - Broker caído → consumer debe reconectar con backoff.
- Herramientas: `mosquitto_pub/sub`, `docker compose logs`, `curl/httpie`, Django admin.

8) Rollback y limpieza
- Parar y eliminar servicio problemático: `docker compose stop <servicio> && docker compose rm -f <servicio>`.
- Revertir cambios en git si se introducen errores.
- Limpiar datos de prueba borrando filas o restaurando snapshot de la DB.

Riesgos y mitigaciones (resumen)
- Hardware ausente: simular con `mosquitto_pub`.
- SQLite vs Postgres: para full-stack usar `docker-compose` con Postgres.
- Payloads/tópicos inconsistentes: definir y documentar esquema JSON antes de producción.

Checklist accionable (ordenada)
1. Confirma si usarás Docker para todo o si el gateway correrá en hardware real (Raspberry).  
2. Revisa `docker-compose.yml` y anota nombres de servicios y puertos.  
3. Ejecuta: `docker compose up -d`.  
4. Comprueba servicios: `docker compose ps`; revisa logs de `backend` y `mosquitto`.  
5. Prueba broker: `mosquitto_sub` / `mosquitto_pub`.  
6. Ajusta `control/raspberry_gateway/.env` para apuntar al `MQTT_HOST/PORT` correcto (si el gateway es local usar `localhost`, si está en Docker usar el nombre del servicio).  
7. Busca en el backend si ya existe consumidor MQTT; si no, implementa `mqtt_consumer` (opción recomendada) o un management command.  
8. Implementa y prueba E2E: publicar, verificar DB, verificar UI.  
9. Añade tests básicos y documenta tópicos/payloads.

Preguntas para afinar el plan
1. ¿Dispones ahora del hardware Raspberry + Arduino o quieres empezar totalmente emulado?  
para las pruebas voy a usar un dispositivo real que ya fue testeado y funciona. El codigo que hay hasta el momento en la seccion de `/control` fucniona correctamente para el arduino y la raspberry 
2. ¿Prefieres que el gateway se ejecute dentro de Docker (con device mapping) o fuera (en la Raspberry/host)?  
Viene funcionando sin utilizar docker, lo que se deberia de agregar es una seccion o un desplegable donde se introduciria la configuracion variable que puede surgir (IP de los dispositivos, el puerto del broker, el usuario y la contraseña) y que se guarde en un archivo de configuracion para que no sea necesario modificar el codigo fuente, el usuario introduce los datos en esa seccion y no tiene que buscar en todo el codigo que lineas modificar.
3. ¿Quieres que la UI se conecte directamente al broker vía WebSockets, o prefieres que todo pase por el backend (recomendado)?  
me parece que lo mejor seria que se conecte al backend, ya que de esta manera se puede controlar mejor la seguridad y el flujo de datos. La UI no debería tener acceso directo al broker para evitar problemas de seguridad y control de acceso.
4. ¿El broker debe usar autenticación y TLS desde el principio, o dejamos auth desactivada para pruebas locales?  
En la seccion de mqtt deberia de haber una opcion que controle la seguridad y se restinja la conexion a los dispositivos que se quieran conectar, ya que de esta manera se puede controlar mejor la seguridad y el flujo de datos. En la ui los permisos se deberia de poder gestionar si es un uausario de administrador o un usuario con poderes como un jefe o superior, los usuarios normales no deberia de poder acceder a esa funcion avanzada, ya que de esta manera se puede controlar mejor la seguridad y el flujo de datos. 
5. ¿Deseas que el backend guarde los datos en SQLite (local) o en PostgreSQL (producción)?
quisiera utilizar PostgreSQL para la version de produccion, ya que de esta manera se puede controlar mejor la seguridad y el flujo de datos.
6. ¿Redundancia?
No c como hacer para que lo que se conecte desde la interface web/software condiga con la realidad y viceverza, en lo posible decime que opciones tengo

