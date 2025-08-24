from fastapi import APIRouter, Depends
from models.user import UserCreate,VendedorProfile
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