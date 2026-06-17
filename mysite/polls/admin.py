from django.contrib import admin
from .models import (
	Fabrica,
	Seccion,
	HistorialEstadoEmpleado,
	Empleado,
	EmpleadoSeccion,
	Inventario,
	ItemInventario,
	HistorialMovimientos,
	CronogramaSeccion,
)


admin.site.register(Fabrica)
admin.site.register(Seccion)
admin.site.register(HistorialEstadoEmpleado)
admin.site.register(Empleado)
admin.site.register(EmpleadoSeccion)
admin.site.register(Inventario)
admin.site.register(ItemInventario)
admin.site.register(HistorialMovimientos)
admin.site.register(CronogramaSeccion)

# Registar modelos SCADA y relacionados
from .models import (
	Receta,
	DispositivoSCADA,
	ComunicacionMQTT,
	Alarma,
	LecturaSensor,
	OrdenProduccion,
	HistorialProduccion,
	PlantillaProduccion,
	RegistroAuditoria,
	Sistema,
	MantenimientoProgramado,
	UnidadAlmacenamiento,
	IngredienteAlmacenamiento,
    ConfiguracionMQTT,
    DetalleReceta,
    EjecucionReceta,
    Produccion,
    RegistroMantenimiento,
)

admin.site.register(Receta)
admin.site.register(DispositivoSCADA)
admin.site.register(ComunicacionMQTT)
admin.site.register(Alarma)
admin.site.register(LecturaSensor)
admin.site.register(OrdenProduccion)
admin.site.register(HistorialProduccion)
admin.site.register(PlantillaProduccion)
admin.site.register(RegistroAuditoria)
admin.site.register(Sistema)
admin.site.register(MantenimientoProgramado)
admin.site.register(UnidadAlmacenamiento)
admin.site.register(IngredienteAlmacenamiento)
admin.site.register(ConfiguracionMQTT)
admin.site.register(DetalleReceta)
admin.site.register(EjecucionReceta)
admin.site.register(Produccion)
admin.site.register(RegistroMantenimiento)

