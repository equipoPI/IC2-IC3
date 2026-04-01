void pulse1()   //medir la cantidad de flujo de agua del caudalimetro 1
{
  if (terminoLlenadoLiquido1 == 0) {
    waterFlow1 += 1.0 / 1400;        //450 es el valor para el caudalimetro de 1/2 pulgada, nosotros tenemos 1/4 pulgada
  }                                 // y su valor es 5880
}

void pulse2()   //medir la cantidad de flujo de agua del caudalimetro 2
{
  if (terminoLlenadoLiquido1 == 1) {
    waterFlow2 += 1.0 / 5880;        //450 es el valor para el caudalimetro de 1/2 pulgada, nosotros tenemos 1/4 pulgada
  }                                 // y su valor es 5880
}

//las funaicones anteriores son se ejecutan por interrupciones externas de forma independiente cuando se detecta en los caudalimetros
//y en posteriori se guarda el valor de las variables de estas funciones en otras de caracter global y que luego se usara para controlar
//los procesos del sistema
void caudal() {
  nivel_liquido_1 = waterFlow1;
  nivel_liquido_2 = waterFlow2;
}
