# app/tools/movements.py
# Movimientos: listado con filtros (fechas OBLIGATORIAS por diseño) y alta
# de gastos/ingresos. La alta resuelve el nombre de categoría a ID consultando
# GET /categories, que es también la herramienta de control de gastos.

from app.tools.backend_api import api_get, api_post
from app.tools.common import (
    VALID_CURRENCIES,
    fmt_date,
    fmt_money,
    is_valid_date,
    normalize,
    parse_amount,
    today_utc,
)

MOVEMENT_TYPES = ("INGRESO", "EGRESO")
# Sinónimos en español que puede mandar el LLM al registrar
_TYPE_SYNONYMS = {
    "GASTO": "EGRESO", "SALIDA": "EGRESO", "DESBOLSO": "EGRESO",
    "GANANCIA": "INGRESO", "ENTRADA": "INGRESO",
}
PAYMENT_METHODS = ("EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA", "MERCADO_PAGO", "OTRO")

# Marca que identifica en la observación que el movimiento lo creó el chatbot
CHATBOT_NOTE_MARK = "Registro chatbot"


def _compose_note(user_note: str = "") -> str:
    """La marca va SIEMPRE (en código, no a merced del LLM).

    Sin nota del usuario -> "Registro chatbot".
    Con nota -> "<nota> · Registro chatbot" (decisión de producto: nota combinada).
    """
    user_note = (user_note or "").strip()
    combined = f"{user_note} · {CHATBOT_NOTE_MARK}" if user_note else CHATBOT_NOTE_MARK
    return combined[:500]


def _create_error(message: str) -> dict:
    return {"message": message, "created": None}


def list_categories(token: str) -> str:
    categories = api_get("/categories", token)
    if not categories:
        return "El usuario no tiene categorías creadas."
    lines = ["Categorías del usuario:"]
    for c in categories:
        threshold = ""
        if c.get("thresholdAmount"):
            threshold = f" | umbral {fmt_money(c['thresholdAmount'], c.get('thresholdCurrency') or 'ARS')}/mes"
        lines.append(
            f"- id {c['id']}: {c['name']} (tipo: {c.get('type') or 'mixta'}){threshold}"
        )
    return "\n".join(lines)


def list_movements(token: str, date_from: str, date_to: str, movement_type: str = "",
                   category_id: int = 0, page: int = 1, limit: int = 20) -> str:
    if not (is_valid_date(date_from) and is_valid_date(date_to)):
        return "ERROR: fechas inválidas. Usá formato YYYY-MM-DD."

    params = {
        # El backend espera ISO: desde 00:00 y hasta fin del día
        "from": f"{date_from}T00:00:00.000Z",
        "to": f"{date_to}T23:59:59.999Z",
        "page": max(page, 1),
        "limit": min(max(limit, 1), 100),
    }
    if movement_type and movement_type.upper() in MOVEMENT_TYPES:
        params["type"] = movement_type.upper()
    if category_id:
        params["categoryId"] = int(category_id)

    data = api_get("/movements", token, params)
    items = data.get("items", [])
    meta = data.get("meta", {})
    total = meta.get("total", len(items))

    if not items:
        return f"No hay movimientos entre {fmt_date(date_from)} y {fmt_date(date_to)} (con los filtros pedidos)."

    # Totales por tipo en el rango (los del backend pueden seguir en más páginas)
    ingresos = sum(parse_amount(i["amount"]) for i in items if i["type"] == "INGRESO")
    egresos = sum(parse_amount(i["amount"]) for i in items if i["type"] == "EGRESO")

    lines = [
        f"Movimientos del {fmt_date(date_from)} al {fmt_date(date_to)}: "
        f"{total} en total, mostrando página de {len(items)}.",
        f"Subtotales de esta página — INGRESOS: {fmt_money(ingresos)} | EGRESOS: {fmt_money(egresos)}"
        " (subtotales de los ítems mostrados; las monedas pueden mezclarse).",
    ]
    for i in items:
        category = (i.get("category") or {}).get("name", "?")
        note = f" — {i['note']}" if i.get("note") else ""
        lines.append(
            f"#{i['id']} {fmt_date(i.get('movementDate'))} [{i['type']}] "
            f"{fmt_money(i.get('amount'), i.get('currency') or 'ARS')} en «{category}»{note}"
        )
    if total > len(items):
        lines.append("(hay más movimientos: se pueden pedir por página)")
    return "\n".join(lines)


