from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    """
    Custom User model for NeuroVision.
    Uses UUID as primary key for better scalability and security.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # inital feild hai change krna hai isko just to deploy mene banya hai 

    def __str__(self):
        return self.username

class InstitutionMembership(models.Model):
    """
    Join table between Users and Institutions (Tenants).
    Allows a single User to be a member of multiple clinical institutions.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    institution = models.ForeignKey('tenant.Institution', on_delete=models.CASCADE, related_name='members')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'institution')

    def __str__(self):
        return f"{self.user.username} @ {self.institution.name}"
