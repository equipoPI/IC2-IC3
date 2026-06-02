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

        self.mqtt.register_command_callback("reposicion", self._handle_reposicion)
        self.mqtt.register_command_callback("mezcla", self._handle_mezcla)
        self.mqtt.register_command_callback("control", self._handle_control)
        self.mqtt.register_command_callback("configuracion", self._handle_configuracion)
        self.mqtt.register_command_callback("consultas", self._handle_consultas)

    def connect(self) -> bool:
        return self.mqtt.connect()

    def stop(self):
        self.running = False
        self.mqtt.disconnect()

    def run(self):
        if not self.connect():
            raise RuntimeError("No se pudo conectar al broker MQTT")

        self.running = True
        logger.info("MockMQTTGateway iniciado. Publicando telemetria simulada...")

        while self.running:
            payload = self._generate_sensor_data()
            self.mqtt.publish_sensor_data(payload)
            self._publish_mock_diagnostics(payload)
            time.sleep(self.interval)

    def _generate_sensor_data(self) -> Dict[str, Any]:
        elapsed = time.time() - self.start_time
        level_base = 50 + math.sin(elapsed / 10) * 20
        flow_base = 5 + math.cos(elapsed / 7) * 1.5
        process_state = 1 if int(elapsed / 20) % 2 == 0 else 2

        self.sequence += 1

        return {
            "timestamp": time.time(),
            "nivel_bombo1": round(level_base + random.uniform(-2, 2), 2),
            "porcentaje_bombo1": max(0, min(100, int(level_base + random.uniform(-3, 3)))),
            "nivel_bombo2": round(level_base + 8 + random.uniform(-2, 2), 2),
            "porcentaje_bombo2": max(0, min(100, int(level_base + 8 + random.uniform(-3, 3)))),
            "nivel_mezcla": round(35 + math.sin(elapsed / 5) * 15 + random.uniform(-1, 1), 2),
            "porcentaje_mezcla": max(0, min(100, int(35 + math.sin(elapsed / 5) * 15 + random.uniform(-2, 2)))),
            "caudal_1": round(flow_base + random.uniform(-0.2, 0.2), 2),
            "caudal_2": round(flow_base - 0.6 + random.uniform(-0.2, 0.2), 2),
            "estado_bomba1": self.sequence % 3 == 0,
            "estado_bomba2": self.sequence % 4 == 0,
            "estado_bomba_mezcla": process_state == 2,
            "estado_mezclador": process_state == 2,
            "estado_bomba_repo": self.sequence % 5 == 0,
            "error": 0,
            "hora_restante": 1,
            "min_restante": max(0, 59 - (self.sequence % 60)),
            "estado_proceso": process_state,
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
        self.mqtt.publish_command_response(
            command_data=data,
            source_topic=topic,
            status="executed",
            code=0,
            result={"mock": True, "accion": "reposicion"},
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


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simulador MQTT del gateway Raspberry sin Arduino")
    parser.add_argument(
        "--config",
        default=str(CURRENT_DIR.parent / "config.yaml"),
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
    logger.add(str(CURRENT_DIR.parent / "logs" / "mock_mqtt_gateway.log"), rotation="10 MB")

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
