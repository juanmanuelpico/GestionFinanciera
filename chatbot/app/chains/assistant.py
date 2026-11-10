# app/chains/assistant.py
# Asistente con tools: recibe el mensaje (+ historial) y responde usando las
# tools del registro (datos del backend del usuario) o el rechazo literal si el
# pedido sale del alcance. Sin RAG en esta ruta: la respuesta sale de los datos
# reales del backend via function calling (modelo con tool calling, ej. Groq
# openai/gpt-oss-20b).

import unicodedata
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage

from app.chains.assistant_prompt import SYSTEM_PROMPT
from app.core.llm import get_llm
from app.tools.registry import build_tools

# Ventana de historial que se reenvía al agente (mensajes, no tokens)
MAX_HISTORY_MESSAGES = 20


def run_assistant(token: str, message: str, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    """Ejecuta el agente para un mensaje del usuario.

    history: lista de {"role": "user"|"assistant", "content": str} más viejos primero.
    Devuelve {"answer": str, "tools_used": [nombres], "events": [marcas]}
    (events: escrituras confirmadas, ej. "movement-created" — ver registry).
    """
    events: list[str] = []
    agent = create_agent(model=get_llm(), tools=build_tools(token, events), system_prompt=SYSTEM_PROMPT)

    messages: list = []
    for item in (history or [])[-MAX_HISTORY_MESSAGES:]:
        if item.get("role") == "assistant":
            messages.append(AIMessage(content=item.get("content", "")))
        else:
            messages.append(HumanMessage(content=item.get("content", "")))
    messages.append(HumanMessage(content=message))

    result = agent.invoke({"messages": messages})
    out_messages = result.get("messages", [])

    answer = ""
    tools_used: list[str] = []
    for msg in out_messages[len(messages):]:
        tool_calls = getattr(msg, "tool_calls", None) or []
        for call in tool_calls:
            name = call.get("name", "")
            if name and name not in tools_used:
                tools_used.append(name)
        content = getattr(msg, "content", None)
        if isinstance(content, str) and content.strip():
            answer = content

    if not answer:
        # Sin pasos de tool y sin texto: tomar el último mensaje con contenido
        for msg in reversed(out_messages):
            content = getattr(msg, "content", None)
            if isinstance(content, str) and content.strip():
                answer = content
                break

    return {"answer": _canonicalize_rejection(answer), "tools_used": tools_used, "events": events}


def _canonicalize_rejection(answer: str) -> str:
    """El modelo a veces "corrige" la frase de rechazo (tildes, punto final).

    Se reemplaza por la versión literal pedida por producto cuando la respuesta
    es claramente ese rechazo, sin importar la puntuación o acentuación.
    """
    from app.chains.assistant_prompt import REJECTION_PHRASE

    if REJECTION_PHRASE in answer:
        return REJECTION_PHRASE

    normalized = unicodedata.normalize("NFKD", answer.lower())
    stripped = "".join(c for c in normalized if not unicodedata.combining(c))
    if "sobrepasa los limites establecidos" in stripped:
        return REJECTION_PHRASE
    return answer
