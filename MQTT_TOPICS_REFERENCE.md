# 📡 Referencia Completa de Tópicos MQTT

## 🏗️ Estructuras Estándar de Tópicos

### 1️⃣ Recepción de Acciones y Comandos (App Web → Gateway / Simulador)
Estructura de 5 niveles para comandos de control directo:
```
{tenant}/{gateway_id}/{seccion}/{sistema}/{variable}
```
*Ejemplo:* `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/reposicion`

---

### 2️⃣ Transmisión de Telemetría y Estados (Gateway / Simulador → Broker / App Web)
Estructura de 6 niveles para datos de sensores, actuadores y procesos:
```
{tenant}/{gateway_id}/{seccion}/{sistema}/{tipo}/{nombre}
```
Donde:
- `{tipo}`: Categoría de componente (`sensores`, `actuadores`, `proceso`)
- `{nombre}`: Identificador único de la variable o equipo (`bombo1`, `bombo2`, `mezcla`, `caudal`, `bombas`, `mezclador`, `electrovalvulas`, `tiempo_restante`, `mezclado`, `temperatura`, `presion`)

*Ejemplos:*
- `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/bombo1`
- `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/bombas`
- `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/proceso/mezclado`
- `Rafaela_S.A/d83add60dbb0/status` (LWT global de gateway)

---

## 📊 Tabla Completa - Tópicos y Payloads

### COMANDOS (App Web → Raspberry / Simulador)

| # | Acción | Tópico | JSON Payload | Arduino Cmd | Descripción |
|---|--------|--------|--------------|------------|-------------|
| 1 | **Reposición** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/reposicion` | `{"bombo": 1, "limite_porcentaje": 75}` | `R1075` | Rellena el bombo indicado al porcentaje |
| 2 | **Freno Reposición** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/freno_reposicion` | `{}` | `F` | Detiene la reposición en curso |
| 3 | **Detener** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/detener` | `{}` | `D` | Detiene la mezcla |
| 4 | **Reanudar** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/reanudar` | `{}` | `A` | Reanuda la mezcla |
| 5 | **Vaciar** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/vaciar` | `{}` | `V` | Vacía el contenedor |
| 6 | **Desechar** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/desechar` | `{}` | `X` | Desecha la mezcla |
| 7 | **Mezcla** | `Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/mezcla` | `{"liquido_1": 50, "liquido_2": 30, "hora": 0, "minuto": 15}` | `L1 50`, `L2 30`, `H 0`, `M 15` | Configura parámetros de mezcla |

---

## 📋 Detalles de Payloads JSON

### 1️⃣ Reposición
```json
{
  "bombo": 1,                    // 1 o 2 (bombo a reposicionar)
  "limite_porcentaje": 75        // 0-100 (capacidad deseada)
}
```
**Notas:**
- Bombo 1 = 1000 + límite porcentaje (Arduino recibe: R1075)
- Bombo 2 = 2000 + límite porcentaje (Arduino recibe: R2075)

### 2️⃣ Freno Reposición
```json
{}
```
**Notas:**
- Sin parámetros, solo detiene la reposición en curso

### 3️⃣ Detener
```json
{}
```
**Notas:**
- Detiene toda actividad de mezcla

### 4️⃣ Reanudar
```json
{}
```
**Notas:**
- Reanuda la mezcla pausada

### 5️⃣ Vaciar
```json
{}
```
**Notas:**
- Vacía el contenedor de mezcla

### 6️⃣ Desechar
```json
{}
```
**Notas:**
- Desecha la mezcla actual

### 7️⃣ Mezcla (Preparación)
```json
{
  "liquido_1": 50,              // 0-100 (volumen % líquido 1)
  "liquido_2": 30,              // 0-100 (volumen % líquido 2)
  "hora": 0,                    // 0-23 (horas de mezcla)
  "minuto": 15                  // 0-59 (minutos de mezcla)
}
```
**Notas:**
- Configura los parámetros para preparar la mezcla
- Cada parámetro se envía como comando separado a Arduino
- Arduino recibe: `L1 50`, `L2 30`, `H 0`, `M 15`

---

## 🧪 Ejemplos de Comando con mosquitto_pub

### Reposición (bombo 1 al 75%)
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/reposicion" \
  -m '{"bombo": 1, "limite_porcentaje": 75}'
```

### Freno Reposición
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/freno_reposicion" \
  -m '{}'
```

### Detener Mezcla
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/detener" \
  -m '{}'
```

### Reanudar Mezcla
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/reanudar" \
  -m '{}'
```

### Vaciar Contenedor
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/vaciar" \
  -m '{}'
```

### Desechar Mezcla
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/desechar" \
  -m '{}'
```

### Preparar Mezcla (50% liq1, 30% liq2, 15 minutos)
```bash
mosquitto_pub \
  -h 192.168.137.1 \
  -t "Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/mezcla" \
  -m '{"liquido_1": 50, "liquido_2": 30, "hora": 0, "minuto": 15}'
```

---

## 📡 Telemetría y Estados (Gateway / Simulador → App Web)

Los tópicos de telemetría y estado utilizan estrictamente la estructura `{tenant}/{gateway_id}/{seccion}/{sistema}/{tipo}/{nombre}`:

```
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/bombo1
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/bombo2
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/mezcla
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/caudal
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/temperatura
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/sensores/presion
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/bombas
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/mezclador
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/actuadores/electrovalvulas
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/proceso/mezclado
Rafaela_S.A/d83add60dbb0/A1/linea_mezclado_1/proceso/tiempo_restante
Rafaela_S.A/d83add60dbb0/status
```

---

## ✅ Configuración en Raspberry Gateway

**Archivo:** `/control/raspberry_gateway/config.yaml`

```yaml
mqtt:
  broker: "192.168.137.1"
  port: 1883
  tenant: "Rafaela_S.A"
  gateway_id: "d83add60dbb0"
  username: "admin"
  password: "admin"
  qos: 1
  keepalive: 60
  
  topics:
    enable_legacy_topics: false      # ✓ Topics legacy DESHABILITADOS
    subscribe_filters:
      - '{tenant}/{gateway_id}/#'    # Suscribe a: Rafaela_S.A/d83add60dbb0/*
```

---

## 🔗 Archivos Relacionados

- 📄 [mqtt_client.py](control/raspberry_gateway/src/mqtt_client.py) - Cliente MQTT
- 📄 [gateway_main.py](control/raspberry_gateway/src/gateway_main.py) - Procesamiento de comandos
- 📄 [config.yaml](control/raspberry_gateway/config.yaml) - Configuración MQTT
- 📄 [README.md](control/raspberry_gateway/README.md) - Documentación gateway
- 📄 [MQTT_TOPICS_MIGRATION.md](control/MQTT_TOPICS_MIGRATION.md) - Migración de topics

---

## ❌ Topics DEPRECATED (No usar)

```
scada/planta1/sensores/*          # Legacy SCADA
scada/planta1/comandos/*          # Legacy SCADA
{tenant}/{gateway_id}/cmd/*       # Removido (/cmd/ innecesario)
```

---

**Última actualización:** 2026-09-05  
**Estado:** ✅ Todos los comandos implementados y probados
