from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrationView, VerifyOTPView, CSRFTokenView, LoginView, LogoutView, ProfileView, ResendOTPView
from rest_framework_simplejwt import views as jwt_views

router = DefaultRouter()
router.register(r'register', RegistrationView, basename='register')
router.register(r'verify-otp', VerifyOTPView, basename='verify-otp')
router.register(r'resend-otp', ResendOTPView, basename='resend-otp')
router.register(r'csrf', CSRFTokenView, basename='csrf')
router.register(r'login', LoginView, basename='login')
router.register(r'logout', LogoutView, basename='logout')
router.register(r'profile', ProfileView, basename='profile')

urlpatterns = [
    path('api/token/refresh/', jwt_views.TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
