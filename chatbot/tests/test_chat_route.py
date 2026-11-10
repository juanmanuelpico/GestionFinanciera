# tests/test_chat_route.py
# Tests del endpoint /chat: auth obligatoria, mapeo de errores y contrato de
# respuesta. El agente se simula: no se llama al LLM.

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

BODY = {"message": "hola"}


def test_chat_sin_token_devuelve_401():
    response = client.post("/chat", json=BODY)
    assert response.status_code == 401
    assert "Authorization" in response.json()["detail"]


def test_chat_token_vacio_devuelve_401():
    response = client.post("/chat", json=BODY, headers={"Authorization": "Bearer "})
    assert response.status_code == 401


def test_chat_devuelve_respuesta_del_agente(monkeypatch):
    from app.api.routes import chat as chat_route

    fake = MagicMock(return_value={"answer": "El dólar blue está en 1.000", "tools_used": ["ver_dolar"], "events": []})
    monkeypatch.setattr(chat_route, "run_assistant", fake)

    response = client.post("/chat", json=BODY, headers={"Authorization": "Bearer tok-123"})
    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "El dólar blue está en 1.000"
    assert body["tools_used"] == ["ver_dolar"]
    assert body["events"] == []
    assert body["provider"] and body["model"]
    # El token se pasa al agente
    assert fake.call_args.kwargs["token"] == "tok-123"


def test_chat_propaga_el_event_de_movimiento_creado(monkeypatch):
    from app.api.routes import chat as chat_route

    fake = MagicMock(return_value={
        "answer": "Registré tu gasto.", "tools_used": ["crear_movimiento"],
        "events": ["movement-created"],
    })
    monkeypatch.setattr(chat_route, "run_assistant", fake)

    response = client.post("/chat", json=BODY, headers={"Authorization": "Bearer tok"})
    assert response.status_code == 200
    assert response.json()["events"] == ["movement-created"]


def test_chat_reenvia_el_historial(monkeypatch):
    from app.api.routes import chat as chat_route

    fake = MagicMock(return_value={"answer": "ok", "tools_used": []})
    monkeypatch.setattr(chat_route, "run_assistant", fake)

    history = [{"role": "user", "content": "¿cuánto gasté?"}, {"role": "assistant", "content": "¿qué fechas?"}]
    response = client.post("/chat", json={"message": "noviembre", "history": history},
                           headers={"Authorization": "Bearer tok"})
    assert response.status_code == 200
    sent = fake.call_args.kwargs["history"]
    assert sent == history


def test_chat_sin_api_key_groq_devuelve_503(monkeypatch):
    from app.api.routes import chat as chat_route

    def raise_config_error(**kwargs):
        raise RuntimeError("GROQ_API_KEY no está configurada")

    monkeypatch.setattr(chat_route, "run_assistant", raise_config_error)
    response = client.post("/chat", json=BODY, headers={"Authorization": "Bearer tok"})
    assert response.status_code == 503
    assert "GROQ_API_KEY" in response.json()["detail"]


def test_chat_fallo_del_agente_devuelve_502(monkeypatch):
    from app.api.routes import chat as chat_route

    def raise_generic(**kwargs):
        raise ValueError("boom")

    monkeypatch.setattr(chat_route, "run_assistant", raise_generic)
    response = client.post("/chat", json=BODY, headers={"Authorization": "Bearer tok"})
    assert response.status_code == 502


def test_chat_rechaza_mensaje_vacio():
    response = client.post("/chat", json={"message": ""}, headers={"Authorization": "Bearer tok"})
    assert response.status_code == 422
