# 📱 Guía de Integración MQTT para Dispositivos IoT - Sistema AURA

## 🎯 **PARA DESARROLLADORES DE DISPOSITIVOS**

Esta guía contiene **toda la información necesaria** para conectar dispositivos IoT al Sistema AURA a través del broker MQTT.

---

## 🔌 **CONEXIÓN AL SISTEMA AURA**

### **📡 Datos de Conexión MQTT**

```cpp
// Configuración para conectar al Sistema AURA
const char* mqtt_server = "IP_SERVIDOR_AURA";  // IP proporcionada por el equipo backend
const int mqtt_port = 1883;
const char* mqtt_client_id = "MAC_DISPOSITIVO"; // MAC sin dos puntos
```

### **⚠️ IMPORTANTE: Los dispositivos NO se conectan a la API REST**

```
✅ CORRECTO: Dispositivo → MQTT Broker (puerto 1883)
❌ INCORRECTO: Dispositivo → API REST (puerto 8000)
```

Los dispositivos deben conectarse **únicamente** al broker MQTT, nunca directamente a la API.

---

## 🏷️ **ESTRUCTURA DE TOPICS MQTT**

### **📝 Formato Base**
```
<tenant>/<dispositivo>/[<componente>/]<variable>
```

**Componentes:**
- **`<tenant>`**: Identificador de la organización (te lo proporciona el equipo backend)
- **`<dispositivo>`**: **MAC address SIN dos puntos** (ej: `73cc4dad16d6`)
- **`<componente>`**: (Opcional) ID del módulo/sensor específico
- **`<variable>`**: Tipo de dato (temperatura, humedad, bateria, status, etc.)

### **📋 Ejemplos de Topics**

```bash
# Telemetría simple
unraf/73cc4dad16d6/temperatura          # 23.5
unraf/73cc4dad16d6/humedad              # 65
unraf/73cc4dad16d6/bateria              # 85

# Telemetría con componentes
unraf/73cc4dad16d6/incubadora1/temperatura   # 37.2
unraf/73cc4dad16d6/sensor_ext/temperatura    # 18.5
unraf/73cc4dad16d6/bomba1/caudal            # 2.5

# Estado del dispositivo (OBLIGATORIO)
unraf/73cc4dad16d6/status               # online/offline
```

### **⚠️ FORMATO MAC ADDRESS**
- **✅ CORRECTO**: `73cc4dad16d6` (sin dos puntos)
- **❌ INCORRECTO**: `73:cc:4d:ad:16:d6` (con dos puntos)

---

## 📤 **ENVÍO DE TELEMETRÍA**

### **🔧 Configuración de Publicación**
- **QoS**: 1 (garantía de entrega)
- **Retained**: false (excepto para `status`)
- **Payload**: texto plano (ej: "23.5", "online", "85")

### **📊 Ejemplo de Implementación**

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// Configuración WiFi y MQTT
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* mqtt_server = "192.168.1.100";  // IP del servidor AURA
const int mqtt_port = 1883;

// Identificación del dispositivo
String tenant = "unraf";                    // Proporcionado por backend
String device_mac = "73cc4dad16d6";         // MAC SIN dos puntos
String device_id = device_mac;              // Usar MAC como client ID

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
    Serial.begin(115200);
    setup_wifi();
    client.setServer(mqtt_server, mqtt_port);
    
    // Configurar callback para comandos
    client.setCallback(callback);
}

void setup_wifi() {
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    // Obtener MAC real del dispositivo
    device_mac = WiFi.macAddress();
    device_mac.replace(":", "");  // Remover dos puntos
    device_id = device_mac;
    
    Serial.println("WiFi conectado");
    Serial.println("MAC del dispositivo: " + device_mac);
}

void reconnect() {
    while (!client.connected()) {
        Serial.print("Intentando conexión MQTT...");
        
        // Configurar LWT (Last Will Testament)
        String lwt_topic = tenant + "/" + device_mac + "/status";
        
        if (client.connect(device_id.c_str(), 
                          lwt_topic.c_str(), 1, true, "offline")) {
            Serial.println("conectado");
            
            // Publicar estado online
            client.publish(lwt_topic.c_str(), "online", true);
            
            // Suscribirse a comandos
            String cmd_topic = tenant + "/" + device_mac + "/cmd/#";
            client.subscribe(cmd_topic.c_str());
            
        } else {
            Serial.print("falló, rc=");
            Serial.print(client.state());
            Serial.println(" reintentando en 5 segundos");
            delay(5000);
        }
    }
}

