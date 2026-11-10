# tests/test_health.py
# Smoke test: la app arranca y responde el healthcheck sin necesitar LLM ni BD.

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "chatbot"
