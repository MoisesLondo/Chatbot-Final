from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from services.db import get_connection
from services.auth import verify_password, create_access_token
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

router = APIRouter()

@router.post("/login")
def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, username, password_hash, role, is_active FROM auth_users WHERE username = %s", (data.username,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    user_id, username, password_hash, role, is_active = user

    if not is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    if not verify_password(data.password, password_hash):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    token = create_access_token({"sub": username, "role": role, "user_id": str(user_id)})

    return {"access_token": token, "token_type": "bearer"}