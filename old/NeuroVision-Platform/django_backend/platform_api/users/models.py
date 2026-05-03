import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    email = models.EmailField(unique=True)
    current_tenant = models.ForeignKey(
        'tenant.Institution',
        related_name='current_members',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    institutions = models.ManyToManyField(
        'tenant.Institution',
        through='InstitutionMembership',
        related_name='users'
    )

    otp_secret = models.CharField(max_length=255, blank=True)
    is_otp_verified = models.BooleanField(default=False)

    failed_otp_attempts = models.IntegerField(default=0)
    last_otp_sent_at = models.DateTimeField(null=True, blank=True)

    
    is_online = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} - {self.email}"


class InstitutionMembership(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MEMBER = "MEMBER", "Member"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    institution = models.ForeignKey('tenant.Institution', on_delete=models.CASCADE, related_name='institution_memberships')

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'institution')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['institution']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.institution.name}"