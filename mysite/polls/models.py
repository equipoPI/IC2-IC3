# Empleados y Recursos Humanos
import random
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Fabrica(models.Model):
    """
    Modelo Fabrica / Planta - Representa una planta industrial con métricas SCADA
    """
    ESTADOS_PLANTA = [
        ('OPERATIVO', 'Operativo'),
        ('ADVERTENCIA', 'Advertencia'),
        ('CRITICO', 'Crítico'),
        ('OFFLINE', 'Offline'),
    ]
    
    nombre = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    pais = models.CharField(max_length=100)
    fecha_creacion = models.DateField(default=now)
    
    # Campos SCADA
    estado = models.CharField(max_length=20, choices=ESTADOS_PLANTA, default='OPERATIVO')
    porcentaje_produccion = models.FloatField(default=0, help_text="Porcentaje de producción actual (0-100)")
    porcentaje_eficiencia = models.FloatField(default=0, help_text="Porcentaje de eficiencia (0-100)")
    temperatura_promedio = models.FloatField(default=0, help_text="Temperatura promedio en °C")
    consumo_energia = models.FloatField(default=0, help_text="Consumo de energía en kWh")
    alarmas_activas = models.IntegerField(default=0, help_text="Número de alarmas activas")

    def __str__(self):
        return self.nombre
    
    def actualizar_metricas(self):
        """Actualiza automáticamente las métricas de la planta"""
        # Contar alarmas activas
        # self.alarmas_activas = self.alarmas.filter(estado='ABIERTA').count()
        
        # # Determinar estado basado en alarmas
        # alarmas_criticas = self.alarmas.filter(estado='ABIERTA', severidad='ALTA').count()
        # alarmas_advertencia = self.alarmas.filter(estado='ABIERTA', severidad='MEDIA').count()
        
        if self.alarmas_activas >= 5:
            self.estado = 'CRITICO'
        elif self.alarmas_activas > 0:
            self.estado = 'ADVERTENCIA'
        else:
            self.estado = 'OPERATIVO'
        
        self.save()



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



# class TipoTarifa(models.Model):
#     nombre = models.CharField(max_length=100)
#     tarifa_por_hora = models.DecimalField(max_digits=10, decimal_places=2)
#     tarifa_extra = models.DecimalField(max_digits=10, decimal_places=2)  # Incluye tarifa extra directamente
#     fecha_alta = models.DateField(default=now)
#     clave = models.CharField(max_length=150, unique=True, editable=False)

#     def save(self, *args, **kwargs):
#         self.clave = f"{self.nombre}-{self.fecha_alta.strftime('%Y%m%d')}"
#         super().save(*args, **kwargs)

#     def __str__(self):
#         return f"{self.nombre} - ${self.tarifa_por_hora}/hora, extra: ${self.tarifa_extra}/hora"



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
    ##tipo_tarifa = models.ForeignKey(TipoTarifa, on_delete=models.SET_NULL, null=True)
    cbu = models.CharField(max_length=22, blank=True, null=True)  # CBU del empleado
    alias_bancario = models.CharField(max_length=50, blank=True, null=True)  # Alias bancario del empleado
    clave = models.CharField(max_length=10, unique=True, editable=False, default="")
    email = models.EmailField(unique=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_EMPLEADO, default='ACTIVO')
    
    # Nuevos campos para tipo y rol
    tipo_empleado = models.CharField(
        max_length=50,
        choices=[
            ('OPERARIO', 'Operario'),
            ('SUPERVISOR', 'Supervisor'),
            ('TECNICO', 'Técnico'),
            ('JEFE_PLANTA', 'Jefe de Planta'),
            ('ADMINISTRATIVO', 'Administrativo'),
        ],
        default='OPERARIO',
        help_text="Tipo de empleado"
    )
    
    rol_actual = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Rol o cargo actual"
    )

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


# ============================================================================
# RRHH - Modelos PruebasMedicas, RegistroFichaje, PagoMensual, Sancion eliminados
# No son necesarios para sistema SCADA industrial
# ============================================================================


# class CambioEmpleado(models.Model):
#     """
#     Registro de cambios en empleados (promociones, cambios de tipo, cambios de tarifa, etc.)
#     Reemplaza al modelo Promocion con funcionalidad más amplia.
#     """
#     TIPOS_CAMBIO = [
#         ('PROMOCION', 'Promoción'),
#         ('CAMBIO_TIPO', 'Cambio de Tipo'),
#         ('CAMBIO_TARIFA', 'Cambio de Tarifa'),
#         ('CAMBIO_ROL', 'Cambio de Rol'),
#         ('DEGRADACION', 'Degradación'),
#     ]
    
