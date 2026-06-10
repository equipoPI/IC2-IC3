/*
 * Sistema SCADA - Versión con comunicación Serial para Raspberry Pi
 * 
 * Migración del sistema original que usaba Bluetooth (HC-05)
 * Ahora usa comunicación Serial nativa (USB) con Raspberry Pi
 * 
 * CAMBIOS PRINCIPALES:
 * - Reemplaza SoftwareSerial(BT) por Serial para comunicación con Raspberry
 * - Mantiene TODA la lógica de sensores, actuadores y control
 * - Optimiza la velocidad de comunicación (115200 baud vs 9600 baud)
 * - Mantiene compatibilidad con el protocolo original
 * 
 * FUNCIONALIDADES COMPLETAS:
 * - Control de 3 sensores ultrasónicos de nivel
 * - 2 Caudalímetros con interrupciones
 * - Control de bombas de reposición
 * - Sistema de mezcla con motor intermitente
 * - Filtrado estadístico de mediciones
 * - Control de electroválvulas
 */

#include <TimerFive.h>

// ============================================================
// CONFIGURACIÓN DE COMUNICACIÓN SERIAL
// ============================================================

// Usar Serial nativo para comunicación con Raspberry Pi
#define RASPBERRY_SERIAL Serial
#define BAUD_RATE 115200  // Mayor velocidad que Bluetooth (antes 9600)

// ============================================================
// VARIABLES GLOBALES - TEMPORIZACIÓN
// ============================================================

unsigned long tiempoEnvio = 0;
unsigned long tiempoMonitoreo = 0;
unsigned long TInicioMezclado = 0;
unsigned long previousMillis = 0;
unsigned long TiempoMotorOn = 5000;
unsigned long TiempoMotorOff = 2000;

// ============================================================
// VARIABLES GLOBALES - COMUNICACIÓN
// ============================================================

int g = 0;
char valor = 'F';
String estado;
byte flagTransmicion = 1;
byte continuar = 0;

// Variables de recepción desde Raspberry
int convinacion = 0;
int bomboSeleccionado = 0;
int valorMaxReposicion = 0;
byte activarMezcla = 0;
byte vaciar = 0;

// ============================================================
// VARIABLES GLOBALES - ESTADOS DE MOTORES/ACTUADORES
// ============================================================

byte flagParadaR = 0;  // Controla el parado de emergencia de la reposición
byte flagR = 0;        // Detecta si los niveles que se envían son para Reposición
byte flagM = 0;        // Detecta si los niveles que se envían son para Mezcla
byte EMezclador = 0;
byte EBomba1 = 0;
byte EBomba2 = 0;
byte EBombaM = 0;
byte EBombaR = 0;
byte EValvula1 = 0;
byte EValvula2 = 0;
byte EProceso = 0;
byte EBomboM = 0;
int horaRest = 0;
int minRest = 0;
int error = 0;
byte desechar = 0;
byte arranque2 = 0;
byte detener = 0;

// ============================================================
// VARIABLES GLOBALES - CONTROL DE NIVEL
// ============================================================

int i = 0;
int x = 25;
int bandera1 = 0;
float alpha = 0.5;  // Factor de suavizado, entre 0 y 1 para reducir oscilación sensores

// Pines de control de los sensores ultrasónicos
int trig = 16;
int eco = 17;

// Variables de medición
float duracion;
float distancia;
float distancia1;
float distancia2;
float distancia3;
byte constrainedPorcentaje1 = 0;
byte constrainedPorcentaje2 = 0;
byte constrainedPorcentaje3 = 0;

// Mediciones filtradas
byte Fporcentaje1 = 0;
byte Fporcentaje2 = 0;
byte Fporcentaje3 = 0;

// ============================================================
// VARIABLES GLOBALES - ESTADÍSTICA/FILTRADO
// ============================================================

#define NUM_READINGS 15  // Número de lecturas a promediar

