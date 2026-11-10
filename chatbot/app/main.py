# app/main.py
# Punto de entrada del servidor FastAPI: router de chat + healthcheck.
# Correr (desde chatbot/): uvicorn app.main:app --reload --port 8100

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.config import settings

app = FastAPI(
    title="Gestión Financiera — Chatbot",
    description=(
        "Servidor Python + LangChain: asistente con tools que consulta el backend "
        "NestJS del usuario (movimientos, ahorros, dólar, deudas, gastos fijos, "
        "control de gastos) y registra movimientos. Requiere Authorization Bearer."
    ),
    version="0.1.0",
)

# El frontend (Vite en :5173) llama directo a este servicio desde el navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health", tags=["health"])
def health():
    """Healthcheck para Docker y para el frontend (no requiere LLM)."""
    return {
        "status": "ok",
        "service": "chatbot",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
    }
