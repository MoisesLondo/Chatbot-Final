import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT")
}

def search(query: str, top_k: int = 10, mas_baratos: bool = False, mas_caros: bool = False):
    if mas_baratos and mas_caros:
        raise ValueError("No puedes usar mas_baratos=True y mas_caros=True al mismo tiempo.")
    conn = psycopg.connect(**DB_CONFIG)
    cur = conn.cursor()

    query_lower = query.lower()
    categorias_conocidas = [
        "laminas galvanizadas",
        "tubo redondo ventilacion",
        "pletinas",
        "rieles perfiles y rejillas",
        "alambron",
        "cerchas",
        "angulos",
        "barras",
        "barras estriadas",
        "tubos hierro pulido",
        "mallas",
        "laminas hierro negro",
        "vigas",
        "tubos hierro negro",
        "base para anclaje",
        "laminas para techo",
        "laminas hierro pulido"
    ]

    # Detectar palabras de categoría en el query
    palabras_categoria = []
    for cat in categorias_conocidas:
        for palabra in cat.split():
            if palabra in query_lower:
                palabras_categoria.append(palabra)

    # Construir filtro SQL
    params = [f"%{query}%", f"%{query}%"]
    where_clauses = [
        "(unaccent(lower(nombre)) LIKE %s OR unaccent(lower(categoria)) LIKE %s)"
    ]
    if palabras_categoria:
        where_clauses.append(
            "(" + " OR ".join(["unaccent(lower(categoria)) LIKE %s" for _ in palabras_categoria]) + ")"
        )
        for p in palabras_categoria:
            params.append(f"%{p}%")

    where_sql = " AND ".join(where_clauses)

    # Ordenar según los argumentos
    if mas_baratos:
        order_by = " ORDER BY precio_minorista ASC "
    elif mas_caros:
        order_by = " ORDER BY precio_minorista DESC "
    else:
        order_by = ""

    params.append(top_k)
    sql = f"""
        SELECT id, codigo, nombre, categoria, precio_minorista, cantidad_disponible
        FROM "producto"
        WHERE {where_sql}
        {order_by}
        LIMIT %s;
    """
    cur.execute(sql, tuple(params))
    results = cur.fetchall()

    cur.close()
    conn.close()

    return [
        {
            "id": r[0],
            "codigo": r[1],
            "nombre": r[2],
            "categoria": r[3],
            "precio_minorista": r[4],
            "cantidad_disponible": r[5]
        } for r in results
    ]
