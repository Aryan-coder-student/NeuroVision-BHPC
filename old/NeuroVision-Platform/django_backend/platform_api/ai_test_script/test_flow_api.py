import requests
import time

BASE_URL = "http://localhost:8000/api/v1/auth"
MAILHOG_URL = "http://localhost:8025/api/v2/messages"

def test_full_flow():
    ts = int(time.time())
    email = f"flow_test_{ts}@example.com"
    
    print(f"1. Registering {email}...")
    reg_payload = {
        "username": f"user_{ts}",
        "email": email,
        "password": "Password123!",
        "password_confirm": "Password123!",
        "first_name": "Flow",
        "last_name": "Test"
    }
    r = requests.post(f"{BASE_URL}/register/", json=reg_payload)
    if r.status_code != 201:
        print(f"Registration failed: {r.text}")
        return

    print("2. Fetching OTP from MailHog...")
    time.sleep(2) # Wait for email to arrive
    m = requests.get(MAILHOG_URL).json()
    body = m['items'][0]['Content']['Body']
    otp = body.split(": ")[1].strip()
    print(f"Found OTP: {otp}")

    print("3. Verifying OTP...")
    v_payload = {"email": email, "otp": otp}
    v = requests.post(f"{BASE_URL}/verify-otp/", json=v_payload)
    print(f"Status: {v.status_code}")
    print(f"Response: {v.json()}")

if __name__ == "__main__":
    test_full_flow()