#     ESTADOS = [
#         ('PENDIENTE', 'Pendiente'),
#         ('APROBADO', 'Aprobado'),
#         ('RECHAZADO', 'Rechazado'),
#     ]

#     empleado = models.ForeignKey(
#         Empleado,
#         on_delete=models.CASCADE,
#         related_name='cambios_historial',
#         help_text="Empleado que sufre el cambio"
#     )
    
#     tipo_cambio = models.CharField(
#         max_length=20,
#         choices=TIPOS_CAMBIO,
#         help_text="Tipo de cambio realizado"
#     )
    
#     # Valores anteriores
#     tipo_empleado_anterior = models.CharField(max_length=50, blank=True, null=True)
#     rango_anterior = models.CharField(max_length=50, blank=True, null=True)
#     tarifa_anterior = models.ForeignKey(
#         TipoTarifa,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='cambios_desde',
#         help_text="Tarifa anterior"
#     )
#     rol_anterior = models.CharField(max_length=100, blank=True, null=True)
    
#     # Valores nuevos
#     tipo_empleado_nuevo = models.CharField(max_length=50, blank=True, null=True)
#     rango_nuevo = models.CharField(max_length=50, blank=True, null=True)
#     tarifa_nueva = models.ForeignKey(
#         TipoTarifa,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='cambios_hacia',
#         help_text="Tarifa nueva"
#     )
#     rol_nuevo = models.CharField(max_length=100, blank=True, null=True)
    
#     # Metadatos del cambio
#     fecha_cambio = models.DateField(default=now)
#     motivo = models.TextField(blank=True, null=True, help_text="Motivo del cambio")
#     descripcion = models.CharField(max_length=255, blank=True, null=True)
    
#     estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
#     solicitado_por = models.CharField(max_length=100, help_text="Quién solicitó el cambio")
#     autorizado_por = models.ForeignKey(
#         Empleado,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='cambios_autorizados',
#         help_text="Quién autorizó el cambio"
#     )
#     fecha_cambio_estado = models.DateTimeField(auto_now=True)
    
#     class Meta:
#         ordering = ['-fecha_cambio']
#         verbose_name = 'Cambio de Empleado'
#         verbose_name_plural = 'Cambios de Empleados'
    
#     def __str__(self):
#         return f"{self.empleado.nombre} - {self.get_tipo_cambio_display()} ({self.fecha_cambio})"


# class Transferencia(models.Model):
#     """Transferencia de empleado a otra ubicación/planta"""
#     empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="transferencias")
#     nueva_direccion = models.CharField(max_length=255)
#     fecha = models.DateField()
#     autorizado_por = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, related_name="transferencias_autorizadas")

#     def __str__(self):
#         return f"Transferencia de {self.empleado} a {self.nueva_direccion} el {self.fecha}"


# ============================================================================
# RRHH - Modelos eliminados: Falta, Vacacion, HistorialEstadoVacacion, Licencia,
# EventoEspecial, PoliticaVacaciones, AccidenteLaboral, Capacitacion, EmpleadoCapacitacion
# No son necesarios para sistema SCADA industrial
# ============================================================================


# ============================================================================
# INVENTARIO Y PROVEEDORES
# ============================================================================

# Modelos eliminados: Proveedor, PedidoProveedor, DetallePedidoProveedor,
# Comprador, PedidoComprador
# No son necesarios para sistema SCADA industrial


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
     #   ('RESIDUO', 'Residuo'),
        ('PRODUCTO', 'Producto'),
        ('MATERIA PRIMA', 'Materia Prima'),
       # ('REPUESTO', 'Repuesto'),
       # ('COMPONENTE', 'Componente'),
       # ('MÁQUINA', 'Máquina'),
       # ('ACTUADOR/SENSOR', 'Actuador/Sensor'),
       # ('HERRAMIENTA', 'Herramienta'),
       # ('VEHÍCULO', 'Vehículo'),
       # ('ELECTRODOMÉSTICO', 'Electrodoméstico'),
       # ('VARIOS', 'Varios'),
    ]

    numero_serie = models.CharField(max_length=50, primary_key=True)  # Clave primaria personalizada
    inventario = models.ForeignKey('Inventario', on_delete=models.CASCADE, related_name="items")
    # Campo proveedor eliminado - no necesario para sistema SCADA
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


# Modelos PedidoProveedor, DetallePedidoProveedor, Comprador, PedidoComprador eliminados
# No son necesarios para sistema SCADA industrial

# Modelo BomboAlmacenamiento eliminado - reemplazado por UnidadAlmacenamiento
# que es más genérico y compatible con SCADA


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

#VER SI AÑADIR TIEMPODETRABAJO
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
        return f"Ejecución de {self.receta.nombre} en {self.seccion.nombre} ({self.tiempo_inicio})"

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