void loop() {
    if (!client.connected()) {
        reconnect();
    }
    client.loop();
    
    // Publicar telemetría cada 30 segundos
    static unsigned long lastMsg = 0;
    unsigned long now = millis();
    
    if (now - lastMsg > 30000) {
        lastMsg = now;
        
        // Leer sensores y publicar
        publish_telemetry();
    }
}

void publish_telemetry() {
    // Leer sensores (ejemplo)
    float temperatura = 23.5;  // Tu código de lectura aquí
    float humedad = 65.0;
    int bateria = 85;
    
    // Construir topics
    String temp_topic = tenant + "/" + device_mac + "/temperatura";
    String hum_topic = tenant + "/" + device_mac + "/humedad";
    String bat_topic = tenant + "/" + device_mac + "/bateria";
    
    // Publicar datos
    client.publish(temp_topic.c_str(), String(temperatura).c_str());
    client.publish(hum_topic.c_str(), String(humedad).c_str());
    client.publish(bat_topic.c_str(), String(bateria).c_str());
    
    Serial.println("Telemetría enviada - Temp: " + String(temperatura) + "°C");
}
```

---

## 📥 **RECEPCIÓN DE COMANDOS**

### **🏷️ Topics de Comandos**
Los comandos llegan en topics con este formato:
```
<tenant>/<dispositivo>/cmd/[<componente>/]<accion>
```

### **📋 Ejemplos de Topics de Comando**
```bash
# Comandos simples
unraf/73cc4dad16d6/cmd/turn_on
unraf/73cc4dad16d6/cmd/turn_off
unraf/73cc4dad16d6/cmd/restart

# Comandos con parámetros (valor en payload)
unraf/73cc4dad16d6/cmd/set_brightness      # payload: {"value": 75}
unraf/73cc4dad16d6/cmd/set_temperature     # payload: {"value": 25}

# Comandos a componentes específicos
unraf/73cc4dad16d6/cmd/incubadora1/set_temperature
unraf/73cc4dad16d6/cmd/ventilador/set_speed
```

### **📦 Estructura del Payload de Comando**
```json
{
    "command_id": "cmd_12345678",
    "value": 75,                    // Valor del parámetro (si aplica)
    "timestamp": "2025-11-28T15:30:00Z",
    "timeout": 30,
    "additional_params": {          // Parámetros extra (si aplica)
        "mode": "gradual",
        "transition_time": 2000
    }
}
```

### **🔧 Implementación del Callback**

```cpp
void callback(char* topic, byte* payload, unsigned int length) {
    // Convertir payload a string
    String message = "";
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    String topic_str = String(topic);
    
    Serial.println("Comando recibido:");
    Serial.println("Topic: " + topic_str);
    Serial.println("Payload: " + message);
    
    // Parsear comando
    if (topic_str.indexOf("/cmd/") > 0) {
        process_command(topic_str, message);
    }
}

