from pydantic import BaseModel
from typing import List, Optional

class DetalleCotizacion(BaseModel):
    codigo_producto: str
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    total: float

class Cotizacion(BaseModel):
    cliente_id: int
    nombre_cliente: str
    cedula_rif: str
    direccion: str
    subtotal: float
    iva: float
    total: float
    detalles: List[DetalleCotizacion]
    created_by: str  # 'chatbot' o 'vendedor'
    created_by_vendedor_id: str = None  # Opcional
    cliente_email: str = None
    cliente_telefono: str = None

class Cliente(BaseModel):
    id: Optional[int] = None
    razon_social: str
    cedula_rif: str
    direccion_fiscal: str
    email: str = None
    telefono: str = None