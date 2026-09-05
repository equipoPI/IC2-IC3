# Simulador SCADA MQTT Interactivo & GUI

Este es el simulador interactivo para pruebas locales y remotas del sistema SCADA. Permite simular los sensores físicos de los bombos de ingredientes, el mezclador, los caudales de las tuberías y responder de forma interactiva a comandos de control desde otra PC.

---

## 🚀 Opciones de Ejecución

### 1. Interfaz Gráfica Visual GUI (Recomendado para Pruebas Multisitio)

Para abrir la ventana interactiva visual con sliders en vivo, luces LED de actuadores y MAC/Gateway ID editable libremente:

```bash
python gui_simulador.py
```

#### Características de la GUI (`gui_simulador.py`):
- **Gateway ID / MAC Editable**: Permite cambiar manualmente la dirección MAC o identificador de pasarela (ej: `d83add60dbb0`, `sim_gw_01`).
- **Pestaña Telemetría & Sliders**: Control manual de Temperatura, Presión, Niveles de Bombos (% Bombo 1, % Bombo 2, % Mezcla) y Caudales en tiempo real, o modo aleatorio sintético.
- **Pestaña Actuadores & Luces LED**: Muestra en pantalla con luces LED virtuales (🟢 Verde / ⚪ Gris) cuando se reciben órdenes de control desde la web (`/scada`, `/control` o `/planificacion`).

---

### 2. Ejecución en Modo Consola CLI Daemon

Para iniciar el simulador en segundo plano desde consola de texto:

```bash
python mock_mqtt_gateway.py
```

---

## 🛠️ Requisitos Previos e Instalación de Dependencias

Asegúrate de tener instalado Python 3.8 o superior. Instala las dependencias ejecutando:

```bash
pip install -r requirements.txt
```

### Configuración Predeterminada (`config.yaml`)

El archivo `config.yaml` contiene los datos predeterminados de conexión al broker Mosquitto:

```yaml
mqtt:
  broker: 192.168.137.1       # Dirección IP del Broker MQTT
  port: 1883                  # Puerto MQTT
  tenant: Rafaela_S.A         # Tenant / Organización (DEBE coincidir con gateway real)
  gateway_id: sim_gateway_test # ID único del simulador
  username: admin             # Usuario MQTT
  password: admin             # Contraseña MQTT
  topics:
    enable_legacy_topics: false  # ✅ Topics legacy DESHABILITADOS
    subscribe_filters:
      - '{tenant}/{gateway_id}/cmd/#'  # Suscribe a comandos nuevos
```
