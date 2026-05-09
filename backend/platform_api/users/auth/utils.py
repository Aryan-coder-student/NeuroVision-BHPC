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
    @property
    def fernet(self):
        return Fernet(settings.ENCRYPTION_KEY)

    def encrypt(self, data: str) -> str:
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, data: str) -> str:
        return self.fernet.decrypt(data.encode()).decode()


cryptography = Cryptography()
email_service = EmailService()
