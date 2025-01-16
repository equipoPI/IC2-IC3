# Empleados y Recursos Humanos
import random
from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now




class Fabrica(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    pais = models.CharField(max_length=100)
    fecha_creacion = models.DateField(default=now)

    def __str__(self):
        return self.nombre



# Modelo de Sección
class Seccion(models.Model):
    nombre = models.CharField(max_length=100)
    fabrica = models.ForeignKey('Fabrica', on_delete=models.CASCADE, related_name="secciones")
    capacidad_trabajadores = models.PositiveIntegerField()
    tamano_seccion = models.FloatField()  # Tamaño en m²
    agenda = models.TextField(blank=True, null=True)  # Cronograma o agenda de actividades

    class Meta:
        unique_together = ('nombre', 'fabrica')  # Cada sección es única dentro de una fábrica

    def __str__(self):
        return f"{self.nombre} - {self.fabrica.nombre}"



class TipoTarifa(models.Model):
    nombre = models.CharField(max_length=100)
    tarifa_por_hora = models.DecimalField(max_digits=10, decimal_places=2)
    tarifa_extra = models.DecimalField(max_digits=10, decimal_places=2)  # Incluye tarifa extra directamente
    fecha_alta = models.DateField(default=now)
    clave = models.CharField(max_length=150, unique=True, editable=False)

    def save(self, *args, **kwargs):
        self.clave = f"{self.nombre}-{self.fecha_alta.strftime('%Y%m%d')}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} - ${self.tarifa_por_hora}/hora, extra: ${self.tarifa_extra}/hora"



class HistorialEstadoEmpleado(models.Model):
    empleado = models.ForeignKey('Empleado', on_delete=models.CASCADE, related_name="historial_estados")
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    motivo = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"De {self.estado_anterior} a {self.estado_nuevo} - {self.empleado.nombre} ({self.fecha_cambio})"



class Empleado(models.Model):
    ESTADOS_EMPLEADO = [
        ('ACTIVO', 'Activo'),
        ('DESPEDIDO', 'Despedido'),
        ('JUBILADO', 'Jubilado'),
        ('OTRO', 'Otro'),
    ]

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, primary_key=True, unique=True)
    seccion = models.ForeignKey('Seccion', on_delete=models.CASCADE, related_name="empleados_directos")

    fabrica = models.ForeignKey(Fabrica, on_delete=models.CASCADE, related_name="empleados")

    RANGO_OPCIONES = [
        ('1', 'Director'),
        ('2', 'Gerente'),
        ('3', 'Jefe de Sección'),
        ('4', 'Coordinador'),
        ('5', 'Especialista'),
        ('6', 'Empleado'),
        ('7', 'Pasante'),
        ('8', 'Contratista'),
    ]

    rango = models.CharField(max_length=50, choices=RANGO_OPCIONES)
    fecha_contratacion = models.DateField()
    contacto = models.CharField(max_length=50)
    direccion = models.CharField(max_length=255)
    tipo_tarifa = models.ForeignKey(TipoTarifa, on_delete=models.SET_NULL, null=True)
    cbu = models.CharField(max_length=22, blank=True, null=True)  # CBU del empleado
    alias_bancario = models.CharField(max_length=50, blank=True, null=True)  # Alias bancario del empleado
    clave = models.CharField(max_length=10, unique=True, editable=False, default="")
    email = models.EmailField(unique=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_EMPLEADO, default='ACTIVO')

    def save(self, *args, **kwargs):
        # Si el estado cambia, registrar el historial
        if self.pk:  # Si el objeto ya existe en la base de datos
            original = Empleado.objects.get(pk=self.pk)
            if original.estado != self.estado:
                HistorialEstadoEmpleado.objects.create(
                    empleado=self,
                    estado_anterior=original.estado,
                    estado_nuevo=self.estado,
                    motivo=f"Cambio de estado a {self.estado}"  # Aquí puedes agregar más detalles si lo deseas
                )
        super().save(*args, **kwargs)

    def calcular_antiguedad(self):
        hoy = now().date()
        self.antiguedad = hoy.year - self.fecha_contratacion.year
        if (hoy.month, hoy.day) < (self.fecha_contratacion.month, self.fecha_contratacion.day):
            self.antiguedad -= 1
        self.save()

    def __str__(self):
        return f"{self.nombre} {self.apellido} - {self.fabrica}"



