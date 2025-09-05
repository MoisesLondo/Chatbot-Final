from fastapi import APIRouter, HTTPException
from services.db import get_connection

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Total leads
            cur.execute("SELECT COUNT(*) AS total_leads FROM clientes;")
            total_leads = cur.fetchone()["total_leads"]

            # Total cotizaciones
            cur.execute("SELECT COUNT(*) AS total_quotes FROM cotizacion;")
            total_quotes = cur.fetchone()["total_quotes"]

            # Producto más cotizado
            cur.execute("""
                SELECT nombre_producto, COUNT(*) AS count
                FROM detalle_cotizacion
                GROUP BY nombre_producto
                ORDER BY count DESC
                LIMIT 1;
            """)
            prod = cur.fetchone()
            most_quoted_product = prod["nombre_producto"] if prod else None

            # Vendedor más activo
            cur.execute("""
                SELECT v.full_name, COUNT(c.id) AS count
                FROM vendedores_profile v
                JOIN cotizacion c ON c.created_by_vendedor_id = v.id
                GROUP BY v.full_name
                ORDER BY count DESC
                LIMIT 1;
            """)
            seller = cur.fetchone()
            most_active_seller = seller["full_name"] if seller else None

            return {
                "totalLeads": total_leads,
                "totalQuotes": total_quotes,
                "mostQuotedProduct": most_quoted_product,
                "mostActiveSeller": most_active_seller
            }
    except Exception as e:
        import traceback
        print('ERROR EN /stats:', e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/leads")
def get_recent_leads():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id AS cotizacion_id, c.created_at, cl.razon_social, cl.email, cl.telefono
                FROM cotizacion c
                JOIN clientes cl ON c.cliente_id = cl.id
                ORDER BY c.created_at DESC
                LIMIT 10;
            """)
            cotizaciones = cur.fetchall()
            return [
                {
                    "id": cotizacion["cotizacion_id"],
                    "name": cotizacion["razon_social"],
                    "email": cotizacion["email"],
                    "phone": cotizacion["telefono"],
                    "date": cotizacion["created_at"]
                }
                for cotizacion in cotizaciones
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()