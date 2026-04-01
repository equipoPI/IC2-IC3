#include <TimerFive.h>         //libreria que usaremos para leer siempre en el mismo instante de tiempo los datos bluethoot
#include <SoftwareSerial.h>    //libreria que usaremos para transmitir y recibir los datos que llegan desde el modulo bluetooth

int BT_Rx = 12;                //pines conectados al modulo bluetooth {cambiar la conexion al 10  y al 11 que son los que funcionaron en el practivo de comunicaicon de datos}
int BT_Tx = 11;

SoftwareSerial BT(BT_Rx, BT_Tx); //definimos con la libreria SoftwareSerial la comunicacion arduino, siempre que se mencione BT.comandoserial
//se ejecutara el comando serialsolo que utilizando los pines definidos anterormente
//esto lo hacemos con la finalidad de no estar conectando y desconectando el modulo bluetooth cada vez que se carga un codigo
//nuevo y tambien no queda disponible el puerto serie para ver datos de control en la PC.

//variables temporales del loop, cada cuanto enviar datos por bluethoot y puerto serie
unsigned long tiempoEnvio = 0;
unsigned long tiempoMonitoreo = 0;
unsigned long TInicioMezclado = 0;
unsigned long previousMillis = 0;
unsigned long TiempoMotorOn = 5000;
unsigned long TiempoMotorOff = 2000;

//variables control de transmicion bluetooth
int g = 0;
char valor = 'F';
String estado;
byte flagTransmicion = 1;
byte continuar = 0;

//variables de recepcion bluetooth
int convinacion = 0; //numero que indicara la canatidad a reponer + bombo
int bomboSeleccionado = 0;
int valorMaxReposicion = 0;
byte activarMezcla = 0;
byte vaciar = 0;

//variables estados de motores
byte flagParadaR = 0; //controla el parado de emergencia de la reposicion
byte flagR = 0;       //detecta si los niveles que se envian son para Reposicion
byte flagM = 0;       //detecta si los niveles que se envian son para Mezcla
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

//variables control de nivel
int i = 0;
int x = 25;
int bandera1 = 0;
float alpha = 0.5;  // Factor de suavizado, entre 0 y 1 para reducir oscilacion sensores
//trig y eco son pines de control de los sensores
int trig = 16;
int eco = 17;
//duracion es el tiempo que tarda en enviarce y recibir el rebote de las ondas de ultrasonido
float duracion;
//distancia es donde se almacena un valor derivado de una opercaion matematica
float distancia;
//son variables donde se gurada el nivel de cada bombo
float distancia1;
float distancia2;
float distancia3;
byte constrainedPorcentaje1 = 0;
byte constrainedPorcentaje2 = 0;
byte constrainedPorcentaje3 = 0;

//mediciones de distancias filtradas
byte Fporcentaje1 = 0;
byte Fporcentaje2 = 0;
byte Fporcentaje3 = 0;

//estadistica
#define NUM_READINGS 15  // Número de lecturas a promediar

float readings1[NUM_READINGS];  // Arreglo para almacenar las lecturas
float readings2[NUM_READINGS];  // Arreglo para almacenar las lecturas
float readings3[NUM_READINGS];  // Arreglo para almacenar las lecturas
int readIndex = 0;  // Índice para la lectura actual
float total1 = 0;  // Suma de las lecturas
float total2 = 0;  // Suma de las lecturas
float total3 = 0;  // Suma de las lecturas
float average1 = 0;  // Promedio de las lecturas
float average2 = 0;  // Promedio de las lecturas
float average3 = 0;  // Promedio de las lecturas

//variables control de caudal
volatile double waterFlow1;
volatile double waterFlow2;
double Ingrediente1 = 0;
double Ingrediente2 = 0;
double cantidad1 = 0;
double cantidad2 = 0;
double liquido1 = 0;
double liquido2 = 0;
int bandera_c = 1;
byte terminoLlenadoLiquido1 = 0;  //banderas de estado que activan el motor de mezcla cuando termina el
byte terminoLlenadoLiquido2 = 0;  //proceso de llenado del bombo de mezcla

//variables de tiempo de duracion de la mezcla
int TiempoHor = 0;  //en estas variables se guradara el tiempo que se envia desde la app y es el que debera de durar el mezclado
int TiempoMin = 0;
long TiempoHorUso = 0;
long TiempoMinUso = TiempoMin * 60000;
byte MotorOn = 1;
byte MotorOff = 0;


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
  digitalWrite(8, HIGH); //in 4 electrovalvula a Bombo 2
  digitalWrite(9, HIGH); //in 3 es la bomba del camión
  digitalWrite(10, HIGH); //in 2 electrovalvula a Bombo 1
  digitalWrite(13, LOW); //no c utiliza

  //configuracion de caudal
  waterFlow1 = 0;
  waterFlow2 = 0;

  attachInterrupt(digitalPinToInterrupt(2), pulse1, RISING);  //DIGITAL Pin 2: interrupcion externa con la llegada de un pulso del caudalimetro
  attachInterrupt(digitalPinToInterrupt(3), pulse2, RISING);  //DIGITAL Pin 3: interrupcion externa con la llegada de un pulso del caudalimetro

  //configuracion bluethooot
  BT.begin(9600);

  for (int K = 0; K < NUM_READINGS; K++) { //esta funcion se encarga de poner todas las posiciones de las cadenas que se usaran para
    readings1[K] = 0;                      //hacer los calculos estadisticos
    readings2[K] = 0;
    readings3[K] = 0;
  }

  Timer5.initialize(250000);        //configuramos el timer para que cada 200 ms lea los datos que vienen del arduino mediante la funcion lectura,
  //la configuracion se debe de escibir en micro segundos
  Timer5.attachInterrupt(lectura);  //funcion encargada de recibir variables tipo texto desde el modulo, a su vez tambien
  //transforma esos datos en variables numericas aptas para su trabajo
}

void loop() {
  //Funcion de monitoreo a travez del PC
  monitoreo();
  if ((tiempoMonitoreo + 2000) <= millis()) {
    //monitoreo();                          //envia datos al PC para control interno del programa
    tiempoMonitoreo = millis();
  }

  //control de nivel de depositos
  nivel();                                  //esta funcion se encarga de obtener la distancia del sensor
  filtrado();                               //esta funcion utiliza calculos de estadisticas aplicados a los sensores
  //esto se hace con el fin de eliminar medidas incorrectas

  //funciones relacionadas con Bluetooth
  if ((tiempoEnvio + 1000) <= millis()) {
    enviarValores();             //envia datos al modulo BT para retroalimentacion a la aplicacion del celular
    tiempoEnvio = millis();
  }

  //comunicacion para controlar el llenado y la mezcla
  //control de bomba a reposicoin de bombos
  activacion();

  //control de bombas a bombo de mezcla

  //control de caudal
  caudal();

  //sistema de mezclado

}
