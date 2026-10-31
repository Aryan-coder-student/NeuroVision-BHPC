from uuid import UUID

from clinical.models import Patient
from django.db.models import Q
from django_tenants.utils import tenant_context
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from users.models import InstitutionMembership


class MyPatientsPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
    last_page_strings = ()


class BoundedPatientResults:
    """Paginator adapter backed by only the rows needed for the requested page."""

    def __init__(self, rows, total_count):
        self.rows = rows
        self.total_count = total_count

    def __len__(self):
        return self.total_count

    def __getitem__(self, item):
        return self.rows[item]


class MyPatientsView(APIView):
    """List patients across workspaces the authenticated professional can access."""

    permission_classes = (IsAuthenticated,)
    pagination_class = MyPatientsPagination

    def get(self, request):
        memberships = list(
            InstitutionMembership.objects.filter(
                user=request.user,
                is_active=True,
                institution__owner=request.user,
            )
            .select_related("institution")
            .order_by("institution__name")
        )
        memberships = self._filter_memberships(
            memberships,
            request.query_params.get("workspace_id"),
        )
        search = request.query_params.get("search", "").strip()[:160]

        paginator = self.pagination_class()
        page_size = paginator.get_page_size(request)
        try:
            page_number = int(request.query_params.get(paginator.page_query_param, 1))
        except (TypeError, ValueError):
            page_number = 1
        row_limit = max(page_number, 1) * page_size

        patients = []
        total_count = 0
        for membership in memberships:
            workspace = membership.institution
            with tenant_context(workspace):
                queryset = Patient.objects.all()
                if search:
                    queryset = queryset.filter(
                        Q(patient_code__icontains=search)
                        | Q(display_name__icontains=search)
                    )
                total_count += queryset.count()
                patients.extend(
                    self._serialize_patient(patient, workspace)
                    for patient in queryset.order_by("-created_at")[:row_limit]
                )

        patients.sort(key=lambda patient: patient["created_at"], reverse=True)
        bounded_results = BoundedPatientResults(patients[:row_limit], total_count)
        page = paginator.paginate_queryset(bounded_results, request, view=self)
        return paginator.get_paginated_response(page)

    @staticmethod
    def _filter_memberships(memberships, workspace_id):
        if not workspace_id:
            return memberships
        try:
            selected_id = UUID(workspace_id)
        except (TypeError, ValueError) as error:
            raise ValidationError({"workspace_id": "Enter a valid workspace ID."}) from error

        selected = [
            membership
            for membership in memberships
            if membership.institution_id == selected_id
        ]
        if not selected:
            raise NotFound("Workspace not found.")
        return selected

    @staticmethod
    def _serialize_patient(patient, workspace):
        return {
            "id": str(patient.id),
            "patient_code": patient.patient_code,
            "display_name": patient.display_name,
            "global_identity_id": (
                str(patient.global_identity_id) if patient.global_identity_id else None
            ),
            "created_at": patient.created_at.isoformat(),
            "updated_at": patient.updated_at.isoformat(),
            "workspace": {
                "id": str(workspace.id),
                "name": workspace.name,
                "slug": workspace.slug,
                "inst_type": workspace.inst_type,
                "country": workspace.country,
            },
        }
