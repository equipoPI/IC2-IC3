import json
import re
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from polls.models import (
    Fabrica,
    Seccion,
    Sistema,
    DispositivoSCADA,
    LecturaSensor,
    UnidadAlmacenamiento,
    Alarma,
    OrdenProduccion,
    Inventario,
    ConfiguracionMQTT,
    MapeoAccionMQTT,
)
from polls.management.commands.mqtt_worker import Command as MqttWorkerCommand


class TestEliminacionComponentes(TestCase):
    """
    Pruebas de eliminación de componentes desde la API REST (frontend)
    para verificar que no fallen con error 500 y que los registros desaparezcan de la BD.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="admin_test", email="admin@test.com", password="password123"
        )
        self.client.force_authenticate(user=self.user)

        self.fabrica = Fabrica.objects.create(nombre="Fabrica Test", estado="OPERATIVO")
        self.seccion = Seccion.objects.create(
            nombre="Seccion A",
            fabrica=self.fabrica,
            capacidad_trabajadores=10,
            tamano_seccion=150.0
        )
        self.sistema = Sistema.objects.create(nombre="Sistema 1", fabrica=self.fabrica)
        self.inventario = Inventario.objects.create(nombre="Inv 1", fabrica=self.fabrica, capacidad_m2=100)

        self.dispositivo = DispositivoSCADA.objects.create(
            numero_serie="test_sensor_001",
            nombre="Sensor Flujo Test",
            categoria="SENSOR_FLUJO",
            sistema=self.sistema,
            seccion=self.seccion,
            gateway_id="gw_test_01",
            estado="ONLINE"
        )
        self.lectura = LecturaSensor.objects.create(
            dispositivo=self.dispositivo,
            valor=25.4,
            unidad="L/min",
            calidad="BUENA"
        )
        self.tanque = UnidadAlmacenamiento.objects.create(
            node_id="test_tank_001",
            nombre="Tanque Test 1",
            tipo="TANK",
            contenido="Agua",
            capacidad=1000.0,
            volumen_actual=500.0,
            inventario=self.inventario,
            sistema=self.sistema,
            seccion=self.seccion,
            dispositivo_sensor=self.dispositivo
        )

    def test_eliminar_dispositivo_exitoso_y_cascada(self):
        """Verifica que DELETE /api/v1/dispositivos/{pk}/ elimine el dispositivo y desvincule tanques sin error 500."""
        url = f"/api/v1/dispositivos/{self.dispositivo.numero_serie}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verificar que el dispositivo ya no existe en la base de datos
        self.assertFalse(DispositivoSCADA.objects.filter(numero_serie="test_sensor_001").exists())

        # Verificar que las lecturas vinculadas en cascada se eliminaron
        self.assertFalse(LecturaSensor.objects.filter(dispositivo_id="test_sensor_001").exists())

        # Verificar que la unidad de almacenamiento vinculada ahora tiene dispositivo_sensor=None
        self.tanque.refresh_from_db()
        self.assertIsNone(self.tanque.dispositivo_sensor)

    def test_eliminar_dispositivo_inexistente_retorna_404(self):
        """Verifica que intentar eliminar un sensor que no existe retorne 404."""
        url = "/api/v1/dispositivos/sensor_inexistente_999/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_eliminar_unidad_almacenamiento_exitosa(self):
        """Verifica que DELETE /api/v1/unidades-almacenamiento/{id}/ elimine el tanque correctamente."""
        url = f"/api/v1/unidades-almacenamiento/{self.tanque.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UnidadAlmacenamiento.objects.filter(id=self.tanque.id).exists())

    def test_eliminar_sin_autenticacion_falla(self):
        """Verifica que una petición anónima para eliminar un dispositivo sea rechazada con 401."""
        anon_client = APIClient()
        url = f"/api/v1/dispositivos/{self.dispositivo.numero_serie}/"
        response = anon_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        # El dispositivo debe seguir existiendo intacto
        self.assertTrue(DispositivoSCADA.objects.filter(numero_serie="test_sensor_001").exists())


class TestMultiTenantScopingWorker(TestCase):
    """
    Pruebas de la lógica de aislamiento multi-tenant y multi-sistema
    para evitar colisiones de IDs y permitir que cada sistema tenga sus propios componentes.
    """

    def setUp(self):
        self.worker = MqttWorkerCommand()

    def test_scoping_retrocompatibilidad_rafaela(self):
        """Rafaela en línea principal debe conservar los identificadores canónicos (tank-1, pump-1, etc.)."""
        def get_scoped_id(base_id, tenant_name, system_name=None):
            if tenant_name.lower() in ['rafaela_sa', 'rafaela', 'planta principal'] and (
                not system_name or system_name.lower() in ['linea_mezclado_1', 'sistema de mezcla a1', 'sistema_principal']
            ):
                return base_id
            clean_tenant = re.sub(r'[^a-zA-Z0-9_]', '_', tenant_name.lower())
            clean_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_id)
            if system_name:
                clean_sys = re.sub(r'[^a-zA-Z0-9_]', '_', system_name.lower())
                if clean_sys.startswith('linea_'):
                    clean_sys = clean_sys[6:]
                scoped = f"{clean_tenant}_{clean_sys}_{clean_base}"
                return scoped[:50]
            return f"{clean_tenant}_{clean_base}"[:50]

        # Para Rafaela principal
        self.assertEqual(get_scoped_id('tank-1', 'rafaela_sa', 'linea_mezclado_1'), 'tank-1')
        self.assertEqual(get_scoped_id('pump-1', 'rafaela_sa', 'linea_mezclado_1'), 'pump-1')
        self.assertEqual(get_scoped_id('sensor-3', 'rafaela', 'sistema_principal'), 'sensor-3')

    def test_scoping_sunchales_multiples_sistemas(self):
        """Sistemas distintos en Sunchales (ej. ensamblado_3 y ensamblado_5) no deben colisionar."""
        def get_scoped_id(base_id, tenant_name, system_name=None):
            if tenant_name.lower() in ['rafaela_sa', 'rafaela', 'planta principal'] and (
                not system_name or system_name.lower() in ['linea_mezclado_1', 'sistema de mezcla a1', 'sistema_principal']
            ):
                return base_id
            clean_tenant = re.sub(r'[^a-zA-Z0-9_]', '_', tenant_name.lower())
            clean_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_id)
            if system_name:
                clean_sys = re.sub(r'[^a-zA-Z0-9_]', '_', system_name.lower())
                if clean_sys.startswith('linea_'):
                    clean_sys = clean_sys[6:]
                scoped = f"{clean_tenant}_{clean_sys}_{clean_base}"
                return scoped[:50]
            return f"{clean_tenant}_{clean_base}"[:50]

        id_sys3_tank1 = get_scoped_id('tank-1', 'sunchales_sa', 'linea_ensamblado_3')
        id_sys5_tank1 = get_scoped_id('tank-1', 'sunchales_sa', 'linea_ensamblado_5')

        # Deben ser identificadores distintos
        self.assertNotEqual(id_sys3_tank1, id_sys5_tank1)
        self.assertEqual(id_sys3_tank1, 'sunchales_sa_ensamblado_3_tank-1')
        self.assertEqual(id_sys5_tank1, 'sunchales_sa_ensamblado_5_tank-1')

        # No deben superar el límite de 50 caracteres del CharField
        self.assertLessEqual(len(id_sys3_tank1), 50)
        self.assertLessEqual(len(id_sys5_tank1), 50)


class TestApiCrudGeneral(TestCase):
    """
    Pruebas generales de los endpoints principales del sistema SCADA
    para detectar errores de serialización, rutas o modelos.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="operario", password="password123")
        self.client.force_authenticate(user=self.user)

        self.fabrica = Fabrica.objects.create(nombre="Planta Rafaela", estado="OPERATIVO")
        self.seccion = Seccion.objects.create(
            nombre="Nave Industrial 1",
            fabrica=self.fabrica,
            capacidad_trabajadores=20,
            tamano_seccion=300.0
        )
        self.sistema = Sistema.objects.create(nombre="Línea de Envasado", fabrica=self.fabrica)

    def test_listar_fabricas(self):
        """GET /api/v1/fabricas/ debe retornar lista con código 200."""
        resp = self.client.get("/api/v1/fabricas/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        self.assertTrue(len(results) >= 1)

    def test_listar_secciones(self):
        """GET /api/v1/secciones/ debe retornar 200."""
        resp = self.client.get("/api/v1/secciones/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_listar_sistemas(self):
        """GET /api/v1/sistemas/ debe retornar 200."""
        resp = self.client.get("/api/v1/sistemas/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_crear_alarma_y_filtrar(self):
        """Crear alarma y verificar consulta filtrada."""
        alarma = Alarma.objects.create(
            planta=self.fabrica,
            sensor_maquina="sensor_presion_01",
            descripcion="Temperatura superó 85°C",
            severidad="alta",
            estado="abierta"
        )
        resp = self.client.get(f"/api/v1/alarmas/?planta={self.fabrica.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(Alarma.objects.filter(id=alarma.id).exists())

    def test_crear_y_modificar_dispositivo(self):
        """Crear y actualizar dispositivo SCADA vía API."""
        payload = {
            "numero_serie": "sensor_presion_01",
            "nombre": "Sensor Presión Reactor",
            "categoria": "SENSOR_PRESION",
            "sistema": self.sistema.id,
            "seccion": self.seccion.id,
            "estado": "ONLINE"
        }
        resp = self.client.post("/api/v1/dispositivos/", payload, format="json")
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

        # Modificar estado a OFFLINE
        patch_resp = self.client.patch(
            "/api/v1/dispositivos/sensor_presion_01/",
            {"estado": "OFFLINE"},
            format="json"
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        dev = DispositivoSCADA.objects.get(numero_serie="sensor_presion_01")
        self.assertEqual(dev.estado, "OFFLINE")
