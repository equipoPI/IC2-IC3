import logging
from django.core.management.base import BaseCommand
from polls.mqtt_services import MQTTBackendManager

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Inicia el cliente MQTT de segundo plano en Django para escuchar sensores y registrar respuestas SCADA."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=== Iniciando Worker MQTT de Django backend ==="))
        try:
            manager = MQTTBackendManager()
            # Esto mantendrá el bucle corriendo y persistiendo datos en la SQLite/PostgreSQL
            manager.start_listener_loop()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nWorker MQTT detenido por el usuario."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error crítico en Worker MQTT: {e}"))
            logger.error(f"Fallo en command mqtt_listener: {e}", exc_info=True)
