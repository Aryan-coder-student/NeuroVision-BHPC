from rest_framework.viewsets import ModelViewSet 
from rest_framework.permissions import AllowAny 
from rest_framework.response import Response 
from rest_framework import status

from .service import UserService
from .serializers import RegistrationSerializer, VerificationOTPSerializer
from ..models import User 

class RegistrationView(ModelViewSet):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        user_data = request.data
        serializer = self.get_serializer(data=user_data)
        serializer.is_valid(raise_exception=True)
        user = UserService.register(serializer.validated_data)
        UserService.send_otp(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class VerifyOTPView(ModelViewSet):
    serializer_class = VerificationOTPSerializer
    permission_classes = [AllowAny]
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        
        user = User.objects.get(email=email)
        if UserService.verify_otp(user, otp):
            return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)
        
        return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
