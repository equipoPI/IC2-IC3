from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create or update Site object with id=1 (used by django-allauth)'

    def handle(self, *args, **options):
        from django.contrib.sites.models import Site

        site, created = Site.objects.update_or_create(
            id=1,
            defaults={
                'domain': 'localhost',
                'name': 'localhost',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created Site id=1'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated Site id=1'))
