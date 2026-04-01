void frenadoReposicion() {
  flagParadaR = 1;
  EBombaR = 0;
  //apagado bomba reposicion
  digitalWrite(9, HIGH);
  bomboSeleccionado = 0;
  //apagado electrovalvula
  digitalWrite(10, HIGH); //in 2 electrovalvula a Bombo 1
  //apagado electrovalvula
  digitalWrite(8, HIGH); //in 4 electrovalvula a Bombo 2
}

void llamadaRepo() {
  //se decodifica que bombo y cuanto se debe de reponer
  if (combinacion >= 1000 and combinacion <= 1100) {
    bomboSeleccionado = 1;
    valorMaxReposicion = combinacion - 1000;
  }

  if (combinacion >= 2000 and combinacion <= 2200) {
    bomboSeleccionado = 2;
    valorMaxReposicion = combinacion - 2000;
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
        digitalWrite(10, LOW);
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
        digitalWrite(10, HIGH); 
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
        digitalWrite(8, LOW);
      }

      if (valorMaxReposicion <= Fporcentaje2 or Fporcentaje2 == 100) {
        EBombaR = 0;
        flagParadaR = 1;
        valorMaxReposicion = 0;
        //apagado bomba repo
        digitalWrite(9, HIGH);
        //apagado electrovalvula
        digitalWrite(8, HIGH);
        bomboSeleccionado = 0;
      }
    }
  }
}
