from uuid import UUID
from fastapi import APIRouter, Depends
from models.user import *
from services.manage_user import *
router = APIRouter()

@router.post("/register-vendedor")
def register_vendedor_route(user: UserCreate, profile: VendedorProfile):
    return register_user(user, profile)

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
                    "full_name": user[5],
                    "email": user[6],
                    "tel": user[7]
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