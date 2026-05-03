import pyotp
from django.utils import timezone
from ..models import User
from .utils import OTP, cryptography, email_service


class UserService:
    @staticmethod
    def register(validated_data: dict):
        validated_data.pop("password_confirm", None)
        
        if not validated_data.get("otp_secret"):
            secret = pyotp.random_base32() 
            validated_data["otp_secret"] = cryptography.encrypt(secret)
        
        user = User.objects.create_user(**validated_data)
        return user
    
    @staticmethod
    def send_otp(user: User):
        dec_code = cryptography.decrypt(user.otp_secret)
        otp = OTP(dec_code).generate()     
        user.last_otp_sent_at = timezone.now()
        user.save()
        
        email_service.send(user.email, "Verify Your Email", f"Your OTP is: {otp}")
    
    @staticmethod
    def verify_otp(user: User, otp: str):
        dec_code = cryptography.decrypt(user.otp_secret)
        otp_obj = OTP(dec_code)
        
        if otp_obj.verify(otp):
            user.is_otp_verified = True
            user.save()
            return True
        return False