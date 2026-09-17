import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from polls.models import MetricaConfiguracion, VariableVinculada, Fabrica, DispositivoSCADA

def seed():
    print("Creando métricas por defecto...")
    
    # 1. Crear métricas conceptuales
    metricas = [
        {
            'nombre': 'Temperatura',
            'unidad_medida': '°C',
            'icono': 'thermometer',
            'rango_minimo': 0.0,
            'rango_maximo': 120.0
        },
        {
            'nombre': 'Presión',
            'unidad_medida': 'bar',
            'icono': 'gauge',
            'rango_minimo': 0.0,
            'rango_maximo': 10.0
        },
        {
            'nombre': 'Consumo Eléctrico',
            'unidad_medida': 'kWh',
            'icono': 'zap',
            'rango_minimo': 0.0,
            'rango_maximo': 5000.0
        },
        {
            'nombre': 'Flujo',
            'unidad_medida': 'L/min',
            'icono': 'droplet',
            'rango_minimo': 0.0,
            'rango_maximo': 100.0
        }
    ]

    metricas_db = {}
    for m in metricas:
        obj, created = MetricaConfiguracion.objects.get_or_create(
            nombre=m['nombre'],
            defaults={
                'unidad_medida': m['unidad_medida'],
                'icono': m['icono'],
                'rango_minimo': m['rango_minimo'],
                'rango_maximo': m['rango_maximo']
            }
        )
        metricas_db[m['nombre']] = obj
        if created:
            print(f"Creada métrica conceptual: {m['nombre']}")
        else:
            print(f"Métrica ya existe: {m['nombre']}")

    # Asegurarnos de que existan dispositivos de prueba en la base de datos para simular vinculación
    dispositivos_sensores = [
        ('sensor-1', 'Sensor de Temperatura Caldera', 'SENSOR_TEMPERATURA'),
        ('sensor-2', 'Sensor de Presión Mezclador', 'SENSOR_PRESION'),
        ('pump-1', 'Bomba Principal P1', 'BOMBA'),
        ('sensor-3', 'Sensor de Flujo Tubería A', 'SENSOR_FLUJO'),
    ]
    
    dispositivos_db = {}
    for serie, nombre, cat in dispositivos_sensores:
        obj, created = DispositivoSCADA.objects.get_or_create(
            numero_serie=serie,
            defaults={
                'nombre': nombre,
                'categoria': cat,
                'estado': 'ONLINE',
                'gateway_id': 'gw1'
            }
        )
        dispositivos_db[serie] = obj
        if created:
            print(f"Creado dispositivo SCADA de prueba: {serie}")

    # 2. Vincular métricas a fábricas existentes
    fabricas = Fabrica.objects.all()
    if not fabricas:
        print("No hay fábricas registradas para vincular variables.")
        return

    for f in fabricas:
        # Vincular Temperatura
        vv_temp, c_temp = VariableVinculada.objects.get_or_create(
            fabrica=f,
            metrica_config=metricas_db['Temperatura'],
            defaults={
                'sensor': dispositivos_db['sensor-1'],
                'umbral_advertencia': 60.0,
                'umbral_critico': 90.0
            }
        )
        # Vincular Presión
        vv_pres, c_pres = VariableVinculada.objects.get_or_create(
            fabrica=f,
            metrica_config=metricas_db['Presión'],
            defaults={
                'sensor': dispositivos_db['sensor-2'],
                'umbral_advertencia': 4.0,
                'umbral_critico': 7.0
            }
        )
        # Vincular Consumo
        vv_cons, c_cons = VariableVinculada.objects.get_or_create(
            fabrica=f,
            metrica_config=metricas_db['Consumo Eléctrico'],
            defaults={
                'sensor': dispositivos_db['pump-1'],
                'umbral_advertencia': 3500.0,
                'umbral_critico': 4500.0
            }
        )
        # Vincular Flujo
        vv_fluj, c_fluj = VariableVinculada.objects.get_or_create(
            fabrica=f,
            metrica_config=metricas_db['Flujo'],
            defaults={
                'sensor': dispositivos_db['sensor-3'],
                'umbral_advertencia': 40.0,
                'umbral_critico': 75.0
            }
        )
        
        print(f"Vinculadas variables por defecto para la fábrica: {f.nombre}")

    # 3. Poblar logs de auditoría de prueba
    from polls.models import RegistroAuditoria
    from django.contrib.auth.models import User

    admin_user = User.objects.filter(username='admin').first()
    if admin_user:
        print("Poblando logs de auditoría de prueba...")
        
        logs = [
            {
                'accion': 'Inicio de Sesión',
                'modulo': 'Seguridad',
                'objeto': 'admin',
                'descripcion': 'El usuario admin inició sesión exitosamente en el panel industrial.',
                'ip_origen': '192.168.1.45'
            },
            {
                'accion': 'Modificación',
                'modulo': 'MQTT',
                'objeto': 'Broker Principal',
                'descripcion': 'Actualizada la dirección del broker MQTT local a 192.168.1.10.',
                'ip_origen': '192.168.1.45'
            },
            {
                'accion': 'Control Manual',
                'modulo': 'SCADA',
                'objeto': 'pump-1',
                'descripcion': 'Enviado comando manual \'Iniciar\' (MQTT: 1) a dispositivo Bomba Principal P1.',
                'ip_origen': '192.168.1.45'
            },
            {
                'accion': 'Creación',
                'modulo': 'Plantas',
                'objeto': 'Planta Córdoba',
                'descripcion': 'Creada una nueva planta de producción en la zona industrial sur.',
                'ip_origen': '192.168.1.45'
            },
            {
                'accion': 'Alarma',
                'modulo': 'Monitoreo',
                'objeto': 'sensor-1',
                'descripcion': 'Sensor de Temperatura Caldera superó el umbral de advertencia (62.5 °C >= 60.0 °C).',
                'ip_origen': '127.0.0.1'
            },
            {
                'accion': 'Modificación',
                'modulo': 'Variables',
                'objeto': 'sensor-3',
                'descripcion': 'Vinculado sensor de flujo a la métrica Caudal de la Fábrica Córdoba.',
                'ip_origen': '192.168.1.45'
            },
            {
                'accion': 'Eliminación',
                'modulo': 'Secciones',
                'objeto': 'Habitación 104',
                'descripcion': 'Eliminada la ubicación interna Habitación 104 por desuso.',
                'ip_origen': '192.168.1.45'
            }
        ]

        for log in logs:
            RegistroAuditoria.objects.create(
                usuario=admin_user,
                accion=log['accion'],
                modulo=log['modulo'],
                objeto=log['objeto'],
                descripcion=log['descripcion'],
                ip_origen=log['ip_origen']
            )
        print("Auditorías de prueba pobladas con éxito.")

if __name__ == '__main__':
    seed()
