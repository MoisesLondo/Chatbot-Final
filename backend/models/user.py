from pydantic import BaseModel
from typing import Optional

# Modelo para la solicitud de registro de usuario
class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # Debe ser uno de: "admin", "vendedor", "cliente"

class VendedorProfile(BaseModel):
    full_name: str
    email: str
    tel: str

class UserStatusUpdate(BaseModel):
    is_active: bool

class RegisterUserWithProfile(BaseModel):
    username: str
    password: str
    role: str
    profile: VendedorProfile

class VendedorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    tel: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    profile: Optional[VendedorProfileUpdate] = None