import pyotp
from django.core.mail import send_mail
from django.conf import settings
from cryptography.fernet import Fernet

class OTP:
    def __init__(self, secret: str):
        self.secret = secret

    def generate(self) -> str:
        totp = pyotp.TOTP(self.secret)
        return totp.now()

    def verify(self, otp: str) -> bool:
        totp = pyotp.TOTP(self.secret)
        return totp.verify(otp, valid_window=1)


class EmailService:
    def __init__(self, from_mail_id: str = None):
        self.from_mail_id = from_mail_id or settings.DEFAULT_FROM_EMAIL

    def send(self, to_mail_id: str, subject: str, body: str):
        send_mail(
            subject=subject,
            message=body,
            from_email=self.from_mail_id,
            recipient_list=[to_mail_id],
            fail_silently=False,
        )

class Cryptography:
    def __init__(self):
        self.key = settings.ENCRYPTION_KEY
        self.fernet = Fernet(self.key)

    def encrypt(self, data: str) -> str:
        enc_code = self.fernet.encrypt(data.encode()).decode()
        return enc_code 

    def decrypt(self, data: str) -> str:
        dec_code = self.fernet.decrypt(data.encode()).decode()
        return dec_code 

cryptography = Cryptography()
email_service = EmailService()