class EmpleadoSeccion(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="secciones")
    seccion = models.ForeignKey('Seccion', on_delete=models.CASCADE, related_name="empleados_historial")
    fecha_union = models.DateField(default=now)
    fecha_salida = models.DateField(blank=True, null=True)  # Si es None, sigue activo en la sección

    class Meta:
        unique_together = ('empleado', 'seccion', 'fecha_union')  # Evita duplicados para la misma relación

    def __str__(self):
        return f"{self.empleado} en {self.seccion} desde {self.fecha_union}"



class PruebasMedicas(models.Model):
    empleado = models.ForeignKey('Empleado', on_delete=models.CASCADE, related_name="pruebas_medicas")
    fecha_prueba = models.DateField(default=now)
    tipo_prueba = models.CharField(max_length=100)  # Ejemplo: "Examen de sangre", "Rayos X"
    resultado = models.TextField(blank=True, null=True)  # Observaciones o resultados de la prueba
    documento = models.FileField(
        upload_to='pruebas_medicas/documentos/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Sube un archivo relacionado con la prueba médica (PDF, Word, etc.)"
    )
    imagen = models.ImageField(
        upload_to='pruebas_medicas/imagenes/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Sube una imagen relacionada con la prueba médica (JPG, PNG, etc.)"
    )
    observaciones = models.TextField(blank=True, null=True)

    def clean(self):
        """
        Validación para asegurarse de que al menos uno de los dos (documento o imagen) sea subido.
        """
        if not self.documento and not self.imagen:
            raise ValidationError("Debes cargar un documento o una imagen.")

    def __str__(self):
        return f"Prueba médica de {self.empleado} - {self.tipo_prueba} ({self.fecha_prueba})"


class RegistroFichaje(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="fichajes")
    fecha = models.DateField(default=now)
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField(null=True, blank=True)

    def calcular_tarifas(self):
        if not self.hora_salida:
            return {"error": "Salida no registrada"}

        entrada_real = datetime.combine(self.fecha, self.hora_entrada)
        salida_real = datetime.combine(self.fecha, self.hora_salida)

        tipo_tarifa = self.empleado.tipo_tarifa
        if not tipo_tarifa:
            return {"error": "Tipo de tarifa no asignado"}

        tiempo_total = salida_real - entrada_real
        horas_totales = tiempo_total.total_seconds() / 3600

        horas_normales = min(horas_totales, 8)  # Supongamos 8 horas normales por día
        horas_extras = max(0, horas_totales - 8)

        salario_normal = horas_normales * tipo_tarifa.tarifa_por_hora
        salario_extra = horas_extras * tipo_tarifa.tarifa_extra

        return {
            "tiempo_normal": round(horas_normales, 2),
            "tiempo_extra": round(horas_extras, 2),
            "salario_normal": round(salario_normal, 2),
            "salario_extra": round(salario_extra, 2),
        }

    def __str__(self):
        return f"{self.empleado} - {self.fecha}: {self.hora_entrada} a {self.hora_salida or 'Pendiente'}"


class PagoMensual(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="pagos_mensuales")
    mes = models.DateField()
    total_horas_normales = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_horas_extras = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_pago = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def calcular_pago_mensual(self):
        fichajes = RegistroFichaje.objects.filter(
            empleado=self.empleado,
            fecha__year=self.mes.year,
            fecha__month=self.mes.month
        )

        horas_normales = 0
        horas_extras = 0
        total_pago = 0

        # Cálculo de fichajes
        for fichaje in fichajes:
            tarifas = fichaje.calcular_tarifas()
            if 'error' not in tarifas:
                horas_normales += tarifas['tiempo_normal']
                horas_extras += tarifas['tiempo_extra']
                total_pago += tarifas['salario_normal'] + tarifas['salario_extra']

        # Descuento por sanciones
        sanciones = Sancion.objects.filter(
            empleado=self.empleado,
            fecha_inicio__month=self.mes.month,
            fecha_inicio__year=self.mes.year
        )
        dias_sancionados = sum(sancion.duracion() for sancion in sanciones)
        descuento_sanciones = (dias_sancionados / 30) * total_pago
        total_pago -= descuento_sanciones

        # Bonos por eventos especiales
        eventos = EventoEspecial.objects.filter(
            empleado=self.empleado,
            fecha__month=self.mes.month,
            fecha__year=self.mes.year
        )
        total_bonos = sum(evento.monto for evento in eventos)
        total_pago += total_bonos

        # Vacaciones tomadas en el mes
        vacaciones = Vacacion.objects.filter(empleado=self.empleado)
        dias_vacaciones_tomados = sum(
            vacacion.dias_tomados for vacacion in vacaciones if vacacion.dias_tomados > 0
        )
        descuento_vacaciones = (dias_vacaciones_tomados / 30) * total_pago
        total_pago -= descuento_vacaciones

        self.total_horas_normales = horas_normales
        self.total_horas_extras = horas_extras
        self.total_pago = total_pago
        self.save()

    def __str__(self):
        return f"Pago mensual de {self.empleado} - {self.mes.strftime('%B %Y')}: ${self.total_pago}"


