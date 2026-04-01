//
//
//// Include necessary libraries
//#include <LiquidCrystal.h>
//
//// Define pins for flow sensors
//#define FLOW_SENSOR_1 2
//#define FLOW_SENSOR_2 3
//
//// Define pins for pumps
//#define PUMP_1 4
//#define PUMP_2 5
//
//// Define pin for DC motor
//#define MOTOR 6
//
//// Define variables for liquid levels
//int liquid_level_1 = 0;
//int liquid_level_2 = 0;
//
//// Define variables for flow rates
//int flow_rate_1 = 0;
//int flow_rate_2 = 0;
//
//// Define variables for pump status
//bool pump_1_on = false;
//bool pump_2_on = false;
//
//// Define variables for mixing process
//unsigned long mixing_start_time = 0;
//unsigned long mixing_duration = 0;
//bool mixing_in_progress = false;
//
//// Define LCD display
//LiquidCrystal lcd(12, 11, 7, 8, 9, 10);
//
//void setup() {
//  // Initialize LCD display
//  lcd.begin(16, 2);
//
//  // Set pins for flow sensors as input
//  pinMode(FLOW_SENSOR_1, INPUT);
//  pinMode(FLOW_SENSOR_2, INPUT);
//
//  // Set pins for pumps as output
//  pinMode(PUMP_1, OUTPUT);
//  pinMode(PUMP_2, OUTPUT);
//
//  // Set pin for DC motor as output
//  pinMode(MOTOR, OUTPUT);
//}
//
//void loop() {
//  // Read liquid levels from flow sensors
//  liquid_level_1 = digitalRead(FLOW_SENSOR_1);
//  liquid_level_2 = digitalRead(FLOW_SENSOR_2);
//
//  // Calculate flow rates
//  flow_rate_1 = liquid_level_1 * 100; // Assuming flow sensor outputs HIGH when liquid passes through
//  flow_rate_2 = liquid_level_2 * 100;
//
//  // Check if Pump 1 needs to be turned on
//  if (flow_rate_1 > 0 && !pump_1_on) {
//    // Turn on Pump 1
//    digitalWrite(PUMP_1, HIGH);
//    pump_1_on = true;
//  }
//
//  // Check if Pump 1 needs to be turned off
//  if (flow_rate_1 == 0 && pump_1_on) {
//    // Turn off Pump 1
//    digitalWrite(PUMP_1, LOW);
//    pump_1_on = false;
//  }
//
//  // Check if Pump 2 needs to be turned on
//  if (flow_rate_2 > 0 && !pump_2_on && !pump_1_on) {
//    // Turn on Pump 2
//    digitalWrite(PUMP_2, HIGH);
//    pump_2_on = true;
//  }
//
//  // Check if Pump 2 needs to be turned off
//  if (flow_rate_2 == 0 && pump_2_on) {
//    // Turn off Pump 2
//    digitalWrite(PUMP_2, LOW);
//    pump_2_on = false;
//  }
//
//  // Check if both pumps have completed their tasks
//  if (!pump_1_on && !pump_2_on) {
//    // Start mixing process
//    mixing_start_time = millis();
//    mixing_duration = 0;
//    mixing_in_progress = true;
//  }
//
//  // Check if mixing process is in progress
//  if (mixing_in_progress) {
//    // Calculate mixing duration
//    mixing_duration = millis() - mixing_start_time;
//
//    // Check if mixing duration has reached user-set time
//    if (mixing_duration >= 5000) {
//      // Turn off DC motor
//      digitalWrite(MOTOR, LOW);
//
//      // Wait for 2 seconds
//      delay(2000);
//
//      // Turn on DC motor
//      digitalWrite(MOTOR, HIGH);
//
//      // Reset mixing start time
//      mixing_start_time = millis();
//    }
//  }
//
//  // Display flow rates and mixing duration on LCD
//  lcd.setCursor(0, 0);
//  lcd.print("Flow Rate 1: ");
//  lcd.print(flow_rate_1);
//  lcd.print(" ml/s");
//  lcd.setCursor(0, 1);
//  lcd.print("Flow Rate 2: ");
//  lcd.print(flow_rate_2);
//  lcd.print(" ml/s");
//  lcd.setCursor(0, 2);
//  lcd.print("Mixing Time: ");
//  lcd.print(mixing_duration / 1000);
//  lcd.print(" s");
//}

