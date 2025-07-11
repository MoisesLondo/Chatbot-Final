from fastapi import FastAPI
from pydantic import BaseModel
from gemini_chain import get_gemini_chain_with_memory, get_chat_history
from typing import Dict, Any
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

origins = [
    "http://localhost:4200",  # Dominio del frontend (Angular)
    "http://127.0.0.1:4200",  # Otra posible URL del frontend
    "http://localhost:3000",  # Si usas otro puerto para el frontend
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Permitir estos orígenes
    allow_credentials=True,  # Permitir cookies y credenciales
    allow_methods=["*"],  # Permitir todos los métodos HTTP
    allow_headers=["*"],  # Permitir todos los encabezados
)

class Question(BaseModel):
    query: str
    session_id: str

class SessionID(BaseModel):
    session_id: str

@app.post("/ask")
def ask_question(q: Question):
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

@app.post("/history")
def get_history(session: SessionID) -> Dict[str, Any]:
    try:
        history = get_chat_history(session.session_id)
        return {
            "history": history['history']
        }
    except Exception as e:
        print(f"Error getting history: {e}")
        return {"error": str(e)}