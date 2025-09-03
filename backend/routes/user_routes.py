from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
import psycopg2
from requests import Session
from models.user import *
from passlib.context import CryptContext
from uuid import uuid4
from datetime import datetime
from services.auth import pwd_context
from services.db import get_connection_login


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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

@router.put("/users/{user_id}")
def update_user(user_id: str, data: UserUpdate):
    conn = get_connection_login()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Primero actualizamos la tabla auth_users
            updates = []
            values = []

            if data.password:
                password_hash = pwd_context.hash(data.password)
                updates.append("password_hash = %s")
                values.append(password_hash)

            if data.role:
                updates.append("role = %s")
                values.append(data.role)

            if updates:
                set_clause = ", ".join(updates)
                cur.execute(f"UPDATE auth_users SET {set_clause} WHERE id = %s", (*values, user_id))

            # Ahora actualizamos el perfil de vendedor
            if data.profile:
                profile_updates = []
                profile_values = []
                if data.profile.full_name is not None:
                    profile_updates.append("full_name = %s")
                    profile_values.append(data.profile.full_name)
                if data.profile.tel is not None:
                    profile_updates.append("tel = %s")
                    profile_values.append(data.profile.tel)

                if profile_updates:
                    set_clause = ", ".join(profile_updates)
                    cur.execute(f"UPDATE vendedores_profile SET {set_clause} WHERE id = %s", (*profile_values, user_id))

            # Opcional: actualizar email directo en vendedores_profile
            if data.email is not None:
                cur.execute("UPDATE vendedores_profile SET email = %s WHERE id = %s", (data.email, user_id))

            conn.commit()

            # Recuperar datos actualizados para devolver al frontend
            cur.execute("""
                SELECT u.id, u.username, u.role, u.is_active, u.created_at,
                       v.full_name, v.email, v.tel
                FROM auth_users u
                LEFT JOIN vendedores_profile v ON u.id = v.id
                WHERE u.id = %s
            """, (user_id,))
            updated_user = cur.fetchone()

            if not updated_user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            # Dar estructura que espera el frontend
            return {
                "id": updated_user["id"],
                "username": updated_user["username"],
                "role": updated_user["role"],
                "is_active": updated_user["is_active"],
                "created_at": updated_user["created_at"],
                "profile": {
                    "full_name": updated_user["full_name"],
                    "email": updated_user["email"],
                    "tel": updated_user["tel"]
                }
            }
    finally:
        conn.close()
