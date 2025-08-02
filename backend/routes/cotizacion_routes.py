from fastapi import APIRouter, HTTPException
from models.cotizacion import Cotizacion
from services.tools.cotizacion_pdf import generar_cotizacion_pdf
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
        pdf_url = generar_cotizacion_pdf(cotizacion)
        return {"pdf_url": pdf_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))