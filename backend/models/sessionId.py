from pydantic import BaseModel

class SessionID(BaseModel):
    session_id: str