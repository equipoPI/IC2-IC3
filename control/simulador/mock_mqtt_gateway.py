"""
Simulador de gateway MQTT para pruebas sin Arduino.

Publica telemetria sintetica usando el mismo cliente MQTT del gateway real
y responde a algunos comandos para validar el flujo cmd/resp.
"""

from __future__ import annotations

import argparse
import math
import random
import signal
import sys
import time
from pathlib import Path
from typing import Any, Dict

from loguru import logger

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from mqtt_client import MQTTClient


class MockMQTTGateway:
    def __init__(self, config_path: Path, interval: float = 2.0):
        self.config_path = config_path
        self.interval = interval
        self.mqtt = MQTTClient(config_path=str(config_path))
        self.running = False
        self.start_time = time.time()
        self.sequence = 0

        # Registrar callbacks para comandos legados
        self.mqtt.register_command_callback("reposicion", self._handle_reposicion)
        self.mqtt.register_command_callback("mezcla", self._handle_mezcla)
        self.mqtt.register_command_callback("control", self._handle_control)
        self.mqtt.register_command_callback("configuracion", self._handle_configuracion)
        self.mqtt.register_command_callback("consultas", self._handle_consultas)

        # Registrar callbacks para comandos de dispositivos (estándar)
        self.mqtt.register_command_callback("pump-1", self._handle_pump_1)
        self.mqtt.register_command_callback("pump-2", self._handle_pump_2)
        self.mqtt.register_command_callback("mixer-1", self._handle_mixer_1)
        self.mqtt.register_command_callback("bomba_mezcla", self._handle_bomba_mezcla)
        self.mqtt.register_command_callback("bomba_reposicion", self._handle_bomba_repo)
        self.mqtt.register_command_callback("electrovalvula-1", self._handle_electrovalvula_1)
        self.mqtt.register_command_callback("electrovalvula-2", self._handle_electrovalvula_2)
        self.mqtt.register_command_callback("proceso", self._handle_proceso)

        # Inicializar variables de estado simuladas interactivo
        self.estado_bomba1 = False
        self.estado_bomba2 = False
        self.estado_bomba_mezcla = False
        self.estado_mezclador = False
        self.estado_bomba_repo = False
        self.estado_electrovalvula1 = False
        self.estado_electrovalvula2 = False
        self.process_active = False
        self.remaining_minutes = 0

        self.nivel_bombo1 = 80.0
        self.nivel_bombo2 = 60.0
        self.nivel_mezcla = 10.0

    def connect(self) -> bool:
        return self.mqtt.connect()

    def stop(self):
        self.running = False
        self.mqtt.disconnect()

    def run(self):
        if not self.connect():
            raise RuntimeError("No se pudo conectar al broker MQTT")

        self.running = True
        logger.info("MockMQTTGateway iniciado. Publicando telemetria interactiva completa...")

        while self.running:
            payload = self._generate_sensor_data()
            self.mqtt.publish_sensor_data(payload)
            self._publish_mock_diagnostics(payload)
            time.sleep(self.interval)

    def _generate_sensor_data(self) -> Dict[str, Any]:
        # Simular comportamiento físico
        # Bomba de reposición y electroválvulas aumentan el nivel de los tanques
        if self.estado_bomba_repo:
            if self.estado_electrovalvula1:
                self.nivel_bombo1 = min(100.0, self.nivel_bombo1 + 1.5)
            if self.estado_electrovalvula2:
                self.nivel_bombo2 = min(100.0, self.nivel_bombo2 + 1.5)

        # Bombas principales de alimentación disminuyen el nivel
        if self.estado_bomba1:
            self.nivel_bombo1 = max(0.0, self.nivel_bombo1 - 0.5)
            caudal_1 = round(12.5 + random.uniform(-0.3, 0.3), 2)
            if self.process_active:
                self.nivel_mezcla = min(100.0, self.nivel_mezcla + 0.4)
        else:
            caudal_1 = 0.0

        if self.estado_bomba2:
            self.nivel_bombo2 = max(0.0, self.nivel_bombo2 - 0.4)
            caudal_2 = round(8.3 + random.uniform(-0.2, 0.2), 2)
            if self.process_active:
                self.nivel_mezcla = min(100.0, self.nivel_mezcla + 0.3)
        else:
            caudal_2 = 0.0

        if self.estado_bomba_mezcla:
            self.nivel_mezcla = max(0.0, self.nivel_mezcla - 0.8)

        # Reposición automática si el nivel baja del 15% (solo si no están activos manualmente)
        if self.nivel_bombo1 < 15.0 and not self.estado_bomba_repo:
            self.estado_bomba_repo = True
            self.estado_electrovalvula1 = True
        elif self.nivel_bombo2 < 15.0 and not self.estado_bomba_repo:
            self.estado_bomba_repo = True
            self.estado_electrovalvula2 = True
        elif self.estado_bomba_repo and (self.nivel_bombo1 >= 95.0 and self.estado_electrovalvula1):
            self.estado_electrovalvula1 = False
            if not self.estado_electrovalvula2:
                self.estado_bomba_repo = False
        elif self.estado_bomba_repo and (self.nivel_bombo2 >= 95.0 and self.estado_electrovalvula2):
            self.estado_electrovalvula2 = False
            if not self.estado_electrovalvula1:
                self.estado_bomba_repo = False

        # Cuenta regresiva del proceso activo
        if self.process_active:
            if self.remaining_minutes > 0:
                self.remaining_minutes -= 1
            else:
                self.process_active = False
                self.estado_bomba1 = False
                self.estado_bomba2 = False
                self.estado_mezclador = False
                self.estado_bomba_mezcla = False

        self.sequence += 1

        # Retornamos el payload con todos los campos necesarios
        return {
            "timestamp": time.time(),
            "nivel_bombo1": round(self.nivel_bombo1 * 0.3, 2),
            "porcentaje_bombo1": int(self.nivel_bombo1),
            "nivel_bombo2": round(self.nivel_bombo2 * 0.3, 2),
            "porcentaje_bombo2": int(self.nivel_bombo2),
            "nivel_mezcla": round(self.nivel_mezcla * 0.3, 2),
            "porcentaje_mezcla": int(self.nivel_mezcla),
            "caudal_1": caudal_1,
            "caudal_2": caudal_2,
            "estado_bomba1": self.estado_bomba1,
            "estado_bomba2": self.estado_bomba2,
            "estado_bomba_mezcla": self.estado_bomba_mezcla,
            "estado_mezclador": self.estado_mezclador,
            "estado_bomba_repo": self.estado_bomba_repo,
            "estado_electrovalvula1": self.estado_electrovalvula1,
            "estado_electrovalvula2": self.estado_electrovalvula2,
            "error": 0,
            "hora_restante": self.remaining_minutes // 60,
            "min_restante": self.remaining_minutes % 60,
            "estado_proceso": 1 if self.process_active else 0,
        }

    def _publish_mock_diagnostics(self, payload: Dict[str, Any]):
        self.mqtt.publish(
            "diagnostico",
            {
                "timestamp": payload["timestamp"],
                "mock_mode": True,
                "cpu": {"percent": round(20 + random.uniform(0, 10), 2)},
                "memory": {"percent": round(35 + random.uniform(0, 15), 2)},
                "connections": {"serial": False, "mqtt": True},
            },
        )

    def _handle_reposicion(self, data: Dict[str, Any], topic: str):
        logger.info(f"Comando reposicion recibido: {topic} -> {data}")
        accion = str(data.get("accion", "")).upper()
        if data.get("freno") is True or accion in ["FRENO", "FRENO_REPOSICION", "PARAR", "DETENER", "EMERGENCIA"]:
            self.estado_bomba_repo = False
            self.estado_electrovalvula1 = False
            self.estado_electrovalvula2 = False
            logger.warning("🚨 Simulador: Freno de emergencia activado. Bomba de reposición y electroválvulas APAGADAS.")
        self.mqtt.publish_command_response(
            command_data=data,
            source_topic=topic,
            status="executed",
            code=0,
            result={"mock": True, "accion": "frenar" if data.get("freno") else "reposicion"},
        )

    def _handle_mezcla(self, data: Dict[str, Any], topic: str):
        logger.info(f"Comando mezcla recibido: {topic} -> {data}")
        self.mqtt.publish_command_response(
            command_data=data,
            source_topic=topic,
            status="executed",
            code=0,
            result={"mock": True, "accion": "mezcla"},
        )

    def _handle_control(self, data: Dict[str, Any], topic: str):
        logger.info(f"Comando control recibido: {topic} -> {data}")
        self.mqtt.publish_command_response(
            command_data=data,
            source_topic=topic,
            status="executed",
            code=0,
            result={"mock": True, "accion": data.get("accion", "control")},
        )

    def _handle_configuracion(self, data: Dict[str, Any], topic: str):
        logger.info(f"Configuracion recibida: {topic} -> {data}")
        self.mqtt.publish_command_response(
            command_data=data,
            source_topic=topic,
            status="executed",
            code=0,
            result={"mock": True, "config_aplicada": True},
        )

    def _handle_consultas(self, data: Dict[str, Any], topic: str):
        logger.info(f"Consulta recibida: {topic} -> {data}")
        response_topic = data.get("response_topic") or f"{self.mqtt.topic_prefix}/resp/consultas"
        self.mqtt.publish(
            response_topic,
            {
                "query": data,
                "count": 3,
                "data": [
                    {"timestamp": time.time(), "nivel_bombo1": 45.0, "caudal_1": 5.2},
                    {"timestamp": time.time(), "nivel_bombo1": 46.1, "caudal_1": 5.0},
                    {"timestamp": time.time(), "nivel_bombo1": 47.3, "caudal_1": 5.4},
                ],
            },
        )
        self.mqtt.publish_command_response(
            command_data=data,
            source_topic=topic,
            status="executed",
            code=0,
            result={"mock": True, "response_topic": response_topic},
        )

    def _handle_pump_1(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_bomba1 = (raw_val == "1")
        logger.info(f"Comando interactivo: Bomba 1 establecida en: {self.estado_bomba1}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_bomba1})

    def _handle_pump_2(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_bomba2 = (raw_val == "1")
        logger.info(f"Comando interactivo: Bomba 2 establecida en: {self.estado_bomba2}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_bomba2})

    def _handle_mixer_1(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_mezclador = (raw_val == "1")
        logger.info(f"Comando interactivo: Mezclador establecido en: {self.estado_mezclador}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_mezclador})

    def _handle_bomba_mezcla(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_bomba_mezcla = (raw_val == "1")
        logger.info(f"Comando interactivo: Bomba mezcla establecida en: {self.estado_bomba_mezcla}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_bomba_mezcla})

    def _handle_bomba_repo(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_bomba_repo = (raw_val == "1")
        logger.info(f"Comando interactivo: Bomba reposicion establecida en: {self.estado_bomba_repo}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_bomba_repo})

    def _handle_electrovalvula_1(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_electrovalvula1 = (raw_val == "1")
        logger.info(f"Comando interactivo: Electrovalvula 1 establecida en: {self.estado_electrovalvula1}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_electrovalvula1})

    def _handle_electrovalvula_2(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.estado_electrovalvula2 = (raw_val == "1")
        logger.info(f"Comando interactivo: Electrovalvula 2 establecida en: {self.estado_electrovalvula2}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"estado": self.estado_electrovalvula2})

    def _handle_proceso(self, data: Dict[str, Any], topic: str):
        raw_val = data.get("raw", "0")
        self.process_active = (raw_val == "1")
        if self.process_active:
            self.remaining_minutes = 150
        else:
            self.remaining_minutes = 0
        logger.info(f"Comando interactivo: Proceso establecido en activo={self.process_active}")
        self.mqtt.publish_command_response(data, topic, status="executed", code=0, result={"activo": self.process_active})


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simulador MQTT del gateway Raspberry sin Arduino")
    parser.add_argument(
        "--config",
        default=str(CURRENT_DIR / "config.yaml"),
        help="Ruta al config.yaml del gateway",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Intervalo entre publicaciones de telemetria en segundos",
    )
    return parser


def main() -> int:
    parser = build_argument_parser()
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    logger.add(str(CURRENT_DIR / "logs" / "mock_mqtt_gateway.log"), rotation="10 MB")

    gateway = MockMQTTGateway(config_path=config_path, interval=args.interval)

    def _shutdown(signum, frame):
        logger.info(f"Senial {signum} recibida. Deteniendo simulador...")
        gateway.stop()

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    try:
        gateway.run()
    except KeyboardInterrupt:
        gateway.stop()
    except Exception as exc:
        logger.exception(f"Error fatal en simulador MQTT: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
