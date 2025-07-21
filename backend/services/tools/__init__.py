from langchain_core.tools import Tool
from .cohere_search import search
from .cotizacion_pdf import generar_cotizacion_pdf

tools = [
    Tool(
        name="InventarioBusqueda",
        func=search,
        description="Devuelve el inventario disponible de un producto. Úsala siempre que el usuario pregunte por stock, disponibilidad o productos. Espera el nombre del producto como entrada en forma de string."
    ),
    Tool(
        name="CotizacionProducto",
        func=generar_cotizacion_pdf,
        description="Calcula el precio total de un producto dado su nombre y cantidad. Úsala siempre que el usuario pida cotización."
    )
]
