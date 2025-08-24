from fastapi import APIRouter, HTTPException, Depends
from models.user import UserCreate, VendedorProfile
from uuid import uuid4
from datetime import datetime
from services.auth import pwd_context
from services.db import get_connection_login

router = APIRouter()

def register_user(user: UserCreate, profile: VendedorProfile):
    """
    Registra un nuevo vendedor en la base de datos.
    """
    try:
        # Validar el rol
        if user.role != "vendedor":
            raise HTTPException(status_code=400, detail="Solo se pueden registrar usuarios con rol 'vendedor'")

        # Generar el hash de la contraseña
        password_hash = pwd_context.hash(user.password)

        # Insertar el nuevo usuario y su perfil en la base de datos
        conn = get_connection_login()
        with conn.cursor() as cur:
            # Insertar en auth_users
            user_id = str(uuid4())
            cur.execute("""
                INSERT INTO auth_users (id, username, password_hash, role, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                user.username,
                password_hash,
                user.role,
                True,  # is_active por defecto es True
                datetime.utcnow()
            ))

            # Insertar en vendedores_profile
            cur.execute("""
                INSERT INTO vendedores_profile (id, full_name, email, tel)
                VALUES (%s, %s, %s, %s)
            """, (
                user_id,  # Foreign key a auth_users
                profile.full_name,
                profile.email,
                profile.tel
            ))

            conn.commit()

        return {"message": "Vendedor registrado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar el vendedor: {e}")
    finally:
        conn.close()

