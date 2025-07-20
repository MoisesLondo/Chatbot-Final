# cotizacion_pdf.py

from docxtpl import DocxTemplate
import uuid
import os

def generar_cotizacion_pdf(datos: dict) -> str:
    """
    Llena la plantilla de cotización con los datos y devuelve la ruta del PDF generado.
    """
    # Cargar plantilla
    plantilla_path = "static/cotizacion-template.docx"
    doc = DocxTemplate(plantilla_path)

    # Calcular totales y preparar productos
    productos = []
    sumAll = 0
    for i, prod in enumerate(datos["products"], start=1):
        total_producto = prod["qty"] * prod["uPrice"]
        sumAll += total_producto
        productos.append({
            "n": i,
            "pCod": prod["pCod"],
            "prodName": prod["prodName"],
            "qty": prod["qty"],
            "uPrice": f"{prod['uPrice']:.2f}",
            "pTotal": f"{total_producto:.2f}"
        })

    iva = round(sumAll * 0.16, 2)
    total = round(sumAll + iva, 2)

    # Contexto para la plantilla
    context = {
        "idCot": datos["idCot"],
        "cxName": datos["cxName"],
        "cxId": datos["cxId"],
        "cxAddress": datos["cxAddress"],
        "creatDate": datos["creatDate"],
        "expDate": datos["expDate"],
        "products": productos,
        "sumAll": f"{sumAll:.2f}",
        "iva": f"{iva:.2f}",
        "total": f"{total:.2f}"
    }

    # Renderizar y guardar DOCX temporal
    temp_id = str(uuid.uuid4())
    temp_dir = "temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_docx = os.path.join(temp_dir, f"{temp_id}.docx")
    temp_pdf = os.path.join(temp_dir, f"{temp_id}.pdf")

    doc.render(context)
    doc.save(temp_docx)

    # Convertir a PDF (requiere docx2pdf y MS Word en Windows)
    try:
        from docx2pdf import convert
        convert(temp_docx, temp_pdf)
        return temp_pdf
    except Exception as e:
        print(f"Error al convertir a PDF: {e}")
        return temp_docx  # Devuelve el DOCX si falla la conversión

# Ejemplo de uso:
datos = {
    "idCot": "COT-001",
    "cxName": "Juan Pérez",
    "cxId": "JPR123",
    "cxAddress": "Calle Falsa 123",
    "creatDate": "2025-07-19",
    "expDate": "2025-07-31",
    "products": [
        {"pCod": "A001", "prodName": "Varilla", "qty": 10, "uPrice": 100},
        {"pCod": "B002", "prodName": "Cemento", "qty": 5, "uPrice": 200}
    ]
}
ruta_pdf = generar_cotizacion_pdf(datos)