from django.http import JsonResponse
from django.db import connection

def health_check(request):
    health = {
        "status": "healthy",
        "database": "unknown",
        "schema": connection.schema_name if hasattr(connection, 'schema_name') else "N/A"
    }
    
    try:
        # Simple query to check DB connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health["database"] = "connected"
    except Exception as e:
        health["status"] = "unhealthy"
        health["database"] = f"error: {str(e)}"
        
    return JsonResponse(health)
