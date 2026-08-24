import { BookOpen, Server, Cpu, Database, Send, Radio, Terminal, ArrowRight, HelpCircle, Wifi, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const GuiaSistema = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Guía de Funcionamiento del Sistema
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Aprende cómo interactúan el frontend, el backend de Django, el Broker MQTT y los sensores en tiempo real.
        </p>
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="flujo-general" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-muted/50 p-1 rounded-lg border border-border h-auto">
          <TabsTrigger value="flujo-general" className="py-2.5 text-sm gap-2">
            <Radio className="h-4 w-4" />
            Flujo General
          </TabsTrigger>
          <TabsTrigger value="telemetria" className="py-2.5 text-sm gap-2">
            <Cpu className="h-4 w-4" />
            Telemetría (Lectura)
          </TabsTrigger>
          <TabsTrigger value="comandos" className="py-2.5 text-sm gap-2">
            <Send className="h-4 w-4" />
            Controles (Escritura)
          </TabsTrigger>
          <TabsTrigger value="desarrollo" className="py-2.5 text-sm gap-2">
            <Terminal className="h-4 w-4" />
            Guía de Desarrollo
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Flujo General */}
        <TabsContent value="flujo-general" className="space-y-6 mt-4">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xl">Arquitectura de Comunicación SCADA</CardTitle>
              <CardDescription>
                Representación paso a paso de cómo viaja la información en nuestro ecosistema IoT.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {/* Diagrama Interactivo */}
              <div className="bg-background/80 rounded-xl p-6 border border-border/80 shadow-inner">
                <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
                  Camino de la Información (Lectura de Sensores)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border border-primary/20 shadow-md relative z-10 hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Cpu className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Paso 1</span>
                    <h4 className="text-sm font-bold text-foreground mt-1">Dispositivo / Sim</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Genera telemetría (ej. Temp = 25.4°C)</p>
                  </div>

                  {/* Arrow 1 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-[10px] font-mono text-primary animate-pulse">MQTT (1883)</span>
                    <ArrowRight className="h-6 w-6 text-primary/70 animate-bounce-horizontal" />
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border border-border shadow-md relative z-10 hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
                      <Wifi className="h-6 w-6 text-success" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Paso 2</span>
                    <h4 className="text-sm font-bold text-foreground mt-1">Broker MQTT</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Mosquitto recibe y enruta el mensaje</p>
                  </div>

                  {/* Arrow 2 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-[10px] font-mono text-success">Suscriptores</span>
                    <ArrowRight className="h-6 w-6 text-success/70" />
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border border-border shadow-md relative z-10 hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                      <Server className="h-6 w-6 text-warning" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Paso 3</span>
                    <h4 className="text-sm font-bold text-foreground mt-1">Django Worker</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Procesa, auto-descubre e inserta datos</p>
                  </div>

                  {/* Arrow 3 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-[10px] font-mono text-warning">ORM Django</span>
                    <ArrowRight className="h-6 w-6 text-warning/70" />
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border border-border shadow-md relative z-10 hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center mb-2">
                      <Database className="h-6 w-6 text-info" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Paso 4</span>
                    <h4 className="text-sm font-bold text-foreground mt-1">PostgreSQL</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Persiste el log y lecturas históricas</p>
                  </div>

                  {/* Arrow 4 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-[10px] font-mono text-info">Polling (3s)</span>
                    <ArrowRight className="h-6 w-6 text-info/70" />
                  </div>

                  {/* Step 5 */}
                  <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border border-primary/20 shadow-md relative z-10 hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Paso 5</span>
                    <h4 className="text-sm font-bold text-foreground mt-1">Frontend SCADA</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Refresca gráficos y estados en vivo</p>
                  </div>
                </div>
              </div>

              {/* Explicación textual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    ¿Cómo funciona el flujo de lectura?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Los sensores físicos (como una Raspberry Pi en planta) o simulados publican datos numéricos en tópicos MQTT.
                    El Broker Mosquitto distribuye estos mensajes al proceso de fondo **Django MQTT Worker**, el cual guarda cada dato en la tabla de lecturas de la base de datos PostgreSQL.
                    Finalmente, nuestro frontend pregunta cada 3 segundos a la API de Django por los últimos valores guardados, actualizando los indicadores en pantalla.
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    ¿Cómo funciona el flujo de control?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cuando el operador hace clic en un botón en la interfaz (como "Abrir Válvula"), el frontend envía una petición HTTP POST al backend.
                    Django recibe la solicitud, verifica los privilegios del usuario y publica inmediatamente un comando en el broker MQTT.
                    El dispositivo físico/simulador (que está suscrito a ese tópico) recibe el mensaje ("1" para abrir, "0" para cerrar) y realiza la acción física real de forma instantánea.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Telemetría (Lectura) */}
        <TabsContent value="telemetria" className="space-y-6 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Ingesta de Datos y Telemetría</CardTitle>
              <CardDescription>
                Esquema estructurado de topics e inserción automática.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Estructura del Tópico */}
              <div>
                <h3 className="text-md font-bold text-foreground mb-3">Estructura del Tópico Estándar</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm border border-border flex items-center justify-between overflow-x-auto">
                  <span className="text-primary font-bold">tenant</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-success font-bold">gateway_id</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-warning font-bold">sector</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-info font-bold">sistema</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-purple-400 font-bold">dispositivo</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-destructive font-bold">variable</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-3 text-xs">
                  <div className="p-2 bg-muted/40 rounded border border-border/50">
                    <span className="font-semibold block text-primary">tenant</span> Identificador de cliente / organización.
                  </div>
                  <div className="p-2 bg-muted/40 rounded border border-border/50">
                    <span className="font-semibold block text-success">gateway_id</span> La Raspberry o pasarela física de la planta.
                  </div>
                  <div className="p-2 bg-muted/40 rounded border border-border/50">
                    <span className="font-semibold block text-warning">sector</span> Sección dentro de la fábrica (ej: "mezclado").
                  </div>
                  <div className="p-2 bg-muted/40 rounded border border-border/50">
                    <span className="font-semibold block text-info">sistema</span> Máquina que agrupa (ej: "caldera-1").
                  </div>
                  <div className="p-2 bg-muted/40 rounded border border-border/50">
                    <span className="font-semibold block text-purple-400">dispositivo</span> Número de serie o id único del sensor.
                  </div>
                  <div className="p-2 bg-muted/40 rounded border border-border/50">
                    <span className="font-semibold block text-destructive">variable</span> Magnitud medida (ej: "temperatura").
                  </div>
                </div>
              </div>

              {/* Ejemplo real */}
              <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-2">
                <h4 className="text-sm font-bold text-foreground">Ejemplo de Mensaje MQTT Real:</h4>
                <div className="text-xs font-mono space-y-1">
                  <p><span className="text-muted-foreground"># Tópico:</span> <span className="text-foreground">acme/gw-planta1/produccion/mezclador/mixer-1/temperatura</span></p>
                  <p><span className="text-muted-foreground"># Payload (Valor plano):</span> <span className="text-success">42.8</span></p>
                </div>
              </div>

              {/* Auto Discovery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border p-4 rounded-lg bg-card space-y-2">
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-primary/30">Auto-Discovery</Badge>
                  <h4 className="text-sm font-bold text-foreground mt-1">Detección Automática de Sensores</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Si un sensor nuevo publica en el broker y su número de serie no existe en la base de datos, el **MQTT Worker** de Django lo crea automáticamente en estado preliminar offline, asociando su gateway y completando la categoría de sensor según el nombre de su variable.
                  </p>
                </div>
                <div className="border border-border p-4 rounded-lg bg-card space-y-2">
                  <Badge className="bg-success/20 text-success hover:bg-success/20 border-success/30">Heartbeats / LWT</Badge>
                  <h4 className="text-sm font-bold text-foreground mt-1">Monitoreo de Estado Online/Offline</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    El broker MQTT utiliza mensajes de "LWT" (Last Will and Testament) enviados por el gateway. Si el gateway se desconecta de forma repentina por falla eléctrica o de internet, el broker publica un estado offline en el tópico `+/+/status`, y Django automáticamente marca todos los sensores vinculados a ese gateway como fuera de línea.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Controles (Escritura) */}
        <TabsContent value="comandos" className="space-y-6 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Envío de Comandos de Control</CardTitle>
              <CardDescription>
                Cómo viajan las acciones manuales del operador hacia la maquinaria física.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Diagrama de escritura */}
              <div className="bg-background/80 rounded-xl p-6 border border-border shadow-inner">
                <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
                  Camino de un Comando (Acción del Operador)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center text-center">
                  <div className="p-3 bg-card rounded-lg border border-primary/20 shadow-md">
                    <BookOpen className="h-5 w-5 mx-auto text-primary mb-1" />
                    <h5 className="text-xs font-bold text-foreground">1. Clic en UI</h5>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Operador pulsa "Abrir válvula"</p>
                  </div>
                  <div className="text-muted-foreground text-xs font-mono">POST API</div>
                  <div className="p-3 bg-card rounded-lg border border-border shadow-md">
                    <Server className="h-5 w-5 mx-auto text-foreground mb-1" />
                    <h5 className="text-xs font-bold text-foreground">2. Django Backend</h5>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Procesa petición y audita acción</p>
                  </div>
                  <div className="text-muted-foreground text-xs font-mono">Publish MQTT</div>
                  <div className="p-3 bg-card rounded-lg border border-border shadow-md">
                    <Wifi className="h-5 w-5 mx-auto text-success mb-1" />
                    <h5 className="text-xs font-bold text-foreground">3. Broker MQTT</h5>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Distribuye el comando en el broker</p>
                  </div>
                  <div className="text-muted-foreground text-xs font-mono">Subscribe</div>
                  <div className="p-3 bg-card rounded-lg border border-primary/20 shadow-md">
                    <Cpu className="h-5 w-5 mx-auto text-primary mb-1" />
                    <h5 className="text-xs font-bold text-foreground">4. Actuador Real</h5>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Recibe el payload "1" y abre relé físico</p>
                  </div>
                </div>
              </div>

              {/* Registro de Auditoría */}
              <div className="flex gap-4 p-4 bg-warning/10 border border-warning/30 rounded-lg text-sm text-foreground">
                <ShieldAlert className="h-6 w-6 text-warning shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold">Seguridad y Auditoría Garantizada</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cada vez que se envía un comando a un dispositivo desde la interfaz, Django registra de manera atómica un registro en la tabla de **Auditoría**, guardando la fecha, la IP de origen, el usuario responsable y la descripción técnica de la acción para asegurar que todo control manual sea rastreable.
                  </p>
                </div>
              </div>

              {/* Ejemplo técnico de comandos */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                  Mapeo de Comandos Frontend ↔ MQTT
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="p-3">Categoría de Dispositivo</th>
                      <th className="p-3">Acción en Frontend</th>
                      <th className="p-3">Comando Interno</th>
                      <th className="p-3">Payload MQTT Enviado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="p-3 font-semibold text-foreground">VÁLVULA</td>
                      <td className="p-3">Abrir / Cerrar</td>
                      <td className="p-3 font-mono text-muted-foreground">"abrir" / "cerrar"</td>
                      <td className="p-3 font-mono font-bold text-success">"1" / "0"</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-3 font-semibold text-foreground">MOTOR / BOMBA</td>
                      <td className="p-3">Iniciar / Detener</td>
                      <td className="p-3 font-mono text-muted-foreground">"iniciar" / "detener"</td>
                      <td className="p-3 font-mono font-bold text-success">"1" / "0"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Guía de Desarrollo */}
        <TabsContent value="desarrollo" className="space-y-6 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Comandos Útiles y Configuración en Desarrollo</CardTitle>
              <CardDescription>
                Cómo interactuar de manera local con los servicios para probar integraciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible className="w-full">
                {/* Accordion Item 1 */}
                <AccordionItem value="worker" className="border-border">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    ¿Cómo levantar el MQTT Worker de Django?
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 text-xs text-muted-foreground">
                    <p>En la consola de tu servidor Django (con tu entorno virtual activo y en la carpeta <code>mysite</code>), corre el siguiente comando:</p>
                    <pre className="bg-muted p-3 rounded border border-border font-mono text-foreground overflow-x-auto">
                      python manage.py mqtt_worker
                    </pre>
                    <p>Este proceso quedará escuchando en tiempo real todo mensaje del broker mosquitto para persistirlo en la base de datos.</p>
                  </AccordionContent>
                </AccordionItem>

                {/* Accordion Item 2 */}
                <AccordionItem value="simuladores" className="border-border">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    ¿Cómo simular sensores usando un script de Python?
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 text-xs text-muted-foreground">
                    <p>Si deseas simular telemetría MQTT desde tu computadora local sin sensores físicos, puedes ejecutar el simulador que genera cambios realistas de temperatura, presión y estados:</p>
                    <pre className="bg-muted p-3 rounded border border-border font-mono text-foreground overflow-x-auto">
                      python scripts/sensor_simulator.py
                    </pre>
                  </AccordionContent>
                </AccordionItem>

                {/* Accordion Item 3 */}
                <AccordionItem value="mosquitto-cli" className="border-border">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Herramientas de Consola para Debugging (Mosquitto Clients)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground mb-1">Escuchar tópicos en tiempo real (Suscribirse):</p>
                      <pre className="bg-muted p-2 rounded border border-border font-mono text-foreground overflow-x-auto">
                        mosquitto_sub -h localhost -t "#" -v
                      </pre>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">Publicar una lectura de prueba de forma manual:</p>
                      <pre className="bg-muted p-2 rounded border border-border font-mono text-foreground overflow-x-auto">
                        mosquitto_pub -h localhost -t "acme/gw1/produccion/mezclado/sensor-1/temperatura" -m "26.5"
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* FAQs */}
              <div className="space-y-3 mt-4">
                <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Preguntas Frecuentes
                </h3>
                <div className="space-y-4">
                  <div className="border border-border/50 p-4 rounded-lg bg-muted/10 space-y-1">
                    <h4 className="text-xs font-bold text-foreground">¿Por qué no veo que los indicadores se actualicen en tiempo real en la UI?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Esto ocurre comúnmente si el comando <code>python manage.py mqtt_worker</code> no está corriendo en segundo plano en el servidor, o si los simuladores/dispositivos físicos no están publicando en los tópicos correctos. También valida que la configuración activa en el panel "Configuración MQTT" coincida con el broker Mosquitto en uso.
                    </p>
                  </div>
                  <div className="border border-border/50 p-4 rounded-lg bg-muted/10 space-y-1">
                    <h4 className="text-xs font-bold text-foreground">¿Qué ocurre si cambia la IP del Broker MQTT en producción?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      No necesitas modificar el código. Simplemente dirígete a la sección <strong>Configuración MQTT</strong> en la barra lateral del frontend, edita la conexión activa, actualiza la dirección del broker y puerto, y guarda los cambios. El worker de Django recargará y aplicará el cambio.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GuiaSistema;