// Code sourced from: https://www.arduino.cc/en/Tutorial/BuiltInExamples/Millis

/*
  prendido y apagadp del led
*/

//// Definir el pin del LED
//const int ledPin = 13; // Cambia al pin que estés usando
//unsigned long previousMillis = 0; // Almacena el tiempo previo
//const long offTime = 5000; // Tiempo que el LED está apagado (5 segundos)
//const long onTime = 2000;  // Tiempo que el LED está encendido (2 segundos)
//
//bool ledState = false; // Estado inicial del LED (apagado)
//
//void setup() {
//  pinMode(ledPin, OUTPUT); // Configurar el pin del LED como salida
//  digitalWrite(ledPin, LOW); // Asegurarse de que el LED empieza apagado
//}
//
//void loop() {
//  unsigned long currentMillis = millis(); // Obtener el tiempo actual
//
//  // Verificar si es momento de cambiar el estado del LED
//  if (ledState == false && currentMillis - previousMillis >= offTime) {
//    ledState = true; // Cambiar el estado a encendido
//    previousMillis = currentMillis; // Actualizar el tiempo previo
//    digitalWrite(ledPin, HIGH); // Encender el LED
//  }
//  else if (ledState == true && currentMillis - previousMillis >= onTime) {
//    ledState = false; // Cambiar el estado a apagado
//    previousMillis = currentMillis; // Actualizar el tiempo previo
//    digitalWrite(ledPin, LOW); // Apagar el LED
//  }
//}

/*
  otra version del primero
   /
*/

// // Include necessary libraries
//#include <LiquidCrystal.h>
//
//// Define pins for flow sensors
//#define FLOW_SENSOR_1 2
//#define FLOW_SENSOR_2 3
//
//// Define pins for pumps
//#define PUMP_1 4
//#define PUMP_2 5
//
//// Define pin for DC motor
//#define MOTOR 6
//
//// Define variables for user-defined cycle duration
//int hour = 0;
//int minute = 0;
//
//// Define variables for current time and remaining time
//unsigned long currentMillis = 0;
//unsigned long previousMillis = 0;
//unsigned long remainingMillis = 0;
//
//// Define variables for flow sensor readings
//int flow1 = 0;
//int flow2 = 0;
//
//// Define variables for pump status
//boolean pump1On = false;
//boolean pump2On = false;
//
//// Define LCD display
//LiquidCrystal lcd(12, 11, 7, 8, 9, 10);
//
//void setup() {
//  // Initialize LCD display
//  lcd.begin(16, 2);
//
//  // Set pins for flow sensors as input
//  pinMode(FLOW_SENSOR_1, INPUT);
//  pinMode(FLOW_SENSOR_2, INPUT);
//
//  // Set pins for pumps as output
//  pinMode(PUMP_1, OUTPUT);
//  pinMode(PUMP_2, OUTPUT);
//
//  // Set pin for DC motor as output
//  pinMode(MOTOR, OUTPUT);
//
//  // Prompt user to enter cycle duration
//  lcd.print("Enter cycle duration:");
//  lcd.setCursor(0, 1);
//  lcd.print("HH:MM");
//}
//
//void loop() {
//  // Read flow sensor values
//  flow1 = digitalRead(FLOW_SENSOR_1);
//  flow2 = digitalRead(FLOW_SENSOR_2);
//
//  // Check if pump 1 needs to be turned on
//  if (!pump1On && flow1 == HIGH) {
//    // Turn on pump 1
//    digitalWrite(PUMP_1, HIGH);
//    pump1On = true;
//  }
//
//  // Check if pump 1 needs to be turned off
//  if (pump1On && flow1 == LOW) {
//    // Turn off pump 1
//    digitalWrite(PUMP_1, LOW);
//    pump1On = false;
//  }
//
//  // Check if pump 2 needs to be turned on
//  if (!pump2On && flow2 == HIGH && !pump1On) {
//    // Turn on pump 2
//    digitalWrite(PUMP_2, HIGH);
//    pump2On = true;
//  }
//
//  // Check if pump 2 needs to be turned off
//  if (pump2On && flow2 == LOW) {
//    // Turn off pump 2
//    digitalWrite(PUMP_2, LOW);
//    pump2On = false;
//  }
//
//  // Check if both pumps have completed their tasks
//  if (!pump1On && !pump2On) {
//    // Activate DC motor for mixing
//    digitalWrite(MOTOR, HIGH);
//
//    // Calculate remaining time in milliseconds
//    remainingMillis = (hour * 3600000) + (minute * 60000);
//
//    // Display remaining time on LCD
//    lcd.clear();
//    lcd.print("Remaining time:");
//    lcd.setCursor(0, 1);
//    lcd.print(hour);
//    lcd.print(":");
//    lcd.print(minute);
//
//    // Keep motor on for 5 seconds and off for 2 seconds, repeating until remaining time expires
//    while (remainingMillis > 0) {
//      // Get current time
//      currentMillis = millis();
//
//      // Check if 5 seconds have passed
//      if (currentMillis - previousMillis >= 5000) {
//        // Turn off motor
//        digitalWrite(MOTOR, LOW);
//
//        // Update remaining time
//        remainingMillis -= 5000;
//
//        // Update LCD display
//        lcd.clear();
//        lcd.print("Remaining time:");
//        lcd.setCursor(0, 1);
//        lcd.print(hour);
//        lcd.print(":");
//        lcd.print(minute);
//
//        // Wait for 2 seconds
//        delay(2000);
//
//        // Turn on motor
//        digitalWrite(MOTOR, HIGH);
//
//        // Update remaining time
//        remainingMillis -= 2000;
//
//        // Update LCD display
//        lcd.clear();
//        lcd.print("Remaining time:");
//        lcd.setCursor(0, 1);
//        lcd.print(hour);
//        lcd.print(":");
//        lcd.print(minute);
//
//        // Update previousMillis
//        previousMillis = currentMillis;
//      }
//    }
//
//    // Turn off motor
//    digitalWrite(MOTOR, LOW);
//
//    // Display "Cycle complete" on LCD
//    lcd.clear();
//    lcd.print("Cycle complete");
//  }
//}
//
//// Code sourced from: https://www.arduino.cc/en/Tutorial/BlinkWithoutDelay



