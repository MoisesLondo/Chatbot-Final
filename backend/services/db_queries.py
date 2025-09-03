def get_vendedor_profile_by_id(vendedor_id: str, conn):
    """
    Obtiene el perfil de un vendedor por su ID desde la base de datos.

    :param vendedor_id: ID del vendedor a buscar.
    :param conn: Conexión activa a la base de datos.
    :return: Diccionario con los datos del vendedor o None si no se encuentra.
    """
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM vendedores_profile
                WHERE id = %s
            """, (vendedor_id,))
            vendedor = cur.fetchone()

            if not vendedor:
                return None

            # Mapear los resultados a un diccionario
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, vendedor))

    except Exception as e:
        raise Exception(f"Error al obtener el perfil del vendedor: {str(e)}")
