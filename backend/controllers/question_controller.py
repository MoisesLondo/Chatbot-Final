from services.gemini_agent import get_gemini_agent_with_memory, get_chat_history
from fastapi import APIRouter, HTTPException
from services.db_queries import get_vendedor_profile_by_id

router = APIRouter()

# Lógica para manejar preguntas

def ask_question_controller(q):
    try:
        chain = get_gemini_agent_with_memory(q.session_id)
        response = chain.invoke(
            {"input": q.query},
            {"configurable": {"session_id": q.session_id}}
        )
        final_response = response["text"] if isinstance(response, dict) and "text" in response else response
        return {
            "input": q.query,
            "response": final_response["output"]
        }
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}


def get_history_controller(session):
    try:
        history = get_chat_history(session.session_id)
        return {
            "history": history['history']
        }
    except Exception as e:
        print(f"Error getting history: {e}")
        return {"error": str(e)}


def get_vendedor_profile_by_id(vendedor_id: str, conn):
    """
    Obtiene el perfil de un vendedor por su ID desde la base de datos.

    :param vendedor_id: ID del vendedor a buscar.
    :param conn: Conexión activa a la base de datos.
    :return: Diccionario con los datos del vendedor o None si no se encuentra.
    """
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM vendedores_profile
                WHERE id = %s
            """, (vendedor_id,))
            vendedor = cur.fetchone()

            if not vendedor:
                return None

            # Mapear los resultados a un diccionario
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, vendedor))

    except Exception as e:
        raise Exception(f"Error al obtener el perfil del vendedor: {str(e)}")
