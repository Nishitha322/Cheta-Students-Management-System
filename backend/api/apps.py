from django.apps import AppConfig
import sys

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        import api.signals
        from api.mongo import get_mongo_db, restore_from_mongo_async
        from django.core.management import call_command

        import os
        if 'VERCEL' in os.environ or any(cmd in sys.argv for cmd in ['runserver', 'gunicorn', 'wsgi', 'asgi']) or 'manage.py' in sys.argv[0]:
            try:
                call_command('migrate', verbosity=0)
            except Exception as e:
                print(f"[Migration Warning] {e}")
        try:
            db = get_mongo_db()
            if db is not None:
                restore_from_mongo_async()
        except Exception as e:
            print(f"[MongoDB Warning] App initialization restore skipped: {e}")

