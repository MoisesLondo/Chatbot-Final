import cohere
import psycopg
import json
import os
from dotenv import load_dotenv

load_dotenv()

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT")
}

def search(query: str, top_k: int = 10):
    co = cohere.Client(COHERE_API_KEY)
    embedding_response = co.embed(
        texts=[query],
        input_type="search_query"
    )
    query_embedding = embedding_response.embeddings[0][:1024]
    query_embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    conn = psycopg.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, content, metadata, similarity
        FROM match_documents(%s, 10);
    """, (query_embedding_str,))
    results = cur.fetchall()

    query_lower = query.lower()
    if any(word in query_lower for word in ["barato", "económico", "precio", "menor precio"]):
        def get_precio(r):
            meta = r[2]
            if isinstance(meta, str):
                meta = json.loads(meta)
            return float(meta.get("precio_minorista", 1e9))
        results = sorted(results, key=get_precio)[:top_k]
    else:
        results = results[:top_k]

    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "content": r[1],
            "metadata": r[2],
            "similarity": round(r[3], 4)
        } for r in results
    ]
