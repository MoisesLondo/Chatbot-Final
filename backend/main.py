from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routes.question_routes import router as question_router
from routes import login
from routes import cotizacion_routes, user_routes




app = FastAPI()

origins = [
    "http://localhost:4200",  # Dominio del frontend (Angular)
    "http://127.0.0.1:4200",  # Otra posible URL del frontend
    "http://localhost:3000",  # Si usas otro puerto para el frontend
    "http://127.0.0.1:3000"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Permitir estos orígenes
    allow_credentials=True,  # Permitir cookies y credenciales
    allow_methods=["*"],  # Permitir todos los métodos HTTP
    allow_headers=["*"],  # Permitir todos los encabezados
)

# Incluir las rutas de preguntas
app.include_router(question_router)

app.include_router(login.router)

app.include_router(cotizacion_routes.router)

app.include_router(user_routes.router)

# Montar el directorio de archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/static/temp", StaticFiles(directory="static/temp"), name="temp")

