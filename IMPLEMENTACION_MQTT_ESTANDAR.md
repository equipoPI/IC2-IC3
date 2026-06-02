# Guia de Implementacion MQTT Estandar - Gateway Raspberry SCADA

## Objetivo
Esta guia documenta la implementacion real del estandar MQTT en el gateway Raspberry del proyecto IC2-IC3.

El objetivo es:
- Migrar a un esquema estilo AURA.
- Mantener compatibilidad con topics legacy SCADA durante la transicion.
- Definir un contrato claro para telemetria, comandos y respuestas.

---

## Alcance de la Implementacion
Aplica al gateway Raspberry en:
- control/raspberry_gateway/src/mqtt_client.py
- control/raspberry_gateway/src/gateway_main.py
- control/raspberry_gateway/config.yaml

No cambia el firmware base del Arduino para MQTT directo.
El Arduino sigue comunicando por serial con la Raspberry.

---

## Modelo de Identidad
Se adopta este modelo:
- tenant: planta/sede (rafaela, susana, sauce_viejo, ramona)
- gateway: MAC de la Raspberry (sin dos puntos) o un id fijo configurado
- sector: ubicacion interna (ala_este, subsuelo, patio, etc.)
- system: linea o sistema (linea_mezclado_1, tratamiento_agua, etc.)
- device: equipo puntual (sensor_nivel_01, bomba_02, caudalimetro_01)

---

## Estructura de Topics

### 1) Telemetria
Formato:
tenant/gateway/sector/system/device/variable

Ejemplos:
- rafaela/73cc4dad16d6/ala_este/linea_mezclado_1/sensor_nivel_01/valor_cm
- rafaela/73cc4dad16d6/ala_este/linea_mezclado_1/bomba_02/estado
- sauce_viejo/aa11bb22cc33/patio/tratamiento_agua/caudalimetro_01/caudal_l

### 2) Estado del gateway
Formato:
tenant/gateway/status

Payload:
- online
- offline (LWT)

Configuracion recomendada:
- QoS: 1
- Retain: true

### 3) Comandos
Formato:
tenant/gateway/cmd/[sector/system/device/]accion

Ejemplos:
- rafaela/73cc4dad16d6/cmd/reposicion
- rafaela/73cc4dad16d6/cmd/ala_este/linea_mezclado_1/bomba_02/set_estado

### 4) Respuestas
Formato:
tenant/gateway/resp/[sector/system/device/]accion

Payload JSON de respuesta:
- command_id
- status (executed, failed, invalid, unsupported, partial)
- code (0 OK, 1 INVALID_ARG, 2 UNSUPPORTED_CMD, 3 EXEC_ERR)
- result
- timestamp (UTC)
- error

---

## Contrato de Payloads

### Telemetria
Se publica payload simple para variables puntuales.

Ejemplos:
- .../sensor_nivel_01/porcentaje -> 45
- .../bomba_02/estado -> 1
- .../caudalimetro_01/caudal_l -> 2.5

### Comandos
Se recomienda payload JSON:
{
  "command_id": "cmd_001",
  "value": 75,
  "timestamp": "2026-06-01T12:00:00Z",
  "additional_params": {}
}

### Respuestas
Se responde siempre con command_id para trazabilidad.

---

## Cambios Aplicados en el Codigo

### A) mqtt_client.py
Implementado:
- Resolucion automatica de gateway_id por MAC si no se define en config.
- Prefix estandar dinamico tenant/gateway.
- LWT en tenant/gateway/status.
- Publicacion de telemetria en formato estructurado.
- Suscripcion a comandos tenant/gateway/cmd/#.
- Publicacion de respuestas tenant/gateway/resp/....
- Modo compatibilidad legacy SCADA opcional por config.

### B) gateway_main.py
Implementado:
- Respuestas cmd/resp para:
  - reposicion
  - mezcla
  - control
  - configuracion
  - consultas
- Respuesta uniforme con status, code, result, error.

### C) config.yaml
Implementado:
- serial.baudrate = 115200 (alineado con Arduino serial).
- mqtt.tenant agregado.
- mqtt.gateway_id opcional.
- mqtt.default_sector y mqtt.default_system agregados.
- mqtt.topics.subscribe_filters agregado.
- mqtt.topics.enable_legacy_topics = true para coexistencia.

---

## Compatibilidad con Legacy SCADA
Mientras enable_legacy_topics sea true, el gateway publica en dos contratos:
1. Estandar nuevo tenant/gateway/...
2. Legacy scada/planta1/...

Estrategia de migracion sugerida:
1. Migrar backend y frontend al contrato estandar.
2. Validar dashboards, alarmas y comandos en paralelo.
3. Desactivar legacy cuando no haya consumidores viejos.

---

## ACL Recomendada en Broker
Por gateway:
- Publish permitido: tenant/gateway/#
- Subscribe permitido: tenant/gateway/cmd/#

Esto da aislamiento natural por planta y por Raspberry.

---

## Convenciones de Naming
- Todo en minuscula.
- Usar guion bajo.
- Sin espacios.
- Evitar ids inestables para device.
- Si hay riesgo de cambio de MAC por interfaz, fijar gateway_id manual.

---

## Testing Operativo

### Suscribirse al arbol estandar de una Raspberry
mosquitto_sub -h IP_BROKER -p 1883 -t "rafaela/73cc4dad16d6/#" -v

### Enviar comando de prueba
mosquitto_pub -h IP_BROKER -p 1883 -t "rafaela/73cc4dad16d6/cmd/reposicion" -m "{\"command_id\":\"test_001\",\"bombo\":1,\"valor\":50}"

### Escuchar respuestas
mosquitto_sub -h IP_BROKER -p 1883 -t "rafaela/73cc4dad16d6/resp/#" -v

---

## Estado de Implementacion
- Estandar MQTT aplicado en gateway Raspberry: SI
- cmd/resp implementado: SI
- Compatibilidad legacy habilitada: SI
- Migracion completa de consumidores externos: PENDIENTE

---

## Proximos pasos
1. Definir catalogo oficial de sectores, systems y devices por planta.
2. Versionar contrato MQTT (v1) para congelar nombres.
3. Migrar backend/frontend al arbol estandar.
4. Desactivar legacy por entorno cuando corresponda.
