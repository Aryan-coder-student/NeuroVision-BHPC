import uuid

from django.utils.text import slugify
from django.conf import settings

from .models import Institution , Domain


def get_domain_url_from_obj(obj):
    domain = Domain.objects.filter(tenant=obj, is_primary=True).first()
    
    return domain.domain if domain else None



def create_slug(name: str):
    base_slug = slugify(name)
    slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    schema_name = slug.replace('-', '_')

    return slug, schema_name



def create_domain_routing(obj:Institution):
    base_domain = getattr(settings, 'TENANT_BASE_DOMAIN', 'localhost')
    
    return Domain.objects.create(
        domain=f"{obj.slug}.{base_domain}",
        tenant=obj,
        is_primary=True
    )