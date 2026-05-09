import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_api.settings')
django.setup()

from tenant.models import Institution
from django.db import connection

def check_orm():
    with connection.cursor() as cursor:
        cursor.execute('show search_path;')
        print(f"Current search path: {cursor.fetchone()}")
    try:
        count = Institution.objects.count()
        print(f"✅ ORM Success! Found {count} institutions.")
        for inst in Institution.objects.all():
            print(f"- {inst.name} ({inst.schema_name})")
    except Exception as e:
        print(f"❌ ORM Failed: {e}")

if __name__ == "__main__":
    check_orm()
