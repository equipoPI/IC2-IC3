from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from django.utils.timezone import now
from datetime import timedelta
from .models import Fabrica, Seccion, DispositivoSCADA, Empleado, Alarma

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obtener_estadisticas(request):
    # 1. Alarmas por Fecha (últimos 30 días)
    hoy = now().date()
    hace_30_dias = hoy - timedelta(days=30)
    # Filtrar alarmas creadas en los últimos 30 días
    alarmas_raw = Alarma.objects.filter(fecha_hora__date__gte=hace_30_dias)
    
    # Agrupamos por fecha de forma secuencial
    fechas = [hace_30_dias + timedelta(days=x) for x in range(31)]
    alarmas_por_fecha = {}
    for f in fechas:
        f_str = f.strftime('%Y-%m-%d')
        alarmas_por_fecha[f_str] = {
            'fecha': f_str,
            'abiertas': 0,
            'cerradas': 0,
            'total': 0
        }
        
    for alm in alarmas_raw:
        f_str = alm.fecha_hora.date().strftime('%Y-%m-%d')
        if f_str in alarmas_por_fecha:
            alarmas_por_fecha[f_str]['total'] += 1
            if alm.estado == 'abierta':
                alarmas_por_fecha[f_str]['abiertas'] += 1
            else:
                alarmas_por_fecha[f_str]['cerradas'] += 1
                
    tendencia_alarmas = list(alarmas_por_fecha.values())

    # 2. Alarmas por Planta
    plantas = Fabrica.objects.all()
    alarmas_por_planta = []
    for p in plantas:
        alms = Alarma.objects.filter(planta=p)
        abiertas = alms.filter(estado='abierta').count()
        cerradas = alms.filter(estado='cerrada').count()
        alarmas_por_planta.append({
            'planta_id': p.id,
            'planta_nombre': p.nombre,
            'abiertas': abiertas,
            'cerradas': cerradas,
            'total': alms.count()
        })

    # 3. Distribución de Empleados por Planta
    empleados_por_planta = []
    for p in plantas:
        cuenta = Empleado.objects.filter(fabrica=p, estado='ACTIVO').count()
        empleados_por_planta.append({
            'planta_id': p.id,
            'planta_nombre': p.nombre,
            'empleados': cuenta
        })

    # 4. Alarmas por Sensor/Dispositivo (Top 10)
    alarmas_por_sensor = list(
        Alarma.objects.values('sensor_maquina')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )

    # 5. Resumen Densidad Operativa (Secciones y Dispositivos por Planta)
    resumen_densidad = []
    for p in plantas:
        cant_secciones = Seccion.objects.filter(fabrica=p).count()
        cant_dispositivos = DispositivoSCADA.objects.filter(seccion__fabrica=p).count()
        resumen_densidad.append({
            'planta_nombre': p.nombre,
            'secciones': cant_secciones,
            'dispositivos': cant_dispositivos,
            'estado': p.estado
        })

    # 6. Distribución de Severidad de Alarmas
    alarmas_por_severidad = list(
        Alarma.objects.values('severidad')
        .annotate(total=Count('id'))
    )

    # 7. Estado de Sensores/Dispositivos SCADA
    dispositivos_por_estado = list(
        DispositivoSCADA.objects.values('estado')
        .annotate(total=Count('numero_serie'))
    )

    # 8. Dispositivos por Sección y Planta
    dispositivos_por_seccion = []
    secciones_db = Seccion.objects.all().select_related('fabrica')
    for sec in secciones_db:
        cuenta = DispositivoSCADA.objects.filter(seccion=sec).count()
        dispositivos_por_seccion.append({
            'seccion_nombre': sec.nombre,
            'planta_nombre': sec.fabrica.nombre,
            'dispositivos': cuenta
        })

    # 9. Distribución de Empleados por Rango/Rol
    rango_mapping = {
        '1': 'Director',
        '2': 'Gerente',
        '3': 'Jefe de Sección',
        '4': 'Coordinador',
        '5': 'Especialista',
        '6': 'Empleado',
        '7': 'Pasante',
        '8': 'Administrador'
    }
    
    empleados_por_rango_raw = list(
        Empleado.objects.filter(estado='ACTIVO')
        .values('rango')
        .annotate(total=Count('user_id'))
    )
    
    empleados_por_rango = []
    for item in empleados_por_rango_raw:
        rango_val = item.get('rango')
        nombre_rango = rango_mapping.get(rango_val, f"Rol {rango_val}")
        empleados_por_rango.append({
            'rango': nombre_rango,
            'total': item['total']
        })

    return Response({
        'tendencia_alarmas': tendencia_alarmas,
        'alarmas_por_planta': alarmas_por_planta,
        'empleados_por_planta': empleados_por_planta,
        'alarmas_por_sensor': alarmas_por_sensor,
        'resumen_densidad': resumen_densidad,
        'alarmas_por_severidad': alarmas_por_severidad,
        'dispositivos_por_estado': dispositivos_por_estado,
        'dispositivos_por_seccion': dispositivos_por_seccion,
        'empleados_por_rango': empleados_por_rango
    })