class Sancion(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="sanciones")
    motivo = models.CharField(max_length=255)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(max_length=10, choices=ESTADOS, default='pendiente')
    solicitada_por = models.CharField(max_length=100)
    autorizada_por = models.ForeignKey(
        Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name="sanciones_autorizadas"
    )
    fecha_cambio_estado = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Sanción: {self.empleado} - {self.estado}"


class Promocion(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="promociones")
    descripcion = models.CharField(max_length=255)
    fecha = models.DateField()
    nuevo_rango = models.CharField(max_length=50, choices=Empleado._meta.get_field('rango').choices)
    estado = models.CharField(max_length=10, choices=ESTADOS, default='pendiente')
    solicitada_por = models.CharField(max_length=100)
    autorizada_por = models.ForeignKey(
        Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name="promociones_autorizadas"
    )
    fecha_cambio_estado = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Promoción: {self.empleado} a {self.nuevo_rango} - {self.estado}"


class Transferencia(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="transferencias")
    nueva_direccion = models.CharField(max_length=255)
    fecha = models.DateField()
    autorizado_por = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, related_name="transferencias_autorizadas")

    def __str__(self):
        return f"Transferencia de {self.empleado} a {self.nueva_direccion} el {self.fecha}"


class Falta(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="faltas")
    fecha = models.DateField()
    motivo = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Falta de {self.empleado} el {self.fecha}"


class Vacacion(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(max_length=10, choices=ESTADOS, default='pendiente')
    solicitada_por = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="vacaciones")
    autorizada_por = models.ForeignKey(
        Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name="vacaciones_autorizadas"
    )
    fecha_cambio_estado = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.pk:  # Si la vacación ya existe en la base de datos
            original = Vacacion.objects.get(pk=self.pk)
            if original.estado != self.estado:
                # Registrar el cambio de estado
                HistorialEstadoVacacion.objects.create(
                    vacacion=self,
                    estado_anterior=original.estado,
                    estado_nuevo=self.estado,
                    realizado_por=self.autorizada_por
                )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vacaciones: {self.solicitada_por} - {self.estado}"