float readings1[NUM_READINGS];
float readings2[NUM_READINGS];
float readings3[NUM_READINGS];
int readIndex = 0;
float total1 = 0;
float total2 = 0;
float total3 = 0;
float average1 = 0;
float average2 = 0;
float average3 = 0;

// ============================================================
// VARIABLES GLOBALES - CONTROL DE CAUDAL
// ============================================================

volatile double waterFlow1;
volatile double waterFlow2;
double Ingrediente1 = 0;
double Ingrediente2 = 0;
double cantidad1 = 0;
double cantidad2 = 0;
double liquido1 = 0;
double liquido2 = 0;
int bandera_c = 1;
byte terminoLlenadoLiquido1 = 0;
byte terminoLlenadoLiquido2 = 0;

// ============================================================
// VARIABLES GLOBALES - TIEMPO DE MEZCLA
// ============================================================

int TiempoHor = 0;
int TiempoMin = 0;
long TiempoHorUso = 0;
long TiempoMinUso = TiempoMin * 60000;
byte MotorOn = 1;
byte MotorOff = 0;


// ============================================================
// SETUP
// ============================================================

void setup() {
  // Configuración puerto serie para comunicación con Raspberry Pi
  RASPBERRY_SERIAL.begin(BAUD_RATE);
  RASPBERRY_SERIAL.println("ARDUINO_READY");

  // ============================================================
  // CONFIGURACIÓN PINES SENSORES ULTRASÓNICOS (NIVEL)
  // ============================================================
  
  pinMode(17, INPUT);   // Echo
  pinMode(19, INPUT);
  pinMode(21, INPUT);
  pinMode(16, OUTPUT);  // Trigger
  pinMode(18, OUTPUT);
  pinMode(20, OUTPUT);

  // ============================================================
  // CONFIGURACIÓN PINES ACTUADORES
  // ============================================================
  
  // Bombas DC y motor mezclador
  pinMode(4, OUTPUT);  // Bomba depósito mezcla
  pinMode(5, OUTPUT);  // Bomba depósito 2
  pinMode(6, OUTPUT);  // Bomba depósito 1
  pinMode(7, OUTPUT);  // Motor mezclador
  
  // Bomba AC y electroválvulas
  pinMode(8, OUTPUT);   // Electroválvula bombo 2
  pinMode(9, OUTPUT);   // Bomba camión (reposición)
  pinMode(10, OUTPUT);  // Electroválvula bombo 1
  pinMode(13, OUTPUT);  // Reservado

  // Estado inicial: todo apagado (HIGH = OFF para relés activos bajos)
  digitalWrite(4, HIGH);   // Bomba depósito mezcla OFF
  digitalWrite(5, HIGH);   // Bomba depósito 1 OFF
  digitalWrite(6, HIGH);   // Bomba depósito 2 OFF
  digitalWrite(7, HIGH);   // Mezclador OFF
  digitalWrite(8, HIGH);   // Electroválvula bombo 2 OFF
  digitalWrite(9, HIGH);   // Bomba camión OFF
  digitalWrite(10, HIGH);  // Electroválvula bombo 1 OFF
  digitalWrite(13, LOW);   // No utilizado

  // ============================================================
  // CONFIGURACIÓN CAUDALÍMETROS (INTERRUPCIONES)
  // ============================================================
  
  waterFlow1 = 0;
  waterFlow2 = 0;
  
  attachInterrupt(digitalPinToInterrupt(2), pulse1, RISING);
  attachInterrupt(digitalPinToInterrupt(3), pulse2, RISING);

  // ============================================================
  // INICIALIZACIÓN BUFFERS ESTADÍSTICOS
  // ============================================================
  
  for (int K = 0; K < NUM_READINGS; K++) {
    readings1[K] = 0;
    readings2[K] = 0;
    readings3[K] = 0;
  }

  // ============================================================
  // CONFIGURACIÓN TIMER PARA LECTURA DE COMANDOS
  // ============================================================
  
  Timer5.initialize(250000);        // 250 ms = 0.25 segundos
  Timer5.attachInterrupt(lectura);  // Función que lee comandos desde Raspberry
  
  RASPBERRY_SERIAL.println("SYSTEM_INITIALIZED");
}


