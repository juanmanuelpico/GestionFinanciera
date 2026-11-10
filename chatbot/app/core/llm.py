# app/core/llm.py
# Fabrica el LLM según la configuración del entorno (igual que rag-chat-static):
# LLM_PROVIDER puede ser "ollama" (local) o "groq" (cloud, requiere API key).

from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.config import settings


def get_llm():
    """Devuelve el chat model configurado (temperature=0, respuestas deterministas)."""
    if settings.llm_provider == "groq":
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY no está configurada: definila en chatbot/.env")
        return ChatGroq(
            model=settings.llm_model,
            temperature=0,
            api_key=settings.groq_api_key,
        )

    # Ollama corre el modelo en tu máquina (requiere tenerlo instalado)
    kwargs = {}
    if settings.ollama_base_url:
        # Dentro de Docker, Ollama suele correr en el host
        kwargs["base_url"] = settings.ollama_base_url
    return ChatOllama(model=settings.llm_model, temperature=0, **kwargs)