//void setup() {
//  // Configuración del monitor serie
//  Serial.begin(9600);
//
//  // Calcular la duración de la tarea en milisegundos
//  task_duration_ms = ((task_duration_hours * 60) + task_duration_minutes) * 60 * 1000;
//
//  // Iniciar la tarea
//  start_time = millis();
//  task_active = true;
//
//  // Mostrar duración inicial
//  Serial.print("Task duration: ");
//  Serial.print(task_duration_hours);
//  Serial.print(" hours, ");
//  Serial.print(task_duration_minutes);
//  Serial.println(" minutes");
//}
//
//void loop() {
//  if (task_active) {
//    // Calcular el tiempo transcurrido
//    unsigned long elapsed_time = millis() - start_time;
//
//    // Calcular el tiempo restante
//    unsigned long remaining_time = task_duration_ms - elapsed_time;
//
//    if (remaining_time > 0) {
//      // Convertir tiempo restante a horas y minutos
//      int hours_left = remaining_time / (60 * 60 * 1000);
//      int minutes_left = (remaining_time % (60 * 60 * 1000)) / (60 * 1000);
//
//      // Mostrar tiempo restante en el monitor serie
//      Serial.print("Time left: ");
//      Serial.print(hours_left);
//      Serial.print(" hours, ");
//      Serial.print(minutes_left);
//      Serial.println(" minutes");
//    } else {
//      // Finalizar la tarea cuando el tiempo se agote
//      Serial.println("Task completed!");
//      task_active = false;
//    }
//  }
//
//  // Aquí puedes agregar otras tareas que necesites realizar mientras el tiempo avanza
//
//  delay(1000); // Actualizar cada segundo (opcional)
//}