// ============================================================
// LOOP PRINCIPAL
// ============================================================

void loop() {
  // Monitoreo interno (opcional, para debugging)
  if ((tiempoMonitoreo + 2000) <= millis()) {
    // monitoreo();  // Descomentar para debug por Serial
    tiempoMonitoreo = millis();
  }

  // Control de nivel de depósitos
  nivel();      // Lee los 3 sensores ultrasónicos
  filtrado();   // Aplica filtrado estadístico

  // Envío de datos a Raspberry Pi cada 1 segundo
  if ((tiempoEnvio + 1000) <= millis()) {
    enviarValores();
    tiempoEnvio = millis();
  }

  // Control de procesos
  activacion();  // Control de bombas de reposición y mezcla
  caudal();      // Actualiza variables de caudal
}


// ============================================================
// FUNCIÓN: nivel()
// Descripción: Lee los 3 sensores ultrasónicos de nivel
// ============================================================

void nivel() {
  while (i <= 3) {
    digitalWrite(trig, HIGH);
    delayMicroseconds(5);
    digitalWrite(trig, LOW);
    duracion = pulseIn(eco, HIGH);
    distancia = duracion / 58.2;  // Conversión a cm según datasheet
    
    if (i == 0) {
      distancia2 = distancia;
    }
    if (i == 1) {
      distancia3 = distancia;
    }
    if (i == 2) {
      distancia1 = distancia;
    }
    
    trig = trig + 2;
    eco = eco + 2;
    i = i + 1;
  }
  
  // Resetear variables para próxima lectura
  i = 0;
  trig = 16;
  eco = 17;
}


// ============================================================
// FUNCIÓN: filtrado()
// Descripción: Aplica filtrado estadístico de media móvil
// ============================================================

void filtrado() {
  // Restar la lectura más antigua de la suma total
  total1 = total1 - readings1[readIndex];
  total2 = total2 - readings2[readIndex];
  total3 = total3 - readings3[readIndex];

  // Guardar los valores de distancia
  readings1[readIndex] = distancia1;
  readings2[readIndex] = distancia2;
  readings3[readIndex] = distancia3;

  // Añadir la nueva lectura a la suma total
  total1 = total1 + readings1[readIndex];
  total2 = total2 + readings2[readIndex];
  total3 = total3 + readings3[readIndex];

  // Avanzar al próximo índice
  readIndex = readIndex + 1;

  // Si llegamos al final del arreglo, volver al inicio
  if (readIndex >= NUM_READINGS) {
    readIndex = 0;
  }

  // Calcular el promedio
  average1 = total1 / NUM_READINGS;
  average2 = total2 / NUM_READINGS;
  average3 = total3 / NUM_READINGS;

  // Mapear distancia a porcentaje (27cm = vacío, 6cm = lleno)
  Fporcentaje1 = map(average1, 27, 6, 0, 100);
  Fporcentaje2 = map(average2, 27, 6, 0, 100);
  Fporcentaje3 = map(average3, 27, 6, 0, 100);

  // Limitar el valor para que no se pase de 0-100
  constrainedPorcentaje1 = constrain(Fporcentaje1, 0, 100);
  constrainedPorcentaje2 = constrain(Fporcentaje2, 0, 100);
  constrainedPorcentaje3 = constrain(Fporcentaje3, 0, 100);
}


// ============================================================
// FUNCIÓN: pulse1()
// Descripción: Interrupción para caudalímetro 1
// ============================================================

void pulse1() {
  waterFlow1 += 1.0 / 450;  // 450 para caudalímetro 1/2 pulgada
}


// ============================================================
// FUNCIÓN: pulse2()
// Descripción: Interrupción para caudalímetro 2
// ============================================================

void pulse2() {
  if (terminoLlenadoLiquido1 == 1) {
    waterFlow2 += 1.0 / 450;
  }
}


