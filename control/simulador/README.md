# Simulador SCADA MQTT

Este es el simulador interactivo para pruebas locales y remotas del sistema SCADA. Permite simular los sensores físicos de los bombos de ingredientes, el mezclador, los caudales de las tuberías y responder de forma interactiva a comandos de control desde otra PC.

## Requisitos previos

Asegúrate de tener instalado Python 3.8 o superior.

## Instalación de dependencias

Instala los paquetes necesarios ejecutando el siguiente comando en tu consola:

```bash
pip install -r requirements.txt
```

## Configuración

Antes de correr el simulador, edita el archivo `config.yaml` para configurar los datos de conexión al broker MQTT:

```yaml
mqtt:
  broker: 192.168.137.1      # Dirección IP de la PC que corre el Broker MQTT (Mosquitto)
  port: 1883                 # Puerto MQTT (por defecto 1883)
  tenant: rafaela            # Nombre del tenant (fábrica) asignado en la web
  gateway_id: 199bff3c7542   # MAC o ID del gateway
  username: admin            # Usuario MQTT
  password: admin            # Contraseña MQTT
```

## Ejecución

Para iniciar el simulador interactivo de telemetría y actuadores, ejecuta:

```bash
python mock_mqtt_gateway.py
```

El simulador comenzará a publicar datos simulados interactivos de forma inmediata y escuchará en caliente comandos enviados desde el frontend del SCADA (como encender o apagar bombas, detener el proceso, etc.).