class HistorialEstadoVacacion(models.Model):
    vacacion = models.ForeignKey('Vacacion', on_delete=models.CASCADE, related_name="historial_estados")
    estado_anterior = models.CharField(max_length=10)
    estado_nuevo = models.CharField(max_length=10)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    realizado_por = models.ForeignKey('Empleado', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Vacación #{self.vacacion.id}: {self.estado_anterior} -> {self.estado_nuevo} ({self.fecha_cambio})"


class Licencia(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    TIPOS = [
        ('maternidad', 'Maternidad'),
        ('psiquiatrica', 'Psiquiatrica'),
        ('enfermedad', 'Enfermedad'),
        ('por accidente', 'Por accidente'),
        ('problemas familiares', 'Problemas familiares'),
    ]

    BINARIO= [
        ('sí', 'Sí'),
        ('no', 'No'),
    ]

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    tipo = models.CharField(max_length=20, choices=TIPOS, default='Maternidad')
    gose_sueldo = models.CharField(max_length=20, choices=BINARIO, default='Si')
    solicitada_por = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="licencias")
    autorizada_por = models.ForeignKey(
        Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name="licencias_autorizadas"
    )


class EventoEspecial(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="eventos_especiales")
    descripcion = models.TextField()
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateField()

    def __str__(self):
        return f"Evento especial para {self.empleado} - ${self.monto} el {self.fecha}"


class PoliticaVacaciones(models.Model):
    fabrica = models.ForeignKey(Fabrica, on_delete=models.CASCADE, related_name="politicas_vacaciones")
    pais = models.CharField(max_length=100)  # País asociado a la política
    estado = models.CharField(max_length=100,default="Desconocido")  # Estado o provincia
    antiguedad_minima = models.PositiveIntegerField(default=0)  # En años
    antiguedad_maxima = models.PositiveIntegerField(default=0)
    dias_vacaciones = models.PositiveIntegerField()  # Número de días de vacaciones por año

    class Meta:
        # La combinación de 'pais' y 'estado' será única
        unique_together = ['pais', 'estado']  # Esto asegura que no haya duplicados de pais y estado

    def __str__(self):
        return f"{self.pais} - {self.estado} - {self.antiguedad_minima}-{self.antiguedad_maxima} años: {self.dias_vacaciones} días"


class AccidenteLaboral(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="accidentes")
    fecha_accidente = models.DateField()
    descripcion = models.TextField()
    indemnizacion_autorizada = models.BooleanField(default=False)
    proveedor_seguro = models.CharField(max_length=255)  # Proveedor de seguro
    monto_indemnizacion = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dias_incapacidad = models.PositiveIntegerField(default=0)  # Días en los que el empleado no trabaja

    def autorizar_indemnizacion(self):
        # Aquí puedes agregar la lógica para autorizar la indemnización
        self.indemnizacion_autorizada = True
        self.save()

    def __str__(self):
        return f"Accidente de {self.empleado} - {self.fecha_accidente}"


    



# Modelo de Capacitación
class Capacitacion(models.Model):
    TIPOS_CAPACITACION = [
        ('TECNICA', 'Técnica'),
        ('SEGURIDAD', 'Seguridad'),
        ('HIGIENE', 'Higiene'),
        ('SALUD', 'Salud'),
        ('RRHH', 'Recursos Humanos'),
    ]

    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    duracion_horas = models.PositiveIntegerField()  # Duración en horas
    tipo = models.CharField(
        max_length=20,
        choices=TIPOS_CAPACITACION,
        default='TECNICA'
    )  # Tipo de capacitación
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"

# Modelo intermedio para relacionar empleados y capacitaciones
class EmpleadoCapacitacion(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="capacitaciones")
    capacitacion = models.ForeignKey(Capacitacion, on_delete=models.CASCADE, related_name="empleados")
    fecha_realizacion = models.DateField()  # Fecha en que se realizó la capacitación
    estado = models.CharField(
        max_length=20,
        choices=[
            ('COMPLETADO', 'Completado'),
            ('EN_PROCESO', 'En proceso'),
            ('NO_INICIADO', 'No iniciado')
        ],
        default='NO_INICIADO'
    )
    calificacion = models.FloatField(blank=True, null=True)  # Calificación obtenida (opcional)

    def __str__(self):
        return f"{self.empleado} - {self.capacitacion} ({self.estado})"

#hasta aca las clases relacionadas con empleado



# Modelo de Proveedor
class Proveedor(models.Model):
    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=50, choices=[
        ('ART', 'ART'),
        ('Seguro', 'Seguro'),
        ('Equipamiento', 'Equipamiento'),
        ('Materia Prima', 'Materia Prima'),
        ('Transporte', 'Transporte'),
        ('Publicidad', 'Publicidad'),
        ('Ayuda Legal', 'Ayuda Legal'),
        ('Ayuda Financiera', 'Ayuda Financiera'),
        ('Otro', 'Otro'),
    ])
    contacto = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.nombre


# Modelo de Inventario
class Inventario(models.Model):
    fabrica = models.ForeignKey('Fabrica', on_delete=models.CASCADE, related_name="inventarios")
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    capacidad_m2 = models.FloatField()  # Capacidad total en m²
    usados_m2 = models.FloatField(default=0)  # Espacio ocupado
    creado_el = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.fabrica.nombre})"



