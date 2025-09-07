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


    import unicodedata

    def normalize(text):
        if not text:
            return ""
        text = text.lower()
        text = unicodedata.normalize('NFD', text)
        text = ''.join([c for c in text if unicodedata.category(c) != 'Mn'])
        return text


    # Palabras irrelevantes a ignorar
    stopwords = {"de", "para", "el", "la", "los", "las", "y", "en", "del", "al", "un", "una", "unos", "unas", "por", "con", "a"}
    query_norm = normalize(query)
    query_words = [w for w in query_norm.split() if w not in stopwords]

    categorias_conocidas = [
        "láminas galvanizadas",
        "tubo redondo ventilacion",
        "pletinas",
        "rieles perfiles y rejillas",
        "alambrón",
        "cerchas",
        "ángulos",
        "barras",
        "barras estriadas",
        "tubos hierro pulido",
        "mallas",
        "láminas hierro negro",
        "vigas",
        "tubos hierro negro",
        "base para anclaje",
        "láminas para techo",
        "láminas hierro pulido"
    ]

    # Buscar coincidencias exactas y parciales en categorías conocidas
    palabras_categoria = set()
    for cat in categorias_conocidas:
        cat_norm = normalize(cat)
        cat_words = cat_norm.split()
        # Si todas las palabras del query están en la categoría, agregar la categoría completa
        if all(qw in cat_words for qw in query_words):
            palabras_categoria.add(cat_norm)
        # Si alguna palabra del query está en la categoría, agregar esa palabra
        for qw in query_words:
            if qw in cat_words:
                palabras_categoria.add(qw)
        # También agregar singular/plural
        for qw in query_words:
            if qw.endswith('s') and qw[:-1] in cat_words:
                palabras_categoria.add(qw[:-1])
            if not qw.endswith('s') and (qw + 's') in cat_words:
                palabras_categoria.add(qw + 's')


    # Filtro: el producto debe contener todas las palabras relevantes en nombre o categoría
    word_clauses = []
    word_params = []
    for w in query_words:
        word_clauses.append("(unaccent(lower(nombre)) LIKE %s OR unaccent(lower(categoria)) LIKE %s)")
        word_params.append(f"%{w}%")
        word_params.append(f"%{w}%")

    # Además, mantener el filtro de categorías conocidas
    params = []
    where_clauses = []
    if word_clauses:
        where_clauses.append(" AND ".join(word_clauses))
        params.extend(word_params)
    if palabras_categoria:
        where_clauses.append(
            "(" + " OR ".join(["unaccent(lower(categoria)) LIKE %s" for _ in palabras_categoria]) + ")"
        )
        for p in palabras_categoria:
            params.append(f"%{p}%")

    if not where_clauses:
        # fallback: buscar por el string completo
        where_clauses = ["(unaccent(lower(nombre)) LIKE %s OR unaccent(lower(categoria)) LIKE %s)"]
        params = [f"%{query_norm}%", f"%{query_norm}%"]

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
