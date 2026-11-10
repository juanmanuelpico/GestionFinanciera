# app/config.py
# Configuración central del chatbot: lee las variables de entorno desde .env.
# Usa los mismos nombres que el proyecto de referencia rag-chat-static
# (LLM_PROVIDER, LLM_MODEL, GROQ_API_KEY) y agrega las propias del servicio.

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Carga el .env del proyecto (chatbot/.env) si existe
load_dotenv()

# Raíz del proyecto: chatbot/
BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    """Valores de configuración del servicio, leídos del entorno."""

    # --- LLM (igual que la referencia) ---
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama").lower()
    llm_model: str = os.getenv("LLM_MODEL", "llama3.2")
    groq_api_key: str = os.getenv("GROQ_API_KEY") or ""
    # URL del servidor Ollama; dentro de Docker suele ser http://host.docker.internal:11434
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL") or ""

    # --- Integraciones ---
    # API del backend NestJS que el chatbot consumirá (futuras tools de CRUD)
    backend_api_url: str = os.getenv("BACKEND_API_URL", "http://localhost:3000/api")

    # --- Servidor ---
    chatbot_port: int = int(os.getenv("CHATBOT_PORT", "8100"))
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")

    # --- RAG ---
    chroma_dir: Path = BASE_DIR / "data" / "chroma_db"
    embedding_model: str = os.getenv(
        "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    top_k: int = int(os.getenv("RAG_TOP_K", "4"))


settings = Settings()
