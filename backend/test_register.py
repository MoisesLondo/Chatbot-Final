import requests

def test_register_user():
    # URL base del servidor FastAPI
    base_url = "http://localhost:8000"
    
    # Endpoint de registro
    url = f"{base_url}/register-vendedor"
    
    # Datos del usuario a registrar
    user_data = {
    "user": {
        "username": "moiseslondo",
        "password": "1234",
        "role": "vendedor"
    },
    "profile": {
        "full_name": "Moisés Londoño",
        "email": "moiseslondo16@gmail.com",
        "tel": "584244632499"
    }
}
    
    
    
    # Encabezados de la solicitud
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        # Realizar la solicitud POST
        response = requests.post(url, json=user_data, headers=headers)
        
        # Verificar el código de estado de la respuesta
        if response.status_code == 200:
            print("Usuario registrado exitosamente:")
            print(response.json())
        elif response.status_code == 403:
            print("No tienes permisos para realizar esta acción.")
        elif response.status_code == 400:
            print("Error en los datos enviados:")
            print(response.json())
        else:
            print(f"Error inesperado: {response.status_code}")
            print(response.json())
    except Exception as e:
        print(f"Error al realizar la solicitud: {e}")

test_register_user()