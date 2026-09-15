# Mosquitto — Gestión de Usuarios (crear / actualizar / eliminar)

Este documento recoge los comandos y ejemplos prácticos para crear, actualizar o eliminar usuarios MQTT en el broker Mosquitto. Incluye instrucciones para Docker Compose (contenedor) y para instalaciones locales en el sistema host. También muestra cómo propagar el cambio al gateway (control/raspberry_gateway/config.yaml) y cómo probar la conexión.

Contenido
- Crear usuario (nuevo)
- Actualizar contraseña (usuario existente)
- Añadir usuario sin interacción (inline)
- Eliminar usuario
- Ver archivo de contraseñas
- Asegurar mosquitto.conf
- Actualizar credenciales en el gateway
- Probar la conexión

---

## 1) Crear usuario (nuevo) — Docker Compose

Si es la primera vez que creás el archivo de contraseñas, usá `-c` para crearlo:

```bash
# Ejecutar desde la raíz del repo donde está docker-compose.yml
docker-compose exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd <usuario>
# Se te pedirá que introduzcas la contraseña interactiva.
```

Ejemplo:

```bash
docker-compose exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd admin
```

## 2) Actualizar contraseña (usuario existente) — Docker Compose

Para cambiar la contraseña de un usuario ya existente (sin `-c`):

```bash
docker-compose exec mosquitto mosquitto_passwd /mosquitto/config/passwd <usuario>
# Se te pedirá la nueva contraseña interactiva.
```

## 3) Añadir/actualizar usuario sin interacción (inline)

Usá la opción `-b` para pasar usuario y contraseña en la misma línea (útil en scripts):

```bash
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd <usuario> <contraseña>
```

Ejemplo:

```bash
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd gateway_user mySecret123
```

## 4) Eliminar usuario

Para eliminar un usuario del archivo passwd (desde el contenedor):

```bash
docker-compose exec mosquitto sh -c "mosquitto_passwd -D /mosquitto/config/passwd <usuario>"
```

Ejemplo:

```bash
docker-compose exec mosquitto sh -c "mosquitto_passwd -D /mosquitto/config/passwd gateway_user"
```

## 5) Ver el archivo de contraseñas

Para comprobar qué usuarios están en el archivo passwd (no verás contraseñas en claro):

```bash
docker-compose exec mosquitto cat /mosquitto/config/passwd
```

## 6) Asegurar mosquitto.conf

Para que Mosquitto exija credenciales, `mosquitto/config/mosquitto.conf` debe contener:

```
allow_anonymous false
password_file /mosquitto/config/passwd
```

Si modificás este archivo, reiniciá el broker:

```bash
docker-compose restart mosquitto
```

## 7) Actualizar credenciales en el gateway (manual)

Si cambiás el usuario o la contraseña, actualizá el archivo del gateway y reinicialo (o guardá desde la GUI):

Archivo a editar:

```
control/raspberry_gateway/config.yaml
```

Modificar las claves dentro de la sección `mqtt`:

```yaml
mqtt:
  username: <usuario>
  password: <contraseña>
```

Ejemplo con `sed` (Linux/macOS) — esto hace un reemplazo simple; crea una copia de seguridad `config.yaml.bak`:

```bash
sed -i.bak -E "s/^(\s*username:\s*).*/\1<usuario>/; s/^(\s*password:\s*).*/\1<contraseña>/" control/raspberry_gateway/config.yaml
```

Si disponés de `yq` (recomendado para editar YAML correctamente):

```bash
yq eval ".mqtt.username = \"<usuario>\" | .mqtt.password = \"<contraseña>\"" -i control/raspberry_gateway/config.yaml
```

Luego reiniciá el gateway o usá la GUI para "Guardar config".

## 8) Probar la conexión (desde la máquina host que corre Docker)

Suscribirse a todos los topics:

```bash
mosquitto_sub -h localhost -p 1883 -u <usuario> -P <contraseña> -t 'scada/#' -v
```

Publicar un comando de prueba:

```bash
mosquitto_pub -h localhost -p 1883 -u <usuario> -P <contraseña> -t 'scada/planta1/comandos/control' -m '{"accion":"CONTINUAR"}'
```

## 9) Comandos alternativos para instalación local (no Docker)

Si Mosquitto está instalado directamente en el host (Ubuntu/Debian):

```bash
# Crear archivo passwd y usuario
```

## 10) PowerShell / Windows (Docker)

Ejemplo para Windows PowerShell con Docker Compose:

```powershell
# Crear/actualizar usuario inline (no interactivo)
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd gateway_user P@ssw0rd

# Reiniciar
docker-compose restart mosquitto
```

---

Notas finales
- Los comandos con `-b` permiten automatizar (útiles en scripts) pero exponen la contraseña en la línea de comandos y en el historial. Úsalos con precaución.
- Después de cambiar credenciales en el broker, todos los clientes (gateway, scripts, interfaces) deben usar las nuevas credenciales.
- Para producción: habilitá TLS y ACLs y no uses contraseñas triviales.
