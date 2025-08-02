from datetime import datetime
from models.cotizacion import Cotizacion, DetalleCotizacion, Cliente
from services.db import get_connection

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
                # Si el cliente existe, retornar su ID
                cliente_id = resultado[0]
                print(f"Cliente ya existe con ID: {cliente_id}")
                return cliente_id

            # Si el cliente no existe, crearlo
            cur.execute("""
                INSERT INTO clientes (razon_social, cedula_rif, direccion_fiscal, email, telefono)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (cliente.razon_social, cliente.cedula_rif, cliente.direccion_fiscal, cliente.email, cliente.telefono))
            cliente_id = cur.fetchone()[0]
            conn.commit()
            print(f"Cliente creado con ID: {cliente_id}")
            return cliente_id
    except Exception as e:
        print(f"Error al obtener o crear el cliente: {e}")
        raise
    finally:
        conn.close()

def guardar_cotizacion(cotizacion: Cotizacion):
    try:
        conn = get_connection()
        if not conn:
            raise Exception("Error al conectar a la base de datos")
        with conn.cursor() as cur:
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
            cotizacion_id = cur.fetchone()[0]

            # Insertar detalles de la cotización
            for detalle in cotizacion.detalles:
                cur.execute("""
                    INSERT INTO detalle_cotizacion (
                        id, cotizacion_id, codigo_producto, nombre_producto, cantidad, precio_unitario, total
                    ) VALUES (
                        gen_random_uuid(), %s, %s, %s, %s, %s, %s
                    )
                """, (
                    cotizacion_id, detalle.codigo_producto, detalle.nombre_producto,
                    detalle.cantidad, detalle.precio_unitario, detalle.total
                ))

            conn.commit()
            return cotizacion_id
    except Exception as e:
        print(f"Error al guardar la cotización: {e}")
        raise
    finally:
        conn.close()