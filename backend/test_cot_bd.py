from services.tools.cotizacion_pdf import generar_cotizacion_pdf

def test_generar_cotizacion():
    # Datos de prueba
    datos_cotizacion = {
        "cxId": "V-12345678",
        "cxName": "Yux Cha",
        "cxAddress": "Calle Falsa 123",
        "email": "yux.cha@example.com",
        "tel": "0412-3456789",
        "products": [
            {
                "pCod": "03-010-0001",
                "prodName": "alambrón EST 4MMX6MTS",
                "qty": 12,
                "uPrice": 1.06
            },
            {
                "pCod": "03-010-0002",
                "prodName": "alambrón EST 5MMX6MTS",
                "qty": 5,
                "uPrice": 2.50
            }
        ]
    }

    try:
        # Llamar a la función para generar la cotización
        pdf_url = generar_cotizacion_pdf(datos_cotizacion)
        print(f"PDF generado exitosamente: {pdf_url}")
    except Exception as e:
            print(f"Error al generar la cotización: {e}")


test_generar_cotizacion()