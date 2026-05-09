from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .service import UserService
from .serializers import (
    RegistrationSerializer,
    VerificationOTPSerializer,
    LoginSerilizer,
    ResendOTPSerializer,
)
from ..models import User


class RegistrationView(ModelViewSet):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs):
        user_data = request.data
        serializer = self.get_serializer(data=user_data)
        serializer.is_valid(raise_exception=True)
        user = UserService.register(serializer.validated_data)
        UserService.send_otp(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LoginView(ModelViewSet):
    serializer_class = LoginSerilizer
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "message": "Login successful.",
                "user": {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "username": user.username,
                },
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            "access_token",
            str(refresh.access_token),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            domain=settings.SESSION_COOKIE_DOMAIN,
        )
        response.set_cookie(
            "refresh_token",
            str(refresh),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            domain=settings.SESSION_COOKIE_DOMAIN,
        )

        return response


class VerifyOTPView(ModelViewSet):
    serializer_class = VerificationOTPSerializer
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        user = User.objects.get(email=email)
        if UserService.verify_otp(user, otp):
            refresh = RefreshToken.for_user(user)
            response = Response(
                {"message": "Email verified successfully."}, status=status.HTTP_200_OK
            )

            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                domain=settings.SESSION_COOKIE_DOMAIN,
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                domain=settings.SESSION_COOKIE_DOMAIN,
            )

            return response

        return Response(
            {"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST
        )


class ResendOTPView(ModelViewSet):
    serializer_class = ResendOTPSerializer
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.get(email=email)

        # Rate limit: allow resend only after 60 seconds
        if user.last_otp_sent_at:
            time_diff = (timezone.now() - user.last_otp_sent_at).total_seconds()
            if time_diff < 60:
                return Response(
                    {
                        "error": f"Please wait {int(60 - time_diff)} seconds before requesting a new OTP."
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        UserService.send_otp(user)
        return Response(
            {"message": "A new OTP has been sent to your email."},
            status=status.HTTP_200_OK,
        )


class CSRFTokenView(ModelViewSet):
    permission_classes = [AllowAny]
    http_method_names = ["get"]

    def list(self, request, *args, **kwargs):
        get_csrf_token = get_token(request)
        return Response({"csrf_token": get_csrf_token}, status=status.HTTP_200_OK)


class LogoutView(ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            response = Response(
                {"message": "Logout successful."}, status=status.HTTP_200_OK
            )
            response.delete_cookie(
                "access_token", domain=settings.SESSION_COOKIE_DOMAIN
            )
            response.delete_cookie(
                "refresh_token", domain=settings.SESSION_COOKIE_DOMAIN
            )
            response.delete_cookie("csrftoken", domain=settings.SESSION_COOKIE_DOMAIN)
            response.delete_cookie("sessionid", domain=settings.SESSION_COOKIE_DOMAIN)
            return response
        except Exception:
            return Response(
                {"error": "Logout failed."}, status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get"]

    def list(self, request, *args, **kwargs):
        user = request.user
        return Response(
            {
                "user": {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "username": user.username,
                }
            },
            status=status.HTTP_200_OK,
        )
