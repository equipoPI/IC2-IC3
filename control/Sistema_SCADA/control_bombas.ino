void frenadoReposicion() {
  flagParadaR = 1;
  EBombaR = 0;
  //apagado bomba repo
  digitalWrite(9, HIGH);
  bomboSeleccionado = 0;
  //apagado electrovalvula
  digitalWrite(10, HIGH); //in 2 electrovalvula a Bombo 1
  //apagado electrovalvula
  digitalWrite(8, HIGH); //in 4 electrovalvula a Bombo 2
}

void activacion() {
  if (convinacion >= 1000 and convinacion <= 1100) {
    bomboSeleccionado = 1;
    valorMaxReposicion = convinacion - 1000;
  }

  if (convinacion >= 2000 and convinacion <= 2200) {
    bomboSeleccionado = 2;
    valorMaxReposicion = convinacion - 2000;
  }

  if (flagParadaR == 0) { //en el caso de que se presione parar por algun motivo se desactivan la siguientes
    //ejecuciones y se deberan cargar los valores nuevamente si se quiere reanudar
    if (bomboSeleccionado == 1) {
      if (valorMaxReposicion <= Fporcentaje1 and EBombaR == 0) {
        error = 722;
      }

      if (valorMaxReposicion > Fporcentaje1 and Fporcentaje1 < 100) {
        EBombaR = 1;
        //encendido electrovalvula
        digitalWrite(10, LOW); //in 2 electrovalvula a Bombo 1
        //encendido bomba repo
        digitalWrite(9, LOW);
      }

      if (valorMaxReposicion <= Fporcentaje1) {
        EBombaR = 0;
        flagParadaR = 1;
        valorMaxReposicion = 0;
        //apagado bomba repo
        digitalWrite(9, HIGH);
        bomboSeleccionado = 0;
        //apagado electrovalvula
        digitalWrite(10, HIGH); //in 2 electrovalvula a Bombo 1
      }
    }

    if (bomboSeleccionado == 2) {
      if (valorMaxReposicion <= Fporcentaje2 and EBombaR == 0) {
        error = 722;
      }

      if (valorMaxReposicion > Fporcentaje2 and Fporcentaje2 < 100) {
        EBombaR = 1;
        //encendido bomba repo
        digitalWrite(9, LOW);
        //encendido electrovalvula
        digitalWrite(8, LOW); //in 4 electrovalvula a Bombo 2
      }

      if (valorMaxReposicion <= Fporcentaje2 or Fporcentaje2 == 100) {
        EBombaR = 0;
        flagParadaR = 1;
        valorMaxReposicion = 0;
        //apagado bomba repo
        digitalWrite(9, HIGH);
        //apagado electrovalvula
        digitalWrite(8, HIGH); //in 4 electrovalvula a Bombo 2
        bomboSeleccionado = 0;
      }
    }
  }
  /* byte EMezclador = false;
    byte EBomba1 = false;
    byte EBomba2 = false;
    byte EValvula1 = false;
    byte EValvula2 = false;*/


  TiempoHorUso = TiempoHor * 3600000;
  TiempoMinUso = TiempoMin * 60000;

  liquido1 = (Ingrediente1 - 10000) / 1000;
  liquido2 = (Ingrediente2 - 20000) / 1000;


  if (continuar == 1) {
    //inicio de transferencia de contenido de bombos 1 y 2 al bombo de mezcla
    if (liquido1 > cantidad1 and liquido1 > 0) {
      //bomba dc correspondiente
      digitalWrite(5, LOW);  //in 3, bomba deposito 1
      EBomba1 = 1;
      EProceso = 1;
    }

    if (liquido2 > cantidad2 and liquido2 > 0 and arranque2 == 1) {
      //bomba dc correspondiente
      digitalWrite(6, LOW);   //in 2, bomba deposito 2
      EBomba2 = 1;
      EProceso = 1;
    }

    //finalizacion de transferencia de contenido de bombos 1 y 2 al bombo de mezcla
    if (liquido1 < cantidad1) {
      terminoLlenadoLiquido1 = 1;
      //bomba dc correspondiente
      digitalWrite(5, HIGH);  //in 3, bomba deposito 1
      EBomba1 = 0;
      arranque2 = 1;
    }

    if (liquido2 < cantidad2 and terminoLlenadoLiquido1 == 1) {
      terminoLlenadoLiquido2 = 1;
      //bomba dc correspondiente
      digitalWrite(6, HIGH);   //in 2, bomba deposito 2
      EBomba2 = 0;
      arranque2 = 0;
    }

    if (terminoLlenadoLiquido1 == 1 and terminoLlenadoLiquido2 == 1) {
      activarMezcla == 1;
      terminoLlenadoLiquido1 = 0;
      terminoLlenadoLiquido2 = 0;
      liquido1 = 0;
      liquido2 = 0;
      TInicioMezclado = millis();
    }
  }

  if (activarMezcla == 1) {
    unsigned long currentMillis = millis(); // Tiempo actual
    EProceso = 1;

    // Encender el motor por 5 segundos
    if ((currentMillis - previousMillis) >= TiempoMotorOn and MotorOn == 1) {
      //apagar el motor
      digitalWrite(7, HIGH);  //in 1 , mezclador
      previousMillis = currentMillis;
      MotorOn = 0;
      MotorOff = 1;
    }

    // Apagar el motor por 2 segundos
    if ((currentMillis - previousMillis) >= TiempoMotorOff and MotorOff == 1) {
      //encender motor
      digitalWrite(7, LOW);  //in 1 , mezclador
      previousMillis = currentMillis;
      MotorOn = 1;
      MotorOff = 0;
    }
    //motor de mezclador
  }

  if ((activarMezcla == 0 and continuar == 0) or detener == 1) {
    EProceso = 0;
    //apagar motor de mezclador
    digitalWrite(7, HIGH);  //in 1 , mezclador

    //apagado bomba Bombo1
    digitalWrite(5, HIGH);  //in 3, bomba deposito 1
    EBomba1 = 0;

    //apagado bomba Bombo2
    digitalWrite(6, HIGH);   //in 2, bomba deposito 2
    EBomba2 = 0;
    desechar = 0;
    detener = 0;
    digitalWrite(4, HIGH);  //in 4, bomba deposito m
  }

  if (desechar == 1) {
    //prender bomba del bombo de mezcla
    digitalWrite(4, LOW);  //in 4, bomba deposito m
    EBombaM = 1;
    liquido1 = 0;
    cantidad1 = 0;
    liquido2 = 0;
    cantidad2 = 0;
  }

  if (vaciar == 1) {
    if (EProceso == 2) {
      //prender bomba del bombo de mezcla
      digitalWrite(4, LOW);  //in 4, bomba deposito m
      EBombaM = 1;
      liquido1 = 0;
      cantidad1 = 0;
      liquido2 = 0;
      cantidad2 = 0;
    }

    if (EProceso == 0 and EProceso == 1) {
      digitalWrite(4, LOW);  //in 4, bomba deposito m
      EBombaM = 1;
      liquido1 = 0;
      cantidad1 = 0;
      liquido2 = 0;
      cantidad2 = 0;

      //apagado bomba Bombo1
      digitalWrite(5, HIGH);  //in 3, bomba deposito 1
      EBomba1 = 0;

      //apagado bomba Bombo2
      digitalWrite(6, HIGH);   //in 2, bomba deposito 2
      EBomba2 = 0;
    }
  }

  if (constrainedPorcentaje3 < 15) {
    digitalWrite(4, HIGH);  //in 4, bomba deposito m
    vaciar = 0;
    EBombaM = 0;
    desechar = 0;
  }

  if (activarMezcla == 1) {
    horaRest = ((TInicioMezclado + TiempoMin + TiempoHor) - millis()) / 3600000;
    minRest = ((TInicioMezclado + TiempoMin + TiempoHor) - millis()) / 60000;

    if ((TInicioMezclado + TiempoMin + TiempoHor) < millis()) {
      liquido1 = 0;
      cantidad1 = 0;
      liquido2 = 0;
      cantidad2 = 0;
      activarMezcla == 0;
      EProceso = 2;
      terminoLlenadoLiquido1=0;
      terminoLlenadoLiquido2=0;
      arranque2=0;
    }
  }
}