/*
  nuevo def
*/
//
//// Definir pines para los sensores de flujo
//#define SENSOR_FLUJO_1 2
//#define SENSOR_FLUJO_2 3
//
//// Definir pines para las bombas
//#define BOMBA_1 4
//#define BOMBA_2 5
//
//// Definir pin para el motor DC
//#define MOTOR 6
//
//// Definir variables para los niveles de líquido
//int nivel_liquido_1 = 0;
//int nivel_liquido_2 = 0;
//
//// Definir variables para los caudales
//int caudal_1 = 0;
//int caudal_2 = 0;
//
//// Definir variables para el estado de las bombas
//bool bomba_1_encendida = false;
//bool bomba_2_encendida = false;
//
//// Definir variables para el proceso de mezcla
//unsigned long inicio_mezcla = 0;
//unsigned long duracion_mezcla_ms = 0;
//bool mezcla_en_progreso = false;
//
//// Definir variables para el tiempo de la tarea
//int duracion_horas = 1;   // Duración en horas
//int duracion_minutos = 30; // Duración en minutos
//unsigned long duracion_total_ms; // Duración total en milisegundos
//unsigned long tiempo_inicio = 0; // Momento de inicio de la tarea
//
//void setup() {
//  // Inicializar comunicación Serial
//  Serial.begin(9600);
//
//  // Configurar pines de los sensores de flujo como entrada
//  pinMode(SENSOR_FLUJO_1, INPUT);
//  pinMode(SENSOR_FLUJO_2, INPUT);
//
//  // Configurar pines de las bombas como salida
//  pinMode(BOMBA_1, OUTPUT);
//  pinMode(BOMBA_2, OUTPUT);
//
//  // Configurar pin del motor como salida
//  pinMode(MOTOR, OUTPUT);
//
//  // Calcular la duración total en milisegundos
//  duracion_total_ms = ((duracion_horas * 60) + duracion_minutos) * 60 * 1000;
//  tiempo_inicio = millis();
//}
//
//void loop() {
//  // Leer niveles de líquido desde los sensores de flujo
//  nivel_liquido_1 = digitalRead(SENSOR_FLUJO_1);
//  nivel_liquido_2 = digitalRead(SENSOR_FLUJO_2);
//
//  // Calcular los caudales
//  caudal_1 = nivel_liquido_1 * 100; // Suposición: sensor da HIGH cuando pasa líquido
//  caudal_2 = nivel_liquido_2 * 100;
//
//  // Control de la Bomba 1
//  if (caudal_1 > 0 && !bomba_1_encendida) {
//    digitalWrite(BOMBA_1, HIGH);
//    bomba_1_encendida = true;
//    Serial.println("Bomba 1 encendida");
//  }
//  if (caudal_1 == 0 && bomba_1_encendida) {
//    digitalWrite(BOMBA_1, LOW);
//    bomba_1_encendida = false;
//    Serial.println("Bomba 1 apagada");
//  }
//
//  // Control de la Bomba 2
//  if (caudal_2 > 0 && !bomba_2_encendida && !bomba_1_encendida) {
//    digitalWrite(BOMBA_2, HIGH);
//    bomba_2_encendida = true;
//    Serial.println("Bomba 2 encendida");
//  }
//  if (caudal_2 == 0 && bomba_2_encendida) {
//    digitalWrite(BOMBA_2, LOW);
//    bomba_2_encendida = false;
//    Serial.println("Bomba 2 apagada");
//  }
//
//  // Iniciar mezcla cuando ambas bombas terminen
//  if (!bomba_1_encendida && !bomba_2_encendida && !mezcla_en_progreso) {
//    inicio_mezcla = millis();
//    mezcla_en_progreso = true;
//    Serial.println("Iniciando mezcla");
//  }
//
//  // Proceso de mezcla
//  if (mezcla_en_progreso) {
//    unsigned long tiempo_transcurrido = millis() - inicio_mezcla;
//
//    // Calcular tiempo restante
//    unsigned long tiempo_restante = duracion_total_ms - (millis() - tiempo_inicio);
//    int horas_restantes = tiempo_restante / (60 * 60 * 1000);
//    int minutos_restantes = (tiempo_restante % (60 * 60 * 1000)) / (60 * 1000);
//
//    // Mostrar tiempo restante por Serial
//    Serial.print("Tiempo restante: ");
//    Serial.print(horas_restantes);
//    Serial.print("h ");
//    Serial.print(minutos_restantes);
//    Serial.println("m");
//
//    // Ciclo del motor (5 segundos encendido, 2 segundos apagado)
//    if (tiempo_transcurrido % 7000 < 5000) {
//      digitalWrite(MOTOR, HIGH);
//      Serial.println("Motor encendido");
//    } else {
//      digitalWrite(MOTOR, LOW);
//      Serial.println("Motor apagado");
//    }
//
//    // Finalizar mezcla cuando el tiempo se acabe
//    if (tiempo_restante <= 0) {
//      mezcla_en_progreso = false;
//      digitalWrite(MOTOR, LOW);
//      Serial.println("Mezcla terminada");
//    }
//  } else {
//    // Mostrar caudales por Serial
//    Serial.print("Caudal 1: ");
//    Serial.print(caudal_1);
//    Serial.println(" L/s");
//    Serial.print("Caudal 2: ");
//    Serial.print(caudal_2);
//    Serial.println(" L/s");
//  }
//
//  delay(500); // Actualizar cada 0.5s
//}

