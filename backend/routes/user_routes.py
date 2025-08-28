from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from models.user import *
from uuid import uuid4
from datetime import datetime
from services.auth import pwd_context
from services.db import get_connection_login
router = APIRouter()

@router.post("/register-vendedor")
def register_user(data: RegisterUserWithProfile, response_model=RegisterUserWithProfile):
    user_id = str(uuid4())
    password_hash = pwd_context.hash(data.password)

    conn = get_connection_login()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO auth_users (id, username, password_hash, role, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                data.username,
                password_hash,
                data.role,
                True,
                datetime.utcnow()
            ))

            cur.execute("""
                INSERT INTO vendedores_profile (id, full_name, email, tel)
                VALUES (%s, %s, %s, %s)
            """, (
                user_id,
                data.profile.full_name,
                data.profile.email,
                data.profile.tel
            ))

            conn.commit()
        return {
                "id": user_id,
                "username": data.username,
                "role": data.role,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "profile": {
                    "full_name": data.profile.full_name,
                    "email": data.profile.email,
                    "tel": data.profile.tel
                }
            }
    finally:
        conn.close()


@router.get("/users")
def get_all_users():
    """
    Consulta todos los usuarios y su perfil.
    """
    try:
        conn = get_connection_login()
        with conn.cursor() as cur:
            # Traemos los usuarios con rol 'vendedor' y su perfil
            cur.execute("""
                SELECT 
                    u.id,
                    u.username,
                    u.role,
                    u.is_active,
                    u.created_at,
                    p.full_name,
                    p.email,
                    p.tel
                FROM auth_users u
                JOIN vendedores_profile p ON u.id = p.id
                ORDER BY u.created_at DESC
            """)
            users = cur.fetchall()

            # Transformamos la respuesta en un diccionario por usuario
            result = []
            for user in users:
                result.append({
                    "id": user[0],
                    "username": user[1],
                    "role": user[2],
                    "is_active": user[3],
                    "created_at": user[4],
                    "profile": {
                        "id": user[0],
                        "full_name": user[5],
                        "email": user[6],
                        "tel": user[7]
                    }
                })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar los usuarios: {e}")
    finally:
        conn.close()


@router.patch("/users/{user_id}/status")
def toggle_user_status(user_id: UUID, status: UserStatusUpdate):
    """
    Activa o desactiva un usuario según su ID (UUID).
    """
    try:
        conn = get_connection_login()
        with conn.cursor() as cur:
            # Verificar si el usuario existe
            cur.execute("SELECT * FROM auth_users WHERE id = %s;", (str(user_id),))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            # Actualizar estado
            cur.execute(
                "UPDATE auth_users SET is_active = %s WHERE id = %s RETURNING id, username, role, is_active, created_at;",
                (status.is_active, str(user_id))
            )
            updated_user = cur.fetchone()

            # Traer también info del perfil
            cur.execute("""
                SELECT 
                    u.id,
                    u.username,
                    u.role,
                    u.is_active,
                    u.created_at,
                    p.full_name,
                    p.email,
                    p.tel
                FROM auth_users u
                LEFT JOIN vendedores_profile p ON u.id = p.id
                WHERE u.id = %s;
            """, (str(user_id),))
            user_with_profile = cur.fetchone()

            conn.commit()
            return {"message": "Estado actualizado correctamente", "user": user_with_profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cambiar el estado del usuario: {e}")
    finally:
        conn.close()