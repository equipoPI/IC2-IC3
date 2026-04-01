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
