import psycopg
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT")
}



def search(nombre_producto: str):
    import unicodedata
    def normalize(text):
        if not text:
            return ""
        text = text.lower()
        text = unicodedata.normalize('NFD', text)
        text = ''.join([c for c in text if unicodedata.category(c) != 'Mn'])
        return text

    nombre_norm = normalize(nombre_producto)
    nombre_words = nombre_norm.split()

    # 1. Buscar coincidencia exacta en nombre o categoría
    conn = psycopg.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id, p.nombre, p.codigo, d.descripcion
        FROM producto p
        JOIN producto_info d ON p.id = d.producto_id
        WHERE unaccent(lower(p.nombre)) = %s OR unaccent(lower(p.categoria)) = %s
        """,
        (nombre_norm, nombre_norm)
    )
    results = cur.fetchall()
    if results:
        print(f"Resultados exactos: {len(results)}")
        cur.close()
        conn.close()
        return [
            {"producto_id": r[0], "nombre": r[1], "codigo": r[2], "descripcion": r[3]} for r in results
        ]

    # 2. Si no hay exactos, buscar coincidencia parcial en nombre/categoría
    cur.execute(
        """
        SELECT p.id, p.nombre, p.codigo, d.descripcion
        FROM producto p
        JOIN producto_info d ON p.id = d.producto_id
        WHERE unaccent(lower(p.nombre)) LIKE %s OR unaccent(lower(p.categoria)) LIKE %s
        """,
        (f"%{nombre_norm}%", f"%{nombre_norm}%")
    )
    results = cur.fetchall()
    if results:
        print(f"Resultados parciales nombre/categoria: {len(results)}")
        cur.close()
        conn.close()
        return [
            {"producto_id": r[0], "nombre": r[1], "codigo": r[2], "descripcion": r[3]} for r in results
        ]

    # 3. Si no hay, buscar variantes singular/plural y en descripción (filtro flexible)
    like_clauses = ["unaccent(lower(p.nombre)) LIKE %s", "unaccent(lower(p.categoria)) LIKE %s", "unaccent(lower(d.descripcion)) LIKE %s"]
    params = [f"%{nombre_norm}%", f"%{nombre_norm}%", f"%{nombre_norm}%"]
    for w in nombre_words:
        if w.endswith('s'):
            like_clauses.append("unaccent(lower(p.nombre)) LIKE %s")
            like_clauses.append("unaccent(lower(p.categoria)) LIKE %s")
            like_clauses.append("unaccent(lower(d.descripcion)) LIKE %s")
            params.append(f"%{w[:-1]}%")
            params.append(f"%{w[:-1]}%")
            params.append(f"%{w[:-1]}%")
        else:
            like_clauses.append("unaccent(lower(p.nombre)) LIKE %s")
            like_clauses.append("unaccent(lower(p.categoria)) LIKE %s")
            like_clauses.append("unaccent(lower(d.descripcion)) LIKE %s")
            params.append(f"%{w + 's'}%")
            params.append(f"%{w + 's'}%")
            params.append(f"%{w + 's'}%")
    where_sql = " OR ".join(like_clauses)
    cur.execute(
        f"""
        SELECT p.id, p.nombre, p.codigo, d.descripcion
        FROM producto p
        JOIN producto_info d ON p.id = d.producto_id
        WHERE {where_sql}
        """,
        tuple(params)
    )
    results = cur.fetchall()
    print(f"Resultados flexibles: {len(results)}")
    cur.close()
    conn.close()
    return [
        {"producto_id": r[0], "nombre": r[1], "codigo": r[2], "descripcion": r[3]} for r in results
    ]


def get_gemini_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.2,
        max_retries=2,
        api_key=GOOGLE_API_KEY
    )


def get_response(query: str):
    sql_query = search(query)
    if not sql_query:
        return "No se encontraron productos relacionados con tu consulta."
    llm = get_gemini_llm()
    descripciones = [prod['descripcion'] for prod in sql_query[:5]]
    user_message = (
        f"Producto consultado: {query}\n"
        "Descripciones encontradas:\n" + "\n---\n".join(descripciones)
    )
    system_prompt = (
        "Eres un experto en materiales de construcción. "
        "Te llegará el nombre de un producto y varias descripciones relacionadas. "
        "Responde con un solo párrafo de extensión media, completo y directo, dando los consejos, precauciones y usos más importantes sobre ese producto, usando solo la información de las descripciones. No uses listas ni enumeraciones, solo texto corrido. No respondas nada más."
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message)
    ]
    response = llm.invoke(messages)
    return response.content

print(get_response("tubo"))  # Ejemplo de uso