from django.core.management.base import BaseCommand
from django.db import transaction

from polls.models import Empleado


RANGO_TO_ROLE = {
    '1': 'admin',
    '2': 'manager',
    '3': 'manager',
    '4': 'manager',
    '5': 'operator',
    '6': 'operator',
    '7': 'operator',
    '8': 'admin',
}


class Command(BaseCommand):
    help = 'Check consistency between Empleado.rango and derived profile role (no DB writes).' 

    def handle(self, *args, **options):
        total = 0
        mismatches = 0

        for emp in Empleado.objects.select_related('user__profile').all():
            total += 1
            if not emp.user:
                continue
            try:
                profile = emp.user.profile
            except Exception:
                continue

            new_role = RANGO_TO_ROLE.get(emp.rango, 'operator')
            # profile.role is now a derived property; report if derived value mismatches mapping
            current = getattr(profile, 'role', None)
            if current != new_role:
                mismatches += 1
                self.stdout.write(f"{emp.documento}: {emp.user.username} {current} -> {new_role}")

        self.stdout.write(self.style.SUCCESS(f"Checked {total} empleados, {mismatches} mismatches."))
        self.stdout.write('Note: this command does not write to the database. Role persistence was removed and role is derived from Empleado.rango.')