// ============================================================
// FUNCIÓN: caudal()
// Descripción: Actualiza variables de cantidad de líquidos
// ============================================================

void caudal() {
  cantidad1 = waterFlow1;
  cantidad2 = waterFlow2;
}


// ============================================================
// FUNCIÓN: frenadoReposicion()
// Descripción: Detiene proceso de reposición de emergencia
// ============================================================

void frenadoReposicion() {
  flagParadaR = 1;
  EBombaR = 0;
  
  // Apagar bomba de reposición
  digitalWrite(9, HIGH);
  bomboSeleccionado = 0;
  
  // Apagar electroválvulas
  digitalWrite(10, HIGH);  // Electroválvula Bombo 1
  digitalWrite(8, HIGH);   // Electroválvula Bombo 2
}


// ============================================================
// FUNCIÓN: activacion()
// Descripción: Control completo de bombas, reposición y mezcla
// ============================================================

void activacion() {
  // ========== DECODIFICACIÓN DE COMBINACIÓN ==========
  if (convinacion >= 1000 && convinacion <= 1100) {
    bomboSeleccionado = 1;
    valorMaxReposicion = convinacion - 1000;
  }

  if (convinacion >= 2000 && convinacion <= 2200) {
    bomboSeleccionado = 2;
    valorMaxReposicion = convinacion - 2000;
  }

  // ========== CONTROL DE REPOSICIÓN ==========
  if (flagParadaR == 0) {
    // REPOSICIÓN BOMBO 1
    if (bomboSeleccionado == 1) {
      if (valorMaxReposicion <= Fporcentaje1 && EBombaR == 0) {
        error = 722;  // Error: nivel ya alcanzado
      }

      if (valorMaxReposicion > Fporcentaje1 && Fporcentaje1 < 100) {
        EBombaR = 1;
        digitalWrite(10, LOW);  // Encender electroválvula Bombo 1
        digitalWrite(9, LOW);   // Encender bomba reposición
      }

      if (valorMaxReposicion <= Fporcentaje1) {
        EBombaR = 0;
        flagParadaR = 1;
        valorMaxReposicion = 0;
        digitalWrite(9, HIGH);   // Apagar bomba reposición
        digitalWrite(10, HIGH);  // Apagar electroválvula Bombo 1
        bomboSeleccionado = 0;
      }
    }

    // REPOSICIÓN BOMBO 2
    if (bomboSeleccionado == 2) {
      if (valorMaxReposicion <= Fporcentaje2 && EBombaR == 0) {
        error = 722;  // Error: nivel ya alcanzado
      }

      if (valorMaxReposicion > Fporcentaje2 && Fporcentaje2 < 100) {
        EBombaR = 1;
        digitalWrite(9, LOW);  // Encender bomba reposición
        digitalWrite(8, LOW);  // Encender electroválvula Bombo 2
      }

      if (valorMaxReposicion <= Fporcentaje2 || Fporcentaje2 == 100) {
        EBombaR = 0;
        flagParadaR = 1;
        valorMaxReposicion = 0;
        digitalWrite(9, HIGH);  // Apagar bomba reposición
        digitalWrite(8, HIGH);  // Apagar electroválvula Bombo 2
        bomboSeleccionado = 0;
      }
    }
  }

  // ========== CÁLCULO DE TIEMPOS Y LÍQUIDOS ==========
  TiempoHorUso = TiempoHor * 3600000;
  TiempoMinUso = TiempoMin * 60000;
  
  liquido1 = (Ingrediente1 - 10000) / 1000;
  liquido2 = (Ingrediente2 - 20000) / 1000;

  // ========== CONTROL DE TRANSFERENCIA DE LÍQUIDOS ==========
  if (continuar == 1) {
    // Inicio de transferencia de Bombo 1
    if (liquido1 > cantidad1 && liquido1 > 0) {
      digitalWrite(5, LOW);  // Encender bomba depósito 1
      EBomba1 = 1;
      EProceso = 1;
    }

    // Inicio de transferencia de Bombo 2
    if (liquido2 > cantidad2 && liquido2 > 0 && arranque2 == 1) {
      digitalWrite(6, LOW);  // Encender bomba depósito 2
      EBomba2 = 1;
      EProceso = 1;
    }

    // Finalización de transferencia de Bombo 1
    if (liquido1 < cantidad1) {
      terminoLlenadoLiquido1 = 1;
      digitalWrite(5, HIGH);  // Apagar bomba depósito 1
      EBomba1 = 0;
      arranque2 = 1;
    }

    // Finalización de transferencia de Bombo 2
    if (liquido2 < cantidad2 && terminoLlenadoLiquido1 == 1) {
      terminoLlenadoLiquido2 = 1;
      digitalWrite(6, HIGH);  // Apagar bomba depósito 2
      EBomba2 = 0;
      arranque2 = 0;
    }

    // Activar mezcla cuando ambos líquidos están transferidos
    if (terminoLlenadoLiquido1 == 1 && terminoLlenadoLiquido2 == 1) {
      activarMezcla = 1;
      terminoLlenadoLiquido1 = 0;
      terminoLlenadoLiquido2 = 0;
      liquido1 = 0;
      liquido2 = 0;
      TInicioMezclado = millis();
    }
  }

  // ========== CONTROL DE MEZCLADO (ON/OFF INTERMITENTE) ==========
  if (activarMezcla == 1) {
    unsigned long currentMillis = millis();
    EProceso = 1;

    // Encender el motor por TiempoMotorOn
    if ((currentMillis - previousMillis) >= TiempoMotorOn && MotorOn == 1) {
      digitalWrite(7, HIGH);  // Apagar motor
      previousMillis = currentMillis;
      MotorOn = 0;
      MotorOff = 1;
    }

    // Apagar el motor por TiempoMotorOff
    if ((currentMillis - previousMillis) >= TiempoMotorOff && MotorOff == 1) {
      digitalWrite(7, LOW);  // Encender motor
      previousMillis = currentMillis;
      MotorOn = 1;
      MotorOff = 0;
    }
  }

  // ========== DETENCIÓN DE PROCESO ==========
  if ((activarMezcla == 0 && continuar == 0) || detener == 1) {
    EProceso = 0;
    digitalWrite(7, HIGH);  // Apagar motor mezclador
    digitalWrite(5, HIGH);  // Apagar bomba Bombo 1
    digitalWrite(6, HIGH);  // Apagar bomba Bombo 2
    digitalWrite(4, HIGH);  // Apagar bomba mezcla
    EBomba1 = 0;
    EBomba2 = 0;
    desechar = 0;
    detener = 0;
  }

  // ========== DESECHAR PRODUCCIÓN ==========
  if (desechar == 1) {
    digitalWrite(4, LOW);  // Encender bomba del bombo de mezcla
    EBombaM = 1;
    liquido1 = 0;
    cantidad1 = 0;
    liquido2 = 0;
    cantidad2 = 0;
  }

  // ========== VACIAR BOMBO DE MEZCLA ==========
  if (vaciar == 1) {
    if (EProceso == 2) {
      digitalWrite(4, LOW);  // Encender bomba del bombo de mezcla
      EBombaM = 1;
      liquido1 = 0;
      cantidad1 = 0;
      liquido2 = 0;
      cantidad2 = 0;
    }

    if (EProceso == 0 || EProceso == 1) {
      digitalWrite(4, LOW);  // Encender bomba del bombo de mezcla
      EBombaM = 1;
      liquido1 = 0;
      cantidad1 = 0;
      liquido2 = 0;
      cantidad2 = 0;
    }
  }
}


