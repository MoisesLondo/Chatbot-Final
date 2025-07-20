from services.gemini_chain import get_gemini_chain_with_memory, get_chat_history

# Lógica para manejar preguntas

def ask_question_controller(q):
    try:
        chain = get_gemini_chain_with_memory(q.session_id)
        response = chain.invoke(
            {"input": q.query},
            {"configurable": {"session_id": q.session_id}}
        )
        final_response = response["text"] if isinstance(response, dict) and "text" in response else response
        return {
            "input": q.query,
            "response": final_response.content
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
