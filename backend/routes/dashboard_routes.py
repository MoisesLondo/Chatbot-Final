from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from services.db import get_connection
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = os.getenv("SECRET_KEY", "megasecret")
ALGORITHM = "HS256"

def get_current_vendedor_id(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        vendedor_id: str = payload.get("user_id")
        if vendedor_id is None:
            raise HTTPException(status_code=401, detail="Invalid JWT: vendedor_id not found")
        return vendedor_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid JWT")

@router.get("/seller/dashboard")
def get_seller_dashboard_stats(
    vendedor_id: str = Depends(get_current_vendedor_id)
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Cotizaciones del vendedor en el mes actual
            cur.execute("""
                SELECT COUNT(*) AS total_quotes
                FROM cotizacion
                WHERE created_by_vendedor_id = %s
                  AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
            """, (vendedor_id,))
            total_quotes = cur.fetchone()["total_quotes"]

            # Leads/clientes potenciales del vendedor en el mes actual (por cotizaciones nuevas)
            cur.execute("""
                SELECT COUNT(DISTINCT cliente_email) AS total_leads
                FROM cotizacion
                WHERE created_by_vendedor_id = %s
                  AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
            """, (vendedor_id,))
            total_leads = cur.fetchone()["total_leads"]

            # Ticket promedio del vendedor (promedio de total en cotizaciones del mes actual)
            cur.execute("""
                SELECT AVG(total) AS avg_ticket
                FROM cotizacion
                WHERE created_by_vendedor_id = %s
                  AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
            """, (vendedor_id,))
            avg_ticket = cur.fetchone()["avg_ticket"] or 0

            # Total de clientes atendidos por el vendedor (clientes únicos en todas sus cotizaciones)
            cur.execute("""
                SELECT COUNT(DISTINCT cliente_email) AS total_clients
                FROM cotizacion
                WHERE created_by_vendedor_id = %s
            """, (vendedor_id,))
            total_clients = cur.fetchone()["total_clients"]

            # Cotizaciones en el tiempo (por mes, últimos 6 meses)
            cur.execute("""
                SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                       COUNT(*) AS quotes
                FROM cotizacion
                WHERE created_by_vendedor_id = %s
                GROUP BY month
                ORDER BY month DESC
                LIMIT 6
            """, (vendedor_id,))
            quotes_over_time = cur.fetchall()

            # Productos más cotizados por el vendedor (top 5)
            cur.execute("""
                SELECT dc.nombre_producto, COUNT(*) AS count
                FROM detalle_cotizacion dc
                JOIN cotizacion c ON dc.cotizacion_id = c.id
                WHERE c.created_by_vendedor_id = %s
                GROUP BY dc.nombre_producto
                ORDER BY count DESC
                LIMIT 5
            """, (vendedor_id,))
            top_products = cur.fetchall()

            return {
                "totalQuotes": total_quotes,
                "totalLeads": total_leads,
                "avgTicket": float(avg_ticket),
                "totalClients": total_clients,
                "quotesOverTime": [
                    {"month": q["month"], "quotes": q["quotes"]}
                    for q in quotes_over_time
                ],
                "topProducts": [
                    {"name": p["nombre_producto"], "count": p["count"]}
                    for p in top_products
                ]
            }
    except Exception as e:
        import traceback
        print('ERROR EN /seller/dashboard:', e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/seller/leads")
def get_recent_seller_leads(
    vendedor_id: str = Depends(get_current_vendedor_id)
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cl.razon_social, cl.email, cl.telefono, c.created_at
                FROM cotizacion c
                JOIN clientes cl ON c.cliente_id = cl.id
                WHERE c.created_by_vendedor_id = %s
                ORDER BY c.created_at DESC
                LIMIT 10;
            """, (vendedor_id,))
            leads = cur.fetchall()
            return [
                {
                    "name": lead["razon_social"],
                    "email": lead["email"],
                    "phone": lead["telefono"],
                    "date": lead["created_at"]
                }
                for lead in leads
            ]
    except Exception as e:
        import traceback
        print('ERROR EN /seller/leads:', e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()