def create_movement(token: str, movement_type: str, amount: float, category_name: str,
                    currency: str = "ARS", date_str: str = "",
                    payment_method: str = "", note: str = "") -> dict:
    """Registra un movimiento. Devuelve {"message": str, "created": dict | None}.

    `created` trae datos estructurados (id, type, amount, currency, movement_date)
    solo en éxito; el registry lo usa para emitir el event "movement-created"
    sin depender del texto del LLM.
    """
    raw_type = (movement_type or "").upper()
    movement_type = _TYPE_SYNONYMS.get(raw_type, raw_type)
    currency = (currency or "ARS").upper()

    if movement_type not in MOVEMENT_TYPES:
        return _create_error("ERROR: tipo inválido. Usá INGRESO (ganancia) o EGRESO (gasto).")
    if currency not in VALID_CURRENCIES:
        return _create_error("ERROR: billetera inválida. Las billeteras son ARS, USD o EUR.")
    if amount is None or parse_amount(amount) <= 0:
        return _create_error("ERROR: el importe debe ser mayor a 0.")
    if date_str and not is_valid_date(date_str):
        return _create_error("ERROR: fecha inválida. Usá formato YYYY-MM-DD.")

    # Resolver nombre de categoría -> id (valida existencia y tipo compatible)
    categories = api_get("/categories", token) or []
    wanted = normalize(category_name or "")
    matches = [c for c in categories if normalize(c["name"]) == wanted]
    if not matches:
        candidates = [c for c in categories if wanted and wanted in normalize(c["name"])]
        if len(candidates) == 1:
            matches = candidates
    if not matches:
        names = ", ".join(c["name"] for c in categories) or "(ninguna)"
        return _create_error(
            f"ERROR: no existe la categoría «{category_name}». "
            f"Categorías disponibles: {names}."
        )
    if len(matches) > 1:
        options = ", ".join(f"{c['name']} (id {c['id']}, tipo {c.get('type') or 'mixta'})" for c in matches)
        return _create_error(
            f"ERROR: hay varias categorías que coinciden con «{category_name}»: {options}. "
            "Pregalá cuál usar."
        )

    category = matches[0]
    if category.get("type") and category["type"] != movement_type:
        return _create_error(
            f"ERROR: la categoría «{category['name']}» es de tipo {category['type']} "
            f"y no admite un movimiento {movement_type}."
        )

    # Sin fecha indicada: hoy (decisión de producto: default hoy)
    movement_date = date_str or today_utc().isoformat()
    body: dict = {
        "type": movement_type,
        "amount": round(parse_amount(amount), 2),
        "categoryId": int(category["id"]),
        "movementDate": f"{movement_date}T12:00:00.000Z",
        "currency": currency,
        # La marca "Registro chatbot" va siempre, combinada con la nota del usuario
        "note": _compose_note(note),
    }
    if payment_method and payment_method.upper() in PAYMENT_METHODS:
        body["paymentMethod"] = payment_method.upper()

    created = api_post("/movements", token, body)

    label = "Gasto" if movement_type == "EGRESO" else "Ingreso"
    message = (
        f"Listo: registré {label.lower()} de {fmt_money(created.get('amount'), currency)} "
        f"en «{category['name']}» el {fmt_date(movement_date)} "
        f"(movimiento #{created.get('id')}, billetera {currency})."
    )
    alert = created.get("spendingAlert")
    if alert:
        message += (
            f" Atención: {fmt_money(alert.get('spentAmount'), alert.get('currency'))} gastados "
            f"de un umbral de {fmt_money(alert.get('thresholdAmount'), alert.get('currency'))} "
            f"en «{alert.get('categoryName')}» este mes ({alert.get('percent')}%)."
        )
    return {
        "message": message,
        "created": {
            "id": created.get("id"),
            "type": movement_type,
            "amount": created.get("amount"),
            "currency": currency,
            "movement_date": movement_date,
            "category_name": category["name"],
        },
    }
