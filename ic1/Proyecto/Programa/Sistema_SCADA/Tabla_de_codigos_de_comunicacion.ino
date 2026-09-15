// De Arduino a ==> BT/app
/*
  average1 === Nivel B1
  constrainedPorcentaje1 === Porcentaje NivelB1
        average2 === Nivel B3
        constrainedPorcentaje2 === Porcentaje NivelB2
        average3 === NM
        constrainedPorcentaje3 === Porcentaje NM
        cantidad1 === Liquido1
        cantidad2 === Liquido2
        EBomba1 === EB1
        EBomba2 === EB2
        EBombaM === EBM
        EMezclador === EM
        EBombaR === BR
        error === ERR
        horaRest === Tiempo Restante H
        minRest === Tiempo Restante M
        EProceso === Estado Bombo Mezcla

datos de caudalimetros en 
cantidad1 y cantidad2
*/

// De BT/app a ==> Arduino

/*
 R === Reposicion, valor convinacion, si es 1000 es el bombo 1 y si es 2000 es el bombo , del 1 al 100 es el limite 
 F === Para la reposicion
 D === Detiene la Mezcla, activarMezcla=0;
 V === vaviar = 1;
 A === continuar, se pone activarMezcla 1
 maximoReposicion === convinacion
 HoraTransmitida === HoraTotal
 Liquido1Definido === Ingrediente1
 Liquido2Definido === Ingrediente2
 */