#VER DE UNIR EJECUCIONRECETA Y PRODUCCION 

# class DetalleResiduos(models.Model):
#     produccion = models.ForeignKey(Produccion, on_delete=models.CASCADE, related_name='detalles_residuos')
#     residuo = models.ForeignKey(ItemInventario, on_delete=models.CASCADE, related_name='detalles_residuos')
#     cantidad_generada = models.FloatField()  # Cantidad generada (en kg, litros, unidades, etc.)
#     unidad = models.CharField(max_length=50, choices=[('kg', 'Kilogramos'), ('litros', 'Litros'), ('unidades', 'Unidades')])

#     def __str__(self):
#         return f"{self.cantidad_generada} {self.unidad} de {self.residuo.nombre} en {self.produccion}"


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
  
#SIMPLICAR REGISTROMANTENIMIENTO Y QUE SOLO MUESTRE EL ESTADO DE LOS EQUIPOS (DISPONIBLE, EN MANTENIMIENTO, AVERIADO, TRABAJANDO)

# class RegistroPagoTarea(models.Model):
#     empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="pagos_por_tarea")
#     tarea = models.ForeignKey(RegistroMantenimiento, on_delete=models.CASCADE, related_name="pagos_asociados")
#     monto = models.DecimalField(max_digits=10, decimal_places=2)
#     fecha_pago = models.DateField(default=now)
#     metodo_pago = models.CharField(
#         max_length=50,
#         choices=[
#             ('TRANSFERENCIA', 'Transferencia Bancaria'),
#             ('EFECTIVO', 'Efectivo'),
#             ('CHEQUE', 'Cheque'),
#         ],
#         default='TRANSFERENCIA'
#     )
#     observaciones = models.TextField(blank=True, null=True)

#     def __str__(self):
#         return f"Pago de {self.monto} a {self.empleado} por tarea {self.tarea} el {self.fecha_pago}"



# =============================================================================
# MODELOS SCADA - Sistema de Control y Monitorización
# =============================================================================

class Sistema(models.Model):
    """
    Representa un sistema o línea de producción dentro de una planta.
    Ejemplo: Sistema de Mezcla A, Línea de Producción 1, etc.
    """
    nombre = models.CharField(max_length=100)
    fabrica = models.ForeignKey(Fabrica, on_delete=models.CASCADE, related_name='sistemas')
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('nombre', 'fabrica')
        verbose_name_plural = "Sistemas"
    
    def __str__(self):
        return f"{self.nombre} - {self.fabrica.nombre}"


