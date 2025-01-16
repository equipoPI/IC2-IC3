'''

from django.db import models
from django.utils.timezone import now
from datetime import datetime
import random

# Modelo para la Fabrica
class Fabrica(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    fecha_creacion = models.DateField(default=now)

    def __str__(self):
        return self.nombre

# Modelo para la Sección dentro de una Fábrica
class Seccion(models.Model):
    nombre = models.CharField(max_length=100)
    fabrica = models.ForeignKey(Fabrica, on_delete=models.CASCADE, related_name="secciones")
    capacidad_trabajadores = models.PositiveIntegerField()
    tamaño_seccion = models.FloatField()
    
    class Meta:
        unique_together = ('nombre', 'fabrica')  # Cada sección es única dentro de una fábrica

    def __str__(self):
        return f"{self.nombre} - {self.fabrica.nombre}"

# Relación de empleados con las secciones de trabajo
class EmpleadoSeccion(models.Model):
    empleado = models.ForeignKey('Empleado', on_delete=models.CASCADE, related_name="secciones")
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name="empleados")
    fecha_union = models.DateField(default=now)
    fecha_salida = models.DateField(blank=True, null=True)  # Si es None, sigue activo en la sección

    class Meta:
        unique_together = ('empleado', 'seccion', 'fecha_union')  # Evita duplicados para la misma relación

    def __str__(self):
        return f"{self.empleado} en {self.seccion} desde {self.fecha_union}"

# Modelo para el Tipo de Tarifa
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

# Modelo para el Empleado
class Empleado(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, primary_key=True, unique=True)
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name="empleados")

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

    def save(self, *args, **kwargs):
        if not self.clave:
            self.clave = ''.join(random.choices('0123456789', k=10))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} {self.apellido}"

# Modelo para las Pruebas Médicas realizadas por los empleados
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

# Modelo para el Registro de Fichajes
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

# Modelo para el Pago Mensual del Empleado
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

        # Cálculo de horas normales y extra, y pago
        for fichaje in fichajes:
            tarifas = fichaje.calcular_tarifas()
            horas_normales += tarifas["tiempo_normal"]
            horas_extras += tarifas["tiempo_extra"]
            total_pago += tarifas["salario_normal"] + tarifas["salario_extra"]

        self.total_horas_normales = horas_normales
        self.total_horas_extras = horas_extras
        self.total_pago = total_pago
        self.save()

    def __str__(self):
        return f"{self.empleado} - {self.mes}: Pago {self.total_pago}"
'''