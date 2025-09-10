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


def get_period_filters():
    return {
        "week": "created_at >= NOW() - INTERVAL '7 days'",
        "month": "created_at >= date_trunc('month', CURRENT_DATE)",
        "year": "created_at >= date_trunc('year', CURRENT_DATE)"
    }

@router.get("/admin/dashboard")
def get_admin_dashboard_stats():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            filters = get_period_filters()
            result = {}

            for period, date_filter in filters.items():
                # Total clientes potenciales (leads)
                cur.execute(f"""
                    SELECT COUNT(DISTINCT cliente_email) AS total_leads
                    FROM cotizacion
                    WHERE {date_filter}
                """)
                total_leads = cur.fetchone()["total_leads"]

                # Total cotizaciones
                cur.execute(f"""
                    SELECT COUNT(*) AS total_quotes
                    FROM cotizacion
                    WHERE {date_filter}
                """)
                total_quotes = cur.fetchone()["total_quotes"]

                # Producto más cotizado
                cur.execute(f"""
                    SELECT dc.nombre_producto, COUNT(*) AS count
                    FROM detalle_cotizacion dc
                    JOIN cotizacion c ON dc.cotizacion_id = c.id
                    WHERE {date_filter}
                    GROUP BY dc.nombre_producto
                    ORDER BY count DESC
                    LIMIT 1
                """)
                prod = cur.fetchone()
                most_quoted_product = prod["nombre_producto"] if prod else None

                # Vendedor más activo
                cur.execute(f"""
                    SELECT vp.full_name, COUNT(c.id) AS count
                    FROM vendedores_profile vp
                    JOIN cotizacion c ON c.created_by_vendedor_id = vp.id
                    WHERE {date_filter}
                    GROUP BY vp.full_name
                    ORDER BY count DESC
                    LIMIT 1
                """)
                seller = cur.fetchone()
                most_active_seller = seller["full_name"] if seller else None

                # Cotizaciones por vendedor (para gráfico)
                cur.execute(f"""
                    SELECT vp.full_name, COUNT(c.id) AS quotes
                    FROM vendedores_profile vp
                    JOIN cotizacion c ON c.created_by_vendedor_id = vp.id
                    WHERE {date_filter}
                    GROUP BY vp.full_name
                    ORDER BY quotes DESC
                """)
                quotes_by_seller = cur.fetchall()

                # Top productos cotizados (para gráfico)
                cur.execute(f"""
                    SELECT dc.nombre_producto, COUNT(*) AS count
                    FROM detalle_cotizacion dc
                    JOIN cotizacion c ON dc.cotizacion_id = c.id
                    WHERE {date_filter}
                    GROUP BY dc.nombre_producto
                    ORDER BY count DESC
                    LIMIT 10
                """)
                top_products = cur.fetchall()

                # Cotizaciones en el tiempo (quotesOverTime)
                if period == "week":
                    # Agrupar por día en la semana actual
                    cur.execute(f"""
                        SELECT to_char(created_at, 'YYYY-MM-DD') AS day,
                            COUNT(*) AS quotes
                        FROM cotizacion
                        WHERE {date_filter}
                        GROUP BY day
                        ORDER BY day ASC
                    """)
                    quotes_over_time = cur.fetchall()
                    quotes_over_time_data = [
                        {"month": q["day"], "quotes": q["quotes"]}
                        for q in quotes_over_time
                    ]
                elif period == "month":
                    # Agrupar por semana en el mes actual
                    cur.execute(f"""
                        SELECT 'Semana ' || EXTRACT(WEEK FROM created_at) - EXTRACT(WEEK FROM date_trunc('month', created_at)) + 1 AS week,
                            COUNT(*) AS quotes
                        FROM cotizacion
                        WHERE {date_filter}
                        GROUP BY week
                        ORDER BY week ASC
                    """)
                    quotes_over_time = cur.fetchall()
                    quotes_over_time_data = [
                        {"month": q["week"], "quotes": q["quotes"]}
                        for q in quotes_over_time
                    ]
                else:  # year
                    # Agrupar por mes en el año actual
                    cur.execute(f"""
                        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                            COUNT(*) AS quotes
                        FROM cotizacion
                        WHERE {date_filter}
                        GROUP BY month
                        ORDER BY month ASC
                    """)
                    quotes_over_time = cur.fetchall()
                    quotes_over_time_data = [
                        {"month": q["month"], "quotes": q["quotes"]}
                        for q in quotes_over_time
                    ]


                # Chatbot vs Vendedores (comparación de canal)
                cur.execute(f"""
                    SELECT created_by, COUNT(*) AS count
                    FROM cotizacion
                    WHERE {date_filter}
                    GROUP BY created_by
                """)
                channel_comparison = cur.fetchall()

                result[period] = {
                    "totalLeads": total_leads,
                    "totalQuotes": total_quotes,
                    "most_quoted_product": most_quoted_product,
                    "most_active_seller": most_active_seller,
                    "quotesBySeller": [
                        {"seller": q["full_name"], "quotes": q["quotes"]}
                        for q in quotes_by_seller
                    ],
                    "topProducts": [
                        {"name": p["nombre_producto"], "count": p["count"]}
                        for p in top_products
                    ],
                    "quotesOverTime": quotes_over_time_data,
                    "channelComparison": [
                        {"channel": c["created_by"], "count": c["count"]}
                        for c in channel_comparison
                    ]
                }
            print(f'Admin dashboard {period} result:', result[period])
            return result
    except Exception as e:
        import traceback
        print('ERROR EN /admin/dashboard:', e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/admin/leads")
def get_recent_admin_leads():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cl.razon_social, cl.email, cl.telefono, c.created_at
                FROM cotizacion c
                JOIN clientes cl ON c.cliente_id = cl.id
                ORDER BY c.created_at DESC
                LIMIT 10;
            """)
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
        print('ERROR EN /admin/leads:', e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()