class DispositivoSCADA(models.Model):
    """
    Representa sensores, actuadores, máquinas y equipamiento SCADA.
    """
    CATEGORIAS = [
        ('SENSOR_TEMPERATURA', 'Sensor de Temperatura'),
        ('SENSOR_PRESION', 'Sensor de Presión'),
        ('SENSOR_FLUJO', 'Sensor de Flujo'),
        ('SENSOR_NIVEL', 'Sensor de Nivel'),
        ('SENSOR_HUMEDAD', 'Sensor de Humedad'),
        ('MOTOR', 'Motor'),
        ('BOMBA', 'Bomba'),
        ('VALVULA', 'Válvula'),
        ('PLC', 'PLC'),
        ('HMI', 'HMI'),
        ('MEZCLADORA', 'Mezcladora'),
        ('ENVASADORA', 'Envasadora'),
        ('TRANSPORTADOR', 'Transportador'),
        ('ROBOT', 'Robot'),
        ('OTRO', 'Otro'),
    ]
    
    ESTADOS = [ #VER LOS ESTADOS DE REGISTROMANTENIMIENTO
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('MANTENIMIENTO', 'En Mantenimiento'),
        ('ERROR', 'Error'),
    ]
    
    numero_serie = models.CharField(max_length=50, unique=True, primary_key=True)
    nombre = models.CharField(max_length=100)
    categoria = models.CharField(max_length=50, choices=CATEGORIAS)
    sistema = models.ForeignKey(Sistema, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispositivos')
    seccion = models.ForeignKey(Seccion, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispositivos')
    inventario = models.ForeignKey(Inventario, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispositivos')
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='OFFLINE')
    
    # Configuración MQTT
    topic_mqtt = models.CharField(max_length=255, blank=True, null=True, help_text="Topic MQTT para este dispositivo")
    
    # Metadatos
    fecha_instalacion = models.DateField(default=now)
    ultima_lectura = models.DateTimeField(null=True, blank=True)
    descripcion = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Dispositivo SCADA"
        verbose_name_plural = "Dispositivos SCADA"
    
    def __str__(self):
        return f"{self.numero_serie} - {self.nombre}"


# class Alarma(models.Model): -------SE COMENTO PORQUE ES DE BAJA PRIORIDAD------
#     """
#     Sistema de alarmas SCADA para monitorización y alertas.
#     """
#     SEVERIDADES = [
#         ('ALTA', 'Alta'),
#         ('MEDIA', 'Media'),
#         ('BAJA', 'Baja'),
#     ]
    
#     ESTADOS_ALARMA = [
#         ('ABIERTA', 'Abierta'),
#         ('CERRADA', 'Cerrada'),
#     ]
    
#     fabrica = models.ForeignKey(Fabrica, on_delete=models.CASCADE, related_name='alarmas')
#     dispositivo = models.ForeignKey(DispositivoSCADA, on_delete=models.SET_NULL, null=True, blank=True, related_name='alarmas')
#     descripcion = models.TextField()
#     severidad = models.CharField(max_length=10, choices=SEVERIDADES)
#     estado = models.CharField(max_length=10, choices=ESTADOS_ALARMA, default='ABIERTA')
    
#     fecha_hora_inicio = models.DateTimeField(auto_now_add=True)
#     fecha_hora_cierre = models.DateTimeField(null=True, blank=True)
    
#     usuario_cierre = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='alarmas_cerradas')
#     notas_resolucion = models.TextField(blank=True, null=True)
    
#     def __str__(self):
#         dispositivo_nombre = self.dispositivo.nombre if self.dispositivo else "Sistema"
#         return f"[{self.severidad}] {dispositivo_nombre} - {self.descripcion[:50]}"
    
#     def cerrar_alarma(self, usuario, notas=''):
#         """Cierra una alarma activa"""
#         self.estado = 'CERRADA'
#         self.fecha_hora_cierre = now()
#         self.usuario_cierre = usuario
#         self.notas_resolucion = notas
#         self.save()
        
#         # Actualizar contador de alarmas de la planta
#         if self.fabrica:
#             self.fabrica.actualizar_metricas()


class LecturaSensor(models.Model):
    """
    Registro de lecturas de sensores - Time-series data
    """
    dispositivo = models.ForeignKey(DispositivoSCADA, on_delete=models.CASCADE, related_name='lecturas')
    timestamp = models.DateTimeField(default=now, db_index=True)
    valor = models.FloatField()
    unidad = models.CharField(max_length=20, default="N/A")
    
    # Metadata adicional
    calidad = models.CharField(max_length=20, default="GOOD", help_text="GOOD, BAD, UNCERTAIN")
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['dispositivo', '-timestamp']),
        ]
        verbose_name = "Lectura de Sensor"
        verbose_name_plural = "Lecturas de Sensores"
    
    def __str__(self):
        return f"{self.dispositivo.nombre}: {self.valor} {self.unidad} ({self.timestamp})"


class OrdenProduccion(models.Model):
    """
    Órdenes de producción para planificación y seguimiento.
    """
    ESTADOS_ORDEN = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROCESO', 'En Proceso'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    ]
    
    codigo = models.CharField(max_length=50, unique=True, editable=False)
    producto = models.CharField(max_length=100)
    cantidad = models.IntegerField()
    
    # Planificación
    fecha_inicio = models.DateField()
    hora_inicio = models.TimeField(default='08:00')
    fecha_fin = models.DateField()
    hora_fin = models.TimeField(default='17:00')
    
    # Asignación
    fabrica = models.ForeignKey(Fabrica, on_delete=models.CASCADE, related_name='ordenes_produccion')
    sistema = models.ForeignKey(Sistema, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes')
    dispositivo = models.ForeignKey(DispositivoSCADA, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes')
    
    # Estado y progreso
    estado = models.CharField(max_length=20, choices=ESTADOS_ORDEN, default='PENDIENTE')
    progreso = models.IntegerField(default=0, help_text="Porcentaje de progreso 0-100")
    
    # Relación con receta/plantilla
    receta = models.ForeignKey(Receta, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes_produccion')
    
    # Metadata
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ordenes_creadas')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    observaciones = models.TextField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        if not self.codigo:
            # Generar código único: OP-YYYY-NNNN
            from datetime import datetime
            year = datetime.now().year
            count = OrdenProduccion.objects.filter(codigo__startswith=f'OP-{year}').count() + 1
            self.codigo = f'OP-{year}-{count:04d}'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.codigo} - {self.producto}"
    
    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = "Orden de Producción"
        verbose_name_plural = "Órdenes de Producción"


class PlantillaProduccion(models.Model):
    """
    Plantillas/Recetas mejoradas para procesos de producción.
    Compatible con el componente FormularioPlantilla de la UI.
    """
    TIPOS = [
        ('PRODUCCION', 'Producción'),
        ('ESPECIALIDAD', 'Especialidad'),
        ('MANTENIMIENTO', 'Mantenimiento'),
        ('CALIBRACION', 'Calibración'),
    ]
    
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=50, choices=TIPOS)
    descripcion = models.TextField(blank=True, null=True)
    
    # Tiempo estimado
    tiempo_horas = models.IntegerField(default=0)
    tiempo_minutos = models.IntegerField(default=0)
    
    # Ingredientes/Materiales (almacenado como JSON o texto estructurado)
    ingredientes_json = models.TextField(blank=True, null=True, help_text="JSON con lista de ingredientes")
    
    # Relación opcional con Receta existente
    receta_base = models.ForeignKey(Receta, on_delete=models.SET_NULL, null=True, blank=True, related_name='plantillas')
    
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo})"
    
    @property
    def tiempo_estimado(self):
        """Retorna el tiempo en formato legible"""
        if self.tiempo_horas > 0 and self.tiempo_minutos > 0:
            return f"{self.tiempo_horas}h {self.tiempo_minutos}m"
        elif self.tiempo_horas > 0:
            return f"{self.tiempo_horas}h"
        else:
            return f"{self.tiempo_minutos}m"
    
    class Meta:
        verbose_name = "Plantilla de Producción"
        verbose_name_plural = "Plantillas de Producción"