void process_command(String topic, String payload) {
    // Extraer comando del topic
    int cmd_pos = topic.indexOf("/cmd/") + 5;
    String command = topic.substring(cmd_pos);
    
    // Parsear payload JSON (opcional, para comandos con parámetros)
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    String command_id = doc["command_id"];
    int value = doc["value"];
    
    // Ejecutar comando
    String result = "";
    int status_code = 0;
    
    if (command == "turn_on") {
        // Encender dispositivo
        digitalWrite(LED_PIN, HIGH);
        result = "Device turned ON";
        status_code = 0;
        
    } else if (command == "turn_off") {
        // Apagar dispositivo
        digitalWrite(LED_PIN, LOW);
        result = "Device turned OFF";
        status_code = 0;
        
    } else if (command == "set_brightness") {
        // Ajustar brillo
        if (value >= 0 && value <= 100) {
            analogWrite(PWM_PIN, map(value, 0, 100, 0, 255));
            result = "Brightness set to " + String(value) + "%";
            status_code = 0;
        } else {
            result = "Invalid brightness value";
            status_code = 1;  // INVALID_ARG
        }
        
    } else {
        result = "Unknown command";
        status_code = 2;  // UNSUPPORTED_CMD
    }
    
    // Enviar respuesta
    send_response(command_id, command, result, status_code, value);
}
```

---

## 📤 **ENVÍO DE RESPUESTAS**

### **🏷️ Topic de Respuesta**
```
<tenant>/<dispositivo>/resp/[<componente>/]<accion>
```

### **📦 Estructura de Respuesta**
```json
{
    "command_id": "cmd_12345678",
    "status": "executed",           // executed, failed, invalid, partial, unsupported
    "code": 0,                      // 0=OK, 1=INVALID_ARG, 2=UNSUPPORTED_CMD, 3=EXEC_ERR
    "result": {
        "current_value": 75,
        "execution_time_ms": 250,
        "component": "luz_principal"
    },
    "timestamp": "2025-11-28T15:30:02Z",
    "error": null                   // Descripción del error si code != 0
}
```

### **📋 Códigos de Estado**
- **executed**: Comando ejecutado exitosamente
- **failed**: Error durante la ejecución
- **invalid**: Parámetros inválidos
- **partial**: Ejecución parcial
- **unsupported**: Comando no soportado

### **📋 Códigos de Error**
- **0**: OK - Ejecución exitosa
- **1**: INVALID_ARG - Argumentos inválidos
- **2**: UNSUPPORTED_CMD - Comando no reconocido
- **3**: EXEC_ERR - Error interno

### **🔧 Implementación de Respuesta**

```cpp
void send_response(String command_id, String command, String result, 
                  int status_code, int current_value) {
    
    // Construir topic de respuesta
    String resp_topic = tenant + "/" + device_mac + "/resp/" + command;
    
    // Determinar status string
    String status = "executed";
    if (status_code == 1) status = "invalid";
    else if (status_code == 2) status = "unsupported";
    else if (status_code == 3) status = "failed";
    
    // Construir JSON de respuesta
    DynamicJsonDocument doc(1024);
    doc["command_id"] = command_id;
    doc["status"] = status;
    doc["code"] = status_code;
    doc["result"]["current_value"] = current_value;
    doc["result"]["execution_time_ms"] = millis(); // Tiempo de ejecución
    doc["timestamp"] = get_timestamp(); // Tu función de timestamp
    
    if (status_code != 0) {
        doc["error"] = result;
    }
    
    // Serializar y enviar
    String response_json;
    serializeJson(doc, response_json);
    
    client.publish(resp_topic.c_str(), response_json.c_str());
    
    Serial.println("Respuesta enviada:");
    Serial.println("Topic: " + resp_topic);
    Serial.println("Response: " + response_json);
}
```

---

## 🛡️ **CONFIGURACIÓN OBLIGATORIA**

### **📍 1. Topics Obligatorios**

#### **Estado del Dispositivo**
```cpp
String status_topic = tenant + "/" + device_mac + "/status";
```
- **Payload**: `"online"` al conectar, `"offline"` automático en desconexión
- **QoS**: 1
- **Retained**: true

#### **Batería (si aplica)**
```cpp
String battery_topic = tenant + "/" + device_mac + "/bateria";
```
- **Payload**: porcentaje o voltaje (ej: "85", "3.7V")
- **QoS**: 1
- **Retained**: false

### **🔧 2. Configuración MQTT Mínima**

```cpp
// Configuración obligatoria
const int MQTT_QOS = 1;              // Garantía de entrega
const int KEEP_ALIVE = 60;           // 15-600 segundos
const bool CLEAN_SESSION = true;     // Siempre true
const bool RETAINED_STATUS = true;   // Solo para status
const bool RETAINED_DATA = false;    // Para telemetría normal
```

### **🛡️ 3. Last Will and Testament (LWT)**

```cpp
void setup_mqtt_with_lwt() {
    String lwt_topic = tenant + "/" + device_mac + "/status";
    
    // Configurar LWT antes de conectar
    if (client.connect(device_id.c_str(),
                      lwt_topic.c_str(),     // Topic LWT
                      1,                     // QoS
                      true,                  // Retained
                      "offline")) {          // Mensaje LWT
        
        // Al conectar, publicar online
        client.publish(lwt_topic.c_str(), "online", true);
        Serial.println("MQTT conectado - Estado: online");
    }
}
```

---

## 📊 **FRECUENCIAS RECOMENDADAS**

| Tipo de Dato | Frecuencia | Observaciones |
|--------------|------------|---------------|
| `status` | Al conectar/desconectar | Automático con LWT |
| `bateria` | Cada 5-10 minutos | Solo si cambia >5% |
| `temperatura` | Cada 30-60 segundos | Crítico para HVAC |
| `humedad` | Cada 30-60 segundos | Importante para ambiente |
| Sensores críticos | Cada 10-30 segundos | Seguridad/emergencias |
| Sensores lentos | Cada 2-5 minutos | Nivel de tanques, etc. |

---

## 🧪 **TESTING Y VALIDACIÓN**

### **🔍 Verificar Conexión**
```cpp
void test_mqtt_connection() {
    Serial.println("=== TEST MQTT ===");
    Serial.println("Servidor: " + String(mqtt_server));
    Serial.println("Puerto: " + String(mqtt_port));
    Serial.println("Client ID: " + device_id);
    Serial.println("Tenant: " + tenant);
    Serial.println("MAC: " + device_mac);
    
    if (client.connected()) {
        Serial.println("Estado: CONECTADO ✅");
    } else {
        Serial.println("Estado: DESCONECTADO ❌");
    }
}
```

### **📡 Comandos de Testing Manual**

Para probar desde PC/servidor:

```bash
# Simular comando desde el sistema
mosquitto_pub -h IP_SERVIDOR -p 1883 \
  -t "unraf/73cc4dad16d6/cmd/turn_on" \
  -m '{"command_id":"test_001","timestamp":"2025-11-28T15:30:00Z"}'

