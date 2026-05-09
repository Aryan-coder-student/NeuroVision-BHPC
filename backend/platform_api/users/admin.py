from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models import User, InstitutionMembership


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "is_staff", "is_active")


@admin.register(InstitutionMembership)
class InstitutionMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "institution", "is_active", "created_at")
