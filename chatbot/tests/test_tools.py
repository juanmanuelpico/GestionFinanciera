# tests/test_tools.py
# Tests de las tools del backend: agregaciones, reglas duras (fechas, defaults,
# umbrales) sin llamar al LLM. Se parchan api_get/api_post por módulo.

from datetime import date

import pytest

from app.tools import debts, dollar, fixed_expenses, movements, savings, spending
from app.tools.backend_api import BackendError, UnauthorizedBackendError


# ---------- movimientos ----------

def test_list_movimientos_exige_fechas_validas():
    err = movements.list_movements("tok", "", "")
    assert err.startswith("ERROR")
    err = movements.list_movements("tok", "31-11-2026", "2026-11-30")
    assert err.startswith("ERROR")


def test_list_movimientos_agrega_tipos_y_lista(monkeypatch):
    captured = {}

    def fake_get(path, token, params=None):
        captured["path"] = path
        captured["params"] = params
        return {
            "items": [
                {"id": 5, "type": "EGRESO", "amount": "1000.00", "currency": "ARS",
                 "movementDate": "2026-11-10T12:00:00.000Z",
                 "category": {"name": "Comida"}, "note": "almuerzo"},
                {"id": 6, "type": "INGRESO", "amount": "500.00", "currency": "ARS",
                 "movementDate": "2026-11-12T12:00:00.000Z",
                 "category": {"name": "Sueldo"}, "note": None},
            ],
            "meta": {"page": 1, "limit": 20, "total": 2, "totalPages": 1},
        }

    monkeypatch.setattr(movements, "api_get", fake_get)
    out = movements.list_movements("tok", "2026-11-01", "2026-11-30")
    assert captured["path"] == "/movements"
    assert captured["params"]["from"] == "2026-11-01T00:00:00.000Z"
    assert captured["params"]["to"] == "2026-11-30T23:59:59.999Z"
    assert "2 en total" in out
    assert "INGRESOS: 500.00" in out and "EGRESOS: 1,000.00" in out
    assert "Comida" in out and "#5" in out


def test_list_movimientos_vacio(monkeypatch):
    monkeypatch.setattr(
        movements, "api_get",
        lambda *a, **k: {"items": [], "meta": {"total": 0, "page": 1, "limit": 20, "totalPages": 0}},
    )
    out = movements.list_movements("tok", "2026-11-01", "2026-11-30")
    assert "No hay movimientos" in out


def test_crear_movimiento_default_ars_y_hoy(monkeypatch):
    captured = {}

    def fake_get(path, token, params=None):
        assert path == "/categories"
        return [{"id": 3, "name": "Comida", "type": "EGRESO", "thresholdAmount": None}]

    def fake_post(path, token, body):
        captured["path"] = path
        captured["body"] = body
        return {"id": 42, "amount": "1500.50", "spendingAlert": None}

    monkeypatch.setattr(movements, "api_get", fake_get)
    monkeypatch.setattr(movements, "api_post", fake_post)

    result = movements.create_movement("tok", "gasto", 1500.5, "comida")
    assert captured["path"] == "/movements"
    assert captured["body"]["currency"] == "ARS"
    assert captured["body"]["type"] == "EGRESO"
    assert captured["body"]["categoryId"] == 3
    assert captured["body"]["movementDate"].startswith(movements.today_utc().isoformat())
    # Marca obligatoria incluso sin nota del usuario
    assert captured["body"]["note"] == "Registro chatbot"
    assert "registré gasto de 1,500.50 ARS" in result["message"]
    assert "movimiento #42" in result["message"]
    assert result["created"] == {
        "id": 42, "type": "EGRESO", "amount": "1500.50", "currency": "ARS",
        "movement_date": movements.today_utc().isoformat(), "category_name": "Comida",
    }


def test_crear_movimiento_nota_combinada(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        movements, "api_get",
        lambda *a, **k: [{"id": 3, "name": "Comida", "type": "EGRESO"}],
    )

    def fake_post(path, token, body):
        captured["body"] = body
        return {"id": 44, "amount": "10.00", "spendingAlert": None}

    monkeypatch.setattr(movements, "api_post", fake_post)
    result = movements.create_movement("tok", "EGRESO", 10, "Comida", note="Supermercado")
    assert captured["body"]["note"] == "Supermercado · Registro chatbot"
    assert result["created"]["id"] == 44


def test_crear_movimiento_error_no_trae_created(monkeypatch):
    result = movements.create_movement("tok", "OTRA", 10, "Comida")
    assert result["message"].startswith("ERROR")
    assert result["created"] is None


