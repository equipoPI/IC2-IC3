void nivel() {
  while (i <= 3) {                      //tiene que ser menor que 3 para que se realice una vez por cada sensor
    digitalWrite(trig, HIGH);
    delayMicroseconds(5);
    digitalWrite(trig, LOW);
    duracion = pulseIn(eco, HIGH);      //funcion que detecta cuanto tarda en llegar la señal al arduino por el pin de eco
    distancia = duracion / 58.2;        //calcula la distancia en funcion del valor encontrado anteriormente, el valor utilizado para el calculo es sacado de la data sheet del sensor
    if (i == 0) {                       //en funcion de en que vez de ejecucion se encuentre el bucle el valor obtenido de distancia se guarda en una variable diferente
      distancia2 = distancia;
    }

    if (i == 1) {
      distancia3 = distancia;
    }

    if (i == 2) {
      distancia1 = distancia;
    }

    trig = trig + 2;                     //se incrementan las variables de los pines a leer y poner en halto de dos en dos para ir cambiando de sensor
    eco = eco + 2;                       
    i = i + 1;                           //se incrementa el valor de i en 1 para cambiar de sensor
  }

  i = 0;                                 //se resetean los valores de los pines y de i una vez que se termino de ejecutar el bucle
  trig = 16;
  eco = 17;
}