# Escuchar respuestas del dispositivo
mosquitto_sub -h IP_SERVIDOR -p 1883 \
  -t "unraf/73cc4dad16d6/resp/#"

# Monitorear telemetría del dispositivo
mosquitto_sub -h IP_SERVIDOR -p 1883 \
  -t "unraf/73cc4dad16d6/#"
```

---

## 🏗️ **DIAGRAMA DE FLUJO DEL SISTEMA AURA COMPLETO**

### **📊 Arquitectura General del Sistema AURA**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🌐 SISTEMA AURA - ARQUITECTURA COMPLETA              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          👥 CAPA DE USUARIOS Y CLIENTES                        │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────────┤
│   🖥️ Frontend   │  📱 Mobile App  │  🤖 API Client │  📊 Dashboard Admin        │
│   (React/TS)    │   (Flutter)     │   (External)    │   (Grafana/Custom)          │
│   Port: 3000    │                 │                 │                             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────────┘
                                    │
                               🌐 HTTP/HTTPS
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            🚪 API GATEWAY / NGINX                               │
│                          (Load Balancer & Routing)                             │
│                               Port: 80/443                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                               📡 HTTP REST API
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         🔧 BACKEND AURA INTEGRADO                              │
│                           (FastAPI Monolith)                                   │
│                               Port: 8000                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  🔐 AUTH SERVICE          │  👤 USER MANAGEMENT    │  🏢 TENANT MANAGEMENT      │
│  ├─ JWT Authentication    │  ├─ User CRUD          │  ├─ Multi-tenancy         │
│  ├─ Login/Logout         │  ├─ Profile Mgmt       │  ├─ Tenant Isolation      │
│  ├─ Token Refresh        │  ├─ User-Tenant-Role   │  ├─ Campus Management     │
│  └─ Session Management   │  └─ Permissions        │  └─ Organization Setup    │
│                          │                        │                           │
│  🏗️ DEVICE MANAGEMENT    │  📊 LOCATION SERVICE   │  🔧 SYSTEM MANAGEMENT     │
│  ├─ Device CRUD          │  ├─ Buildings          │  ├─ Components            │
│  ├─ Device Status        │  ├─ Floors             │  ├─ Systems               │
│  ├─ Device Types         │  ├─ Rooms              │  ├─ Permissions           │
│  └─ Device Config        │  └─ External Zones     │  └─ Roles                 │
│                          │                        │                           │
│  📈 TELEMETRY SERVICE    │  ⚡ MQTT SERVICE        │  🔗 API CORE             │
│  ├─ TimescaleDB          │  ├─ Command Publisher  │  ├─ Middleware           │
│  ├─ Data Aggregation     │  ├─ Message Parser     │  ├─ Exception Handling   │
│  ├─ Historical Data      │  ├─ Topic Router       │  ├─ Logging              │
│  └─ Analytics            │  └─ Response Handler   │  └─ Security Headers     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                          📡 Internal Communication
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           💾 CAPA DE DATOS                                     │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────────┤
│  🐘 PostgreSQL  │  📊 TimescaleDB │  🚀 Redis Cache │  📁 File Storage           │
│                 │                 │                 │                             │
│  ├─ Users       │  ├─ Telemetry   │  ├─ Sessions    │  ├─ Logs                   │
│  ├─ Devices     │  ├─ Sensor Data │  ├─ Cache       │  ├─ Backups                │
│  ├─ Tenants     │  ├─ Commands    │  ├─ Config      │  └─ Static Files           │
│  ├─ Locations   │  ├─ Events      │  └─ Temp Data   │                             │
│  ├─ Roles       │  └─ Metrics     │                 │                             │
│  └─ Permissions │                 │                 │                             │
│                 │                 │                 │                             │
│  Port: 5432     │  Port: 5433     │  Port: 6379     │                             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────────┘
                                    │
                          🌉 Network Bridge (Docker)
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📡 CAPA DE COMUNICACIÓN IoT                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                         🦟 MOSQUITTO MQTT BROKER                               │
│                              Port: 1883                                        │
│                                                                                 │
│  📨 Message Routing      │  🔄 QoS Management     │  🏷️ Topic Structure        │
│  ├─ Device → Backend    │  ├─ Delivery Guarantee │  ├─ <tenant>/<device>/...  │
│  ├─ Backend → Device    │  ├─ Retained Messages  │  ├─ Commands & Responses   │
│  ├─ LWT Management      │  └─ Message Queuing    │  └─ Status & Telemetry     │
│  └─ Multi-tenant Topics │                        │                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                          📡 MQTT Protocol (WiFi/Ethernet)
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         🔌 DISPOSITIVOS IoT                                     │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────┤
│  🌡️ Sensores     │  💡 Actuadores  │  📷 Cámaras    │  🤖 Gateways               │
│                 │                 │                 │                            │
│  ├─ Temperatura │  ├─ Luces       │  ├─ Vigilancia  │  ├─ ESP32/Arduino          │
│  ├─ Humedad     │  ├─ Ventiladores│  ├─ Accesos     │  ├─ Raspberry Pi           │
│  ├─ Presión     │  ├─ Bombas      │  ├─ Streaming   │  ├─ Industrial IoT         │
│  ├─ Movimiento  │  ├─ Servos      │  └─ Recording   │  └─ Edge Computing         │
│  ├─ Sonido      │  └─ Relays      │                 │                            │
│  └─ Calidad Aire│                 │                 │                            │
│                 │                 │                 │                            │
│  📤 Publish:    │  📥 Subscribe:  │  📤 Stream:     │  🔄 Bridge:              │
│  └─ Telemetría  │  └─ Comandos    │  └─ Video/Audio │  └─ Local/Cloud            │
└─────────────────┴─────────────────┴─────────────────┴────────────────────────────┘
```