def test_crear_movimiento_categoria_inexistente_lista_opciones(monkeypatch):
    monkeypatch.setattr(
        movements, "api_get",
        lambda *a, **k: [{"id": 1, "name": "Comida", "type": "EGRESO"}, {"id": 2, "name": "Sueldo", "type": "INGRESO"}],
    )
    result = movements.create_movement("tok", "EGRESO", 10, "Telefonía")
    assert result["message"].startswith("ERROR")
    assert "Comida, Sueldo" in result["message"]
    assert result["created"] is None


def test_crear_movimiento_tipo_de_categoria_no_coincide(monkeypatch):
    monkeypatch.setattr(
        movements, "api_get",
        lambda *a, **k: [{"id": 2, "name": "Sueldo", "type": "INGRESO"}],
    )
    result = movements.create_movement("tok", "EGRESO", 10, "Sueldo")
    assert result["message"].startswith("ERROR")
    assert "INGRESO" in result["message"]
    assert result["created"] is None


def test_crear_movimiento_alerta_de_umbral(monkeypatch):
    monkeypatch.setattr(
        movements, "api_get",
        lambda *a, **k: [{"id": 3, "name": "Comida", "type": "EGRESO"}],
    )
    monkeypatch.setattr(movements, "api_post", lambda *a, **k: {
        "id": 43, "amount": "900.00",
        "spendingAlert": {"spentAmount": "950.00", "thresholdAmount": "900.00",
                          "currency": "ARS", "categoryName": "Comida", "percent": 105.5},
    })
    result = movements.create_movement("tok", "EGRESO", 900, "Comida")
    assert "Atención" in result["message"] and "105.5%" in result["message"]


# ---------- ahorros ----------

def test_ahorros_todas_las_monedas(monkeypatch):
    monkeypatch.setattr(savings, "api_get", lambda path, token, params=None: (
        {"ARS": 100.0, "USD": 2.0, "EUR": 0.0} if path == "/savings/available"
        else {"savingsByCurrency": {"ARS": 500.0, "USD": 10.0, "EUR": 0.0}, "convertedTotals": {"ars": 1000.0, "usd": 1.0}}
    ))
    out = savings.get_savings("tok")
    assert "ARS: disponible 100.00" in out
    assert "ahorro registrado 500.00" in out
    assert "Total estimado en ARS" in out


def test_ahorros_filtro_moneda(monkeypatch):
    monkeypatch.setattr(savings, "api_get", lambda path, token, params=None: (
        {"ARS": 100.0, "USD": 2.0, "EUR": 0.0} if path == "/savings/available"
        else {"savingsByCurrency": {"ARS": 500.0, "USD": 10.0, "EUR": 0.0}}
    ))
    out = savings.get_savings("tok", "usd")
    assert "USD: disponible 2.00" in out
    assert "ARS" not in out


def test_ahorros_moneda_invalida():
    assert savings.get_savings("tok", "JPY").startswith("ERROR")


# ---------- dolar ----------

def test_dolar_formatea_tres_cotizaciones(monkeypatch):
    quotes = {
        "BLUE": {"type": "BLUE", "compra": 1000, "venta": 1050, "fechaActualizacion": "2026-11-09T12:00:00Z"},
        "OFICIAL": {"type": "OFICIAL", "compra": 900, "venta": 950, "fechaActualizacion": "2026-11-09T12:00:00Z"},
        "MEP": {"type": "MEP", "compra": 980, "venta": 990, "fechaActualizacion": "2026-11-09T12:00:00Z"},
    }
    monkeypatch.setattr(dollar, "api_get", lambda *a, **k: quotes)
    out = dollar.get_dollar_quotes("tok")
    for label in ("Blue", "Oficial", "MEP"):
        assert label in out
    assert "compra 1,000.00" in out


# ---------- deudas ----------

def _debt(**over):
    base = {
        "id": "d1", "kind": "TERCERO", "code": "DT1", "status": "ACTIVA", "currency": "ARS",
        "totalAmount": "1000.00", "remainingAmount": "600.00", "nextDueDate": "2026-10-15",
        "actor": {"displayName": "Juan Pérez", "type": "PERSONA"},
        "installments": [
            {"number": 1, "dueDate": "2026-09-15", "amount": "500.00", "paidAmount": "500.00", "paidAt": "2026-09-14T12:00:00.000Z"},
            {"number": 2, "dueDate": "2026-10-15", "amount": "500.00", "paidAmount": "400.00", "paidAt": None},
        ],
    }
    base.update(over)
    return base


