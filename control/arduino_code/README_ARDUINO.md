# Sistema SCADA - Código Arduino

## Descripción General

Este código Arduino es la versión adaptada del sistema SCADA original para funcionar con comunicación Serial (USB) hacia Raspberry Pi, reemplazando la comunicación Bluetooth del sistema original.

**Migración**: Bluetooth HC-05 (9600 baud) → Serial USB (115200 baud)

## ⚠️ IMPORTANTE: Funcionalidades Completas Preservadas

Este código mantiene **TODAS** las funcionalidades del sistema original:

### 1. Control de Nivel (3 Sensores Ultrasónicos)
- **Pines**: 16-21 (Trigger: 16,18,20 | Echo: 17,19,21)
- **Función**: `nivel()`
- **Características**:
  - Lectura secuencial de 3 depósitos
  - Conversión distancia → porcentaje (27cm vacío, 6cm lleno)
  - Filtrado estadístico con media móvil (15 muestras)

### 2. Control de Caudal (2 Caudalímetros)
- **Pines**: D2 y D3 (interrupciones)
- **Funciones**: `pulse1()`, `pulse2()`, `caudal()`
- **Características**:
  - Medición con caudalímetros 1/2" (450 pulsos/litro)
  - Acumulación independiente de líquido 1 y líquido 2
  - Interrupción por hardware para precisión

### 3. Control de Reposición
- **Actuadores**: 
  - Bomba camión (Pin 9)
  - Electroválvula Bombo 1 (Pin 10)
  - Electroválvula Bombo 2 (Pin 8)
- **Función**: `activacion()` - sección reposición
- **Características**:
  - Reposición automática hasta nivel objetivo
  - Códigos: 1000-1100 (Bombo 1), 2000-2100 (Bombo 2)
  - Parada de emergencia con comando 'F'
  - Detección de errores (código 722)

### 4. Control de Proceso de Mezcla
- **Actuadores**:
  - Bomba depósito 1 (Pin 5)
  - Bomba depósito 2 (Pin 6)
  - Motor mezclador (Pin 7)
  - Bomba vaciado (Pin 4)
- **Funciones**: `activacion()` - sección mezcla
- **Características**:
  - Transferencia secuencial de líquidos
  - Mezclado intermitente (5s ON / 2s OFF)
  - Control de tiempo programable
  - Función de vaciado/descarte

### 5. Comunicación Bidireccional
- **Transmisión**: 17 campos CSV cada 1 segundo
- **Recepción**: 9 comandos diferentes
- **Puerto**: Serial (USB) a 115200 baud

## Arquitectura del Código

```
Sistema_SCADA_Serial.ino (ARCHIVO ÚNICO)
│
├── Declaración de Variables Globales
│   ├── Temporización (tiempoEnvio, previousMillis, etc.)
│   ├── Comunicación (valor, estado, flagTransmicion, etc.)
│   ├── Estados Actuadores (EBomba1, EMezclador, etc.)
│   ├── Nivel (distancia1-3, porcentajes, etc.)
│   ├── Estadística (readings1-3[15], average1-3, etc.)
│   └── Caudal (waterFlow1-2, Ingrediente1-2, etc.)
│
├── setup()
│   ├── Inicialización Serial (115200 baud)
│   ├── Configuración pines sensores (16-21)
│   ├── Configuración pines actuadores (4-10, 13)
│   ├── Configuración interrupciones (D2, D3)
│   ├── Inicialización buffers estadísticos
│   └── Configuración Timer5 (250ms)
│
├── loop() [Ciclo principal]
│   ├── monitoreo() - Debug opcional (cada 2s)
│   ├── nivel() - Lectura sensores
│   ├── filtrado() - Procesamiento estadístico
│   ├── enviarValores() - Transmisión datos (cada 1s)
│   ├── activacion() - Control completo de procesos
│   └── caudal() - Actualización variables
│
└── Funciones Auxiliares
    ├── nivel() - Lee 3 sensores ultrasónicos
    ├── filtrado() - Media móvil 15 muestras
    ├── pulse1() - ISR caudalímetro 1
    ├── pulse2() - ISR caudalímetro 2
    ├── caudal() - Actualiza cantidad1/cantidad2
    ├── frenadoReposicion() - Parada emergencia
    ├── activacion() - Control bombas/mezcla/reposición
    ├── enviarValores() - Transmisión CSV
    ├── lectura() - ISR Timer5 - Recepción comandos
    ├── obtencionEntero() - Parser valores numéricos
    └── monitoreo() - Debugging
```