class ConfiguracionMQTT(models.Model):
    """
    Configuración de servidor MQTT para comunicación IoT.
    """
    nombre = models.CharField(max_length=100, unique=True)
    broker_url = models.CharField(max_length=255, help_text="URL del broker MQTT")
    puerto = models.IntegerField(default=1883)
    
    # Autenticación
    usuario = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=100, blank=True, null=True)
    
    # Opciones
    usar_tls = models.BooleanField(default=False)
    keep_alive = models.IntegerField(default=60, help_text="Keep alive en segundos")
    
    # Topics
    topic_base = models.CharField(max_length=255, default="scada/", help_text="Topic base para suscripciones")
    
    activo = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.nombre} ({self.broker_url}:{self.puerto})"
    
    class Meta:
        verbose_name = "Configuración MQTT"
        verbose_name_plural = "Configuraciones MQTT"



class IngredienteAlmacenamiento(models.Model):
    """
    Ingredientes disponibles en el sistema de almacenamiento.
    Para uso con PlantillaProduccion.
    Compatible con frontend StorageContext (Ingredient interface).
    """
    # Categorías compatibles con frontend
    CATEGORIAS = [
        ('RAW_MATERIAL', 'Materia Prima'),
        ('ADDITIVE', 'Aditivo'),
        ('CATALYST', 'Catalizador'),
        ('BASE', 'Base'),
    ]
    
    nombre = models.CharField(max_length=100, unique=True)
    categoria = models.CharField(
        max_length=20,
        choices=CATEGORIAS,
        default='RAW_MATERIAL',
        help_text="Categoría del ingrediente"
    )
    unidad_medida = models.CharField(max_length=20, default="L")
    stock_actual = models.FloatField(default=0)
    stock_minimo = models.FloatField(default=0)
    
    # Relación con UnidadAlmacenamiento (compatible con frontend)
    unidad_almacenamiento = models.ForeignKey(
        'UnidadAlmacenamiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ingredientes_disponibles',
        help_text="Unidad de almacenamiento donde se encuentra este ingrediente"
    )
    
    activo = models.BooleanField(default=True)
    
    @property
    def available_in_storage(self):
        """Propiedad para compatibilidad con frontend"""
        return self.stock_actual > 0
    
    def __str__(self):
        return f"{self.nombre} ({self.stock_actual} {self.unidad_medida})"
    
    class Meta:
        verbose_name = "Ingrediente"
        verbose_name_plural = "Ingredientes"


# ============================================================================
# MODELOS SCADA ADICIONALES - Compatibilidad con SCADA-UI
# ============================================================================

# class Notificacion(models.Model): --------RELACIONADO CON ALARMAS----------
#     """
#     Sistema de notificaciones para usuarios del sistema SCADA.
#     Aparece en el componente NotificationsContext de la UI.
    
#     Casos de uso:
#     - Notificar alarmas críticas
#     - Avisar de cambios en órdenes de producción
#     - Alertar sobre problemas de sensores
#     - Confirmar acciones exitosas
#     """
#     TIPOS = [
#         ('INFO', 'Información'),
#         ('WARNING', 'Advertencia'),
#         ('SUCCESS', 'Éxito'),
#         ('ERROR', 'Error'),
#     ]
    
#     usuario = models.ForeignKey(
#         User,
#         on_delete=models.CASCADE,
#         related_name='notificaciones',
#         help_text="Usuario que recibe la notificación"
#     )
    