def test_deudas_totales_y_vencidas(monkeypatch):
    monkeypatch.setattr(debts, "api_get", lambda path, token, params=None: {
        "items": [_debt()],
        "meta": {"page": 1, "limit": 100, "total": 1, "totalPages": 1},
    })
    out = debts.list_debts("tok", kind="TERCERO")
    assert "quedan 600.00 ARS" in out
    assert "Total pendiente en ARS: 600.00" in out
    # Cuota 2 con 100 pendientes y vencimiento 15/10/2026 < hoy -> VENCIDA
    assert "VENCIDAS" in out and "100.00" in out
    assert "DT1 «Juan Pérez»" in out


def test_deudas_kind_invalido():
    assert debts.list_debts("tok", kind="OTRA").startswith("ERROR")


def test_deudas_busqueda_por_persona(monkeypatch):
    captured = {}

    def fake_get(path, token, params=None):
        captured["params"] = params
        return {"items": [_debt()], "meta": {"page": 1, "limit": 100, "total": 1, "totalPages": 1}}

    monkeypatch.setattr(debts, "api_get", fake_get)
    out = debts.list_debts("tok", kind="TERCERO", search="Juan")
    assert captured["params"]["search"] == "Juan"
    assert "Juan Pérez" in out


# ---------- gastos fijos ----------

def test_gastos_fijos_clasifica_pagado_pendiente_vencido(monkeypatch):
    today = date.today().isoformat()
    this_month = today[:7]
    monkeypatch.setattr(fixed_expenses, "api_get", lambda path, token, params=None: [
        {"fixedExpenseId": "e1", "title": "Alquiler", "amount": "50000.00", "currency": "ARS",
         "period": this_month, "dueDate": f"{this_month}-05", "status": "PAGADO",
         "payment": {"paidAt": f"{this_month}-04T12:00:00.000Z"}},
        {"fixedExpenseId": "e2", "title": "Internet", "amount": "12000.00",
         "currency": "ARS", "period": this_month, "dueDate": f"{this_month}-28",
         "status": "PENDIENTE", "payment": None},
        {"fixedExpenseId": "e3", "title": "Patente", "amount": "20000.00", "currency": "ARS",
         "period": this_month, "dueDate": f"{this_month}-01", "status": "PENDIENTE", "payment": None},
    ])
    out = fixed_expenses.get_fixed_expenses("tok", this_month)
    assert "PAGADO el" in out
    assert "PENDIENTE (vence el" in out
    # El día 1 del mes actual solo es "vencido" si ya pasó; se valida el resumen presente
    assert "Resumen:" in out and "vencidos" in out


def test_gastos_fijos_periodo_invalido():
    assert fixed_expenses.get_fixed_expenses("tok", "2026/11").startswith("ERROR")


def test_historia_gasto_fijo_resuelve_titulo(monkeypatch):
    calls = []

    def fake_get(path, token, params=None):
        calls.append(path)
        if path == "/fixed-expenses":
            return [{"id": "e1", "title": "Alquiler departamento", "currency": "ARS"}]
        if path == "/fixed-expenses/e1/payments":
            return {"fixedExpense": {"title": "Alquiler departamento"}, "items": [
                {"period": "2026-10", "dueDate": "2026-10-05", "paidAt": "2026-10-03T12:00:00.000Z",
                 "amount": "50000.00", "currency": "ARS"},
            ]}
        raise AssertionError(path)

    monkeypatch.setattr(fixed_expenses, "api_get", fake_get)
    out = fixed_expenses.get_fixed_expense_history("tok", "alquiler")
    assert "Historial de pagos" in out
    assert "50,000.00 ARS pagado el" in out


# ---------- control de gastos ----------

def test_control_gastos_estados_por_umbral(monkeypatch):
    def fake_get(path, token, params=None):
        if path == "/categories":
            return [
                {"id": 1, "name": "Comida", "thresholdAmount": "1000.00", "thresholdCurrency": "ARS"},
                {"id": 2, "name": "Ocio", "thresholdAmount": "1000.00", "thresholdCurrency": "ARS"},
                {"id": 3, "name": "Transporte", "thresholdAmount": "1000.00", "thresholdCurrency": "ARS"},
                {"id": 4, "name": "Sin umbral", "thresholdAmount": None, "thresholdCurrency": None},
            ]
        if path == "/reports/movements/category-averages":
            assert params["from"] == params["to"] == "2026-11"
            assert params["type"] == "EGRESO"
            return {"items": [
                {"categoryId": 1, "categoryName": "Comida", "totalAmount": 1100.0},
                {"categoryId": 2, "categoryName": "Ocio", "totalAmount": 850.0},
                {"categoryId": 3, "categoryName": "Transporte", "totalAmount": 300.0},
            ]}
        raise AssertionError(path)

    monkeypatch.setattr(spending, "api_get", fake_get)
    out = spending.get_spending_control("tok", period="2026-11")
    assert "UMBRAL SUPERADO" in out
    assert "CERCA DE SUPERAR" in out
    assert "EN CONTROL" in out
    assert "Sin umbral" not in out
    assert "1 con umbral superado, 1 cerca de superar, 1 en control" in out


