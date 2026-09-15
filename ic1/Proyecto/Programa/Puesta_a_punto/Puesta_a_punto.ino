#include <SoftwareSerial.h>    //libreria que usaremos para transmitir y recibir los datos que llegan desde el modulo bluetooth

int BT_Rx = 12;                //pines conectados al modulo bluetooth
int BT_Tx = 11;

//trig y eco son pines de control de los sensores
int trig = 16;
int eco = 17;

SoftwareSerial BT(BT_Rx, BT_Tx); //definimos con la libreria SoftwareSerial la comunicacion arduino, siempre que se mencione BT.comandoserial
//se ejecutara el comando serialsolo que utilizando los pines definidos anterormente
//esto lo hacemos con la finalidad de no estar conectando y desconectando el modulo bluetooth cada vez que se carga un codigo
//nuevo y tambien no queda disponible el puerto serie para ver datos de control en la PC.

int i = 0;

//duracion es el tiempo que tarda en enviarce y recibir el rebote de las ondas de ultrasonido
float duracion;
//distancia es donde se almacena un valor derivado de una opercaion matematica
float distancia;
//son variables donde se gurada el nivel de cada bombo
float distancia1;
float distancia2;
float distancia3;
float distanciaReal1 = 0;
float distanciaReal2 = 0;
float distanciaReal3 = 0;
byte porcentaje1 = 0;
byte porcentaje2 = 0;
byte porcentaje3 = 0;
byte constrainedPorcentaje1 = 0;
byte constrainedPorcentaje2 = 0;
byte constrainedPorcentaje3 = 0;
byte porcentajeReal1 = 0;
byte porcentajeReal2 = 0;
byte porcentajeReal3 = 0;

void setup() {
  //configuracion puerto serie para mandar señales de control a la PC
  Serial.begin(9600);
  Serial.print("Listo");

   //pines de sensores ultrasonicos, nivel
  pinMode(17, INPUT);  //outputs son los pines de triger
  pinMode(19, INPUT);  //input son los pines de eco
  pinMode(21, INPUT);
  pinMode(16, OUTPUT);
  pinMode(18, OUTPUT);
  pinMode(20, OUTPUT);
  
  //pines de bombas
  //Bombas dc y motor de mezcla dc
  pinMode(4, OUTPUT); //bomba deposito m
  pinMode(5, OUTPUT); //bomba deposito 2
  pinMode(6, OUTPUT); //bomba deposito 1
  pinMode(7, OUTPUT);
  //Bomba ac y electrovalvulas ac
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(13, OUTPUT);

  //Bombas dc y motor de mezcla dc
  digitalWrite(4, HIGH);  //in 4, bomba deposito m
  digitalWrite(5, HIGH);  //in 3, bomba deposito 1
  digitalWrite(6, HIGH);   //in 2, bomba deposito 2
  digitalWrite(7, HIGH);  //in 1 , mezclador
  //Bomba ac y electrovalvulas ac
  digitalWrite(8, HIGH); //in 4 electrovalvula
  digitalWrite(9, HIGH); //in 3 es la bomba del camión
  digitalWrite(10, HIGH); //in 2 electrovalvula
  digitalWrite(13, LOW); //no c utiliza

  /*
   * Con esta convinacion se llena el bombo 2
   *  digitalWrite(8, LOW); //in 4 electrovalvula
  digitalWrite(9, LOW); //in 3 es la bomba del camión

  Con esta convinacion se llena el bombo 1
 digitalWrite(10, LOW); //in 2 electrovalvula
    digitalWrite(9, LOW); //in 3 es la bomba del camión

    Bomba bombo 1
 digitalWrite(5, LOW);  //in 3, bomba deposito 1


    Bomba bombo 2
   digitalWrite(6, LOW);   //in 2, bomba deposito 2


    
   */

  //configuracion bluethooot
  BT.begin(9600);
}

void loop() {

  
  while (i <= 3) {                      //tiene que ser menor que 3 para que se realice una vez por cada sensor
    digitalWrite(trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig, LOW);
    duracion = pulseIn(eco, HIGH);      //funcion que detecta cuanto tarda en llegar la señal al arduino por el pin de eco
    distancia = duracion / 58.2;        //calcula la distancia en funcion del valor encontrado anteriormente, el valor utilizado para el calculo es
    //sacado de la data sheet
    if (i == 0) {                       //en funcion de en que vez de ejecucion se encuentre el bucle el valor obtenido de distancia se guarda en una variable diferente
      distancia2 = distancia;
      // Serial.print("distancia1:");
      // Serial.println(distancia1);
    }

    if (i == 1) {
      distancia3 = distancia;
      // Serial.print("distancia2:");
      // Serial.println(distancia2);
    }

    if (i == 2) {
      distancia1 = distancia;
      // Serial.print("distancia3:");
      // Serial.println(distancia3);
    }

    trig = trig + 2;                     //se incrementan las variables de los pines a leer y poner en halto en dos para ir cambiando de sensor
    eco = eco + 2;
    i = i + 1;                           //se incrementa el valor de i en 1
  }

  /*if (distancia3 <= 16 or bandera1 == 1) {
    bandera1 = 1;
    Serial.println("Stop");
    }*/

  i = 0;                                 //se resetean los valores de los pines y de i una vez que se termino de ejecutar el bucle
  trig = 16;
  eco = 17;

  porcentaje1 = map(distancia1, 27, 6, 0, 100);
  porcentaje2 = map(distancia2, 27, 6, 0, 100);
  porcentaje3 = map(distancia3, 27, 6, 0, 100);

  constrainedPorcentaje1 = constrain(porcentaje1, 0, 100); // Limitar el valor para que no se pase de 100
  constrainedPorcentaje2 = constrain(porcentaje2, 0, 100); // Limitar el valor para que no se pase de 100
  constrainedPorcentaje3 = constrain(porcentaje3, 0, 100); // Limitar el valor para que no se pase de 100

  if (distanciaReal1 <= porcentaje1) {
    distanciaReal1 = distancia1;
  }

  if (distanciaReal2 <= porcentaje2) {
    distanciaReal2 = distancia2;
  }

  if (distanciaReal3 <= porcentaje3) {
    distanciaReal3 = distancia3;
  }

  if (porcentajeReal1 <= constrainedPorcentaje1) {
    porcentajeReal1 = constrainedPorcentaje1;
  }

  if (porcentajeReal2 <= constrainedPorcentaje2) {
    porcentajeReal2 = constrainedPorcentaje2;
  }

  if (porcentajeReal3 <= constrainedPorcentaje3) {
    porcentajeReal3 = constrainedPorcentaje3;
  }


Serial.print("distancia1:");
  Serial.print(distancia1);
  Serial.print("  distancia2:");
  Serial.print(distancia2);
  Serial.print("  distancia3:");
  Serial.println(distancia3);
 /* Serial.print("Porcentaje1:");
  Serial.print(porcentaje1);
  Serial.print("  Porcentaje2:");
  Serial.print(porcentaje2);
  Serial.print("  Porcentaje3:");
  Serial.println(porcentaje3);
  Serial.print("Porcentaje1C:");
  Serial.print(constrainedPorcentaje1);
  Serial.print("  Porcentaje2C:");
  Serial.print(constrainedPorcentaje2);
  Serial.print("  Porcentaje3C:");
  Serial.println(constrainedPorcentaje3);
  Serial.print("Porcentaje1R:");
  Serial.print(porcentajeReal1);
  Serial.print("  Porcentaje2R:");
  Serial.print(porcentajeReal2);
  Serial.print("  Porcentaje3R:");
  Serial.println(porcentajeReal3);*/

}
