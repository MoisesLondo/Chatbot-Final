import requests

# Cambia estos valores por los correctos:
API_URL = "http://localhost:8000"  # Cambia si tu backend corre en otro puerto/url
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtY2hhbmcyMiIsInJvbGUiOiJ2ZW5kZWRvciIsInVzZXJfaWQiOiIwOGZmNTYyNy1lMDA1LTRkM2QtODc2YS0zYzUyYTM0M2MwZDciLCJleHAiOjE3NTczOTE1MjN9.MFry6Wsxyo3bQ4qVerIVZLi23zn1Lhq40EyUtXPAlx8"           # Coloca aquí el JWT del vendedor

headers = {
    "Authorization": f"Bearer {JWT_TOKEN}"
}

def test_dashboard():
    resp = requests.get(f"{API_URL}/seller/dashboard", headers=headers)
    if resp.status_code == 200:
        print("Dashboard stats:")
        print(resp.json())
    else:
        print(f"Error {resp.status_code}: {resp.text}")

def test_leads():
    resp = requests.get(f"{API_URL}/seller/leads", headers=headers)
    if resp.status_code == 200:
        print("Recent leads:")
        print(resp.json())
    else:
        print(f"Error {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    print("=== Probar Dashboard ===")
    test_dashboard()
    print("\n=== Probar Leads ===")
    test_leads()