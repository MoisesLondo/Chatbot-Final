from datetime import datetime
from models.cotizacion import Cotizacion, DetalleCotizacion, Cliente, CotizacionCreate
from services.db import get_connection
import traceback


def obtener_o_crear_cliente(cliente: Cliente) -> int:
    """
    Verifica si el cliente ya existe en la base de datos por email o teléfono.
    Si existe, retorna su ID. Si no, lo crea y retorna su ID.
    """
    try:
        conn = get_connection()
        if not conn:
            raise Exception("Error al conectar a la base de datos")
        with conn.cursor() as cur:
            # Verificar si el cliente ya existe por email o teléfono
            cur.execute("""
                SELECT id FROM clientes
                WHERE email = %s OR telefono = %s
            """, (cliente.email, cliente.telefono))
            resultado = cur.fetchone()

            if resultado:
                if isinstance(resultado, (tuple, list)):
                    cliente_id = resultado[0]
                elif isinstance(resultado, dict):
                    cliente_id = resultado.get('id')
                    if cliente_id is None:
                        raise Exception(f"El resultado del SELECT es un dict pero no contiene 'id': {resultado}")
                else:
                    raise Exception(f"Tipo inesperado para el resultado del SELECT: {type(resultado)} - valor: {resultado}")
                print(f"Cliente ya existe con ID: {cliente_id}")
                return cliente_id

            cur.execute("""
                INSERT INTO clientes (razon_social, cedula_rif, direccion_fiscal, email, telefono)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (cliente.razon_social, cliente.cedula_rif, cliente.direccion_fiscal, cliente.email, cliente.telefono))
            insert_result = cur.fetchone()
            if insert_result is None:
                raise Exception("No se pudo crear el cliente: el INSERT no devolvió ningún id. Verifica la tabla y los constraints.")
            # Soportar tupla, dict o lista
            if isinstance(insert_result, (tuple, list)):
                cliente_id = insert_result[0]
            elif isinstance(insert_result, dict):
                cliente_id = insert_result.get('id')
                if cliente_id is None:
                    raise Exception(f"El resultado del INSERT es un dict pero no contiene 'id': {insert_result}")
            else:
                raise Exception(f"Tipo inesperado para el resultado del INSERT: {type(insert_result)} - valor: {insert_result}")
            conn.commit()
            print(f"Cliente creado con ID: {cliente_id}")
            return cliente_id
    except Exception as e:
        
        print(f"Error al obtener o crear el cliente: {e}")
        traceback.print_exc()
        raise
    finally:
        conn.close()

def guardar_cotizacion(cotizacion: CotizacionCreate):
    try:
        conn = get_connection()
        if not conn:
            raise Exception("Error al conectar a la base de datos")
        with conn.cursor() as cur:
            # Log de los datos antes de guardar
            print("Datos a guardar en cotizacion:")
            print("cliente_id:", cotizacion.cliente_id)
            print("nombre_cliente:", cotizacion.nombre_cliente)
            print("cedula_rif:", cotizacion.cedula_rif)
            print("direccion:", cotizacion.direccion)
            print("subtotal:", cotizacion.subtotal)
            print("iva:", cotizacion.iva)
            print("total:", cotizacion.total)
            print("created_by:", cotizacion.created_by)
            print("created_by_vendedor_id:", cotizacion.created_by_vendedor_id)
            print("cliente_email:", cotizacion.cliente_email)
            print("cliente_telefono:", cotizacion.cliente_telefono)
            print("Detalles:", cotizacion.detalles)
            # Insertar cotización
            cur.execute("""
                INSERT INTO cotizacion (
                    cliente_id, nombre_cliente, cedula_rif, direccion, subtotal, iva, total, created_at, created_by, created_by_vendedor_id, cliente_email, cliente_telefono
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """, (
                cotizacion.cliente_id, cotizacion.nombre_cliente, cotizacion.cedula_rif, cotizacion.direccion,
                cotizacion.subtotal, cotizacion.iva, cotizacion.total, datetime.now(),
                cotizacion.created_by, cotizacion.created_by_vendedor_id, cotizacion.cliente_email, cotizacion.cliente_telefono
            ))
            cotizacion_result = cur.fetchone()
            if cotizacion_result is None:
                raise Exception("No se pudo crear la cotización: el INSERT no devolvió ningún id. Verifica la tabla y los constraints.")
            if isinstance(cotizacion_result, (tuple, list)):
                cotizacion_id = cotizacion_result[0]
            elif isinstance(cotizacion_result, dict):
                cotizacion_id = cotizacion_result.get('id')
                if cotizacion_id is None:
                    raise Exception(f"El resultado del INSERT de cotización es un dict pero no contiene 'id': {cotizacion_result}")
            else:
                raise Exception(f"Tipo inesperado para el resultado del INSERT de cotización: {type(cotizacion_result)} - valor: {cotizacion_result}")

            # Insertar detalles de la cotización
            for detalle in cotizacion.detalles:
                cur.execute("""
                    INSERT INTO detalle_cotizacion (
                        id, cotizacion_id, codigo_producto, nombre_producto, cantidad, precio_unitario, total, unidad
                    ) VALUES (
                        gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    cotizacion_id, detalle.codigo_producto, detalle.nombre_producto,
                    detalle.cantidad, detalle.precio_unitario, detalle.total, detalle.unidad
                ))

            conn.commit()
            return cotizacion_id
    except Exception as e:
        print(f"Error al guardar la cotización: {e}")
        traceback.print_exc()
        raise
    finally:
        conn.close()