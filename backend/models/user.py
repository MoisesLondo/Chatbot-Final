from pydantic import BaseModel
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