class ItemInventario(models.Model):
    TIPOS = [
        ('RESIDUO', 'Residuo'),
        ('PRODUCTO', 'Producto'),
        ('MATERIA PRIMA', 'Materia Prima'),
        ('REPUESTO', 'Repuesto'),
        ('COMPONENTE', 'Componente'),
        ('MÁQUINA', 'Máquina'),
        ('ACTUADOR/SENSOR', 'Actuador/Sensor'),
        ('HERRAMIENTA', 'Herramienta'),
        ('VEHÍCULO', 'Vehículo'),
        ('ELECTRODOMÉSTICO', 'Electrodoméstico'),
        ('VARIOS', 'Varios'),
    ]

    numero_serie = models.CharField(max_length=50, primary_key=True)  # Clave primaria personalizada
    inventario = models.ForeignKey('Inventario', on_delete=models.CASCADE, related_name="items")
    proveedor = models.ForeignKey('Proveedor', on_delete=models.SET_NULL, null=True, related_name="items")
    seccion = models.ForeignKey('Seccion', on_delete=models.SET_NULL, null=True, blank=True)
    categoria = models.CharField(max_length=40, choices=TIPOS)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    cantidad = models.PositiveIntegerField()
    unidad = models.CharField(max_length=50, default="unidades")
    espacio_m2 = models.FloatField()  # Espacio en m² que ocupa cada unidad
    creado_el = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.numero_serie} - {self.nombre} ({self.inventario.nombre})"


# Modificación del modelo PedidoProveedor
class PedidoProveedor(models.Model):
    proveedor = models.ForeignKey('Proveedor', on_delete=models.CASCADE, related_name='pedidos')
    fecha_pedido = models.DateTimeField(auto_now_add=True)
    fecha_recibido = models.DateTimeField(blank=True, null=True)
    total_monto = models.DecimalField(max_digits=10, decimal_places=2)
    empleado_encargado = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pedidos_proveedor_realizados')
    items = models.ManyToManyField('ItemInventario', through='DetallePedidoProveedor', related_name='items_pedidos_proveedor')
    vehiculo_usado = models.ForeignKey('ItemInventario', on_delete=models.SET_NULL, null=True, blank=True, related_name='vehiculos_usados_en_pedidos')
    factura = models.FileField(
        upload_to='pedidos_proveedor/facturas/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Carga una factura o recibo relacionado con el pedido."
    )
    imagen_factura = models.ImageField(
        upload_to='pedidos_proveedor/imagenes/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Carga una imagen del recibo relacionado con el pedido."
    )

    def __str__(self):
        return f"Pedido a {self.proveedor.nombre} el {self.fecha_pedido}"

class DetallePedidoProveedor(models.Model):
    pedido = models.ForeignKey(PedidoProveedor, on_delete=models.CASCADE, related_name='detalles')
    item = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name='detalles_pedido_proveedor')
    cantidad_pedida = models.PositiveIntegerField()
    cantidad_recibida = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.cantidad_pedida}/{self.cantidad_recibida} de {self.item.nombre}"


class Comprador(models.Model):
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    direccion = models.CharField(max_length=255)
    email = models.EmailField(unique=True, blank=True, null=True)

    def __str__(self):
        return self.nombre


# Modificación del modelo PedidoComprador
class PedidoComprador(models.Model):
    comprador = models.ForeignKey('Comprador', on_delete=models.CASCADE, related_name='pedidos')
    fecha_pedido = models.DateTimeField(auto_now_add=True)
    fecha_entrega = models.DateTimeField(blank=True, null=True)
    total_monto = models.DecimalField(max_digits=10, decimal_places=2)
    vehiculo_usado = models.ForeignKey('ItemInventario', on_delete=models.SET_NULL, null=True, blank=True, related_name='pedidos_transportados')
    empleado_encargado = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pedidos_realizados')
    productos = models.ManyToManyField('ItemInventario', through='DetallePedidoComprador', related_name='pedidos')
    factura = models.FileField(
        upload_to='pedidos_comprador/facturas/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Carga una factura o recibo relacionado con el pedido."
    )
    imagen_factura = models.ImageField(
        upload_to='pedidos_comprador/imagenes/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Carga una imagen del recibo relacionado con el pedido."
    )

    def __str__(self):
        return f"Pedido {self.id} - {self.comprador.nombre}"


class DetallePedidoComprador(models.Model):
    pedido = models.ForeignKey(PedidoComprador, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name='detalles_pedido')
    cantidad = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.cantidad} de {self.producto.nombre} en Pedido {self.pedido.id}"