### **🔄 FLUJO DE DATOS PRINCIPAL**

#### **📤 1. Telemetría (Dispositivos → Sistema):**
```
[Sensor IoT] 
    │ 🌡️ temperatura: 22.5°C
    │ 📡 MQTT Publish
    ▼
[Mosquitto Broker]
    │ 📬 Topic: "unraf/device123/telemetry/temperatura"
    │ 🔀 Route to subscribers
    ▼
[MQTT Service (Backend)]
    │ 🔍 Parse topic structure
    │ ✅ Validate tenant & device
    │ 💾 Insert TimescaleDB
    ▼
[TimescaleDB]
    │ 📊 Store sensor data
    │ 🕒 Timestamp indexing
    │ 📈 Ready for analytics
    ▼
[API Endpoint]
    │ 📡 GET /api/v1/telemetry
    │ 📊 Return aggregated data
    ▼
[Frontend Dashboard]
    │ 📈 Charts & Graphs
    │ ⚠️ Alerts & Notifications
    └─ 👁️ Real-time monitoring
```

#### **📥 2. Comandos (Sistema → Dispositivos):**
```
[Frontend UI]
    │ 👆 User clicks "Set Brightness 75%"
    │ 🌐 HTTP POST to API
    ▼
[Backend API]
    │ 🔐 Authenticate user
    │ ✅ Validate permissions
    │ 🏗️ Build MQTT topic
    │ 📝 Create command payload
    ▼
[MQTT Service]
    │ 📡 Publish to "unraf/device123/cmd/set_brightness" (value in payload)
    │ 💾 Log command to database
    ▼
[Mosquitto Broker]
    │ 📬 Forward to device
    │ 🔀 Handle QoS & delivery
    ▼
[Device IoT]
    │ 📥 Receive command
    │ ⚡ Execute action
    │ 📤 Send response
    ▼
[Backend MQTT Service]
    │ 📥 Receive response
    │ ✅ Update command status
    │ 🔔 Notify frontend
    ▼
[Frontend]
    │ ✅ Show success/failure
    │ 🔄 Update device status
    └─ 📊 Refresh dashboard
```

