
import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class DetalleCotizacion(BaseModel):
    id: UUID
    cotizacion_id: int
    producto_id: int | None
    codigo_producto: str
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    unidad: str
    total: float

class Cotizacion(BaseModel):
    id: int
    cliente_id: int
    nombre_cliente: str
    cedula_rif: str
    direccion: str
    cliente_email: str = None
    cliente_telefono: str = None
    subtotal: float
    iva: float
    total: float
    created_at: datetime
    created_by: str
    created_by_vendedor_id: str | None
    detalles: List[DetalleCotizacion]

    model_config = ConfigDict(arbitrary_types_allowed=True)

class Cliente(BaseModel):
    id: Optional[int] = None
    razon_social: str
    cedula_rif: str
    direccion_fiscal: str
    email: str = None
    telefono: str = None

class DetalleCotizacionCreate(BaseModel):
    codigo_producto: str
    nombre_producto: str
    cantidad: int
    unidad: str
    precio_unitario: float
    total: float

class CotizacionCreate(BaseModel):
    cliente_id: int
    nombre_cliente: str
    cedula_rif: str
    direccion: str
    cliente_email: str = None
    cliente_telefono: str = None
    subtotal: float
    iva: float
    total: float
    created_by: str
    created_by_vendedor_id: str | None = None
    detalles: List[DetalleCotizacionCreate]