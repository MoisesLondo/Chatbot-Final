# cotizacion_pdf.py
from docxtpl import DocxTemplate
import os
from services.cotizacion_bd import guardar_cotizacion, obtener_o_crear_cliente
from models.cotizacion import Cliente, CotizacionCreate, DetalleCotizacionCreate
import pythoncom
from docx2pdf import convert
from services.db_queries import get_vendedor_profile_by_id
from services.db import get_connection_login, get_connection
from fastapi import HTTPException
from typing import List
from pydantic import BaseModel

def armar_modelo_cotizacion(datos: dict) -> CotizacionCreate:
    # Calcular totales
    subtotal = sum(prod["qty"] * prod["uPrice"] for prod in datos["products"])
    iva = round(subtotal * 0.16, 2)
    total = round(subtotal + iva, 2)

    # Transformar productos al modelo DetalleCotizacion
    detalles = [
        DetalleCotizacionCreate(
            codigo_producto=prod["pCod"],
            nombre_producto=prod["prodName"],
            cantidad=prod["qty"],
            precio_unitario=prod["uPrice"],
            total=prod["qty"] * prod["uPrice"],
        )
        for prod in datos["products"]
    ]

    try:
        # Crear el cliente si no existe
        cliente = Cliente(
            razon_social=datos["cxName"],
            cedula_rif=datos["cxId"],
            direccion_fiscal=datos["cxAddress"],
            email=datos["email"],
            telefono=datos["tel"]
        )
        # Guardar cliente en la base de datos
        cliente_id = obtener_o_crear_cliente(cliente)
        print(f"Cliente guardado con ID: {cliente_id}")
        cliente.id = cliente_id  # Asignar el ID de la base de datos al modelo
    except Exception as e:
        print(f"Error al obtener o crear el cliente: {e}")
        raise

    # Determinar el creador de la cotización
    created_by = "chatbot"
    created_by_vendedor_id = None
    if "vendedorId" in datos and datos["vendedorId"]:
        created_by = "vendedor"
        created_by_vendedor_id = datos["vendedorId"]

    cotizacion = CotizacionCreate(
        cliente_id=cliente_id,
        nombre_cliente=datos["cxName"],
        cedula_rif=datos["cxId"],
        direccion=datos["cxAddress"],
        subtotal=subtotal,
        iva=iva,
        total=total,
        detalles=detalles,
        created_by=created_by,
        cliente_email=datos.get("email"),
        cliente_telefono=datos.get("tel"),
        created_by_vendedor_id=created_by_vendedor_id
    )

    return cotizacion

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


class ProductoCotizacion(BaseModel):
    pCod: str
    prodName: str
    qty: int
    uPrice: float
    unit: str

def generar_cotizacion_pdf(
    cxName: str,
    cxId: str,
    cxAddress: str,
    email: str,
    tel: str,
    products: List[ProductoCotizacion],
    vendedorId: str = None
) -> str:
    """
    Guarda la cotización en la base de datos, llena la plantilla de cotización con los datos y devuelve la ruta del PDF generado.
    """
    try:
        # Si los productos son modelos Pydantic, convertir a dict para armar_modelo_cotizacion
        productos_dict = [p.dict() if hasattr(p, 'dict') else p for p in products]
        # Extraer units para la plantilla, pero no enviar a DB
        productos_for_db = [
            {k: v for k, v in p.items() if k != 'unit'} for p in productos_dict
        ]
        datos = {
            "cxName": cxName,
            "cxId": cxId,
            "cxAddress": cxAddress,
            "email": email,
            "tel": tel,
            "products": productos_for_db,
        }
        if vendedorId:
            datos["vendedorId"] = vendedorId
        cotizacion = armar_modelo_cotizacion(datos)
        vendedor_id = cotizacion.created_by_vendedor_id
        sellerName = 'Megan Hierro'
        vendedor = None
        if vendedor_id:
            vendedor = fetch_seller_name(vendedor_id)
            if vendedor and 'full_name' in vendedor:
                sellerName = vendedor['full_name']
        print(f"Vendedor usado en cotización: {sellerName}")

        # Guardar cotización en la base de datos
        cotizacion_id = guardar_cotizacion(cotizacion)
        print(f"Cotización guardada con ID: {cotizacion_id}")

        # Cargar plantilla
        plantilla_path = "static/cotizacion-template.docx"
        doc = DocxTemplate(plantilla_path)
        productos = []
        for i, detalle in enumerate(cotizacion.detalles, start=1):
            unit_val = None
            if i-1 < len(productos_dict):
                raw_unit = productos_dict[i-1].get('unit')
                unit_val = get_unit_label(raw_unit, detalle.cantidad)
            productos.append({
                "n": i,
                "pCod": detalle.codigo_producto,
                "prodName": detalle.nombre_producto,
                "qty": f"{detalle.cantidad} {unit_val}",
                "uPrice": f"{detalle.precio_unitario:.2f}",
                "pTotal": f"{detalle.total:.2f}"
            })

        # Contexto para la plantilla
        context = {
            "idCot": cotizacion_id,
            "cxName": cotizacion.nombre_cliente,
            "cxId": cotizacion.cedula_rif,
            "cxAddress": cotizacion.direccion,
            "email": cotizacion.cliente_email,
            "tel": cotizacion.cliente_telefono,
            "creatDate": generar_creation_date(),
            "expDate": generar_expiration_date(),
            "products": productos,
            "sumAll": f"{cotizacion.subtotal:.2f}",
            "iva": f"{cotizacion.iva:.2f}",
            "total": f"{cotizacion.total:.2f}",
            "sellerName": sellerName,
        }

        # Renderizar y guardar DOCX temporal
        temp_id = str(cotizacion_id)  # Usar el ID de la cotización
        temp_dir = "static/temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_docx = os.path.join(temp_dir, f"{temp_id}.docx")
        temp_pdf = os.path.join(temp_dir, f"{temp_id}.pdf")

        doc.render(context)
        doc.save(temp_docx)

        # Convertir a PDF (requiere docx2pdf y MS Word en Windows)
        try:
            pythoncom.CoInitialize()
            convert(temp_docx, temp_pdf)
            return f"http://localhost:8000/static/temp/{temp_id}.pdf"
        except Exception as e:
            print(f"Error al convertir a PDF: {e}")
            return f"http://localhost:8000/static/temp/{temp_id}.docx"  # Devuelve el DOCX si falla la conversión

    except Exception as e:
        print(f"Error al guardar la cotización o generar el PDF: {e}")
        raise

