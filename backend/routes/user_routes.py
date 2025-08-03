from fastapi import APIRouter, Depends
from models.user import UserCreate,VendedorProfile
from services.manage_user import register_user 
router = APIRouter()

@router.post("/register-vendedor")
def register_vendedor_route(user: UserCreate, profile: VendedorProfile):
    return register_user(user, profile)