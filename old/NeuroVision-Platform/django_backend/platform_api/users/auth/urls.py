from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrationView, VerifyOTPView

router = DefaultRouter()
router.register(r'register', RegistrationView, basename='register')
router.register(r'verify-otp', VerifyOTPView, basename='verify-otp')

urlpatterns = [
    path('', include(router.urls)),
]