// ============================================================
// FUNCIÓN: enviarValores()
// Descripción: Envía todos los datos a Raspberry Pi en formato CSV
// ============================================================

void enviarValores() {
  RASPBERRY_SERIAL.print(average1);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(constrainedPorcentaje1);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(average2);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(constrainedPorcentaje2);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(average3);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(constrainedPorcentaje3);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(cantidad1);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(cantidad2);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(EBomba1);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(EBomba2);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(EBombaM);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(EMezclador);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(EBombaR);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(error);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(horaRest);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.print(minRest);
  RASPBERRY_SERIAL.print(",");
  RASPBERRY_SERIAL.println(EProceso);
}


// ============================================================
// FUNCIÓN: lectura()
// Descripción: Interrupción del Timer - Lee comandos desde Raspberry
// ============================================================

void lectura() {
  if (RASPBERRY_SERIAL.available()) {
    valor = RASPBERRY_SERIAL.read();

    if (valor == 'F') {
      g = 1;
      frenadoReposicion();
      flagParadaR = 1;
    }

    if (valor == 'R') {
      g = 2;
      obtencionEntero();
      flagR = 1;
      flagM = 0;
      flagParadaR = 0;
    }

    if (valor == 'G') {
      g = 3;
      obtencionEntero();
    }

    if (valor == 'S') {
      g = 4;
      obtencionEntero();
    }

    if (valor == 'C') {
      g = 5;
      obtencionEntero();
      continuar = 1;
    }

    if (valor == 'c') {
      g = 6;
      obtencionEntero();
    }

    if (valor == 'V') {
      g = 7;
      vaciar = 1;
      obtencionEntero();
    }

    if (valor == 'D') {
      g = 8;
      activarMezcla = 0;
      continuar = 0;
      detener = 1;
    }

    if (valor == 'A') {
      g = 10;
      continuar = 1;
    }

    if (valor == 'T') {
      flagTransmicion = 1;
    }

    if (valor == 'H') {
      g = 11;
      obtencionEntero();
    }

    if (valor == 'h') {
      g = 12;
      obtencionEntero();
    }

    if (valor == 'X') {
      desechar = 1;
    }
  }
}


