// esta funcion se encarga de controlar todo lo relacionado con el preparado de la emzcla, control de mezclador y estado de bombo de mezcla
void llamadaProduccion() {
  duracion_total_ms = ((duracion_horas * 60) + duracion_minutos) * 60 * 1000;

  liquido1 = (Ingrediente1 - 10000) / 1000;
  liquido2 = (Ingrediente2 - 20000) / 1000;

  if (desechar == 1) {
    // prender bomba del bombo de mezcla y elimina todas las variables ya que se desecha la produccion que se estaba realizando
    digitalWrite(4, LOW);  //bomba depósito mezcla
    EBombaM = 1;
    liquido1 = 0;
    nivel_liquido_1 = 0;
    liquido2 = 0;
    nivel_liquido_2 = 0;
    Ingrediente1 = 0;
    Ingrediente2 = 0;
    EProceso = 4;
    mezcla_en_progreso = false;
    duracion_total_ms = 0;
    duracion_horas = 0;
    duracion_minutos = 0;
  }

  if (EProceso == 4 or EProceso == 2) {
    if (constrainedPorcentaje3 < 15) { //frena la bomba del bombo de mezcla cuando se detecta que sa vacio  el bombo
      digitalWrite(4, HIGH);           // bomba del deposito de mezcla
      vaciar = 0;
      EBombaM = 0;
      desechar = 0;
      EProceso = 0;
      EBombaM = 1;
      liquido1 = 0;
      nivel_liquido_1 = 0;
      liquido2 = 0;
      nivel_liquido_2 = 0;
      Ingrediente1 = 0;
      Ingrediente2 = 0;
      waterFlow1 = 0;
      waterFlow2 = 0;
      EProceso = 4;
      mezcla_en_progreso = false;
      duracion_total_ms = 0;
      duracion_horas = 0;
      duracion_minutos = 0;
      EProceso = 0;
      terminoLlenadoLiquido1 = 0;
    }
  }

  // Control del llenado de líquidos
  if (empezar == 1) {
    // Llenar con líquido 1
    if (nivel_liquido_1 == liquido1 && bomba_1_encendida == false) {
      terminoLlenadoLiquido1 = 1;
    }
    if (nivel_liquido_1 < liquido1 && bomba_1_encendida == false) {
      digitalWrite(5, LOW);
      bomba_1_encendida = true;
      Serial.println("Bomba 1 encendida: llenando líquido 1");
    } else if (nivel_liquido_1 >= liquido1 && bomba_1_encendida == true) {
      digitalWrite(5, HIGH);
      bomba_1_encendida = false;
      Serial.println("Llenado de líquido 1 completado.");
      terminoLlenadoLiquido1 = 1;
    }

    // Llenar con líquido 2
    if (nivel_liquido_2 < liquido2 && bomba_2_encendida == false && bomba_1_encendida == false) {
      digitalWrite(6, LOW);
      bomba_2_encendida = true;
      Serial.println("Bomba 2 encendida: llenando líquido 2");
    } else if (nivel_liquido_2 >= liquido2 && bomba_2_encendida == true) {
      digitalWrite(6, HIGH);
      bomba_2_encendida = false;
      Serial.println("Llenado de líquido 2 completado.");
    }

    // Iniciar mezcla si ambas bombas han terminado
    if (bomba_1_encendida == false && bomba_2_encendida == false && mezcla_en_progreso == false) {
      mezcla_en_progreso = true;
      tiempo_inicio = millis();
      tiempo_pausado = 0;
      Serial.println("Iniciando mezcla.");
      terminoLlenadoLiquido1 = 3;
      Ingrediente1 = 0;
      Ingrediente2 = 0 ;
    }
  }

  //Si se solicita pausar
  if (parar == 1) {
    //para las bombas
    mezcla_en_progreso = false;
    digitalWrite(4, HIGH);
    digitalWrite(5, HIGH);
    digitalWrite(6, HIGH);
    digitalWrite(7, HIGH);
    tiempo_pausado += millis() - tiempo_inicio;
    Serial.println("Proceso pausado");

    // Reiniciar variable de control
    parar = 0;
    desechar = 0;
    vaciar = 0;
    EMezclador = 0;
    EProceso = 3;
  }

  //Si se solicita continuar
  if (continuar == 1 && mezcla_en_progreso == false) {
    mezcla_en_progreso = true;
    tiempo_inicio = millis();             // Reiniciar tiempo considerando la pausa
    Serial.println("Proceso reanudado");
    continuar = 0;                        // Reiniciar variable de control
  }

  // Proceso de mezcla
  if (mezcla_en_progreso == true) {
    empezar = 0;                          // Reiniciar variable de control

    tiempo_transcurrido = millis() - tiempo_inicio + tiempo_pausado;
    tiempo_restante = duracion_total_ms - tiempo_transcurrido;

    horas_restantes = tiempo_restante / 3600000;
    minutos_restantes = (tiempo_restante / 60000) - (horas_restantes * 60);
    segundos_restantes = (tiempo_restante / 1000) - (horas_restantes * 3600) - (minutos_restantes * 60);

    // Mostrar tiempo restante por Serial
    Serial.print("Tiempo restante: ");
    Serial.print(horas_restantes);
    Serial.print("h ");
    Serial.print(minutos_restantes);
    Serial.println("m");
    Serial.print(segundos_restantes);
    Serial.println("s");

    // Ciclo del motor (5 segundos encendido, 2 segundos apagado)
    if (tiempo_transcurrido % 7000 < 5000) {
      digitalWrite(7, LOW);
      Serial.println("Motor encendido");
      EMezclador = 1;
      EProceso = 1;
    } else {
      digitalWrite(7, HIGH);
      Serial.println("Motor apagado");
      EMezclador = 0;
      EProceso = 1;
    }

    // Finalizar mezcla cuando el tiempo se acabe
    if (tiempo_restante <= 0) {
      digitalWrite(7, HIGH);
      mezcla_en_progreso = false;
      Serial.println("Mezcla finalizada. Esperando vaciado.");
      EProceso = 2;
      terminoLlenadoLiquido1 = 0;
    }
  }

  // Activar señal de vaciado si el tiempo de mezcla ha terminado
  if (mezcla_en_progreso == false && vaciar == 1) {
    digitalWrite(4, LOW);
    Serial.println("Pin de vaciado activado.");
    vaciar = 0; // Reiniciar variable de control
    EProceso = 4;
    liquido1 = 0;
    nivel_liquido_1 = 0;
    liquido2 = 0;
    nivel_liquido_2 = 0;
    Ingrediente1 = 0;
    Ingrediente2 = 0;
    duracion_total_ms = 0;
    duracion_horas = 0;
    duracion_minutos = 0;
  }
}
