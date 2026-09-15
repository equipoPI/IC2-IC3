Guía combinada: Mosquitto en este proyecto

Resumen
- Este documento explica la configuración, arranque y resolución de problemas del broker Mosquitto usado en el proyecto.

Estructura de ficheros relevante
- /mosquitto/config/: configuración y archivo `passwd` esperado.
- /mosquitto/config/mosquitto.conf: fichero principal de configuración.
- /mosquitto/data/: datos y persistencia (si se usa).
- /mosquitto/log/: logs del broker.
- scripts: `create_admin.sh`, `create_admin.ps1`, `init_mosquitto.sh` (en este repo).

Problema común observado
- Mensaje de error en loop al arrancar:
  - "Unable to open password file /mosquitto/config/passwd. No such file or directory."
  - El init intenta crear `passwd` usando `mosquitto_passwd` pero falla porque el directorio o el volumen montado no existe o no tiene permisos.

Causas probables
1. El volumen o bind mount de Docker no crea el directorio `config` dentro del contenedor.
2. Los scripts intentan escribir en `/mosquitto/config` pero el usuario dentro del contenedor no tiene permisos.
3. La ruta en el host está equivocada o no se mapea en `docker-compose.yml`.
4. `mosquitto_passwd` no encuentra la ruta porque el contenedor arranca con un usuario limitado antes de crear los directorios.

Pasos recomendados para solucionar (ordenados)
1) Comprobar `docker-compose.yml` (o el `Dockerfile`) para ver volumenes:
   - Asegúrate que hay una entrada tipo:
     - `./mosquitto/config:/mosquitto/config`
     - `./mosquitto/data:/mosquitto/data`
     - `./mosquitto/log:/mosquitto/log`
2) Verificar que en el host el directorio `mosquitto/config` existe y tiene permisos de escritura:
   - En PowerShell (desde la raíz del repo):
     ```powershell
     ls .\mosquitto\config
     mkdir .\mosquitto\config -Force
     icacls .\mosquitto\config /grant "%USERNAME%:(OI)(CI)F"
     ```
3) Ejecutar manualmente el script de creación de admin en host (si existe) o dentro del contenedor:
   - Usar el script `create_admin.sh` o `create_admin.ps1` proporcionado en `mosquitto/`.
   - Si usas Docker Compose, levantar el contenedor en modo interactivo para ejecutar `mosquitto_passwd`:
     ```powershell
     docker compose run --rm mosquitto sh -c "mosquitto_passwd -b /mosquitto/config/passwd admin admin"
     ```
   - Si `mosquitto_passwd` no está disponible por `alpine` o imagen base, instalar package `mosquitto-clients` o usar el contenedor oficial.
4) Asegurar propietario y permisos dentro del contenedor:
   - Si el fichero fue creado por root en el host, puede que el contenedor no lo pueda escribir; usar `chown` dentro del contenedor si es necesario.
5) Revisar el script de init que se ejecuta al inicio (probablemente en `mosquitto/init` o `init_mosquitto.sh`):
   - Asegúrate de que crea el directorio antes de llamar a `mosquitto_passwd`:
     ```sh
     mkdir -p /mosquitto/config
     touch /mosquitto/config/passwd
     mosquitto_passwd -b /mosquitto/config/passwd admin admin
     chown -R mosquitto:mosquitto /mosquitto
     ```
6) Si usas Docker, reconstruir y levantar:
   ```powershell
   docker compose down
   docker compose up -d --build
   docker compose logs -f mosquitto
   ```

Verificación
- Debes ver en logs: "Broker running" o similar, y no el loop de creación de passwd.
- Comprobar que puedes conectarte (p.ej. `mosquitto_sub -h localhost -t test -u admin -P admin`).

Notas sobre seguridad
- No uses contraseñas "admin" en producción.
- Preferir ficheros de contraseña gestionados y credenciales en `.env` con `key.env` u otro secreto.

Si quieres, puedo:
- Revisar `docker-compose.yml` y `mosquitto` scripts y aplicar cambios concretos.
- Ejecutar los comandos para crear `passwd` dentro del contenedor (si tienes Docker instalado y quieres que lo haga ahora).
- Unir y formatear más documentación de `mosquitto/docs` si prefieres otro formato.