### **🗂️ ESTRUCTURA DE LA BASE DE DATOS**

#### **🐘 PostgreSQL - Datos Operacionales:**
```sql
-- Multi-tenancy e Identidad
tenants            │ 🏢 Organizaciones (UNRaf, Municipios)
users              │ 👤 Usuarios del sistema  
user_tenant_roles  │ 🔗 Relación users ↔ tenants ↔ roles
tokens             │ 🎫 JWT refresh tokens
roles              │ 🔐 Roles y permisos
permissions        │ 🛡️ Granularidad de acceso

-- Infraestructura Física  
locations          │ 📍 Ubicaciones genéricas
buildings          │ 🏢 Edificios
floors             │ 📋 Pisos de edificios  
rooms              │ 🚪 Recintos/Aulas
external_zones     │ 🌳 Zonas externas (jardines, plazas)
tenant_location    │ 🔗 Relación tenants ↔ locations

-- Tecnología IoT
devices            │ 📱 Dispositivos IoT
components         │ 🔧 Componentes de dispositivos
systems            │ ⚙️ Sistemas (HVAC, Lighting, etc)
device_component   │ 🔗 Relación devices ↔ components  
system_device      │ 🔗 Relación systems ↔ devices
```

#### **📊 TimescaleDB - Datos de Series Temporales:**
```sql
-- Telemetría IoT
ts_telemetry       │ 📈 Datos de sensores en tiempo real
                   │ └─ {tenant_id, device_id, ts, type, payload}
                   
-- Comandos y Respuestas (TODO)
ts_commands        │ ⚡ Log de comandos enviados
ts_responses       │ 📥 Respuestas de dispositivos
ts_events          │ 🔔 Eventos del sistema
ts_alerts          │ ⚠️ Alertas y notificaciones
```

### **🎯 ENDPOINTS API PRINCIPALES**

#### **🔐 Autenticación:**
```
POST   /api/v1/auth/login           │ 🔑 Iniciar sesión
POST   /api/v1/auth/refresh         │ 🔄 Renovar token
POST   /api/v1/auth/logout          │ 🚪 Cerrar sesión
GET    /api/v1/profile              │ 👤 Perfil usuario
```

#### **🏢 Gestión Multi-tenant:**
```
GET    /api/v1/tenants              │ 🏢 Listar organizaciones
POST   /api/v1/tenants              │ ➕ Crear organización
GET    /api/v1/users                │ 👥 Gestión de usuarios
POST   /api/v1/user_tenant_roles    │ 🔗 Asignar roles
```

#### **🔧 Gestión de Dispositivos:**
```
GET    /api/v1/devices              │ 📱 Listar dispositivos
POST   /api/v1/devices              │ ➕ Registrar dispositivo
PUT    /api/v1/devices/{id}         │ ✏️ Actualizar dispositivo
DELETE /api/v1/devices/{id}         │ 🗑️ Eliminar dispositivo
```

#### **📍 Gestión de Ubicaciones:**
```
GET    /api/v1/locations            │ 📍 Ubicaciones genéricas
GET    /api/v1/edificios            │ 🏢 Edificios
GET    /api/v1/pisos                │ 📋 Pisos
GET    /api/v1/recintos             │ 🚪 Recintos/Aulas
GET    /api/v1/zonas_externas       │ 🌳 Zonas externas
```

#### **📊 Telemetría y Datos:**
```
GET    /api/v1/telemetry            │ 📈 Datos de sensores
POST   /api/v1/telemetry            │ 📤 Enviar datos (manual)
GET    /api/v1/telemetry/stats      │ 📊 Estadísticas
```

#### **⚡ Comandos IoT (TODO):**
```
POST   /api/v1/devices/{id}/commands │ 📤 Enviar comando
GET    /api/v1/devices/{id}/status   │ 📊 Estado dispositivo  
GET    /api/v1/commands/history      │ 📋 Historial comandos
```

### **🐳 CONTENEDORES DOCKER**

```yaml
# docker-compose.base.yml
services:
  postgres:          # 🐘 Base de datos principal
    image: postgres:15-alpine
    ports: ["5432:5432"]
    
  timescaledb:       # 📊 Series temporales  
    image: timescale/timescaledb:latest-pg16
    ports: ["5433:5432"]
    
  redis:             # 🚀 Cache y sesiones
    image: redis:7-alpine  
    ports: ["6379:6379"]
    
  mosquitto:         # 🦟 MQTT Broker
    image: eclipse-mosquitto:2
    ports: ["1883:1883", "9001:9001"]
```

