from langchain_core.tools import Tool
from langchain_core.tools import StructuredTool
from .product_search import search
from .cotizacion_pdf import generar_cotizacion_pdf

tools = [
    Tool(
        name="InventarioBusqueda",
        func=search,
        description="Devuelve el inventario disponible de un producto. Úsala siempre que el usuario pregunte por stock, disponibilidad o productos. Espera el nombre del producto como entrada en forma de string. También acepta los argumentos opcionales 'mas_baratos' (bool) y 'mas_caros' (bool) para ordenar los resultados por precio de menor a mayor o de mayor a menor, respectivamente. Nunca deben ser ambos True al mismo tiempo. Ejemplo de uso: search('tubos', mas_baratos=True) o search('tubos', mas_caros=True)."
    ),
    StructuredTool.from_function(
        name="CotizacionProducto",
        func=generar_cotizacion_pdf,
        description="""Genera un PDF de cotización formal. Usa esta herramienta **ÚNICAMENTE** después de que todos los datos esenciales del cliente (Nombre, Cédula/RIF, Dirección, Productos con cantidades **y sus `pCod` y `uPrice` obtenidos de `InventarioBusqueda`**) hayan sido recolectados, y el cliente haya confirmado explícitamente que está listo para la cotización.
     **Esta herramienta espera un único argumento: una estructura de datos tipo diccionario NO UN STRING 'datos_cotizacion'** que debe contener la siguiente estructura con los datos del cliente y los productos, extraídos del historial de la conversación, cuyos campos son: 
                        - 'cxName': Nombre completo del cliente (string). 
                        - 'cxId': Cédula de identidad o RIF del cliente (string). 
                        - 'cxAddress': Dirección completa del cliente (string).
                        - 'email': Correo electrónico del cliente (string).
                        - 'tel': Teléfono del cliente (string).
                        - 'products': Una lista (array) de diccionarios, donde cada diccionario representa un producto. "
                         Cada producto en la lista 'products' debe tener las claves: 
                         - 'pCod': Código del producto (string). 
                        - 'prodName': Nombre del producto (string). 
                         - 'qty': Cantidad del producto (entero). 
                         - 'uPrice': Precio unitario del producto (número flotante).
                        El agente DEBE extraer estos datos del historial de la conversación y pasarlos en el formato de diccionario Python adecuado como el argumento 'datos_cotizacion'. 
                        Solo invoca esta herramienta cuando TODOS los datos de la cotización están completos y confirmados por el usuario, incluyendo los códigos y precios unitarios de los productos."""
    )
]
