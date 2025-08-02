import requests

def test_obtener_cotizacion():
    # URL base del servidor FastAPI
    base_url = "http://localhost:8000"
    
    # ID de la cotización a consultar
    cotizacion_id = 4  # Cambia este ID según los datos en tu base de datos
    
    # Endpoint de consulta
    url = f"{base_url}/cotizacion/{cotizacion_id}"
    
    try:
        # Realizar la solicitud GET
        response = requests.get(url)
        
        # Verificar el código de estado de la respuesta
        if response.status_code == 200:
            print("Cotización obtenida exitosamente:")
            print(response.json())
        elif response.status_code == 404:
            print(f"Cotización con ID {cotizacion_id} no encontrada.")
        else:
            print(f"Error al obtener la cotización: {response.status_code}")
            print(response.json())
    except Exception as e:
        print(f"Error al realizar la solicitud: {e}")

test_obtener_cotizacion()