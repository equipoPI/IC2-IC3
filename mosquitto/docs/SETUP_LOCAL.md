# Configurar Mosquitto (Docker) con autenticación - instrucciones locales

Estos pasos crean un usuario `admin` con contraseña `admin` en el contenedor Mosquitto, habilitan la autenticación y reinician el broker.

IMPORTANTE: Ejecuta estos comandos en la máquina donde corre Docker (la que tiene `docker-compose` disponible).

1) Abrir terminal en la raíz del repositorio (donde está `docker-compose.yml`).

2) Levantar el servicio mosquitto si no está corriendo:

```bash
docker-compose up -d mosquitto
```

3) Crear o actualizar el usuario `admin` con contraseña `admin` (usa `-c` solo la primera vez para crear el archivo):

```bash
# Para crear/sobrescribir el archivo passwd (solo la primera vez):
docker-compose exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd admin
# Se te pedirá la contraseña; introduce: admin

# O para añadir/actualizar sin sobrescribir:
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd admin admin
```

4) Verificar que `mosquitto/config/mosquitto.conf` tiene las siguientes líneas (ya están aplicadas en el repo):

```
allow_anonymous false
password_file /mosquitto/config/passwd
```

5) Reiniciar el broker para aplicar cambios:

```bash
docker-compose restart mosquitto
```

6) Probar conexión desde la máquina (o desde la Raspberry apuntando a la IP del host):

```bash
# Suscribir
mosquitto_sub -h localhost -p 1883 -u admin -P admin -t 'scada/#' -v

# Publicar
mosquitto_pub -h localhost -p 1883 -u admin -P admin -t 'scada/planta1/comandos/control' -m '{"accion":"CONTINUAR"}'
```

Notas
- Por simplicidad de prototipo, las credenciales por defecto sugeridas aquí son:

  - usuario: admin
  - contraseña: admin

- Si querés cambiar estos valores manualmente edita el archivo del gateway:

  - control/raspberry_gateway/config.yaml

  Cambia las claves `mqtt.username` y `mqtt.password` en ese archivo y reinicia el gateway.

- En producción no uses admin/admin: usa una contraseña segura, restringe permisos en `/mosquitto/config/passwd`, y habilita TLS/ACL.
