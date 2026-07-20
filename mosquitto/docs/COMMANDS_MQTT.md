# Comandos para gestionar usuarios y contraseñas del broker Mosquitto

Este documento recoge comandos útiles para crear, modificar y eliminar usuarios/contraseñas del archivo `passwd` que usa Mosquitto, así como recomendaciones para entornos Windows con bind-mounts.

Nota: en este repositorio la configuración del broker está en `/mosquitto/config` dentro del contenedor y el `passwd` suele estar en `/mosquitto/config/passwd`.

## Cambiar o crear contraseña para un usuario (ejecución dentro del contenedor mosquitto)

Ejecuta el siguiente comando para añadir o actualizar el usuario `usuario` con `nueva_contraseña`:

```bash
docker compose -f IC2-IC3/docker-compose.yml exec -T mosquitto \
  sh -c "mosquitto_passwd -b /mosquitto/config/passwd usuario nueva_contraseña"
docker compose -f IC2-IC3/docker-compose.yml restart mosquitto
```

Opciones:
- `-b` pasa la contraseña por línea de comando (útil en scripts). 
- Si el archivo `/mosquitto/config/passwd` no existe, el comando lo creará.

## Crear/reescribir el archivo `passwd` desde el host (recomendado en Windows bind-mounts)

En Windows puede haber problemas al crear archivos en un bind-mount desde el host. Usa un contenedor temporal para crear o sobrescribir `passwd`:

```powershell
docker run --rm -v "%CD%/IC2-IC3/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 \
  sh -c "/usr/bin/mosquitto_passwd -b /mosquitto/config/passwd usuario nueva_contraseña"
docker compose -f IC2-IC3/docker-compose.yml restart mosquitto
```

En PowerShell asegúrate de ejecutar desde la carpeta raíz del proyecto para que `%CD%/IC2-IC3/mosquitto/config` apunte correctamente.

## Eliminar un usuario del archivo `passwd`

```bash
docker compose -f IC2-IC3/docker-compose.yml exec -T mosquitto \
  sh -c "mosquitto_passwd -D /mosquitto/config/passwd usuario"
docker compose -f IC2-IC3/docker-compose.yml restart mosquitto
```

## Ver contenido del archivo `passwd` (hashes)

```bash
docker compose -f IC2-IC3/docker-compose.yml exec -T mosquitto sh -c "cat /mosquitto/config/passwd"
```

## Probar conexión al broker con las nuevas credenciales

Prueba publicar un mensaje usando la imagen `eclipse-mosquitto` (desde el host):

```bash
docker run --rm eclipse-mosquitto:2 \
  mosquitto_pub -h host.docker.internal -p 1883 -u usuario -P nueva_contraseña -t 'scada/test' -m 'hola'

docker run --rm eclipse-mosquitto:2 \
  mosquitto_sub -h host.docker.internal -p 1883 -u usuario -P nueva_contraseña -t 'scada/test' -C 1
```

Nota: `host.docker.internal` permite que un contenedor apunte al host desde Docker Desktop en Windows/Mac. Si tu infraestructura es distinta, ajusta el host según corresponda.

## Comprobaciones y recomendaciones
- Verifica que `mosquitto.conf` contiene la línea `password_file /mosquitto/config/passwd` y que `allow_anonymous false` si usas autenticación.
- Si usas reglas ACL, actualiza `acl_file` y reinicia el servicio.
- En entornos Windows, crear/editar `passwd` desde un contenedor evita problemas de permisos y de creación de archivos en bind-mounts.

## Ejemplo de script rápido (UNIX)

```bash
# Crear o actualizar usuario
docker run --rm -v "$(pwd)/IC2-IC3/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 \
  sh -c "/usr/bin/mosquitto_passwd -b /mosquitto/config/passwd admin Changeme123"
docker compose -f IC2-IC3/docker-compose.yml restart mosquitto
```

---
Archivo creado: `IC2-IC3/mosquitto/COMMANDS_MQTT.md`