## Protocolo de Comunicación

### Datos Transmitidos (CSV - cada 1 segundo)

```
average1,porcentaje1,average2,porcentaje2,average3,porcentaje3,caudal1,caudal2,bomba1,bomba2,bombaM,mezclador,bombaR,error,horaRest,minRest,proceso
```

**Ejemplo**:
```
12.5,45,15.3,60,10.2,80,25.5,30.2,1,0,0,1,0,0,2,30,1
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| average1 | float | Distancia promedio tanque 1 (cm) |
| porcentaje1 | byte | Nivel tanque 1 (0-100%) |
| average2 | float | Distancia promedio tanque 2 (cm) |
| porcentaje2 | byte | Nivel tanque 2 (0-100%) |
| average3 | float | Distancia promedio tanque 3 (cm) |
| porcentaje3 | byte | Nivel tanque 3 (0-100%) |
| caudal1 | float | Litros acumulados líquido 1 |
| caudal2 | float | Litros acumulados líquido 2 |
| bomba1 | byte | Estado bomba depósito 1 (0/1) |
| bomba2 | byte | Estado bomba depósito 2 (0/1) |
| bombaM | byte | Estado bomba mezcla (0/1) |
| mezclador | byte | Estado motor mezclador (0/1) |
| bombaR | byte | Estado bomba reposición (0/1) |
| error | int | Código de error (0=OK, 722=nivel alcanzado) |
| horaRest | int | Horas restantes de mezcla |
| minRest | int | Minutos restantes de mezcla |
| proceso | byte | Estado proceso (0=detenido, 1=transferencia, 2=mezclando) |

### Comandos Recibidos

| Comando | Formato | Descripción | Ejemplo |
|---------|---------|-------------|---------|
| **R** | R{bombo}{valor} | Reposición a nivel objetivo | `R1050` = Bombo 1 al 50% |
| **F** | F | Frenar reposición (emergencia) | `F` |
| **C** | C{valor} | Configurar ingrediente 1 (10000+litros*1000) | `C12500` = 2.5L |
| **c** | c{valor} | Configurar ingrediente 2 (20000+litros*1000) | `c23200` = 3.2L |
| **H** | H{valor} | Establecer horas de mezcla | `H2` |
| **h** | h{valor} | Establecer minutos de mezcla | `h30` |
| **A** | A | Activar/Continuar mezcla | `A` |
| **D** | D | Detener proceso | `D` |
| **V** | V | Vaciar bombo de mezcla | `V` |
| **X** | X | Desechar producción | `X` |
| **T** | T | Activar transmisión | `T` |

**Notas sobre comandos**:
- **Reposición**: Rango 1000-1100 (Bombo 1), 2000-2100 (Bombo 2)
  - Ejemplo: `R1075` → Bombo 1 al 75%
  - Ejemplo: `R2040` → Bombo 2 al 40%
- **Ingredientes**: Codificación especial
  - Ingrediente1: 10000 + (litros × 1000)
  - Ingrediente2: 20000 + (litros × 1000)
  - Ejemplo: 2.5L → `C12500` o `c22500`

## Mapeo de Hardware

### Sensores

| Sensor | Tipo | Pines | Variable de Salida |
|--------|------|-------|-------------------|
| Nivel Tanque 1 | HC-SR04 | Trig:16, Echo:17 | distancia1, constrainedPorcentaje1 |
| Nivel Tanque 2 | HC-SR04 | Trig:18, Echo:19 | distancia2, constrainedPorcentaje2 |
| Nivel Tanque 3 | HC-SR04 | Trig:20, Echo:21 | distancia3, constrainedPorcentaje3 |
| Caudalímetro 1 | YF-S201 | D2 (INT) | waterFlow1, cantidad1 |
| Caudalímetro 2 | YF-S201 | D3 (INT) | waterFlow2, cantidad2 |

### Actuadores

| Actuador | Tipo | Pin | Variable de Control | Lógica |
|----------|------|-----|---------------------|--------|
| Bomba Depósito 1 | Relé DC | 5 | EBomba1 | LOW=ON, HIGH=OFF |
| Bomba Depósito 2 | Relé DC | 6 | EBomba2 | LOW=ON, HIGH=OFF |
| Bomba Mezcla | Relé DC | 4 | EBombaM | LOW=ON, HIGH=OFF |
| Motor Mezclador | Relé DC | 7 | EMezclador | LOW=ON, HIGH=OFF |
| Bomba Reposición | Relé AC | 9 | EBombaR | LOW=ON, HIGH=OFF |
| Electroválvula Bombo 1 | Relé | 10 | EValvula1 | LOW=ON, HIGH=OFF |
| Electroválvula Bombo 2 | Relé | 8 | EValvula2 | LOW=ON, HIGH=OFF |

**Nota**: Todos los relés son activos bajos (LOW=activado, HIGH=desactivado)

## Lógica de Filtrado

El sistema implementa un filtro de media móvil sobre 15 muestras para reducir ruido en sensores ultrasónicos:

```cpp
// Pseudocódigo
total = total - readings[oldestIndex]
readings[currentIndex] = newReading
total = total + readings[currentIndex]
average = total / 15

