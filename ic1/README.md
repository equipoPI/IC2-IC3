# **_IC1_**
### Resumen:

El proyecto presentado corresponde al diseño e implementación de un sistema SCADA (Supervisión, Control y Adquisición de Datos) aplicado a una planta automatizada de producción de jugos. Este sistema combina hardware y software para optimizar procesos industriales, utilizando componentes como Arduino Mega 2560, sensores ultrasónicos, caudalímetros, bombas, y módulos Bluetooth para comunicación inalámbrica con una aplicación móvil.

# Proyecto
Dentro de este se encuentran las versiones del los códigos de Arduino, los archivos APK para las aplicaciones de celular y archivos .aia que se pueden cargar en la plataforma de "MIT APP INVENTOR" para realizarle modificaciones. Las versiones finales son:

### Versión final del codigo del arduino:
[Versión final del código del Arduino](https://github.com/equipoPI/IC1/tree/main/Proyecto/Programa/SCADA.V4)

### Versión final del APK:
[Versión final APK](https://github.com/equipoPI/IC1/blob/main/Proyecto/APKs%20y%20.aia/App_SCADAV3.apk)

### Versión final del .aia:
[Versión final del .aia](https://github.com/equipoPI/IC1/blob/main/Proyecto/APKs%20y%20.aia/App_SCADAV3.aia)

## Estructura del Proyecto

### **Organización de Carpetas:**

```
IC1/
├── README.md                           # Documentación principal del proyecto
├── Proyecto/                          # Contenido técnico del sistema SCADA
│   ├── Componentes y gastos inicio.xlsx    # Presupuesto y lista de materiales
│   ├── APKs y .aia/                   # Aplicaciones móviles
│   │   ├── App_SCADAV3.apk           # ✅ Aplicación final instalable
│   │   ├── App_SCADAV3.aia           # ✅ Código fuente MIT App Inventor
│   │   └── [otras versiones]          # Versiones anteriores del desarrollo
│   ├── diseño Eagle/                  # Esquemas electrónicos (Eagle CAD)
│   │   ├── Sistema SCADA.sch         # Esquemático principal
│   │   └── Sistema SCADA.s#*         # Archivos de respaldo
│   ├── diseño Proteus/                # Simulación y diseño (Proteus)
│   │   ├── Esquema de SCADA IC1.pdsprj # Proyecto principal
│   │   └── Project Backups/          # Respaldos automáticos
│   ├── Fotos del proyecto/            # Documentación visual
│   │   ├── Diagrama 1.png            # Diagrama de flujo del proceso
│   │   ├── IMG_*.jpg                 # Fotos del montaje físico
│   │   └── WhatsApp Image*.jpeg      # Imágenes del proyecto finalizado
│   ├── Librerias Eagle/               # Librerías personalizadas para Eagle
│   │   └── Arduino/                  # Componentes de Arduino
│   ├── Librerias Proteus/             # Librerías para simulación
│   │   └── HC 05/                    # Modelo del módulo Bluetooth
│   └── Programa/                      # Código fuente del Arduino
│       ├── Puesta_a_punto/           # Códigos de prueba individual
│       ├── SCADA.V1/ → SCADA.V3/     # Versiones de desarrollo
│       ├── SCADA.V4/                 # ✅ Versión final del código
│       │   ├── SCADA.V4.ino          # Archivo principal
│       │   ├── bluetooth.ino         # Comunicación inalámbrica
│       │   ├── control_bombas.ino    # Control de actuadores
│       │   ├── funcion_de_nivel.ino  # Sensores ultrasónicos
│       │   ├── funcion_de_caudal.ino # Caudalímetros
│       │   ├── control_mezcla.ino    # Automatización del proceso
│       │   ├── estadistica_filtros.ino # Filtrado de señales
│       │   └── funciones_de_monitoreo.ino # Depuración
│       └── Sistema_SCADA/            # Versión de desarrollo anterior
└── Redaccion Informe academico/       # Documentación académica
    ├── Trabajo Final IC1*.pdf        # ✅ Informe final (PDF)
    ├── Trabajo Final IC1*.docx       # ✅ Informe final (editable)
    ├── Manual del Usuario.docx       # Guía de uso del sistema
    ├── Ejemplos/                     # Referencias bibliográficas
    ├── gráficos/                     # Imágenes para el informe
    └── plantillas/                   # Plantillas de documentos
```

### **Archivos Clave del Proyecto:**
- **Código Arduino:** `Proyecto/Programa/SCADA.V4/SCADA.V4.ino`
- **App Móvil:** `Proyecto/APKs y .aia/App_SCADAV3.apk`
- **Esquemático:** `Proyecto/diseño Eagle/Sistema SCADA.sch`
- **Informe Final:** `Redaccion Informe academico/Trabajo Final IC1*.pdf`

## Estructura del Código Arduino

El código del sistema SCADA está organizado en múltiples archivos `.ino` para facilitar su mantenimiento y comprensión:

### **Archivo Principal: `SCADA.V4.ino`**
Contiene las declaraciones de variables globales, configuración inicial del sistema (`setup()`) y el bucle principal (`loop()`).

**Variables principales:**
- **Control de caudal:** `caudal_1`, `caudal_2`, `waterFlow1`, `waterFlow2`
- **Estado de bombas:** `bomba_1_encendida`, `bomba_2_encendida`
- **Control de tiempo:** `duracion_horas`, `duracion_minutos`, `tiempo_transcurrido`
- **Comunicación:** Variables para Bluetooth y estados del proceso

### **Módulos Funcionales:**

#### `bluetooth.ino`
- **Función:** Manejo de comunicación inalámbrica con la aplicación móvil
- **Funciones principales:**
  - `lectura()`: Interpreta comandos desde la app (F=frenar, R=reposición, M=mezcla)
  - `obtencionEntero()`: Decodifica valores numéricos recibidos
  - `envio()`: Transmite datos de sensores y estado del sistema

#### `control_bombas.ino`
- **Función:** Control de bombas y electroválvulas
- **Funciones principales:**
  - `frenadoReposicion()`: Parada de emergencia del sistema de reposición
  - `llamadaRepo()`: Decodifica comandos de reposición (formato: bombo + cantidad)
  - Control de bombas DC y AC mediante relés

#### `funcion_de_nivel.ino`
- **Función:** Medición de niveles usando sensores ultrasónicos HC-SR04
- **Algoritmo:** 
  - Cicla entre 3 sensores (tanques de ingredientes y mezcla)
  - Calcula distancia usando tiempo de vuelo de ondas ultrasónicas
  - Convierte distancia a porcentaje de llenado

#### `funcion_de_caudal.ino`
- **Función:** Medición de flujo de líquidos
- **Características:**
  - Utiliza interrupciones para contar pulsos de caudalímetros
  - Calcula caudal en L/min basado en frecuencia de pulsos
  - Integra volumen total transferido

#### `control_mezcla.ino`
- **Función:** Automatización del proceso de mezclado
- **Secuencia:**
  1. Dosificación de ingredientes según proporciones
  2. Control de tiempo de mezcla
  3. Gestión de pausas y reanudación del proceso

#### `estadistica_filtros.ino`
- **Función:** Filtrado y suavizado de señales de sensores
- **Técnicas:**
  - Promedio móvil para reducir ruido
  - Filtro exponencial (factor α = 0.5)
  - Eliminación de valores atípicos

#### `funciones_de_monitoreo.ino`
- **Función:** Visualización de variables para depuración
- **Salida:** Estado de variables críticas por puerto serie

## Funcionamiento del Sistema

### **1. Inicialización (`setup()`)**
- Configuración de pines (sensores, bombas, electroválvulas)
- Inicialización de comunicación Bluetooth (9600 baud)
- Configuración de interrupciones para caudalímetros
- Estado inicial: todas las bombas apagadas (relés en HIGH)

### **2. Bucle Principal (`loop()`)**
El sistema ejecuta cíclicamente:
1. **Lectura de sensores** (cada 100ms)
2. **Procesamiento de comandos Bluetooth**
3. **Control de procesos activos**
4. **Envío de datos** a la aplicación móvil
5. **Monitoreo y estadísticas**

### **3. Proceso de Producción**
1. **Reposición:** Llenado automático de tanques hasta nivel programado
2. **Dosificación:** Transferencia de cantidades exactas según receta
3. **Mezclado:** Agitación durante tiempo programado con posibilidad de pausa/reanudación
4. **Vaciado:** Descarga del producto terminado

### **4. Comunicación Bluetooth**
**Protocolo de comandos:**
- `F`: Parada de emergencia
- `R + número`: Reposición (formato: bombo[1-2] + cantidad[0-100])
- `M + número`: Proceso de mezcla con parámetros
- Envío continuo de telemetría: niveles, caudales, tiempos restantes

## Hardware del Sistema

### **Componentes Principales:**
- **Microcontrolador:** Arduino Mega 2560
- **Comunicación:** Módulo Bluetooth HC-05
- **Sensores de nivel:** 3x HC-SR04 (ultrasónicos)
- **Caudalímetros:** 2x sensores de flujo con salida de pulsos
- **Actuadores:** 
  - Bombas DC (12V) para transferencia de líquidos
  - Bomba AC para reposición desde camión cisterna
  - Motor de mezclado
  - Electroválvulas para control de flujo
- **Control de potencia:** Módulo de relés de 8 canales

### **Conexiones:**
- **Pines 2-3:** Interrupciones para caudalímetros
- **Pines 4-10, 13:** Control de bombas y electroválvulas
- **Pines 11-12:** Comunicación Bluetooth
- **Pines 16-21:** Sensores ultrasónicos (trigger y echo)

## Aplicación Móvil (MIT App Inventor)

La aplicación móvil permite:
1. **Monitoreo en tiempo real:** Visualización de niveles de tanques y caudales
2. **Control remoto:** Inicio/pausa/parada de procesos
3. **Configuración de recetas:** Definición de proporciones y tiempos
4. **Interfaz de reposición:** Control manual de llenado de tanques
5. **Alertas:** Notificaciones de eventos críticos y finalización de procesos

**Archivos disponibles:**
- `App_SCADAV3.apk`: Aplicación instalable
- `App_SCADAV3.aia`: Código fuente editable en MIT App Inventor

## Recursos Adicionales del Proyecto

### **Documentación Visual:**
- **Fotos del montaje:** Registro fotográfico completo del proceso de construcción y resultado final
- **Diagramas:** Esquemas de flujo del proceso de producción de jugos
- **Imágenes actualizadas:** Se incluyen fotos recientes del proyecto finalizado (2024)

### **Diseño Electrónico:**
- **Eagle CAD:** Esquemas detallados del circuito y PCB
  - Librerías personalizadas para componentes de Arduino
  - Conexionado completo del sistema
- **Proteus:** Simulación del circuito para validación previa
  - Modelos de componentes específicos (HC-05, sensores)
  - Respaldos de proyecto para seguridad

### **Desarrollo de Software:**
- **Códigos de prueba:** Rutinas individuales para validar cada componente
- **Evolución del proyecto:** Historial completo desde V1 hasta V4
- **Sistema de depuración:** Herramientas de monitoreo y diagnóstico

### **Presupuesto y Materiales:**
- **Excel de gastos:** Detalle completo de costos del proyecto
- **Lista de componentes:** Especificaciones técnicas y proveedores

### **Informe Académico:**
- **Manual de usuario:** Guía completa para operación del sistema
- **Referencias bibliográficas:** Documentación técnica de apoyo
- **Plantillas:** Formatos institucionales utilizados

![Logo de GitHub](https://github.com/equipoPI/IC1/blob/main/Proyecto/Fotos%20del%20proyecto/IMG-20230318-WA0009.jpg)

<p align="center">
  <img src="https://github.com/equipoPI/IC1/blob/main/Proyecto/Fotos%20del%20proyecto/Diagrama%201.png" alt="Descripción de la imagen" />
</p>

# Redaccion de Informe Académico
Todas las referencias para la redaccion de imforme académico y las diferentes versiones del mismo se encuentran en este apartado, la versión final del mismo esta disponible en formato PDF y en formato editable.

### Informe Académico finalizado, formato PDF:
[Informe Académico finalizado en PDF](https://github.com/equipoPI/IC1/blob/main/Redaccion%20Informe%20academico/Trabajo%20Final%20IC1-%20Chiabo%2C%20Kuhn%2C%20Palomeque.pdf)

### Informe Académico finalizado, formato editable:
[Informe Académico editable](https://github.com/equipoPI/IC1/blob/main/Redaccion%20Informe%20academico/Trabajo%20Final%20IC1-%20Chiabo%2C%20Kuhn%2C%20Palomeque.docx)
