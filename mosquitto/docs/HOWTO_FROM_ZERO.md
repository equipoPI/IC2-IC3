# Levantar Mosquitto desde cero (Docker) y crear usuarios automáticos

Este documento explica cómo levantar el contenedor Mosquitto desde cero, crear usuarios y sincronizar las credenciales con el gateway Raspberry.

Requisitos
- Docker y Docker Compose instalados en la máquina host.
- Acceso al repositorio (donde está el `docker-compose.yml`).

Pasos para levantar desde cero

1. Clonar el repo (si no lo hiciste):

```bash
git clone <repo-url>
cd <repo-root>
```

2. Levantar Mosquitto con Docker Compose:

```bash
docker-compose up -d mosquitto
```

3. Crear un usuario y contraseña (automatizado):

- Opción rápida (usuario admin):

```bash
chmod +x mosquitto/create_admin.sh
./mosquitto/create_admin.sh
```

- Opción: crear usuario con password fuerte y actualizar config del gateway localmente:

```bash
chmod +x mosquitto/create_user_and_update_gateway.sh
./mosquitto/create_user_and_update_gateway.sh my_gateway_user
```

El script generará una contraseña fuerte, la añadirá al archivo `/mosquitto/config/passwd` dentro del contenedor, reiniciará Mosquitto y actualizará `control/raspberry_gateway/config.yaml` con las nuevas credenciales (si `yq` no está disponible usa sed como fallback y hace una copia de seguridad `config.yaml.bak`).

4. Probar la conexión desde la máquina host:

```bash
# Suscribir
mosquitto_sub -h localhost -p 1883 -u <usuario> -P <contraseña> -t 'scada/#' -v

# Publicar
mosquitto_pub -h localhost -p 1883 -u <usuario> -P <contraseña> -t 'scada/planta1/comandos/control' -m '{"accion":"CONTINUAR"}'
```

Notas y recomendaciones
- Cambia la contraseña generada por una que almacenes de forma segura o usa un secret manager.
- Revisa que `mosquitto/config/mosquitto.conf` tenga `allow_anonymous false` y `password_file /mosquitto/config/passwd`.
- Para producción, habilita TLS y ACL.