class BomboAlmacenamiento(models.Model):
    inventario = models.ForeignKey(Inventario, on_delete=models.CASCADE, related_name="bombos")
    nombre = models.CharField(max_length=100)
    capacidad_total_litros = models.FloatField()  # Capacidad en litros
    capacidad_usada_litros = models.FloatField(default=0)  # Cantidad actualmente almacenada
    tipo_contenido = models.CharField(max_length=50, choices=[
        ('LIQUIDO', 'Líquido'),
        ('RESIDUO', 'Residuo'),
    ])
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.nombre} ({self.inventario.nombre})"

    def espacio_disponible(self):
        return self.capacidad_total_litros - self.capacidad_usada_litros



# Modelo de Historial de Movimientos entre Inventario y Secciones
class HistorialMovimientos(models.Model):
    ACCIONES = [
        ('AL_INVENTARIO', 'A Inventario'),
        ('A_SECCION', 'A Sección'),
    ]

    item = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name='movimientos')
    seccion = models.ForeignKey(Seccion, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos')
    accion = models.CharField(max_length=20, choices=ACCIONES)
    cantidad = models.PositiveIntegerField()
    fecha_hora = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)  # Usuario que realiza el movimiento
    observaciones = models.TextField(blank=True, null=True)

    def __str__(self):
        seccion_nombre = self.seccion.nombre if self.seccion else "Inventario"
        return f"{self.accion} {self.cantidad} de {self.item.nombre} a {seccion_nombre} el {self.fecha_hora}"


# Modelo de Cronograma por Sección
class CronogramaSeccion(models.Model):
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name="cronogramas")
    item = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name="cronogramas")
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.seccion.nombre} - {self.item.nombre} ({self.fecha_inicio} a {self.fecha_fin})"



class Receta(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    ingredientes = models.ManyToManyField(ItemInventario, through='DetalleReceta', related_name='recetas')
    tipo = models.CharField(max_length=50, choices=[('Líquido', 'Líquido'), ('Sólido', 'Sólido'), ('Combinado', 'Combinado')])

    def __str__(self):
        return self.nombre


# Reutilizamos ItemInventario como dispositivo
class EstadoItem(models.Model):
    """
    Modelo para registrar estados de los items (pueden ser sensores, actuadores, etc.).
    """
    item = models.ForeignKey('ItemInventario', on_delete=models.CASCADE, related_name="estados")
    timestamp = models.DateTimeField(default=now)
    dato = models.FloatField()  # Ejemplo: nivel de líquido, velocidad, etc.
    unidad = models.CharField(max_length=20, default="N/A")  # Ejemplo: litros, segundos, etc.

    def __str__(self):
        return f"{self.item.nombre} - {self.dato} {self.unidad} ({self.timestamp})"



class DetalleReceta(models.Model):
    receta = models.ForeignKey(Receta, on_delete=models.CASCADE, related_name='detalles')
    ingrediente = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name='detalles_receta')
    cantidad = models.PositiveIntegerField()
    unidad = models.CharField(max_length=50, choices=[('kg', 'Kilogramos'), ('litros', 'Litros'), ('unidades', 'Unidades')])

    def __str__(self):
        return f"{self.cantidad} {self.unidad} de {self.ingrediente.nombre} en {self.receta.nombre}"

class EjecucionReceta(models.Model):
    receta = models.ForeignKey(Receta, on_delete=models.CASCADE, related_name='ejecuciones')
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name='ejecuciones')
    tiempo_inicio = models.DateTimeField(default=now)
    tiempo_fin = models.DateTimeField(blank=True, null=True)
    estado = models.CharField(max_length=50, choices=[
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('COMPLETADO', 'Completado'),
        ('FALLIDO', 'Fallido'),
    ], default='PENDIENTE')

    def __str__(self):
        return f"Ejecución de {self.receta.nombre} en {self.planta.nombre} ({self.tiempo_inicio})"

