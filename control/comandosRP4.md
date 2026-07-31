Ver el estado actual (si esta corriendo, detenido o si tira algun error):
sudo systemctl status gateway.service

Detenerlo:
sudo systemctl stop gateway.service

Reiniciarlo manualmente:
sudo systemctl restart gateway.service

Ver los prints del c�digo en tiempo real (logs):
journalctl -u gateway.service -f

re lanzar el servicio de la raspberri sin tener que reiniciar:
sudo systemctl restart gateway.service

Paso 2: Configurar el inicio autom�tico en el escritorio
El entorno de escritorio de la Raspberry Pi (LXDE / Wayfire) tiene su propia carpeta para lanzar aplicaciones apenas el usuario inicia sesi�n.

Cre� la carpeta de autostart si no existe:
mkdir -p ~/.config/autostart

Cre� un archivo de configuraci�n para tu aplicaci�n con nano:
nano ~/.config/autostart/gateway_ui.desktop

Peg� el siguiente contenido dentro del archivo (asegurate de mantener las rutas a tu proyecto y entorno virtual como lo hac�amos antes):
[Desktop Entry]
Type=Application
Name=Gateway AURA UI
Exec=env PYTHONPATH=/home/lautaro/Proyects/IC2-IC3/ /home/lautaro/Proyects/IC2-IC3/.venv/bin/python3 -m control.raspberry_gateway.src.gateway_main
WorkingDirectory=/home/lautaro/Proyects/IC2-IC3/
Terminal=false

desactivar codigo solo es esa sesion:
gateway-stop

correr prueba con SO ya levantado:
env PYTHONPATH=/home/lautaro/Proyects/IC2-IC3/ /home/lautaro/Proyects/IC2-IC3/.venv/bin/python3 -m control.raspberry_gateway.src.gateway_main