/*
 con variables de parada continuacion o descarte
 */
//// Definir pines para los sensores de flujo
//#define SENSOR_FLUJO_1 2
//#define SENSOR_FLUJO_2 3
//
//// Definir pines para las bombas
//#define BOMBA_1 4
//#define BOMBA_2 5
//
//// Definir pin para el motor DC
//#define MOTOR 6
//
//// Definir pin para la señal de vaciado
//#define VACIO 30
//
//// Definir variables para los niveles de líquido
//int nivel_liquido_1 = 0;
//int nivel_liquido_2 = 0;
//
//// Definir variables para los caudales
//int caudal_1 = 0;
//int caudal_2 = 0;
//
//// Definir variables para el estado de las bombas
//bool bomba_1_encendida = false;
//bool bomba_2_encendida = false;
//
//// Definir variables para el proceso de mezcla
//unsigned long inicio_mezcla = 0;
//unsigned long duracion_mezcla_ms = 0;
//unsigned long tiempo_pausado = 0; // Tiempo acumulado durante la pausa
//bool mezcla_en_progreso = false;
//
//// Variables de control
//int empezar = 0;    // Iniciar el proceso
//int parar = 0;      // Pausar el proceso
//int continuar = 0;  // Reanudar el proceso
//int vaciar = 0;     // Vaciar al finalizar la mezcla
//
//// Definir variables para el tiempo de la tarea
//int duracion_horas = 1;   // Duración en horas
//int duracion_minutos = 30; // Duración en minutos
//unsigned long duracion_total_ms; // Duración total en milisegundos
//unsigned long tiempo_inicio = 0; // Momento de inicio de la tarea
//
//void setup() {
//  // Inicializar comunicación Serial
//  Serial.begin(9600);
//
//  // Configurar pines de los sensores de flujo como entrada
//  pinMode(SENSOR_FLUJO_1, INPUT);
//  pinMode(SENSOR_FLUJO_2, INPUT);
//
//  // Configurar pines de las bombas como salida
//  pinMode(BOMBA_1, OUTPUT);
//  pinMode(BOMBA_2, OUTPUT);
//
//  // Configurar pin del motor como salida
//  pinMode(MOTOR, OUTPUT);
//
//  // Configurar pin de vaciado como salida
//  pinMode(VACIO, OUTPUT);
//
//  // Calcular la duración total en milisegundos
//  duracion_total_ms = ((duracion_horas * 60) + duracion_minutos) * 60 * 1000;
//}

