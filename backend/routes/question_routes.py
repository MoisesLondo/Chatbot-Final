from fastapi import APIRouter
from models.question import Question
from models.sessionId import SessionID
from controllers import question_controller

router = APIRouter()

@router.post("/ask")
def ask_question(q: Question):
    return question_controller.ask_question_controller(q)

@router.post("/history")
def get_history(session: SessionID):
    return question_controller.get_history_controller(session)
