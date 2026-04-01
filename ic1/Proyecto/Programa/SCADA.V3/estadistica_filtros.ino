void filtrado() { // Restar la lectura más antigua de la suma total

  total1 = total1 - readings1[readIndex];
  total2 = total2 - readings2[readIndex];
  total3 = total3 - readings3[readIndex];

  // guardar los valores de distancia
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

  Fporcentaje1 = map(average1, 27, 6, 0, 100);
  Fporcentaje2 = map(average2, 27, 6, 0, 100);
  Fporcentaje3 = map(average3, 27, 6, 0, 100);

  constrainedPorcentaje1 = constrain(Fporcentaje1, 0, 100); // Limitar el valor para que no se pase de 100
  constrainedPorcentaje2 = constrain(Fporcentaje2, 0, 100); // Limitar el valor para que no se pase de 100
  constrainedPorcentaje3 = constrain(Fporcentaje3, 0, 100); // Limitar el valor para que no se pase de 100

}