### **🔧 TECNOLOGÍAS UTILIZADAS**

#### **Backend:**
- **FastAPI** - Framework web principal
- **SQLAlchemy** - ORM para PostgreSQL
- **Pydantic** - Validación de datos
- **JWT** - Autenticación
- **Paho-MQTT** - Cliente MQTT (TODO)

#### **Base de Datos:**
- **PostgreSQL 15** - Datos operacionales
- **TimescaleDB** - Series temporales
- **Redis 7** - Cache y sesiones

#### **IoT & Comunicación:**  
- **Mosquitto** - MQTT Broker
- **MQTT v3.1.1** - Protocolo IoT
- **WebSocket** - Tiempo real (web)

#### **Infraestructura:**
- **Docker** - Containerización
- **Docker Compose** - Orquestación
- **Nginx** - Load balancer (TODO)

### **📋 FLUJO DE DESARROLLO**

#### **✅ Implementado:**
1. ✅ Backend FastAPI integrado
2. ✅ Sistema de autenticación completo  
3. ✅ Gestión multi-tenant
4. ✅ CRUD de usuarios, dispositivos, ubicaciones
5. ✅ Base de datos PostgreSQL + TimescaleDB
6. ✅ API REST completa
7. ✅ Middleware y manejo de errores
8. ✅ Documentación automática (Swagger)

#### **🔄 En Progreso:**
1. 🔄 MQTT Service para comunicación IoT
2. 🔄 Sistema de comandos a dispositivos
3. 🔄 Dashboard frontend React
4. 🔄 Agregación de datos TimescaleDB

#### **📅 Pendiente:**
1. ⏳ Frontend completo (React + TypeScript)
2. ⏳ Dashboards de monitoreo
3. ⏳ Sistema de alertas
4. ⏳ Mobile app (Flutter)
5. ⏳ Optimizaciones y escalabilidad

### **🎯 PRÓXIMOS PASOS INMEDIATOS**

1. **MQTT Service Implementation** - Conectar dispositivos IoT
2. **Commands API** - Envío de comandos a dispositivos  
3. **Frontend Dashboard** - Interfaz de usuario principal
4. **Real-time Monitoring** - WebSocket para tiempo real
5. **Device Testing** - Pruebas con hardware IoT real

Este diagrama representa la arquitectura completa del Sistema AURA, mostrando todos los componentes implementados y la integración entre servicios, bases de datos y comunicación IoT.

---

## 💡 **EJEMPLOS PRÁCTICOS DE TOPICS Y PAYLOADS**

### **📤 1. Ejemplos de Telemetría**

#### **🌡️ Sensor Simple:**
```
Topic: unraf/73cc4dad16d6/temperatura
Payload: "23.5"

Topic: unraf/73cc4dad16d6/humedad  
Payload: "65"

Topic: unraf/73cc4dad16d6/bateria
Payload: "85"
```

#### **🏠 Múltiples Componentes:**
```
Topic: unraf/73cc4dad16d6/incubadora1/temperatura
Payload: "37.2"

Topic: unraf/73cc4dad16d6/incubadora2/temperatura  
Payload: "36.8"

Topic: unraf/73cc4dad16d6/sensor_externo/temperatura
Payload: "18.5"

Topic: unraf/73cc4dad16d6/bomba1/caudal
Payload: "2.5"
```

#### **📊 Estado Obligatorio:**
```
Topic: unraf/73cc4dad16d6/status
Payload: "online"  (al conectarse)
Payload: "offline" (LWT automático al desconectarse)
```

### **📥 2. Ejemplos de Comandos**

#### **🔧 Comandos Simples:**
```
Topic: unraf/73cc4dad16d6/cmd/turn_on
Payload: {"command_id": "cmd_001", "timestamp": "2025-11-28T15:30:00Z"}

Topic: unraf/73cc4dad16d6/cmd/turn_off
Payload: {"command_id": "cmd_002", "timestamp": "2025-11-28T15:30:00Z"}

Topic: unraf/73cc4dad16d6/cmd/restart
Payload: {"command_id": "cmd_003", "timestamp": "2025-11-28T15:30:00Z"}
```

