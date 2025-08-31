from uuid import UUID
from fastapi import APIRouter, HTTPException
from models.cotizacion import Cotizacion, DetalleCotizacion
from services.tools.cotizacion_pdf import generar_ruta_pdf
from services.cotizacion_bd import guardar_cotizacion
from services.db import get_connection

router = APIRouter()

@router.post("/cotizacion")
def crear_cotizacion(cotizacion: Cotizacion):
    try:
        cotizacion_id = guardar_cotizacion(cotizacion)
        return {"message": "Cotización guardada exitosamente", "cotizacion_id": cotizacion_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cotizacion/{cotizacion_id}")
def obtener_cotizacion(cotizacion_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error al conectar a la base de datos")

    try:
        with conn.cursor() as cur:
            # Ejecutar consulta para obtener la cotización
            cur.execute("SELECT * FROM cotizacion WHERE id = %s", (str(cotizacion_id),))
            cotizacion = cur.fetchone()

            # Verificar si existe la cotización
            if cotizacion is None:
                raise HTTPException(status_code=404, detail=f"Cotización con ID {cotizacion_id} no encontrada")

            # Obtener detalles en una nueva consulta
            cur.execute("SELECT * FROM detalle_cotizacion WHERE cotizacion_id = %s", (cotizacion_id,))
            detalles = cur.fetchall()

            # Convertir los resultados en diccionarios si estás usando psycopg2
            # (Opcional) Si no usas DictCursor, esto devuelve tuplas.
            # print(cotizacion)
            # print(detalles)
            return {
                "cotizacion": cotizacion,
                "detalles": detalles
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/cotizacion/{cotizacion_id}/pdf")
def descargar_cotizacion_pdf(cotizacion_id: str):
    try:
        # Obtener cotización y detalles
        cotizacion = obtener_cotizacion(cotizacion_id)

        cotizacion_data = cotizacion["cotizacion"]
        detalles_data = cotizacion["detalles"]

        detalles_pydantic = []
        for detalle in detalles_data:
            detalles_pydantic.append(DetalleCotizacion(
                id=UUID(str(detalle["id"])),
                cotizacion_id=int(detalle["cotizacion_id"]) if detalle["cotizacion_id"] is not None else None,
                producto_id=int(detalle["producto_id"]) if detalle["producto_id"] is not None else None,
                codigo_producto=detalle["codigo_producto"],
                nombre_producto=detalle["nombre_producto"],
                cantidad=int(detalle["cantidad"]),
                precio_unitario=float(detalle["precio_unitario"]),
                total=float(detalle["total"]),
            ))
        
        cotizacion_pydantic = Cotizacion(
        id=int(cotizacion_data["id"]),
        cliente_id=int(cotizacion_data["cliente_id"]),
        nombre_cliente=cotizacion_data["nombre_cliente"],
        cedula_rif=cotizacion_data["cedula_rif"],
        direccion=cotizacion_data["direccion"],
        cliente_email=cotizacion_data["cliente_email"],
        cliente_telefono=cotizacion_data["cliente_telefono"],
        subtotal=float(cotizacion_data["subtotal"]),
        iva=float(cotizacion_data["iva"]),
        total=float(cotizacion_data["total"]),
        created_at=cotizacion_data["created_at"],
        created_by=cotizacion_data["created_by"],
        created_by_vendedor_id=cotizacion_data["created_by_vendedor_id"],
        detalles=detalles_pydantic,
    )

        pdf_url = generar_ruta_pdf(cotizacion_pydantic)
        return pdf_url
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))