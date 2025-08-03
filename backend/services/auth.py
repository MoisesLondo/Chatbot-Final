from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "megasecret"  # Idealmente lo cargas de .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def verify_password(plain_password, hashed_password):
    try:
        print(f"Contraseña en texto plano: {plain_password}")
        print(f"Hash almacenado: {hashed_password}")
        result = pwd_context.verify(plain_password, hashed_password)
        print(f"Resultado de la verificación: {result}")
        return result
    except Exception as e:
        print(f"Error al verificar la contraseña: {e}")
        raise

def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)