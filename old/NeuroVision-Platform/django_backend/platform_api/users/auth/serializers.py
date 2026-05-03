import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from ..models import User


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name'
        )

    def validate_username(self, value):
        pattern = r'^[a-zA-Z][a-zA-Z0-9_.]{2,30}$'

        if not re.fullmatch(pattern, value):
            raise serializers.ValidationError(
                "Username must start with a letter and contain only letters, numbers, underscores, or dots."
            )

        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")

        return value

    def validate_first_name(self, value):
        pattern = r"^[a-zA-Z]+(?: [a-zA-Z]+)*$"

        if not re.fullmatch(pattern, value):
            raise serializers.ValidationError("First name can only contain letters.")

        return value

    def validate_last_name(self, value):
        pattern = r"^[a-zA-Z]+(?: [a-zA-Z]+)*$"

        if not re.fullmatch(pattern, value):
            raise serializers.ValidationError("Last name can only contain letters.")

        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value


    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })
        return attrs


class VerificationOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True)

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
            if user.is_otp_verified:
                raise serializers.ValidationError("This email is already verified.")
        
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email not found.")
        
        return value
