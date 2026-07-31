"""Modelos relacionados con Recursos Humanos.

Mover aquí las clases `Empleado`, `HistorialEstadoEmpleado`, `EmpleadoSeccion`,
y demás modelos de RRHH durante la refactorización.
"""

"""Re-exports de modelos RRHH desde `models_pkg.__init__`.

Este archivo expone las clases relacionadas con RRHH para permitir
importar desde `polls.models_pkg.rrhh` durante la refactorización.
"""

from . import (  # re-export
	Empleado,
	HistorialEstadoEmpleado,
	EmpleadoSeccion,
)

__all__ = [
	'Empleado',
	'HistorialEstadoEmpleado',
	'EmpleadoSeccion',
]