//void loop() {
//  // Leer niveles de líquido desde los sensores de flujo
//  nivel_liquido_1 = digitalRead(SENSOR_FLUJO_1);
//  nivel_liquido_2 = digitalRead(SENSOR_FLUJO_2);
//
//  // Leer variables de control desde Serial (simular entrada)
//  if (Serial.available()) {
//    String input = Serial.readStringUntil('\n');
//    if (input.startsWith("empezar=")) empezar = input.substring(9).toInt();
//    if (input.startsWith("parar=")) parar = input.substring(6).toInt();
//    if (input.startsWith("continuar=")) continuar = input.substring(10).toInt();
//    if (input.startsWith("vaciar=")) vaciar = input.substring(7).toInt();
//  }
//
//  // Control del llenado de líquidos
//  if (empezar == 1) {
//    // Llenar con líquido 1
//    if (nivel_liquido_1 == 0 && !bomba_1_encendida) {
//      digitalWrite(BOMBA_1, HIGH);
//      bomba_1_encendida = true;
//      Serial.println("Bomba 1 encendida: llenando líquido 1");
//    } else if (nivel_liquido_1 == 1 && bomba_1_encendida) {
//      digitalWrite(BOMBA_1, LOW);
//      bomba_1_encendida = false;
//      Serial.println("Llenado de líquido 1 completado.");
//    }
//
//    // Llenar con líquido 2
//    if (nivel_liquido_2 == 0 && !bomba_2_encendida && !bomba_1_encendida) {
//      digitalWrite(BOMBA_2, HIGH);
//      bomba_2_encendida = true;
//      Serial.println("Bomba 2 encendida: llenando líquido 2");
//    } else if (nivel_liquido_2 == 1 && bomba_2_encendida) {
//      digitalWrite(BOMBA_2, LOW);
//      bomba_2_encendida = false;
//      Serial.println("Llenado de líquido 2 completado.");
//    }
//
//    // Iniciar mezcla si ambas bombas han terminado
//    if (!bomba_1_encendida && !bomba_2_encendida && !mezcla_en_progreso) {
//      mezcla_en_progreso = true;
//      tiempo_inicio = millis();
//      tiempo_pausado = 0;
//      Serial.println("Iniciando mezcla.");
//    }
//
//    empezar = 0; // Reiniciar variable de control
//  }
//
//  // Si se solicita pausar
//  if (parar == 1 && mezcla_en_progreso) {
//    mezcla_en_progreso = false;
//    tiempo_pausado += millis() - tiempo_inicio;
//    Serial.println("Proceso pausado");
//    parar = 0; // Reiniciar variable de control
//  }
//
//  // Si se solicita continuar
//  if (continuar == 1 && !mezcla_en_progreso) {
//    mezcla_en_progreso = true;
//    tiempo_inicio = millis(); // Reiniciar tiempo considerando la pausa
//    Serial.println("Proceso reanudado");
//    continuar = 0; // Reiniciar variable de control
//  }
//
//  // Proceso de mezcla
//  if (mezcla_en_progreso) {
//    unsigned long tiempo_transcurrido = millis() - tiempo_inicio + tiempo_pausado;
//    unsigned long tiempo_restante = duracion_total_ms - tiempo_transcurrido;
//
//    int horas_restantes = tiempo_restante / (60 * 60 * 1000);
//    int minutos_restantes = (tiempo_restante % (60 * 60 * 1000)) / (60 * 1000);
//
//    // Mostrar tiempo restante por Serial
//    Serial.print("Tiempo restante: ");
//    Serial.print(horas_restantes);
//    Serial.print("h ");
//    Serial.print(minutos_restantes);
//    Serial.println("m");
//
//    // Ciclo del motor (5 segundos encendido, 2 segundos apagado)
//    if (tiempo_transcurrido % 7000 < 5000) {
//      digitalWrite(MOTOR, HIGH);
//      Serial.println("Motor encendido");
//    } else {
//      digitalWrite(MOTOR, LOW);
//      Serial.println("Motor apagado");
//    }
//
//    // Finalizar mezcla cuando el tiempo se acabe
//    if (tiempo_restante <= 0) {
//      mezcla_en_progreso = false;
//      Serial.println("Mezcla finalizada. Esperando vaciado.");
//    }
//  }
//
//  // Activar señal de vaciado si el tiempo de mezcla ha terminado
//  if (!mezcla_en_progreso && vaciar == 1) {
//    digitalWrite(VACIO, HIGH);
//    Serial.println("Pin de vaciado activado.");
//    vaciar = 0; // Reiniciar variable de control
//  } else {
//    digitalWrite(VACIO, LOW);
//  }
//
//  delay(500); // Actualizar cada 0.5s
//}
