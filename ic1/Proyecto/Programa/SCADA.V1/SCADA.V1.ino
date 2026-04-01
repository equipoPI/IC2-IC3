#include <VirtuinoBluetooth.h>
#include <VirtuinoEsp8266_WebServer.h>
#include <VirtuinoEthernet_WebServer.h>

#define trig1 2
#define eco1 3
#define trig2 4
#define eco2 5
#define trig3 6
#define eco3 7
#define x 25

int duracion;
int distancia1;
int distancia2;
int distancia3;

void setup() {
  pinMode(trig1, OUTPUT);
  pinMode(trig2, OUTPUT);
  pinMode(trig3, OUTPUT);
  pinMode(eco1, INPUT);
  pinMode(eco2, INPUT);
  pinMode(eco3, INPUT);
}

void loop() {
  digitalWrite(trig1, HIGH);
  delay(1);
  digitalWrite(trig1, LOW);
  duracion = pulseIn(eco1, HIGH);
  distancia1 = duracion / 58.2;

  digitalWrite(trig2, HIGH);
  delay(1);
  digitalWrite(trig2, LOW);
  duracion = pulseIn(eco2, HIGH);
  distancia2 = duracion / 58.2;

  digitalWrite(trig3, HIGH);
  delay(1);
  digitalWrite(trig3, LOW);
  duracion = pulseIn(eco3, HIGH);
  distancia3 = duracion / 58.2;

  if (distancia1 <= 3) {}
  if (distancia1 >= x) {}

  if (distancia2 <= 3) {}
  if (distancia2 >= x) {}

  if (distancia3 <= 3) {}
  if (distancia3 >= x) {}

  //bluethot
  //comunicacion para controlar el llenado y la mezcla
  //control de bombas
  //control de caudal
  //sistema de mezclado

}
