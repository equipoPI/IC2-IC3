# Migraciones en `polls` — Guía rápida

Resumen corto:
- `models.py` declara la intención (clases de Python) de los modelos.
- Los archivos en `migrations/` (0001, 0002, 0003...) describen el historial de cambios aplicados a la base de datos.

¿Por qué "faltan" modelos en la interfaz o en admin?
1. Algunas migraciones posteriores pueden eliminar modelos del esquema. En este repo, la migración `0002_configuracionmqtt_and_more.py` contiene muchas operaciones `DeleteModel` y `RemoveField` — esos modelos fueron eliminados del esquema.
2. Un modelo puede estar definido en `models.py` pero no aparecer en el admin si no está registrado en `polls/admin.py`.
3. Si las migraciones se aplicaron (ver `showmigrations`), la base de datos reflejará lo que indican las migraciones, no necesariamente el contenido actual de `models.py` si hubo cambios manuales no migrados.

Cómo inspeccionar qué pasó (comandos):

```bash
# Lista las migraciones y su estado
docker exec scada_backend python manage.py showmigrations polls --list

# Ver modelos que Django carga actualmente
docker exec scada_backend python manage.py shell -c "from django.apps import apps; print([m.label for m in apps.get_models()])"

# Buscar en el historial de migraciones dónde se eliminó un modelo (ej: 'Receta')
grep -n "DeleteModel.*Receta" -n mysite/polls/migrations/* || true
```

Opciones para recuperar o exponer modelos:

- Si el modelo fue eliminado por migración y querés recuperarlo, tenés dos caminos:
  1. Revertir la migración que lo borró (solo en entornos de desarrollo o con extremo cuidado en prod):
     ```bash
     python manage.py migrate polls 0001
     ```
     Luego revisar y volver a migrar hacia adelante.

  2. Recrear el modelo en `models.py` y generar una nueva migración que lo vuelva a crear (recomendado si querés conservar historial de cambios):
     ```bash
     # editar models.py -> añadir clase Receta
     python manage.py makemigrations polls
     python manage.py migrate
     ```

- Si el modelo existe en `models.py` pero no aparece en admin, registralo en `polls/admin.py`:

```py
from django.contrib import admin
from .models import Receta, Sistema
admin.site.register(Receta)
admin.site.register(Sistema)
```

Sobre unificar (squash) migraciones:
- Útil en repositorios en desarrollo para simplificar el historial. NO squashear si otras ramas/producción ya usan las migraciones aplicadas sin coordinar.
- Pasos resumidos:
  1. `python manage.py squashmigrations polls 0003`  (genera una migración que reemplaza 0001..0003)
  2. Revisar el archivo generado y probar en DB limpia.
  3. Comunicar al equipo y reemplazar las migraciones antiguas si procede.

Buenas prácticas:
- Siempre editar `models.py` y luego ejecutar `makemigrations` — evitar editar migraciones para cambios de esquema simples.
- Revisar los archivos generados en `migrations/` antes de commitear.
- Mantener `admin.py` sincronizado con los modelos que querés exponer.

Si querés, puedo:
- Generar la migración `squash` y probarla en un contenedor de prueba (recreando la DB).
- Crear una nota corta en `README.md` del proyecto con el workflow de migraciones.
- Restaurar modelos específicos (por ejemplo `Receta`, `Sistema`) creando las migraciones necesarias.

Decime qué prefieres y lo implemento.
