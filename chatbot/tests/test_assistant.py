# tests/test_assistant.py
# run_assistant: armado de mensajes (history -> Human/AI), extraccion de la
# respuesta final y de las tools realmente usadas. El grafo se simula devolviendo
# input + pasos nuevos, igual que create_agent real.

from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage

from app.chains import assistant as assistant_mod


def _patch_graph(monkeypatch, extra_messages, captured=None):
    monkeypatch.setattr(assistant_mod, "get_llm", lambda: MagicMock())
    monkeypatch.setattr(assistant_mod, "build_tools", lambda token, events=None: [])

    def fake_create_agent(model, tools, system_prompt):
        if captured is not None:
            captured["system_prompt"] = system_prompt
            captured["tools"] = tools
        agent = MagicMock()

        def invoke(payload):
            if captured is not None:
                captured["messages"] = payload["messages"]
            return {"messages": list(payload["messages"]) + extra_messages}

        agent.invoke = invoke
        return agent

    monkeypatch.setattr(assistant_mod, "create_agent", fake_create_agent)


def test_run_assistant_extrae_respuesta_y_tools(monkeypatch):
    extra = [
        AIMessage(content="", tool_calls=[{"name": "ver_dolar", "args": {}, "id": "c1"}]),
        AIMessage(content="El dólar blue está en 1.000 ARS."),
    ]
    _patch_graph(monkeypatch, extra)

    result = assistant_mod.run_assistant("tok", "¿cuánto está el dólar?")
    assert result["answer"] == "El dólar blue está en 1.000 ARS."
    assert result["tools_used"] == ["ver_dolar"]


def test_run_assistant_pasa_el_historial_como_mensajes(monkeypatch):
    captured: dict = {}
    _patch_graph(monkeypatch, [AIMessage(content="listo")], captured)

    history = [{"role": "user", "content": "¿cuánto gasté?"},
               {"role": "assistant", "content": "¿qué fechas?"}]
    result = assistant_mod.run_assistant("tok", "noviembre", history=history)
    roles = [type(m) for m in captured["messages"]]
    assert roles == [HumanMessage, AIMessage, HumanMessage]
    assert result["answer"] == "listo"


def test_run_assistant_canoniza_la_frase_de_rechazo(monkeypatch):
    extra = [AIMessage(content="No puedo responder o aplicar tu consulta porque sobrepasa los límites establecidos.")]
    _patch_graph(monkeypatch, extra)

    from app.chains.assistant_prompt import REJECTION_PHRASE

    result = assistant_mod.run_assistant("tok", "¿en qué cripto invierto?")
    assert result["answer"] == REJECTION_PHRASE


def test_run_assistant_deduplica_tools_y_ordena(monkeypatch):
    extra = [
        AIMessage(content="", tool_calls=[{"name": "listar_categorias", "args": {}, "id": "c1"}]),
        AIMessage(content="", tool_calls=[
            {"name": "crear_movimiento", "args": {}, "id": "c2"},
            {"name": "listar_categorias", "args": {}, "id": "c3"},
        ]),
        AIMessage(content="hecho"),
    ]
    _patch_graph(monkeypatch, extra)

    result = assistant_mod.run_assistant("tok", "gasto de 10 en comida")
    assert result["tools_used"] == ["listar_categorias", "crear_movimiento"]
    assert result["answer"] == "hecho"


def test_run_assistant_propaga_events_del_sink(monkeypatch):
    """El sink que recibe build_tools es el que termina en result["events"]."""
    seen: dict[str, list] = {}

    def fake_build_tools(token, events=None):
        seen["events"] = events
        # simula que la tool de alta confirmo una escritura exitosa
        events.append("movement-created")
        return []

    monkeypatch.setattr(assistant_mod, "get_llm", lambda: MagicMock())
    monkeypatch.setattr(assistant_mod, "build_tools", fake_build_tools)
    monkeypatch.setattr(
        assistant_mod, "create_agent",
        lambda model, tools, system_prompt: MagicMock(
            invoke=lambda payload: {"messages": list(payload["messages"]) + [AIMessage(content="listo")]}
        ),
    )

    result = assistant_mod.run_assistant("tok", "gasto de 10 en comida")
    assert seen["events"] is not None
    assert result["events"] == ["movement-created"]