porcentaje = map(average, 27, 6, 0, 100)  // 27cm=vacío, 6cm=lleno
porcentaje = constrain(porcentaje, 0, 100)
```

## Lógica de Proceso de Mezcla

### Fase 1: Transferencia de Líquidos

```
1. Usuario envía C{valor1} y c{valor2} → Ingrediente1, Ingrediente2
2. Usuario envía A → continuar=1
3. Si cantidad1 < liquido1 → Bomba1 ON
4. Cuando cantidad1 >= liquido1 → Bomba1 OFF, terminoLlenadoLiquido1=1
5. Si terminoLlenadoLiquido1==1 y cantidad2 < liquido2 → Bomba2 ON
6. Cuando cantidad2 >= liquido2 → Bomba2 OFF, terminoLlenadoLiquido2=1
7. Si ambos terminaron → activarMezcla=1
```

### Fase 2: Mezclado Intermitente

```
1. activarMezcla=1 → Motor ON por 5 segundos
2. Motor OFF por 2 segundos
3. Repetir ciclo hasta que se envíe comando D
4. Control de tiempo: TiempoHor * 3600000 + TiempoMin * 60000 (ms)
```

### Fase 3: Vaciado

```
1. Usuario envía V → vaciar=1
2. BombaM ON → vacía el tanque de mezcla
3. Usuario envía D → detener=1 → BombaM OFF
```

## Diferencias con el Sistema Original

| Aspecto | Sistema Original | Sistema Nuevo |
|---------|-----------------|---------------|
| Comunicación | SoftwareSerial (BT) | Serial (USB) |
| Pines BT | 11 (RX), 12 (TX) | - (liberados) |
| Velocidad | 9600 baud | 115200 baud |
| Separador CSV | `\|` (pipe) | `,` (coma) |
| Puerto de comunicación | BT | RASPBERRY_SERIAL |
| Librería Bluetooth | SoftwareSerial.h | - (eliminada) |
| Init delay BT | 1000ms | - (eliminado) |
| Estructura de código | 8 archivos .ino | 1 archivo .ino (completo) |

**IMPORTANTE**: Toda la lógica de control, sensores, actuadores y algoritmos se mantiene IDÉNTICA al sistema original.

## Compilación y Carga

### Requisitos

- **IDE**: Arduino IDE 1.8.x o superior
- **Placa**: Arduino Uno/Mega (Mega recomendado)
- **Librería**: TimerFive (instalar desde Library Manager)

### Pasos

1. Abrir `Sistema_SCADA_Serial.ino` en Arduino IDE
2. Instalar librería TimerFive: `Sketch > Include Library > Manage Libraries > TimerFive`
3. Seleccionar placa: `Tools > Board > Arduino Mega 2560` (o Arduino Uno)
4. Seleccionar puerto: `Tools > Port > COM X` (donde esté conectado)
5. Compilar: `Sketch > Verify/Compile`
6. Cargar: `Sketch > Upload`

### Verificación

Abrir el Serial Monitor (115200 baud) y verificar mensajes:
```
ARDUINO_READY
SYSTEM_INITIALIZED
```

Luego deberías ver datos CSV llegando cada segundo.

## Integración con Raspberry Pi

### Conexión Física

```
Arduino Mega ----USB----> Raspberry Pi 4
    |
    +-- /dev/ttyUSB0 o /dev/ttyACM0
```

### Script Python de Prueba

```python
import serial
import time

# Conectar al Arduino
ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=1)
time.sleep(2)  # Esperar reset de Arduino

