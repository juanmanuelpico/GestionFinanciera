# app/schemas/chat.py
# Modelos Pydantic de entrada/salida del endpoint /chat.

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Mensaje previo del usuario o del asistente (para el contexto)."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    """Petición de chat: mensaje actual + historial visible opcional."""

    message: str = Field(min_length=1, max_length=4000, description="Prompt del usuario")
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=40,
        description="Mensajes anteriores (más viejos primero). El chatbot no guarda estado.",
    )


class ChatResponse(BaseModel):
    """Respuesta del chatbot."""

    answer: str = Field(description="Respuesta generada por el asistente")
    provider: str = Field(description="Proveedor de LLM usado (ollama | groq)")
    model: str = Field(description="Modelo usado")
    tools_used: list[str] = Field(
        default_factory=list,
        description="Tools realmente invocadas (vacio = respuesta sin datos del backend)",
    )
    events: list[str] = Field(
        default_factory=list,
        description=(
            "Marcas estructuradas de escrituras confirmadas por codigo (no por el LLM). "
            'Hoy: "movement-created" cuando el chatbot dio de alta un movimiento; '
            "el frontend la usa para refrescar el dinero disponible y las listas."
        ),
    )