#### **⚙️ Comandos con Parámetros:**
```
Topic: unraf/73cc4dad16d6/cmd/set_brightness
Payload: {
  "command_id": "cmd_004", 
  "value": 75, 
  "timestamp": "2025-11-28T15:30:00Z"
}

Topic: unraf/73cc4dad16d6/cmd/set_temperature  
Payload: {
  "command_id": "cmd_005",
  "value": 25,
  "timestamp": "2025-11-28T15:30:00Z"
}
```

#### **🏗️ Comandos a Componentes:**
```
Topic: unraf/73cc4dad16d6/cmd/incubadora1/set_temperature
Payload: {
  "command_id": "cmd_006",
  "value": 37,
  "additional_params": {"tolerance": 1.0, "mode": "heating"},
  "timestamp": "2025-11-28T15:30:00Z"
}

Topic: unraf/73cc4dad16d6/cmd/ventilador/set_speed
Payload: {
  "command_id": "cmd_007", 
  "value": 60,
  "timestamp": "2025-11-28T15:30:00Z"
}

Topic: unraf/73cc4dad16d6/cmd/bomba1/set_flow
Payload: {
  "command_id": "cmd_008",
  "value": 3.2,
  "additional_params": {"units": "L/min"},
  "timestamp": "2025-11-28T15:30:00Z"  
}
```

### **📤 3. Ejemplos de Respuestas**

#### **✅ Respuesta Exitosa:**
```
Topic: unraf/73cc4dad16d6/resp/set_brightness
Payload: {
  "command_id": "cmd_004",
  "status": "executed",
  "code": 0,
  "result": {
    "current_value": 75,
    "execution_time_ms": 250
  },
  "timestamp": "2025-11-28T15:30:02Z",
  "error": null
}
```

#### **❌ Respuesta con Error:**
```
Topic: unraf/73cc4dad16d6/resp/set_brightness  
Payload: {
  "command_id": "cmd_009",
  "status": "invalid",
  "code": 1,
  "result": {
    "current_value": 50,
    "execution_time_ms": 10
  },
  "timestamp": "2025-11-28T15:30:02Z",
  "error": "Brightness value out of range (0-100)"
}
```

#### **🔧 Respuesta de Componente:**
```
Topic: unraf/73cc4dad16d6/resp/incubadora1/set_temperature
Payload: {
  "command_id": "cmd_006", 
  "status": "executed",
  "code": 0,
  "result": {
    "current_value": 37,
    "component": "incubadora1",
    "execution_time_ms": 500
  },
  "timestamp": "2025-11-28T15:30:05Z",
  "error": null
}
```

### **🔄 4. Casos de Uso Específicos**

#### **🌾 Sistema de Riego Automático:**
```
# Comando complejo
Topic: unraf/73cc4dad16d6/cmd/riego/set_duration
Payload: {
  "command_id": "cmd_010",
  "value": 15,
  "additional_params": {
    "zones": [1, 3, 5],
    "flow_rate": 2.5,
    "soil_check": true
  },
  "timestamp": "2025-11-28T16:00:00Z"
}

# Respuesta
Topic: unraf/73cc4dad16d6/resp/riego/set_duration
Payload: {
  "command_id": "cmd_010",
  "status": "executed", 
  "code": 0,
  "result": {
    "current_value": 15,
    "zones_activated": [1, 3, 5],
    "component": "riego",
    "execution_time_ms": 1200
  },
  "timestamp": "2025-11-28T16:00:01Z",
  "error": null
}
```

#### **🏭 Control Industrial:**
```
# Telemetría de múltiples sensores
Topic: unraf/73cc4dad16d6/maquina1/temperatura
Payload: "85.2"

Topic: unraf/73cc4dad16d6/maquina1/presion
Payload: "2.3"

Topic: unraf/73cc4dad16d6/maquina1/vibracion  
Payload: "0.05"

# Comando de emergencia
Topic: unraf/73cc4dad16d6/cmd/maquina1/emergency_stop
Payload: {
  "command_id": "cmd_emergency_001",
  "timestamp": "2025-11-28T16:05:00Z"
}

# Respuesta inmediata
Topic: unraf/73cc4dad16d6/resp/maquina1/emergency_stop
Payload: {
  "command_id": "cmd_emergency_001",
  "status": "executed",
  "code": 0, 
  "result": {
    "component": "maquina1",
    "execution_time_ms": 50,
    "safety_status": "STOPPED"
  },
  "timestamp": "2025-11-28T16:05:00Z",
  "error": null
}
```




