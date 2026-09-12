# Sistema SCADA: Versión Distribuida Multiplataforma (IoT/Web)

**Lautaro Kuhn; Mateo Palomeque**[cite: 3]  
*UNRaf, Universidad Nacional de Rafaela, Santa Fe, Argentina.*[cite: 3]  
*Ingeniería en Computación 2-3 (IC)*[cite: 3]  
**Autor Corresp.:** 1221kuhn@gmail.com, mateopalo3@gmail.com[cite: 3]  
**Repositorio:** [https://github.com/equipoPI/IC2-IC3](https://github.com/equipoPI/IC2-IC3)[cite: 3]

---

## Resumen
El proyecto IC2–IC3 implementa una plataforma SCADA orientada a la supervisión y control de procesos industriales[cite: 3]. La solución actual amplía significativamente la versión inicial basada en Arduino y comunicación Bluetooth: incorpora una arquitectura de servicios compuesta por PostgreSQL, Django/Django REST Framework, Django Channels, Daphne/ASGI, React con TypeScript y Vite, Mosquitto como broker MQTT y un túnel Ngrok para acceso remoto[cite: 3]. El repositorio también incorpora Docker Compose como mecanismo de orquestación[cite: 3].

Desde el punto de vista funcional, el sistema permite visualizar dispositivos y variables, recibir telemetría, transmitir comandos, configurar tópicos MQTT, administrar sistemas y secciones, registrar auditoría, gestionar recetas y planificación, y representar el proceso mediante una interfaz SCADA dinámica[cite: 3].

La característica central de la arquitectura es la separación entre adquisición, transporte, procesamiento, persistencia y presentación[cite: 3]. MQTT funciona como bus de mensajería industrial/IoT; el worker de Django consume esa telemetría y actualiza el modelo de datos; Django Channels difunde cambios mediante WebSockets; finalmente React refleja el estado en tiempo real sin depender de polling continuo[cite: 3].

**Palabras clave:** SCADA, MQTT, WebSockets, Django, React, TypeScript, PostgreSQL, Docker, IoT, telemetría, automatización industrial[cite: 3].

### Objetivos del informe
* Describir la arquitectura y sus responsabilidades[cite: 3].
* Explicar la evolución respecto del proyecto anterior[cite: 3].
* Documentar las comunicaciones y el flujo de datos[cite: 3].
* Analizar componentes de software relevantes y explicar decisiones técnicas[cite: 3].

![Imagen 1. Funcionalidad principal del sistema](Imagen_1.png)[cite: 3]  
*Imagen 1. Funcionalidad principal del sistema.*[cite: 3]

---

## 1. Introducción
La versión anterior del proyecto planteaba una maqueta de producción de líquidos con depósitos, bombas, electroválvulas, caudalímetros, sensores ultrasónicos y un Arduino Mega 2560[cite: 3]. El control remoto se realizaba mediante una aplicación móvil y un módulo Bluetooth HC-05[cite: 3]. El informe previo describe explícitamente la lógica de carga de depósitos, mezcla de ingredientes, medición de caudal y vaciado del producto final[cite: 3].

La evolución hacia IC2–IC3 mantiene el concepto de automatización, pero desplaza el centro de gravedad desde una aplicación de control local hacia una plataforma distribuida[cite: 3]. El repositorio actual describe un sistema con arquitectura reactiva en tiempo real, paneles dinámicos, diagrama P&ID, planificación de producción, almacenamiento, seguridad y gateway IoT[cite: 3].

| Versión anterior | Evolución IC2–IC3 |
| :--- | :--- |
| Arduino + Bluetooth[cite: 3] | Gateway + MQTT + backend + WebSockets[cite: 3] |
| Aplicación móvil[cite: 3] | Frontend web React/TypeScript[cite: 3] |
| Control más acoplado al hardware[cite: 3] | Separación por capas[cite: 3] |
| Comunicación punto a punto[cite: 3] | Bus MQTT jerárquico[cite: 3] |
| Estado principalmente local[cite: 3] | Persistencia en PostgreSQL[cite: 3] |
| Lógica de control concentrada[cite: 3] | Servicios especializados[cite: 3] |

![Imagen 2. Evolución de la interfaz de control](Imagen_2.png)[cite: 3]  
*Imagen 2. Evolución de la interfaz de control.*[cite: 3]

---

## 2. Antecedentes y continuidad del proyecto
El presente desarrollo corresponde a una nueva etapa del Proyecto Sistema SCADA iniciado en Ingeniería en Computación 1 (IC1) y documentado en el informe final de 2024[cite: 3]. El trabajo anterior planteó una maqueta de producción automatizada de líquidos y resolvió la adquisición y el accionamiento mediante un Arduino Mega 2560, sensores de nivel, caudalímetros, bombas, electroválvulas y un módulo Bluetooth HC-05[cite: 3]. La supervisión y el control se realizaban desde una aplicación móvil desarrollada en MIT App Inventor[cite: 3]. Este antecedente constituye la base funcional y física sobre la cual se continúa el proyecto[cite: 3].

En la etapa IC2–IC3 se conserva la lógica general del proceso físico, pero se modifica de manera significativa la arquitectura de software y comunicaciones[cite: 3]. La aplicación móvil deja lugar a una interfaz web desarrollada con React y TypeScript, se incorpora una Raspberry Pi 4 de 8 GB como gateway entre el sistema físico y la infraestructura de software, y la comunicación se reorganiza alrededor de MQTT, un backend Django/DRF, PostgreSQL y WebSockets[cite: 3]. Por lo tanto, el objetivo de esta etapa no es repetir el prototipo anterior, sino evolucionarlo hacia una arquitectura distribuida, modular y con mayor capacidad de supervisión, integración y crecimiento[cite: 3].

La relación entre ambos informes es deliberada: el documento de IC1 describe el punto de partida físico y funcional, mientras que este informe documenta la transformación de ese prototipo en una plataforma SCADA web[cite: 3]. En particular, las figuras del informe anterior permiten visualizar el boceto inicial, el centro de control, la maqueta completa, el Arduino y la interfaz móvil; dichas evidencias se utilizan aquí únicamente como antecedentes históricos y se contrastan con la arquitectura actual[cite: 3].

### Evidencias del sistema en la etapa IC1
Las siguientes imágenes fueron tomadas del informe de Proyecto Sistema SCADA de IC1 (2024) y se incorporan como referencia de continuidad[cite: 3]. No representan la interfaz ni la arquitectura actual de IC2–IC3; su finalidad es documentar el estado inicial del proyecto[cite: 3].

| Centro de control IC1 | Maqueta completa IC1 |
| :---: | :---: |
| ![Imagen 3. Centro de control de la etapa IC1 (2024)](Imagen_3.png)[cite: 3] | ![Imagen 4. Maqueta completa del sistema en la etapa IC1 (2024)](Imagen_4.png)[cite: 3] |
| *Imagen 3. Centro de control de la etapa IC1 (2024).*[cite: 3] | *Imagen 4. Maqueta completa del sistema en la etapa IC1 (2024).*[cite: 3] |

| Arduino Mega 2560 | Interfaz móvil IC1 |
| :---: | :---: |
| ![Imagen 5. Arduino Mega 2560 utilizado en la etapa IC1](Imagen_5.png)[cite: 3] | ![Imagen 6. Interfaz móvil de configuración de la etapa IC1](Imagen_6.png)[cite: 3] |
| *Imagen 5. Arduino Mega 2560 utilizado en la etapa IC1.*[cite: 3] | *Imagen 6. Interfaz móvil de configuración de la etapa IC1.*[cite: 3] |

En el informe anterior también se documentó la trama serial utilizada entre Arduino y Bluetooth[cite: 3]. En la arquitectura actual, esa comunicación punto a punto es reemplazada por una cadena de comunicación en la que el Arduino se vincula por Serial USB con el gateway Raspberry Pi, el gateway publica y recibe mensajes MQTT, el backend procesa y persiste la información y la interfaz React recibe eventos mediante WebSocket[cite: 3]. Esta diferencia constituye uno de los principales cambios tecnológicos entre ambas etapas[cite: 3].

| Elemento | Informe IC1 (2024) | Continuidad en IC2–IC3 |
| :--- | :--- | :--- |
| **Control físico** | Arduino Mega 2560[cite: 3] | Arduino + Raspberry Pi 4 Gateway[cite: 3] |
| **Comunicación** | Bluetooth HC-05 / UART[cite: 3] | Serial USB + MQTT[cite: 3] |
| **Interfaz** | MIT App Inventor móvil[cite: 3] | React + TypeScript + Vite[cite: 3] |
| **Procesamiento** | Lógica concentrada en Arduino[cite: 3] | Arduino + Gateway + mqtt_worker + backend[cite: 3] |
| **Persistencia** | No centralizada como plataforma SCADA[cite: 3] | PostgreSQL + almacenamiento local del gateway[cite: 3] |
| **Supervisión** | Pantallas móviles[cite: 3] | SCADA web, P&ID, paneles dinámicos y monitorización[cite: 3] |
| **Integración** | Punto a punto[cite: 3] | Arquitectura distribuida con broker MQTT y WebSocket[cite: 3] |

![Figura 1. Evolución del proyecto IC1 a IC2-IC3](Figura_1_Evolucion.png)[cite: 3]  
*Figura 1. Evolución del proyecto IC1 → IC2–IC3.*[cite: 3]

---

## 3. Estado del Arte
El informe de IC1 describía una maqueta de producción de líquidos controlada por Arduino Mega 2560, con sensores ultrasónicos, caudalímetros, bombas, electroválvulas y comunicación Bluetooth con una aplicación móvil[cite: 3]. El sistema era deliberadamente didáctico y buscaba demostrar la lógica de automatización, supervisión y control[cite: 3]. 

La implementación actual mantiene el proceso físico como antecedente, pero cambia la arquitectura informática[cite: 3]. El repositorio actual incorpora una plataforma web, MQTT, un gateway Raspberry Pi, persistencia central, WebSockets, auto-descubrimiento de dispositivos, P&ID, planificación, inventario y auditoría[cite: 3]. 

La migración de la aplicación móvil a una aplicación web responde a la necesidad de mayor superficie de visualización e interacción[cite: 3]. El navegador permite reunir múltiples vistas y componentes en una misma plataforma y evita acoplar la interfaz al protocolo físico del controlador[cite: 3].

El cambio de Bluetooth a una arquitectura con gateway también modifica el modelo de comunicación: el Arduino deja de depender directamente del dispositivo del operador[cite: 3]. La Raspberry Pi absorbe las tareas de conectividad y actúa como frontera entre el sistema físico y la red[cite: 3].

---

## 4. Marco Teórico
* **SCADA:** Integra adquisición de datos, supervisión, alarmas y control[cite: 3]. En este proyecto esas funciones se distribuyen entre el controlador físico, el gateway, el broker MQTT, el backend y la interfaz web[cite: 3].
* **MQTT:** Implementa publicación/suscripción mediante un broker[cite: 3]. Esta característica desacopla productores y consumidores: el gateway puede publicar telemetría sin conocer quién la consumirá, y nuevos clientes pueden incorporarse sin modificar el controlador[cite: 3].
* **WebSocket:** Complementa a HTTP mediante un canal persistente orientado a eventos[cite: 3]. En un SCADA resulta apropiado porque las novedades suelen originarse en el proceso; el servidor puede enviar una actualización cuando existe un cambio en lugar de esperar a la próxima consulta del navegador[cite: 3].
* **PostgreSQL y SQLite:** PostgreSQL se utiliza para persistencia central de entidades relacionales, mientras que SQLite en el gateway permite conservar una configuración simple del mismo y almacenamiento local[cite: 3].
* **Docker Compose:** Integra los servicios del servidor en un entorno reproducible y aislado[cite: 3].

---

## 5. Alcance y Requerimientos Funcionales
El alcance actual puede dividirse en cinco grupos: supervisión, control, comunicaciones, gestión y despliegue[cite: 3].

### Supervisión
* Visualización de plantas, secciones, sistemas y dispositivos[cite: 3].
* Lectura de variables y estados de sensores/actuadores[cite: 3].
* Alarmas y diagnóstico[cite: 3].
* Tendencias y gráficos de telemetría[cite: 3].
* Representación gráfica del proceso mediante P&ID/diagrama de flujo[cite: 3].

### Control
* Envío de comandos a dispositivos[cite: 3].
* Control de procesos de mezcla y reposición[cite: 3].
* Recetas y dosificación parametrizada[cite: 3].
* Pausa, reanudación, vaciado y descarte según el dispositivo/proceso[cite: 3].

### Gestión
* Usuarios, empleados y rangos de autorización[cite: 3].
* Configuración de MQTT[cite: 3].
* Personalización de comandos y mapeos[cite: 3].
* Planificación de producción[cite: 3].
* Inventario y unidades de almacenamiento[cite: 3].

La interfaz `VisualizacionSCADA` integra filtros de planta, sección y sistema, carga dispositivos mediante API, recupera configuración MQTT y comandos personalizados, y utiliza el hook `useScadaWebSocket` para reaccionar a eventos de telemetría[cite: 3].

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 5. Frames WebSocket en Tiempo Real (DevTools)**[cite: 3]  
> *Captura de las DevTools del navegador (F12, pestaña Network, filtro WS) sobre la conexión `ws://localhost:8000/ws/scada/`[cite: 3]. Mostrar los mensajes JSON de telemetría llegando en tiempo real con sus timestamps y payloads[cite: 3]. Idealmente mostrar varios frames consecutivos para evidenciar el flujo continuo de datos.*[cite: 3]

---

## 6. Arquitectura General
![Figura 2. Arquitectura general del sistema SCADA IC2-IC3](Figura_2_Arquitectura.png)[cite: 3]  
*Figura 2. Arquitectura general del sistema SCADA IC2–IC3.*[cite: 3]

La arquitectura puede entenderse como una cadena de transformación de información: el hardware genera señales; el gateway las convierte en mensajes; MQTT los transporta; el backend los interpreta y persiste; WebSockets los distribuye; y el frontend los presenta al operador[cite: 3].

El README del repositorio identifica explícitamente PostgreSQL, Django/Channels, React, Mosquitto, Ngrok, Raspberry Pi/Gateway y hardware Arduino como elementos de la arquitectura[cite: 3].

![Figura 6. Arquitectura de carpetas del proyecto](Figura_6_Carpetas.png)[cite: 3]  
*Figura 6. Arquitectura de carpetas del proyecto.*[cite: 3]

### Principio de desacoplamiento
Una ventaja importante es que el frontend no necesita conocer directamente cómo funciona un sensor[cite: 3]. El frontend consume una API y recibe eventos WebSocket; el worker MQTT se ocupa de traducir mensajes externos a entidades internas; y el gateway abstrae el hardware[cite: 3]. Esto permite cambiar el microcontrolador o agregar dispositivos sin rediseñar la interfaz[cite: 3].

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 6. Worker MQTT Procesando Telemetria en Vivo**[cite: 3]  
> *Captura de la terminal con `docker compose logs -f mqtt_worker`, mostrando en tiempo real: la suscripción al tópico wildcard (`#`), los mensajes de telemetría entrantes con su tópico y payload, el auto-discovery de nuevos dispositivos, el procesamiento de alarmas y la difusión WebSocket.*[cite: 3]

### Cadena de transformación de datos
| Etapa | Entrada | Salida | Objetivo |
| :--- | :--- | :--- | :--- |
| **1. Adquisición** | Pulso/medición física[cite: 3] | Variable Arduino[cite: 3] | Medir el proceso[cite: 3] |
| **2. Serial** | Trama Arduino[cite: 3] | Dato en Raspberry[cite: 3] | Transportar localmente[cite: 3] |
| **3. MQTT** | Dato normalizado[cite: 3] | Topic + payload[cite: 3] | Distribuir[cite: 3] |
| **4. Worker** | Topic/payload[cite: 3] | Entidad Django[cite: 3] | Interpretar[cite: 3] |
| **5. Persistencia** | Entidad[cite: 3] | PostgreSQL[cite: 3] | Conservar[cite: 3] |
| **6. WebSocket** | Evento[cite: 3] | JSON al navegador[cite: 3] | Actualizar UI[cite: 3] |
| **7. React** | JSON[cite: 3] | Estado visual[cite: 3] | Mostrar al operador[cite: 3] |

---

## 7. Capa Física y Gateway Raspberry Pi
La incorporación de una Raspberry Pi 4 con 8 GB de RAM es uno de los cambios estructurales de la nueva etapa[cite: 3]. Su función es actuar como gateway IoT entre el Arduino y la infraestructura de red[cite: 3]. El Arduino conserva la responsabilidad de adquirir variables y accionar dispositivos; la Raspberry administra comunicaciones, almacenamiento y enrutamiento[cite: 3].

El firmware actual reemplaza el enlace Bluetooth por comunicación Serial USB[cite: 3]. La configuración define 115200 baudios, frente a los 9600 baudios utilizados por el enlace Bluetooth del prototipo original[cite: 3].

El gateway se divide en cinco módulos principales: `arduino_serial.py`, `mqtt_client.py`, `data_storage.py`, `system_diagnostics.py` y `gateway_main.py` (además de `gui.py` para la interfaz gráfica táctil local)[cite: 3]. El primero administra el puerto serie mediante colas y callbacks; el segundo gestiona MQTT; el tercero conserva los parámetros que pueden modificarse mediante la interfaz; el cuarto monitorea recursos; y el último coordina los componentes y sus políticas de recuperación[cite: 3].

![Figura 3. Arquitectura interna del Gateway (Raspberry Pi 4)](Figura_3_Gateway.png)[cite: 3]  
*Figura 3. Arquitectura interna del Gateway (Raspberry Pi 4).*[cite: 3]

La separación permite que una interrupción de red no implique necesariamente detener el control local[cite: 3]. El Arduino puede seguir operando mientras la Raspberry reintenta conexiones, conserva información y restablece el vínculo con el broker[cite: 3].

### 7.1 Migración Bluetooth → Serial USB
La versión IC1 utilizaba HC-05 y una trama ASCII con comandos y valores[cite: 3]. La versión actual mantiene la compatibilidad con esos comandos a nivel del Arduino, pero traslada la comunicación inalámbrica a una capa de red gestionada por el gateway[cite: 3]. Esto reduce el acoplamiento entre la interfaz y el controlador[cite: 3].

### 7.2 Almacenamiento y diagnóstico local
El archivo de configuración del gateway define SQLite con el fin de guardar configuraciones del dispositivo, las cuales luego se usarán para recrear tópicos y hacer efectiva la comunicación[cite: 3]. Dentro de la configuración que permite guardar están: IP del broker, credenciales de conexión (usuario y contraseña), puerto, tenant/empresa, sector (lugar dentro de la empresa) y nombre del sistema representado[cite: 3].

### 7.3 Componentes físicos y función dentro del sistema
La arquitectura de software no puede analizarse separada de la instalación física que da origen a los datos[cite: 3]. La versión actual conserva los principales componentes descritos en el informe de IC1, pero cambia la forma en que se integran con la red[cite: 3]:

* **Sensores de nivel HC-SR04:** Estiman el nivel de líquido emitiendo ultrasonido y midiendo el tiempo de retorno del eco[cite: 3]. El Arduino convierte tiempo a distancia y luego a porcentaje de llenado (rango aprox. 2 a 400 cm a 40 kHz)[cite: 3]. Intervienen en decisiones críticas de control (protección por sobrellenado o alarma por nivel bajo)[cite: 3].
* **Caudalímetros (Efecto Hall):** Generan pulsos asociados al movimiento del fluido que el Arduino cuenta mediante interrupciones de hardware para dosificación volumétrica[cite: 3].
* **Bombas, electroválvulas y relés:** Actuadores encargados del trasvase y selección del recorrido del líquido[cite: 3]. Los relés aíslan eléctricamente la lógica del microcontrolador de las cargas de potencia[cite: 3].
* **Motor de mezcla y alimentación:** Motor DC con paleta que ejecuta ciclos de mezclado temporizados configurables[cite: 3].
* **Raspberry Pi 4 (8 GB):** Nodo perimetral con capacidad para ejecutar paralelamente el cliente MQTT, procesamiento serial, SQLite, diagnósticos y logging[cite: 3].

| Sensor Ultrasónico HC-SR04 | Caudalímetro ¼’’ |
| :---: | :---: |
| ![Figura 12. Sensor Ultrasónico HC-SR04](Figura_12_HCSR04.png)[cite: 3] | ![Figura 11. Caudalímetro](Figura_11_Caudalimetro.png)[cite: 3] |
| *Figura 12. Sensor Ultrasónico HC-SR04.*[cite: 3] | *Figura 11. Caudalímetro ¼’’.*[cite: 3] |

| Módulo Relé 4 canales | Mini Bomba de Agua 3-5V |
| :---: | :---: |
| ![Figura 7. Módulo Relé de 4 canales 5V](Figura_7_Rele.png)[cite: 3] | ![Figura 8. Mini Bomba de Agua 3-5V](Figura_8_Bomba3V.png)[cite: 3] |
| *Figura 7. Módulo Relé de 4 canales 5V.*[cite: 3] | *Figura 8. Mini Bomba de Agua 3-5V.*[cite: 3] |

| Bomba de Agua 2000-4000 L/h | Electroválvula Doble |
| :---: | :---: |
| ![Figura 9. Bomba de Agua 4000-2000 L/h](Figura_9_BombaPotencia.png)[cite: 3] | ![Figura 10. Electroválvula Doble](Figura_10_Electrovalvula.png)[cite: 3] |
| *Figura 9. Bomba de Agua 4000 – 2000 L/h.*[cite: 3] | *Figura 10. Electroválvula Doble.*[cite: 3] |

| Mini Motor DC | Fuente de Alimentación 5V |
| :---: | :---: |
| ![Figura 13. Mini Motor DC](Figura_13_MotorDC.png)[cite: 3] | ![Figura 14. Fuente de Alimentación de 5V](Figura_14_Fuente.png)[cite: 3] |
| *Figura 13. Mini Motor DC.*[cite: 3] | *Figura 14. Fuente de Alimentación de 5V.*[cite: 3] |

| Elemento | Función física | Implicancia informática |
| :--- | :--- | :--- |
| **HC-SR04** | Medición de nivel[cite: 3] | Genera variable de telemetría y condiciones de alarma[cite: 3] |
| **Caudalímetro** | Medición de flujo[cite: 3] | Permite dosificación y registro de proceso[cite: 3] |
| **Bomba** | Transferencia de fluido[cite: 3] | Actuador controlado por comandos[cite: 3] |
| **Electroválvula** | Selección de recorrido[cite: 3] | Determina ruta de reposición/mezcla[cite: 3] |
| **Relé** | Interfaz de potencia[cite: 3] | Aísla lógica de control de la carga[cite: 3] |
| **Motor DC** | Mezclado[cite: 3] | Ejecuta ciclo de producción[cite: 3] |
| **Arduino** | Control local[cite: 3] | Mantiene lógica del proceso[cite: 3] |
| **Raspberry Pi** | Gateway[cite: 3] | Adapta serial, MQTT, almacenamiento y diagnóstico[cite: 3] |

### 7.4 Protocolo serial entre Arduino y Gateway
El firmware del microcontrolador (`Sistema_SCADA_Serial.ino`) conserva una interfaz textual simple y estructurada (/dev/ttyACM0, 115200 baud, timeout de 1 s)[cite: 3]. El Arduino envía `ARDUINO_READY` al iniciar y luego transmite las variables[cite: 3]. El gateway mantiene un buffer y colas de comunicación (`Queue`), desacoplando lectura y escritura antes de la publicación MQTT[cite: 3].

---

## 8. Comunicaciones MQTT y Jerarquía de Tópicos
![Figura 5. Jerarquía de tópicos MQTT](Figura_5_Topicos.png)[cite: 3]  
*Figura 5. Jerarquía de tópicos MQTT.*[cite: 3]

El sistema organiza las comunicaciones en dos formatos estructurados:
* **Telemetría (6 niveles):** `{tenant}/{gateway_id}/{seccion}/{sistema}/{categoria}/{dispositivo}`[cite: 3]  
  *Ejemplo:* `rafaela_sa/d83add60dbb0/a1/linea_mezclado_1/sensores/caudalimetro_1`[cite: 3]
* **Comandos (5 niveles):** `{tenant}/{gateway_id}/{seccion}/{sistema}/comandos/{accion}`[cite: 3]

### Acciones y comandos estandarizados
| Acción | Tópico (sufijo) | Payload JSON | Cmd Arduino | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Reposición** | `/reposicion`[cite: 3] | `{"bombo":1,"limite_porcentaje":75}`[cite: 3] | `R1075`[cite: 3] | Rellena bombo al % indicado[cite: 3] |
| **Freno Repos.** | `/freno_reposicion`[cite: 3] | `{}`[cite: 3] | `F`[cite: 3] | Detiene bomba de reposición[cite: 3] |
| **Detener** | `/detener`[cite: 3] | `{}`[cite: 3] | `D`[cite: 3] | Pausa la mezcla[cite: 3] |
| **Reanudar** | `/reanudar`[cite: 3] | `{}`[cite: 3] | `A`[cite: 3] | Reanuda la mezcla[cite: 3] |
| **Vaciar** | `/vaciar`[cite: 3] | `{}`[cite: 3] | `V`[cite: 3] | Vacía contenedor[cite: 3] |
| **Desechar** | `/desechar`[cite: 3] | `{}`[cite: 3] | `X`[cite: 3] | Descarta mezcla actual[cite: 3] |
| **Mezcla** | `/mezcla`[cite: 3] | `{"liquido_1":50,"liquido_2":30,"hora":0,"minuto":15}`[cite: 3] | `L1 50, L2 30, H 0, M 15`[cite: 3] | Configura y dosifica mezcla[cite: 3] |

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 8. Árbol Jerárquico de Tópicos en MQTT Explorer**[cite: 3]  
> *Captura de MQTT Explorer conectado a `localhost:1883` mostrando el árbol de tópicos desplegado con payloads recibidos.*[cite: 3]

---

## 9. Worker MQTT e Ingesta de Telemetría
El archivo `mqtt_worker.py` implementa un proceso en segundo plano encargado de conectarse al broker, suscribirse a los tópicos y procesar mensajes[cite: 3].
* **Suscripción wildcard (`#`):** Permite capturar todos los tópicos entrantes facilitando el auto-descubrimiento en desarrollo[cite: 3].
* **Auto-descubrimiento:** Si el worker recibe telemetría de un dispositivo o sección que aún no está dado de alta en la base de datos, lo crea automáticamente[cite: 3].
* **Persistencia y Alarmas:** Parsea payloads JSON, actualiza `LecturaSensor` y evalúa umbrales para crear registros en `Alarma`[cite: 3].
* **Difusión en tiempo real:** Remite las actualizaciones instantáneas a Django Channels vía `scada_telemetry`[cite: 3].

---

## 10. Backend: Django, API REST y Modelo de Datos
![Figura 4. Flujo bidireccional de telemetría y comandos](Figura_4_Flujo.png)[cite: 3]  
*Figura 4. Flujo bidireccional de telemetría y comandos.*[cite: 3]

El backend está organizado como una aplicación Django con Django REST Framework (DRF)[cite: 3]. Entre los recursos expuestos se encuentran fábricas, secciones, sistemas, dispositivos, configuraciones MQTT, auditoría y mapeos de acciones[cite: 3].

### 10.1 Lógica de negocio y autorización
El modelo `Fabrica` contiene nombre, ubicación, país y métricas SCADA agregadas (producción, eficiencia, temperatura, consumo y alarmas)[cite: 3]. El método `actualizar_metricas()` encapsula reglas de negocio modificando el estado de la planta a OPERATIVO, ADVERTENCIA o CRÍTICO según la severidad de alarmas activas[cite: 3].

El modelo `Empleado` vincula al usuario de Django con una planta/sección y utiliza el campo `rango` como fuente de autorización para derivar perfiles (administrador, manager u operador)[cite: 3].

### 10.2 Despacho de Comandos: Arquitectura Híbrida (WebSocket Directo vs. API REST)
El sistema implementa una **arquitectura de doble canal** para el despacho de comandos de control industrial desde la interfaz de usuario:

1. **Canal Reactivo WebSocket (Ultra-baja latencia, prioritario):**
   * Cuando el operador acciona un control en la interfaz, el comando viaja directamente en formato JSON a través del canal bidireccional WebSocket ya establecido hacia `SCADAConsumer` (`consumers.py`)[cite: 3].
   * La función `SCADAConsumer.receive` parsea el mensaje (`msg_type: "command"`), resuelve dinámicamente el tópico correspondiente según el dispositivo y despacha de forma asíncrona la publicación al broker Mosquitto mediante `_publish_mqtt_single`[cite: 3].
   * De manera simultánea, genera una entrada transaccional en `RegistroAuditoria` (almacenando usuario, acción, payload y timestamp) y emite un acuse de recibo inmediato (`command_ack`) hacia el cliente web con una latencia típica inferior a **15 ms**[cite: 3].

2. **Canal API REST (Fallback y Acceso Externo):**
   * Como mecanismo de respaldo y punto de integración para sistemas de terceros, se dispone del endpoint HTTP POST (`/api/scada/transmitir_comando/` y `/api/scada/accion_comando/`)[cite: 3].
   * Para evitar bloquear la respuesta HTTP ante la comunicación de red con el broker, la publicación MQTT se delega a un hilo daemon concurrente (`threading.Thread`)[cite: 3].
   * Este canal aplica un patrón *fire-and-forget*, garantizando una respuesta inmediata al cliente HTTP mientras el hilo secundario ejecuta la entrega del paquete MQTT[cite: 3].

### 10.3 Modelo de Datos Principal (ER)
![Figura 8. Modelo de datos principal (ER)](Figura_8_ERD.png)[cite: 3]  
*Figura 8. Modelo de datos principal (ER).*[cite: 3]

| Entidad | Relación / Responsabilidad |
| :--- | :--- |
| **Fabrica** | Representa una planta y concentra métricas SCADA[cite: 3] |
| **Seccion** | Agrupa áreas físicas dentro de una fábrica[cite: 3] |
| **Sistema** | Representa una línea o proceso industrial[cite: 3] |
| **DispositivoSCADA** | Representa sensores y actuadores[cite: 3] |
| **LecturaSensor** | Registra mediciones históricas[cite: 3] |
| **Alarma** | Representa condiciones anómalas de operación[cite: 3] |
| **Receta / DetalleReceta** | Define combinaciones e insumos parametrizados[cite: 3] |
| **OrdenProduccion** | Representa una ejecución productiva planificada[cite: 3] |
| **Inventario / ItemInventario**| Control de existencias y almacenamiento de insumos[cite: 3] |
| **Empleado / Profile** | Usuarios, rangos jerárquicos y permisos[cite: 3] |

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 7. Respuesta JSON de la API REST**[cite: 3]  
> *Captura de Postman o del DRF Browsable API mostrando una petición GET a `/api/fabricas/` con su respuesta JSON estructurada.*[cite: 3]

---

## 11. WebSockets y Tiempo Real
Django Channels implementa el consumidor asíncrono `SCADAConsumer`, que gestiona una conexión dúplex completa: en sentido descendente agrupa a los navegadores en el grupo `scada_telemetry` transmitiendo eventos mediante `scada_update`, y en sentido ascendente procesa comandos de control en tiempo real mediante `receive`[cite: 3].

En el frontend, el hook personalizado `useScadaWebSocket`:
* Selecciona dinámicamente `ws://` o `wss://` según el protocolo de la página[cite: 3].
* Establece la conexión hacia `/ws/scada/`[cite: 3].
* Implementa reconexión automática tras 3 segundos ante una caída de red[cite: 3].

---

## 12. Frontend React + TypeScript
Construido con React 18, TypeScript, Vite y Tailwind CSS[cite: 3].

| Página (TSX) | Funcionalidad |
| :--- | :--- |
| `VisualizacionSCADA.tsx`[cite: 3] | Diagrama P&ID interactivo, selector de sistema y controles dinámicos[cite: 3] |
| `GuiaSistema.tsx`[cite: 3] | Documentación interactiva del sistema monitorizado[cite: 3] |
| `PlanificacionProduccion.tsx`[cite: 3] | Diagrama de Gantt, calendario mensual y ejecución de recetas[cite: 3] |
| `MonitorizacionSCADA.tsx`[cite: 3] | Gráficos Recharts en tiempo real y panel de alarmas[cite: 3] |
| `AdministracionAlmacenamiento.tsx`[cite: 3]| Gestión de tanques, bombos y reposición automática[cite: 3] |
| `Credenciales.tsx`[cite: 3] | Claves de registro, passwd Mosquitto y matriz de roles 1-8[cite: 3] |

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 9. Página VisualizacionSCADA - Diagrama P&ID en Vivo**[cite: 3]  
> *Captura de pantalla de la página VisualizacionSCADA con componentes en vivo (sensores, bombas, tanques animados).*[cite: 3]

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 10. MonitorizacionSCADA - Gráficos Recharts en Tiempo Real**[cite: 3]  
> *Captura de MonitorizacionSCADA mostrando gráficos temporales de nivel/temperatura y el panel de alarmas activas.*[cite: 3]

---

## 13. Visualización P&ID y Gemelo Digital
La representación gráfica del proceso industrial se implementa en la página `VisualizacionSCADA.tsx` (ruta `/scada`), cuyo núcleo visual es el componente `ScadaFlowDiagram.tsx`, desarrollado sobre la biblioteca especializada `@xyflow/react` (React Flow)[cite: 3].

### 13.1 Arquitectura de Nodos Industriales Personalizados
En lugar de componentes estáticos genéricos, el diagrama se compone de **nodos SVG customizados** (`src/components/scada/nodes/`) que reaccionan directamente a los estados del modelo de telemetría:

* **`TankNode.tsx` (Tanques de Reposición y Mezcla):** Representa los depósitos físicos con cálculo volumétrico dinámico. Incluye animación visual SVG/CSS de llenado de líquido en gradiente según el porcentaje de nivel reportado por los sensores ultrasónicos HC-SR04, junto con indicadores de alarma por sobrellenado o vaciado[cite: 3].
* **`PumpNode.tsx` (Bombas Centrífugas y Dosificadoras):** Representa las bombas de trasvase con animación giratoria de rotor cuando están en funcionamiento. Emplea codificación cromática estándar industrial: verde (activa/en marcha), gris oscuro (detenida/standby) y rojo pulsante (falla o disparo de protección)[cite: 3].
* **`ValveNode.tsx` (Electroválvulas Solenoide):** Representa las válvulas de paso y desvío de fluidos con animación de apertura/cierre y cambio dinámico de estado cromático[cite: 3].
* **`MixerNode.tsx` (Agitador Industrial):** Modela el motor DC de paleta mezcladora en el bombo central, mostrando animación continua de rotación durante los ciclos de agitación temporizados de la receta[cite: 3].
* **`SensorNode.tsx` (Transmisores de Nivel y Flujo):** Módulos de lectura digital que exhiben en pantalla los valores numéricos normalizados de caudal (L/min) y nivel porcentual (%)[cite: 3].

### 13.2 Tuberías Dinámicas (Edges Reactivos) y Modales de Control
* **Flujo de Fluidos Animado:** Las interconexiones de tuberías (aristas/edges de React Flow) incorporan la propiedad reactiva `animated: true`. Un algoritmo de propagación de estado activa el desplazamiento visual de partículas CSS únicamente cuando las bombas impulsoras y las electroválvulas de la línea correspondiente se encuentran abiertas y activas[cite: 3].
* **Modales Operativos Parametrizados:** La interfaz desacopla la supervisión gráfica de la parametrización avanzada mediante modales especializados:
  * `ControlRecetaLiquidosModal.tsx`: Permite configurar dosificación de componentes A y B, tiempos de mezcla y consignas de producción[cite: 3].
  * `ControlReposicionModal.tsx`: Permite disparar la recarga controlada de tanques con tope porcentual de seguridad y parada de emergencia inmediata (`Freno Reposición`)[cite: 3].
  * `GestorComandosModal.tsx` y `ControlDinamicoModal.tsx`: Proveen consolas manuales para mantenimiento y accionamiento directo de actuadores por parte de usuarios con rango de autorización suficiente[cite: 3].
* **Integración Macro-Planta:** Mediante `VistaMacroPlanta.tsx`, el operador puede alternar entre la visión global de la planta (fábricas, secciones y líneas de proceso) y el gemelo digital P&ID focalizado en un sistema específico[cite: 3].

---

## 14. Planificación, Recetas e Inventario
* **Recetas:** `Receta` y `DetalleReceta` permiten parametrizar volúmenes y tiempos de mezclado[cite: 3].
* **Producción:** `OrdenProduccion` independiza la formulación de su ejecución física, admitiendo estados de progreso y auditoría[cite: 3].
* **Inventario:** `Inventario` e `ItemInventario` asocian existencias de insumos a plantas y secciones físicas[cite: 3].

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 11. Planificación de Producción - Gantt y Calendario**[cite: 3]  
> *Captura mostrando la programación de lotes en el diagrama de Gantt y el calendario operativo.*[cite: 3]

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 14. Gateway Raspberry Pi: Comunicación Serial y MQTT en Vivo**[cite: 3]  
> *Captura de la terminal de la Raspberry Pi corriendo el gateway y mostrando tramas seriales y publicaciones MQTT.*[cite: 3]

---

## 15. Seguridad, Credenciales y Acceso Remoto
* **Control de acceso:** Matriz jerárquica de rangos del 1 al 8 modelada en `Empleado`[cite: 3].
* **Broker MQTT:** Autenticación local mediante fichero `passwd`[cite: 3].
* **Acceso remoto:** Integración del túnel **Ngrok** en Docker Compose para exponer la interfaz web mediante HTTPS sin necesidad de abrir puertos (port forwarding) en el router local[cite: 3].

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 12. Matriz de Roles y Gestión de Credenciales**[cite: 3]  
> *Captura de la página Credenciales (`Credenciales.tsx`) mostrando la matriz de acceso por rangos 1-8 y usuarios Mosquitto.*[cite: 3]

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 13. Túnel Ngrok en Funcionamiento**[cite: 3]  
> *Captura del navegador accediendo a la URL pública HTTPS de Ngrok mostrando el frontend cargado remotamente.*[cite: 3]

---

## 16. Infraestructura de Virtualización y Despliegue
Docker Compose actúa como capa de orquestación[cite: 3]. El archivo `docker-compose.yml` define servicios independientes para PostgreSQL, backend, worker MQTT, frontend, Mosquitto y túnel Ngrok[cite: 3].

| Servicio Compose | Contenedor Docker | Puerto principal | Protocolo | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **frontend** | `scada_frontend`[cite: 3] | 5173:5173[cite: 3] | HTTP / WS[cite: 3] | Interfaz Web React (Vite dev server)[cite: 3] |
| **backend** | `scada_backend`[cite: 3] | 8000:8000[cite: 3] | HTTP / WS[cite: 3] | Django REST + Daphne ASGI (Channels)[cite: 3] |
| **db** | `scada_postgres`[cite: 3] | 5432:5432[cite: 3] | TCP[cite: 3] | PostgreSQL 15 (persistencia relacional)[cite: 3] |
| **mqtt_worker** | `scada_mqtt_worker`[cite: 3] | Interno (bridge)[cite: 3]| TCP[cite: 3] | Ingesta asíncrona y auto-descubrimiento[cite: 3] |
| **mosquitto** | `scada_mqtt_broker`[cite: 3] | 1883 / 9001[cite: 3] | MQTT / WS[cite: 3] | Eclipse Mosquitto con autenticación passwd[cite: 3] |
| **ngrok** | `scada_ngrok`[cite: 3] | Externo (cloud)[cite: 3]| HTTPS[cite: 3] | Túnel público Ngrok para acceso seguro remoto[cite: 3] |

![Figura 7. Stack de servicios con Docker Compose](Figura_7_Docker.png)[cite: 3]  
*Figura 7. Stack de servicios con Docker Compose.*[cite: 3]

> **[ESPACIO PARA INSERTAR IMAGEN] Figura 3. Stack Docker Compose en Ejecución**[cite: 3]  
> *Captura de terminal con `docker compose ps` mostrando los seis contenedores con estado `Up` y sus puertos expuestos.*[cite: 3]

---

## 17. Pruebas, Puesta en Marcha y Validación
Para verificar la integridad del flujo extremo a extremo se definió la siguiente batería de pruebas:

| ID | Ensayo de prueba | Resultado esperado | Capa evaluada |
| :--- | :--- | :--- | :--- |
| **T01** | Inicio serial de Arduino a 115200 baud[cite: 3] | Emisión de `ARDUINO_READY` y enlace estable[cite: 3] | Firmware[cite: 3] |
| **T02** | Desconexión/Reconexión de USB[cite: 3] | Gateway reabre el puerto y recupera conexión[cite: 3] | Gateway Python[cite: 3] |
| **T03** | Publicación de telemetría MQTT[cite: 3] | Worker recibe payload y decodifica JSON[cite: 3] | Broker / Worker[cite: 3] |
| **T04** | Tópico no registrado[cite: 3] | Auto-descubrimiento controlado en BD[cite: 3] | Worker / ORM[cite: 3] |
| **T05** | Nueva lectura de sensor[cite: 3] | Registro insertado en `LecturaSensor`[cite: 3] | PostgreSQL[cite: 3] |
| **T06** | Difusión WebSocket[cite: 3] | UI actualiza variables en tiempo real sin recargar[cite: 3] | Channels / React[cite: 3] |
| **T07** | Envío de comando desde UI[cite: 3] | Publicación MQTT y registro en auditoría[cite: 3] | API REST / MQTT[cite: 3] |
| **T08** | Caída temporal del broker MQTT[cite: 3] | Gateway almacena telemetría en SQLite local[cite: 3] | Gateway / Resiliencia[cite: 3] |
| **T09** | Cierre de navegador web[cite: 3] | El proceso físico en Arduino continúa operando[cite: 3] | Desacoplamiento[cite: 3] |
| **T10** | Detección de alarma[cite: 3] | Objeto `Alarma` creado y visible en interfaz[cite: 3] | Dominio SCADA[cite: 3] |

---

## 18. Evaluación Técnica y Trabajo Futuro

### Fortalezas
* Arquitectura modular y distribuida con responsabilidades bien delimitadas[cite: 3].
* Desacoplamiento efectivo mediante bus MQTT y WebSockets en tiempo real[cite: 3].
* Persistencia relacional sólida combinada con resiliencia perimetral en SQLite[cite: 3].
* Entorno totalmente reproducible con contenedores Docker[cite: 3].

### Mejoras futuras
* Implementación de almacenamiento de series temporales (TimescaleDB / InfluxDB) para históricos de larga duración[cite: 3].
* Cifrado TLS estricto en el broker Mosquitto (puerto 8883) y reglas ACL por tenant[cite: 3].
* Mecanismo de acuse de recibo físico (ACK) para comandos críticos en lugar del esquema fire-and-forget[cite: 3].

---

## 19. Conclusiones
El proyecto IC2–IC3 representa una evolución sustancial respecto de la maqueta inicial de IC1[cite: 3]. La incorporación de software distribuido y estándares modernos de comunicaciones transforma un automatismo local en una plataforma SCADA modular, escalable y accesible de forma remota[cite: 3].

Desde la perspectiva de Ingeniería en Computación, el valor principal radica en la integración interdisciplinaria: electrónica de control en Arduino, programación perimetral en Linux con Raspberry Pi, mensajería concurrente MQTT, persistencia transaccional en Django/PostgreSQL y desarrollo frontend reactivo con React y WebSockets[cite: 3].

---

## Referencias
* [1] Chiabo, F., Kuhn, L., Palomeque, M. (2024). *Trabajo Final IC1 – Proyecto Sistema SCADA*. UNRaf[cite: 3].
* [2] Repositorio del proyecto: [https://github.com/equipoPI/IC2-IC3](https://github.com/equipoPI/IC2-IC3)[cite: 3]
* [3] Documentación interna: `README.md`, `INSTALACION.md` y `docs/mqtt_spec.md`[cite: 3].
* [4] Estándar MQTT v5.0 / v3.1.1 OASIS Standard[cite: 3].

---

## Anexo A. Matriz de Responsabilidades de la Arquitectura
| Capa | Componente | Responsabilidad principal | No debería asumir |
| :--- | :--- | :--- | :--- |
| **Física** | Sensores y actuadores[cite: 3] | Medir y ejecutar acciones físicas[cite: 3] | Lógica de presentación web[cite: 3] |
| **Control** | Arduino Mega 2560[cite: 3] | Adquisición, temporización y control local[cite: 3] | Persistencia histórica central[cite: 3] |
| **Gateway** | Raspberry Pi 4[cite: 3] | Adaptación serial/MQTT, búfer local y diagnóstico[cite: 3] | Ser la fuente única de verdad del dominio[cite: 3] |
| **Mensajería** | Mosquitto[cite: 3] | Distribuir mensajes MQTT[cite: 3] | Implementar reglas de negocio[cite: 3] |
| **Ingesta** | mqtt_worker.py[cite: 3] | Interpretar topics/payloads y actualizar dominio[cite: 3] | Presentar interfaz[cite: 3] |
| **Negocio** | Django + DRF[cite: 3] | Validar, persistir, autorizar y exponer recursos[cite: 3] | Leer directamente el puerto serial[cite: 3] |
| **Tiempo real**| Django Channels[cite: 3] | Difundir eventos hacia clientes[cite: 3] | Reemplazar la persistencia[cite: 3] |
| **Presentación**| React + TypeScript[cite: 3] | Visualizar y solicitar acciones[cite: 3] | Acceder directamente a PostgreSQL/MQTT[cite: 3] |
| **Persistencia**| PostgreSQL[cite: 3] | Fuente central de datos[cite: 3] | Controlar actuadores[cite: 3] |