// ============================================================
// FUNCIÓN: obtencionEntero()
// Descripción: Lee valores numéricos desde Raspberry
// ============================================================

void obtencionEntero() {
  delay(30);
  while (RASPBERRY_SERIAL.available()) {
    char c = RASPBERRY_SERIAL.read();
    estado += c;
  }

  if (estado.length() > 0) {
    if (g == 2) {
      convinacion = estado.toInt();
    }
    if (g == 3) {
      bomboSeleccionado = estado.toInt();
    }
    if (g == 5) {
      Ingrediente1 = estado.toInt();
    }
    if (g == 6) {
      Ingrediente2 = estado.toInt();
    }
    if (g == 11) {
      TiempoHor = estado.toInt();
    }
    if (g == 12) {
      TiempoMin = estado.toInt();
    }

    g = 0;
    estado = "";
  }
}


// ============================================================
// FUNCIÓN: monitoreo()
// Descripción: Función de debugging (opcional)
// ============================================================

void monitoreo() {
  RASPBERRY_SERIAL.println(valor);
  RASPBERRY_SERIAL.print("TiempoHor:");
  RASPBERRY_SERIAL.print(TiempoHor);
  RASPBERRY_SERIAL.print("  TiempoMin:");
  RASPBERRY_SERIAL.println(TiempoMin);
  RASPBERRY_SERIAL.print("Cantidad1:");
  RASPBERRY_SERIAL.print(cantidad1);
  RASPBERRY_SERIAL.print("  Cantidad2:");
  RASPBERRY_SERIAL.println(cantidad2);
  RASPBERRY_SERIAL.print("activarMezcla:");
  RASPBERRY_SERIAL.print(activarMezcla);
  RASPBERRY_SERIAL.print("  terminoLlenadoLiquido1:");
  RASPBERRY_SERIAL.print(terminoLlenadoLiquido1);
  RASPBERRY_SERIAL.print("  terminoLlenadoLiquido2:");
  RASPBERRY_SERIAL.println(terminoLlenadoLiquido2);
  RASPBERRY_SERIAL.print(" arranque2:");
  RASPBERRY_SERIAL.println(arranque2);
}
