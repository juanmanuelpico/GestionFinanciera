# app/api/routes/chat.py
# Endpoint principal: recibe el prompt del usuario (+ historial) y la respuesta
# del asistente con tools. El token JWT se RECIBE en Authorization y se reenvia
# al backend NestJS en cada tool: todas las consultas son por usuario y el
# chatbot nunca guarda credenciales.

from fastapi import APIRouter, Header, HTTPException

from app.chains.assistant import run_assistant
from app.config import settings
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])

_BEARER_PREFIX = "bearer "


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith(_BEARER_PREFIX):
        raise HTTPException(
            status_code=401,
            detail="Falta el token de acceso: enviá Authorization: Bearer <token> del usuario.",
        )
    token = authorization[len(_BEARER_PREFIX):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="El token de acceso está vacío.")
    return token


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, authorization: str | None = Header(default=None)) -> ChatResponse:
    """Responde un mensaje del usuario usando las tools del backend."""
    token = _extract_token(authorization)

    try:
        result = run_assistant(
            token=token,
            message=body.message,
            history=[m.model_dump() for m in body.history],
        )
    except RuntimeError as exc:
        # Config inválida del LLM (ej. GROQ_API_KEY faltante)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo generar la respuesta ({exc.__class__.__name__}). Intentá de nuevo.",
        ) from exc

    return ChatResponse(
        answer=result["answer"],
        provider=settings.llm_provider,
        model=settings.llm_model,
        tools_used=result["tools_used"],
        events=result.get("events", []),
    )
