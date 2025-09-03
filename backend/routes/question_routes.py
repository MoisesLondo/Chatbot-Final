from fastapi import APIRouter, HTTPException, Depends
from models.question import Question
from models.sessionId import SessionID
from controllers import question_controller
from services.db import get_connection_login
from services.db_queries import get_vendedor_profile_by_id

router = APIRouter()

@router.post("/ask")
def ask_question(q: Question):
    return question_controller.ask_question_controller(q)

@router.post("/history")
def get_history(session: SessionID):
    return question_controller.get_history_controller(session)

@router.get("/vendedores_profile/{vendedor_id}")
def get_vendedor_profile(vendedor_id: str):
    """
    Endpoint para obtener el perfil de un vendedor por su ID.
    """
    try:
        conn = get_connection_login()
        try:
            vendedor = get_vendedor_profile_by_id(vendedor_id, conn)
            if not vendedor:
                raise HTTPException(status_code=404, detail="Vendedor no encontrado")
            return vendedor
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
