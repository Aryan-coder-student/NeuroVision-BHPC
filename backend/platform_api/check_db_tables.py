import os
import django
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_api.settings')
django.setup()

def list_tables():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        print("--- Tables in 'public' schema ---")
        for table in tables:
            print(f"- {table[0]}")
        
        if not tables:
            print("❌ No tables found in 'public' schema!")

if __name__ == "__main__":
    list_tables()