#     titulo = models.CharField(
#         max_length=200,
#         help_text="Título corto de la notificación"
#     )
    
#     mensaje = models.TextField(
#         help_text="Mensaje detallado"
#     )
    
#     tipo = models.CharField(
#         max_length=10,
#         choices=TIPOS,
#         default='INFO',
#         help_text="Tipo de notificación"
#     )
    
#     fecha_hora = models.DateTimeField(
#         auto_now_add=True,
#         db_index=True,
#         help_text="Fecha y hora de creación"
#     )
    
#     leida = models.BooleanField(
#         default=False,
#         help_text="Indica si el usuario ya la leyó"
#     )
    
#     # Generic relation para vincular con cualquier objeto
#     content_type = models.ForeignKey(
#         ContentType,
#         on_delete=models.CASCADE,
#         null=True,
#         blank=True
#     )
#     object_id = models.PositiveIntegerField(null=True, blank=True)
#     content_object = GenericForeignKey('content_type', 'object_id')
    
#     class Meta:
#         ordering = ['-fecha_hora']
#         verbose_name = 'Notificación'
#         verbose_name_plural = 'Notificaciones'
#         indexes = [
#             models.Index(fields=['usuario', '-fecha_hora']),
#             models.Index(fields=['leida', '-fecha_hora']),
#         ]
    
#     def __str__(self):
#         return f"{self.titulo} - {self.usuario.username}"


class MantenimientoProgramado(models.Model):
    """
    Planificación de mantenimientos futuros para plantas y dispositivos.
    Aparece en PlanificacionProduccion.tsx junto con órdenes de producción.
    
    Diferencia con RegistroMantenimiento:
    - MantenimientoProgramado: Para PLANIFICAR mantenimientos futuros
    - RegistroMantenimiento: Para REGISTRAR mantenimientos ya REALIZADOS
    """
    ESTADOS = [
        ('PROGRAMADO', 'Programado'),
        ('EN_CURSO', 'En Curso'),
        ('COMPLETADO', 'Completado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    # Identificación
    nombre = models.CharField(
        max_length=200,
        help_text="Nombre descriptivo del mantenimiento"
    )
    
    descripcion = models.TextField(
        help_text="Descripción detallada de las tareas"
    )
    
    # Programación
    fecha_inicio = models.DateField(
        help_text="Fecha de inicio planificada"
    )
    
    hora_inicio = models.TimeField(
        help_text="Hora de inicio planificada"
    )
    
    fecha_fin = models.DateField(
        help_text="Fecha de finalización planificada"
    )
    
    hora_fin = models.TimeField(
        help_text="Hora de finalización planificada"
    )
    
    # Asignación
    fabrica = models.ForeignKey(
        Fabrica,
        on_delete=models.CASCADE,
        related_name='mantenimientos_programados',
        help_text="Planta/fábrica donde se realizará"
    )
    
    sistema = models.ForeignKey(
        Sistema,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mantenimientos_programados',
        help_text="Sistema específico (opcional)"
    )
    
    dispositivo = models.ForeignKey(
        DispositivoSCADA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mantenimientos_programados',
        help_text="Dispositivo/máquina específica (opcional)"
    )
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='PROGRAMADO'
    )
    
    # Personal asignado
    # personal_asignado = models.ManyToManyField(
    #     Empleado,
    #     blank=True,
    #     related_name='mantenimientos_asignados',
    #     help_text="Empleados asignados al mantenimiento"
    # )
    
    # Relación con registro de mantenimiento realizado
    registro_mantenimiento = models.OneToOneField(
        RegistroMantenimiento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mantenimiento_programado_origen',
        help_text="Se crea automáticamente al completar el mantenimiento"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['fecha_inicio', 'hora_inicio']
        verbose_name = 'Mantenimiento Programado'
        verbose_name_plural = 'Mantenimientos Programados'
        indexes = [
            models.Index(fields=['fecha_inicio', 'estado']),
            models.Index(fields=['fabrica', 'estado']),
        ]
    
    def __str__(self):
        return f"{self.nombre} - {self.fabrica.nombre} ({self.fecha_inicio})"
    
    @property
    def duracion_planificada(self):
        """Calcula la duración planificada del mantenimiento"""
        from datetime import datetime
        inicio = datetime.combine(self.fecha_inicio, self.hora_inicio)
        fin = datetime.combine(self.fecha_fin, self.hora_fin)
        return fin - inicio


class UnidadAlmacenamiento(models.Model): #VER SI SE UNIFICA CON INVENTARIO, ITEMINVENTARIO, BOMBOALMACENAMIENTO-------
    """
    Unidades de almacenamiento genéricas (tanques, silos, depósitos).
    Compatible con StorageContext de la UI (AdministracionAlmacenamiento.tsx).
    
    REEMPLAZA a BomboAlmacenamiento que era muy específico.
    
    Esta clase es más genérica y tiene todos los campos que la UI necesita:
    - nodeId: para vincular con diagrama SCADA
    - type: tank, silo, deposit
    - temperature: monitorización de temperatura
    - status: active, inactive, warning, error
    """
    TIPOS = [
        ('TANK', 'Tanque'),
        ('SILO', 'Silo'),
        ('DEPOSIT', 'Depósito'),
    ]
    
    ESTADOS = [
        ('ACTIVE', 'Activo'),
        ('INACTIVE', 'Inactivo'),
        ('WARNING', 'Advertencia'),
        ('ERROR', 'Error'),
    ]
    
    # Identificación
    inventario = models.ForeignKey(
        Inventario,
        on_delete=models.CASCADE,
        related_name='unidades_almacenamiento',
        help_text="Inventario al que pertenece"
    )
    
    nombre = models.CharField(
        max_length=100,
        help_text="Nombre de la unidad (ej: Tanque A, Silo Norte)"
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
        help_text="Tipo de unidad de almacenamiento"
    )
    
    # Contenido
    contenido = models.CharField(
        max_length=200,
        help_text="Qué contiene actualmente (ej: Aceite de Oliva)"
    )
    
    volumen_actual = models.FloatField(
        default=0,
        help_text="Volumen actual en la unidad especificada"
    )
    
    capacidad = models.FloatField(
        help_text="Capacidad máxima en la unidad especificada"
    )
    
    unidad = models.CharField(
        max_length=20,
        default='L',
        help_text="Unidad de medida (L, m³, kg, etc.)"
    )
    
    # Monitorización
    temperatura = models.FloatField(
        null=True,
        blank=True,
        help_text="Temperatura en °C"
    )
    
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='ACTIVE',
        help_text="Estado operativo de la unidad"
    )
    
    # Relación con SCADA
    node_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        unique=True,
        help_text="ID del nodo en diagrama SCADA (ej: tank-1)"
    )
    
    dispositivo_sensor = models.ForeignKey(
        DispositivoSCADA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unidades_monitoreadas',
        help_text="Sensor que monitorea esta unidad"
    )
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nombre']
        verbose_name = 'Unidad de Almacenamiento'
        verbose_name_plural = 'Unidades de Almacenamiento'
        indexes = [
            models.Index(fields=['node_id']),
            models.Index(fields=['estado']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.contenido})"
    
    @property
    def nivel_porcentaje(self):
        """Calcula el porcentaje de llenado"""
        if self.capacidad > 0:
            return round((self.volumen_actual / self.capacidad) * 100, 2)
        return 0
    
    @property
    def espacio_disponible(self):
        """Calcula el espacio disponible"""
        return max(0, self.capacidad - self.volumen_actual)


