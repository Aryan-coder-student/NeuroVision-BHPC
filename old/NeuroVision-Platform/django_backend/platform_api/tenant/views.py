from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction

from .serializers import InstitutionSerializer
from .utils import create_slug, create_domain_routing

from users.models import InstitutionMembership


class InstitutionViewSet(ModelViewSet):

    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return self.request.user.institutions.all()

    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Returns the metadata for the current tenant based on the subdomain.
        """
        serializer = self.get_serializer(request.tenant)
        return Response(serializer.data)

    @transaction.atomic
    def perform_create(self, serializer):
        name = serializer.validated_data.get('name')
        slug, schema_name = create_slug(name)

        institution = serializer.save(
            slug=slug,
            schema_name=schema_name
        )
    
        create_domain_routing(institution)

        InstitutionMembership.objects.create(
            user=self.request.user,
            institution=institution,
            role=InstitutionMembership.Role.ADMIN
        )

