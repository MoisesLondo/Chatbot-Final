from langchain_core.tools import Tool
from langchain_core.tools import StructuredTool
from .product_search import search
from .cotizacion_pdf import generar_cotizacion_pdf
from .tips import get_response

tools = [
    Tool(
        name="InventarioBusqueda",
        func=search,
        description="Devuelve el inventario disponible de un producto. Úsala siempre que el usuario pregunte por stock, disponibilidad o productos. Espera el nombre del producto como entrada en forma de string. También acepta los argumentos opcionales 'mas_baratos' (bool) y 'mas_caros' (bool) para ordenar los resultados por precio de menor a mayor o de mayor a menor, respectivamente. Nunca deben ser ambos True al mismo tiempo. Ejemplo de uso: search('tubos', mas_baratos=True) o search('tubos', mas_caros=True)."
    ),
    Tool(
        name="ProductoConsejos",
        func=get_response,
        description="Devuelve consejos y precauciones sobre un producto. Úsala siempre que el usuario pregunte por recomendaciones o advertencias relacionadas con un producto. Espera el nombre del producto como entrada en forma de string."
    ),
    StructuredTool.from_function(
        name="CotizacionProducto",
        func=generar_cotizacion_pdf,
        description="""Genera un PDF de cotización formal. Usa esta herramienta cuando recibas todos los datos esenciales del cliente (nombre, cédula/RIF, dirección, email, teléfono y productos con cantidades). Si los datos llegan desde el formulario (por ejemplo, en un mensaje que comienza con [FORMULARIO-ENVIADO]), debes mapear los campos recibidos a los argumentos requeridos:
        - cxName: nombre
        - cxId: cedula
        - cxAddress: direccion
        - email: email
        - tel: telefono
        - products: una lista de productos, cada uno con:
            - pCod: Código del producto (string, obtenido usando InventarioBusqueda)
            - prodName: Nombre del producto (string)
            - qty: Cantidad del producto (entero)
            - uPrice: Precio unitario del producto (número flotante, obtenido usando InventarioBusqueda)
            - unit: Unidad del producto (string)
        - vendedorId: ID del vendedor (string, opcional)
        Si el usuario que cotiza es admin o vendedor (envia un objeto vendedor), también debes enviar el campo 'vendedorId' como string, para que la cotización refleje quién la generó. El agente debe extraer estos datos, mapearlos correctamente y pasarlos como argumentos separados. Nunca muestres el JSON ni los datos internos al usuario, solo responde con el enlace al PDF generado o un mensaje de éxito. Solo invoca esta herramienta cuando todos los datos estén completos y confirmados."""
    )
]