class HistorialProduccion(models.Model):
    """
    Historial de producciones finalizadas con métricas completas.
    Se crea automáticamente cuando una OrdenProduccion se completa.
    
    Proporciona:
    - Datos históricos para análisis
    - Métricas de cumplimiento
    - Costos reales vs planificados
    - Base de datos para reportes y dashboards
    """
    # Referencia a la orden original
    orden_produccion = models.OneToOneField(
        OrdenProduccion,
        on_delete=models.CASCADE,
        related_name='historial',
        help_text="Orden de producción que generó este historial"
    )
    
    # Datos generales (desnormalizados para consultas rápidas)
    producto = models.CharField(
        max_length=200,
        help_text="Nombre del producto (copiado de la orden)"
    )
    
    fabrica = models.ForeignKey(
        Fabrica,
        on_delete=models.SET_NULL,
        null=True,
        related_name='historial_producciones',
        help_text="Planta donde se produjo"
    )
    
    # Cantidades
    cantidad_planificada = models.IntegerField(
        help_text="Cantidad que se planificó producir"
    )
    
    cantidad_producida = models.IntegerField(
        help_text="Cantidad realmente producida"
    )
    
    porcentaje_cumplimiento = models.FloatField(
        help_text="Porcentaje de cumplimiento (producida/planificada * 100)"
    )
    
    # Tiempos
    tiempo_planificado = models.DurationField(
        help_text="Tiempo que se planificó (hora_fin - hora_inicio)"
    )
    
    tiempo_real = models.DurationField(
        help_text="Tiempo que realmente tomó"
    )
    
    fecha_inicio_real = models.DateTimeField(
        help_text="Fecha y hora real de inicio"
    )
    
    fecha_fin_real = models.DateTimeField(
        help_text="Fecha y hora real de finalización"
    )
    
    # Recursos utilizados
    empleados_asignados = models.ManyToManyField(
        Empleado,
        blank=True,
        related_name='producciones_historial',
        help_text="Empleados que trabajaron en esta producción"
    )
    
    receta_utilizada = models.ForeignKey(
        Receta,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producciones_historial',
        help_text="Receta base utilizada"
    )
    
    # Calidad
    defectos_detectados = models.IntegerField(
        default=0,
        help_text="Cantidad de defectos detectados"
    )
    
    porcentaje_calidad = models.FloatField(
        default=100,
        help_text="Porcentaje de calidad (100 = sin defectos)"
    )
    
    # Costos (opcional)
    costo_materiales = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Costo real de materiales"
    )
    
    costo_mano_obra = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Costo real de mano de obra"
    )
    
    costo_energia = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Costo de energía consumida"
    )
    
    costo_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Costo total (suma de todos los costos)"
    )
    
    # Observaciones
    observaciones = models.TextField(
        blank=True,
        null=True,
        help_text="Observaciones generales sobre la producción"
    )
    
    # Auditoría
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha cuando se creó este registro histórico"
    )
    
    class Meta:
        ordering = ['-fecha_fin_real']
        verbose_name = 'Historial de Producción'
        verbose_name_plural = 'Historiales de Producción'
        indexes = [
            models.Index(fields=['-fecha_fin_real']),
            models.Index(fields=['fabrica', '-fecha_fin_real']),
            models.Index(fields=['producto', '-fecha_fin_real']),
        ]
    
    def __str__(self):
        return f"{self.producto} - {self.fecha_fin_real.strftime('%Y-%m-%d')}"
    
    @property
    def eficiencia_temporal(self):
        """Calcula eficiencia temporal (tiempo_planificado / tiempo_real * 100)"""
        if self.tiempo_real.total_seconds() > 0:
            return round((self.tiempo_planificado.total_seconds() / self.tiempo_real.total_seconds()) * 100, 2)
        return 0
    
    def save(self, *args, **kwargs):
        """Calcula automáticamente algunos campos antes de guardar"""
        # Calcular porcentaje de cumplimiento
        if self.cantidad_planificada > 0:
            self.porcentaje_cumplimiento = round(
                (self.cantidad_producida / self.cantidad_planificada) * 100, 2
            )
        
        # Calcular costo total si hay costos individuales
        if self.costo_materiales or self.costo_mano_obra or self.costo_energia:
            self.costo_total = (
                (self.costo_materiales or 0) +
                (self.costo_mano_obra or 0) +
                (self.costo_energia or 0)
            )
        
        super().save(*args, **kwargs)