def test_control_gastos_una_categoria(monkeypatch):
    def fake_get(path, token, params=None):
        if path == "/categories":
            return [
                {"id": 1, "name": "Comida", "thresholdAmount": "1000.00", "thresholdCurrency": "ARS"},
                {"id": 2, "name": "Ocio", "thresholdAmount": "1000.00", "thresholdCurrency": "ARS"},
            ]
        return {"items": [{"categoryId": 1, "categoryName": "Comida", "totalAmount": 500.0}]}

    monkeypatch.setattr(spending, "api_get", fake_get)
    out = spending.get_spending_control("tok", period="2026-11", category_name="comida")
    assert "Comida" in out and "Ocio" not in out
    assert "EN CONTROL" in out


# ---------- errores de backend ----------

def test_registry_convierte_errores_en_texto(monkeypatch):
    from app.tools import registry

    def boom(*a, **k):
        raise UnauthorizedBackendError()

    monkeypatch.setattr(movements, "api_get", boom)
    tools = registry.build_tools("tok")
    listar = next(t for t in tools if t.name == "listar_movimientos")
    out = listar.invoke({"date_from": "2026-11-01", "date_to": "2026-11-30"})
    assert "ERROR DE SESION" in out

    def boom2(*a, **k):
        raise BackendError(404, "Categoría no encontrada")

    monkeypatch.setattr(movements, "api_get", boom2)
    tools = registry.build_tools("tok")
    listar = next(t for t in tools if t.name == "listar_movimientos")
    out = listar.invoke({"date_from": "2026-11-01", "date_to": "2026-11-30"})
    assert "ERROR DEL SISTEMA: Categoría no encontrada" in out


def test_registry_expone_nueve_tools():
    from app.tools import registry

    tools = registry.build_tools("tok")
    names = {t.name for t in tools}
    assert names == {
        "listar_movimientos", "crear_movimiento", "ver_ahorros", "ver_dolar",
        "listar_deudas", "ver_gastos_fijos", "ver_gasto_fijo", "ver_control_gastos",
        "listar_categorias",
    }


# ---------- events (marca de escritura para el frontend) ----------

def _crear_tool(events, monkeypatch):
    from app.tools import registry

    monkeypatch.setattr(
        movements, "api_get",
        lambda *a, **k: [{"id": 3, "name": "Comida", "type": "EGRESO"}],
    )
    tools = registry.build_tools("tok", events)
    return next(t for t in tools if t.name == "crear_movimiento")


def test_event_movement_created_solo_en_exito(monkeypatch):
    monkeypatch.setattr(movements, "api_post", lambda *a, **k: {
        "id": 50, "amount": "100.00", "spendingAlert": None,
    })
    events: list[str] = []
    tool = _crear_tool(events, monkeypatch)
    out = tool.invoke({"movement_type": "EGRESO", "amount": 100, "category_name": "Comida"})
    assert "registré" in out
    assert events == ["movement-created"]


def test_event_no_se_emite_cuando_falla_la_alta(monkeypatch):
    monkeypatch.setattr(movements, "api_post", lambda *a, **k: (_ for _ in ()).throw(
        BackendError(400, "La billetera USD no está habilitada")))
    events: list[str] = []
    tool = _crear_tool(events, monkeypatch)
    out = tool.invoke({"movement_type": "EGRESO", "amount": 100, "category_name": "Comida", "currency": "USD"})
    assert out.startswith("ERROR DEL SISTEMA")
    assert events == []


def test_event_no_se_emite_con_error_de_categoria(monkeypatch):
    # create_movement devuelve created=None (error de validacion) -> nada en el sink
    events: list[str] = []
    tool = _crear_tool(events, monkeypatch)
    out = tool.invoke({"movement_type": "EGRESO", "amount": 100, "category_name": "Inexistente"})
    assert out.startswith("ERROR")
    assert events == []
