import requests
import time

BASE_URL = "http://localhost:8000/api/v1/auth"

def test_registration():
    print("Testing Registration...")
    payload = {
        "username": "testuser_" + str(int(time.time())),
        "email": f"test_{int(time.time())}@example.com",
        "password": "Password123!",
        "password_confirm": "Password123!",
        "first_name": "Test",
        "last_name": "User"
    }
    response = requests.post(f"{BASE_URL}/register/", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.json()

if __name__ == "__main__":
    try:
        user = test_registration()
        print("\nAPI Check Successful!")
    except Exception as e:
        print(f"\nAPI Check Failed: {e}")