class ComunicacionMQTT(models.Model):
    """
    Registro histórico de comunicaciones MQTT para debugging y auditoría.
    
    Permite:
    - Ver qué mensajes se enviaron/recibieron
    - Debugging de problemas de comunicación
    - Auditoría de comandos enviados a dispositivos
    """
    DIRECCIONES = [
        ('PUBLICADO', 'Publicado'),
        ('RECIBIDO', 'Recibido'),
    ]
    
    configuracion = models.ForeignKey(
        ConfiguracionMQTT,
        on_delete=models.CASCADE,
        related_name='comunicaciones',
        help_text="Configuración MQTT utilizada"
    )
    
    topic = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Topic MQTT (ej: scada/planta1/sensor1/temperatura)"
    )
    
    payload = models.TextField(
        help_text="Datos enviados/recibidos (JSON, plain text, etc.)"
    )
    
    direccion = models.CharField(
        max_length=20,
        choices=DIRECCIONES,
        help_text="Si fue publicado o recibido"
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Momento exacto de la comunicación"
    )
    
    qos = models.IntegerField(
        default=0,
        help_text="Quality of Service MQTT (0, 1, o 2)"
    )
    
    # Relación con dispositivo (si aplica)
    dispositivo = models.ForeignKey(
        DispositivoSCADA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comunicaciones_mqtt',
        help_text="Dispositivo relacionado (si aplica)"
    )
    
    # Control de éxito/error
    exitoso = models.BooleanField(
        default=True,
        help_text="Si la comunicación fue exitosa"
    )
    
    mensaje_error = models.TextField(
        blank=True,
        null=True,
        help_text="Mensaje de error si falló"
    )
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Comunicación MQTT'
        verbose_name_plural = 'Comunicaciones MQTT'
        indexes = [
            models.Index(fields=['topic', '-timestamp']),
            models.Index(fields=['dispositivo', '-timestamp']),
            models.Index(fields=['exitoso', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.direccion} - {self.topic} ({self.timestamp.strftime('%Y-%m-%d %H:%M:%S')})"