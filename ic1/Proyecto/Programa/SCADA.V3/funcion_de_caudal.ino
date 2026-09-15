void pulse1()  //medir la cantidad de flujo de agua
{
  if (terminoLlenadoLiquido1 == 0) {
    waterFlow1 += 1.0 / 450;        //450 es el valor para el caudalimetro de 1/2 pulgada, nosotros tenemos 1/4 pulgada
  }                                 // y su valor es 5880
}

void pulse2()   //medir la cantidad de flujo de agua
{
  if (terminoLlenadoLiquido1 == 1) {
    waterFlow2 += 1.0 / 450;        //450 es el valor para el caudalimetro de 1/2 pulgada, nosotros tenemos 1/4 pulgada
  }                                 // y su valor es 5880
}

void caudal() {
  nivel_liquido_1 = waterFlow1;
  nivel_liquido_2 = waterFlow2;
}
