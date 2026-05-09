from rest_framework import serializers

from .models import Institution
from .utils import get_domain_url_from_obj


class InstitutionSerializer(serializers.ModelSerializer):
    domain_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Institution
        fields = "__all__"
        read_only_fields = ["id", "slug", "schema_name", "created_at", "updated_at"]

    def get_domain_url(self, obj):
        return get_domain_url_from_obj(obj)