# Leer datos
while True:
    if ser.in_waiting > 0:
        line = ser.readline().decode('utf-8').strip()
        if ',' in line:  # Es un dato CSV
            campos = line.split(',')
            print(f"Nivel1: {campos[1]}%, Nivel2: {campos[3]}%, Nivel3: {campos[5]}%")
    time.sleep(0.1)

# Enviar comando de reposición
def reposicion_bombo1_50():
    ser.write(b'R1050\n')  # Bombo 1 al 50%

# Enviar comando de mezcla
def iniciar_mezcla(litros1, litros2, horas, minutos):
    codigo1 = 10000 + int(litros1 * 1000)
    codigo2 = 20000 + int(litros2 * 1000)
    
    ser.write(f'C{codigo1}\n'.encode())
    time.sleep(0.1)
    ser.write(f'c{codigo2}\n'.encode())
    time.sleep(0.1)
    ser.write(f'H{horas}\n'.encode())
    time.sleep(0.1)
    ser.write(f'h{minutos}\n'.encode())
    time.sleep(0.1)
    ser.write(b'A\n')  # Activar
```

## Troubleshooting

### Problema: No se reciben datos

**Solución**:
1. Verificar que el LED TX del Arduino parpadee cada segundo
2. Verificar puerto Serial en Raspberry: `ls /dev/tty*`
3. Verificar permisos: `sudo chmod 666 /dev/ttyUSB0`
4. Verificar baudrate en Python: `115200`

### Problema: Comandos no funcionan

**Solución**:
1. Verificar formato: `R1050` (sin espacios ni saltos de línea extra)
2. Usar `\n` al final de cada comando
3. Esperar 30ms entre comando y valor (`delay(30)` en `obtencionEntero()`)

### Problema: Lecturas de nivel erráticas

**Solución**:
1. Verificar conexión de sensores ultrasónicos
2. Aumentar NUM_READINGS para más filtrado (actualmente 15)
3. Verificar que los sensores no estén apuntando a superficies anguladas

### Problema: Caudalímetros no cuentan

**Solución**:
1. Verificar conexión en pines D2 y D3
2. Verificar que los caudalímetros estén generando pulsos (LED de caudalímetro)
3. Verificar `attachInterrupt()` en setup()

## Seguridad

### Paradas de Emergencia

- **Comando F**: Detiene inmediatamente la reposición
- **Comando D**: Detiene el proceso de mezcla
- Todas las bombas se apagan al reiniciar el Arduino (estado inicial HIGH)

### Detección de Errores

- **Error 722**: Nivel ya alcanzado en reposición
- Verificar que `valorMaxReposicion > porcentajeActual` antes de iniciar

## Mantenimiento

### Calibración de Sensores Ultrasónicos

Ajustar los valores en la función `filtrado()`:

```cpp
Fporcentaje1 = map(average1, 27, 6, 0, 100);
//                           ^^  ^
//                           |   |
//                           |   +-- Distancia con tanque lleno (cm)
//                           +------ Distancia con tanque vacío (cm)
```

Medir la distancia real con tanque vacío y lleno, y ajustar estos valores.

### Calibración de Caudalímetros

Ajustar el factor de conversión en las funciones de interrupción:

```cpp
void pulse1() {
  waterFlow1 += 1.0 / 450;  // 450 pulsos/litro para YF-S201 1/2"
}
```

Para otros caudalímetros:
- YF-S401: 1/330 (5~150 L/min)
- YF-S201: 1/450 (1~30 L/min) ← **ACTUAL**
- YF-B1: 1/96 (0.3~6 L/min)

### Tiempos de Mezclado

Ajustar en el código:

```cpp
unsigned long TiempoMotorOn = 5000;   // 5 segundos ON
unsigned long TiempoMotorOff = 2000;  // 2 segundos OFF
```

## Licencia

Este código es parte del proyecto SCADA para control de procesos industriales.
Desarrollado para la materia Instrumentación y Control 2 y 3.

**Autor**: [Tu nombre]  
**Institución**: [Tu institución]  
**Fecha**: 2024

---

## Referencias

- [Datasheet HC-SR04](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf)
- [Datasheet YF-S201](https://www.hobbytronics.co.uk/datasheets/yf-s201-flow-sensor.pdf)
- [TimerFive Library](https://github.com/PaulStoffregen/TimerFive)
- Sistema SCADA Original: `d:\Escuela\Proyectos\IC2-IC3\ic1\Proyecto\Programa\Sistema_SCADA\`