def generar_ruta_docx(cotizacion: CotizacionCreate) -> str:
    """
    Genera un archivo DOCX para una cotización existente y devuelve la ruta del archivo.
    Si el archivo ya existe, simplemente devuelve la ruta.
    """
    try:
        temp_dir = "static/temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_docx = os.path.join(temp_dir, f"{cotizacion.id}.docx")

        # Verificar si el archivo ya existe
        if os.path.exists(temp_docx):
            return f"http://localhost:8000/static/temp/{cotizacion.id}.docx"

        # Cargar plantilla
        plantilla_path = "static/cotizacion-template.docx"
        doc = DocxTemplate(plantilla_path)

        # Preparar productos para la plantilla
        productos = []
        for i, detalle in enumerate(cotizacion.detalles, start=1):
            productos.append({
                "n": i,
                "pCod": detalle.codigo_producto,
                "prodName": detalle.nombre_producto,
                "qty": detalle.cantidad,
                "uPrice": f"{detalle.precio_unitario:.2f}",
                "pTotal": f"{detalle.total:.2f}"
            })

        # Contexto para la plantilla
        context = {
            "idCot": cotizacion.id,
            "cxName": cotizacion.nombre_cliente,
            "cxId": cotizacion.cedula_rif,
            "cxAddress": cotizacion.direccion,
            "email": cotizacion.cliente_email,
            "tel": cotizacion.cliente_telefono,
            "creatDate": generar_creation_date(),
            "expDate": generar_expiration_date(),
            "products": productos,
            "sumAll": f"{cotizacion.subtotal:.2f}",
            "iva": f"{cotizacion.iva:.2f}",
            "total": f"{cotizacion.total:.2f}",
            "sellerName": cotizacion.created_by,
        }

        # Renderizar y guardar DOCX
        doc.render(context)
        doc.save(temp_docx)

        return f"http://localhost:8000/static/temp/{cotizacion.id}.docx"

    except Exception as e:
        print(f"Error al generar el archivo DOCX: {e}")
        raise


def generar_ruta_pdf(cotizacion: CotizacionCreate) -> str:
    """
    Genera un archivo PDF para una cotización existente y devuelve la ruta del archivo.
    Si el archivo ya existe, simplemente devuelve la ruta.
    """
    try:
        temp_dir = "static/temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_pdf = os.path.join(temp_dir, f"{cotizacion.id}.pdf")

        # Verificar si el archivo ya existe
        if os.path.exists(temp_pdf):
            return f"http://localhost:8000/static/temp/{cotizacion.id}.pdf"

        # Generar el archivo DOCX primero
        temp_docx = generar_ruta_docx(cotizacion).replace("http://localhost:8000", "")

        # Convertir a PDF (requiere docx2pdf y MS Word en Windows)
        try:
            convert(temp_docx, temp_pdf)
            return f"http://localhost:8000/static/temp/{cotizacion.id}.pdf"
        except Exception as e:
            print(f"Error al convertir a PDF: {e}")
            return f"http://localhost:8000{temp_docx}"  # Devuelve el DOCX si falla la conversión

    except Exception as e:
        print(f"Error al generar el archivo PDF: {e}")
        raise

def fetch_seller_name(vendedor_id: str):
    try:
        conn = get_connection_login()
        try:
            vendedor = get_vendedor_profile_by_id(vendedor_id, conn)
            if not vendedor:
                raise HTTPException(status_code=404, detail="Vendedor no encontrado")
            return vendedor
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_unit_label(unit, quantity):
            if not unit:
                return ''
            unit = unit.upper()
            if unit == 'KILOGRAMO':
                return 'kilogramo' if quantity == 1 else 'kilogramos'
            if unit == 'UNIDAD':
                return 'unidad' if quantity == 1 else 'unidades'
            if unit == 'METRO':
                return 'metro' if quantity == 1 else 'metros'
            if unit == 'PIEZA':
                return 'pieza' if quantity == 1 else 'piezas'
            return unit.lower()