class Produccion(models.Model):
    receta = models.ForeignKey(Receta, on_delete=models.CASCADE, related_name='producciones')
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name='producciones')
    cronograma = models.ForeignKey(CronogramaSeccion, on_delete=models.SET_NULL, null=True, blank=True, related_name="producciones")
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField(blank=True, null=True)
    cantidad_producida = models.FloatField()  # Cantidad producida (puede ser en kg, litros, etc.)
    tipo_producto = models.CharField(max_length=50, choices=[('Líquido', 'Líquido'), ('Sólido', 'Sólido'), ('Combinado', 'Combinado')])

    def __str__(self):
        return f"Producción de {self.receta.nombre} en {self.seccion.nombre} ({self.fecha_inicio})"



class DetalleResiduos(models.Model):
    produccion = models.ForeignKey(Produccion, on_delete=models.CASCADE, related_name='detalles_residuos')
    residuo = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name='detalles_residuos')
    cantidad_generada = models.FloatField()  # Cantidad generada (en kg, litros, unidades, etc.)
    unidad = models.CharField(max_length=50, choices=[('kg', 'Kilogramos'), ('litros', 'Litros'), ('unidades', 'Unidades')])

    def __str__(self):
        return f"{self.cantidad_generada} {self.unidad} de {self.residuo.nombre} en {self.produccion}"


class RegistroMantenimiento(models.Model):
    componente = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name="mantenimientos")
    seccion_origen = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name="mantenimientos_realizados")
    seccion_destino = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name="mantenimientos_recibidos")
    empleado_responsable = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name="mantenimientos")
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(blank=True, null=True)
    descripcion_mantenimiento = models.TextField(blank=True, null=True)
    estado = models.CharField(
        max_length=50,
        choices=[
            ('PENDIENTE', 'Pendiente'),
            ('EN_PROCESO', 'En Proceso'),
            ('COMPLETADO', 'Completado'),
        ],
        default='PENDIENTE'
    )
    devuelto_a_origen = models.BooleanField(default=False)
    
    def marcar_completado(self):
        """Actualiza el estado y registra la fecha de fin."""
        self.estado = 'COMPLETADO'
        self.fecha_fin = now()
        self.save()
    
    def marcar_devuelto(self):
        """Registra el retorno a la sección original."""
        self.devuelto_a_origen = True
        self.save()

    def __str__(self):
        return (
            f"{self.componente.nombre} - {self.estado} "
            f"(De {self.seccion_origen.nombre} a {self.seccion_destino.nombre})"
        )

class RegistroPagoTarea(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="pagos_por_tarea")
    tarea = models.ForeignKey(RegistroMantenimiento, on_delete=models.CASCADE, related_name="pagos_asociados")
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_pago = models.DateField(default=now)
    metodo_pago = models.CharField(
        max_length=50,
        choices=[
            ('TRANSFERENCIA', 'Transferencia Bancaria'),
            ('EFECTIVO', 'Efectivo'),
            ('CHEQUE', 'Cheque'),
        ],
        default='TRANSFERENCIA'
    )
    observaciones = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Pago de {self.monto} a {self.empleado} por tarea {self.tarea} el {self.fecha_pago}"


# Modelo de Registro Financiero
class RegistroFinanciero(models.Model):
    TIPOS_TRANSACCION = [
        ('INGRESO', 'Ingreso'),
        ('GASTO', 'Gasto'),
    ]
    CATEGORIAS = [
        ('SALARIOS', 'Salarios'),
        ('IMPUESTOS', 'Impuestos'),
        ('PROVEEDORES', 'Proveedores'),
        ('SERVICIOS', 'Servicios Públicos (agua, luz, etc.)'),
        ('VENTAS', 'Ventas'),
        ('OTROS', 'Otros'),
    ]

    fabrica = models.ForeignKey('Fabrica', on_delete=models.CASCADE, related_name="registros_financieros")
    tipo = models.CharField(max_length=20, choices=TIPOS_TRANSACCION)
    categoria = models.CharField(max_length=50, choices=CATEGORIAS)
    monto = models.DecimalField(max_digits=15, decimal_places=2)
    fecha = models.DateField()
    descripcion = models.TextField(blank=True, null=True)
    factura = models.FileField(
        upload_to='finanzas/facturas/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Carga una factura o recibo en PDF relacionado con la transacción."
    )
    imagen_factura = models.ImageField(
        upload_to='finanzas/imagenes/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Carga una imagen del recibo relacionado con la transacción."
    )

    def __str__(self):
        return f"{self.tipo} - {self.categoria} (${self.monto}) - {self.fecha}"