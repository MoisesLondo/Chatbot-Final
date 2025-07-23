# cotizacion_pdf.py
from docxtpl import DocxTemplate
import uuid
import os


def generar_id_cotizacion():
    """
    Genera un ID único para la cotización.
    """
    return str(uuid.uuid4())

def generar_creation_date():
    """
    Genera la fecha de creación de la cotización.
    """
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def generar_expiration_date():
    """
    Genera la fecha de expiración de la cotización (30 días después de la creación).
    """
    from datetime import datetime, timedelta
    return (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d %H:%M:%S")

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
        "idCot": generar_id_cotizacion(),
        "cxName": datos["cxName"],
        "cxId": datos["cxId"],
        "cxAddress": datos["cxAddress"],
        "creatDate": generar_creation_date(),
        "expDate": generar_expiration_date(),
        "products": productos,
        "sumAll": f"{sumAll:.2f}",
        "iva": f"{iva:.2f}",
        "total": f"{total:.2f}"
    }

    # Renderizar y guardar DOCX temporal
    temp_id = str(uuid.uuid4())
    temp_dir = "static/temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_docx = os.path.join(temp_dir, f"{temp_id}.docx")
    temp_pdf = os.path.join(temp_dir, f"{temp_id}.pdf")

    doc.render(context)
    doc.save(temp_docx)

    # Convertir a PDF (requiere docx2pdf y MS Word en Windows)
    try:
        from docx2pdf import convert
        convert(temp_docx, temp_pdf)
        return f"http://localhost:8000/static/temp/{temp_id}.pdf"
    except Exception as e:
        print(f"Error al convertir a PDF: {e}")
        return f"http://localhost:8000/static/temp/{temp_id}.docx"  # Devuelve el DOCX si falla la conversión
