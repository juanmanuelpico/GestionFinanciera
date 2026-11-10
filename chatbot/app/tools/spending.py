# app/tools/spending.py
# Control de gastos por categoría: combina GET /categories (umbrales) con el
# total gastado por categoría del período (GET /reports/movements/category-averages).
# Reproduce la regla del backend (spending-limit.ts): EXCEEDED >= 100% del umbral,
# WARNING >= 80%, OK en caso contrario. El porcentaje va truncado (floor) igual que allá.

from app.tools.backend_api import api_get
from app.tools.common import (
    VALID_CURRENCIES,
    current_period,
    fmt_money,
    is_valid_period,
    normalize,
    parse_amount,
)

SPENDING_WARNING_RATIO = 0.8

_STATUS_LABEL = {
    "EXCEEDED": "UMBRAL SUPERADO",
    "WARNING": "CERCA DE SUPERAR (más del 80%)",
    "OK": "EN CONTROL",
}


def get_spending_control(token: str, period: str = "", currency: str = "ARS",
                         category_name: str = "") -> str:
    period = (period or current_period()).strip()
    currency = (currency or "ARS").upper()
    if not is_valid_period(period):
        return "ERROR: período inválido. Usá formato YYYY-MM (ej. 2026-11)."
    if currency not in VALID_CURRENCIES:
        return "ERROR: moneda inválida. Las billeteras son ARS, USD o EUR."

    categories = api_get("/categories", token) or []
    thresholded = [
        c for c in categories
        if c.get("thresholdAmount") and (c.get("thresholdCurrency") or "ARS") == currency
    ]
    if category_name:
        wanted = normalize(category_name)
        thresholded = [c for c in thresholded if wanted in normalize(c.get("name", ""))
                       or normalize(c.get("name", "")) in wanted]

    if not thresholded:
        hint = (f" para «{category_name}»" if category_name else " con umbral configurado")
        return (f"No hay categorías{hint} con umbral de gasto en la billetera {currency}. "
                "Configurales un umbral en Control de Gastos para poder monitorearlas.")

    report = api_get(
        "/reports/movements/category-averages",
        token,
        {"from": period, "to": period, "currency": currency, "type": "EGRESO"},
    ) or {}
    spent_by_category = {
        item.get("categoryId"): parse_amount(item.get("totalAmount"))
        for item in report.get("items") or []
    }

    rows = []
    for category in thresholded:
        spent = spent_by_category.get(category["id"], 0.0)
        threshold = parse_amount(category.get("thresholdAmount"))
        if threshold <= 0:
            continue
        percent = int(spent / threshold * 1000) / 10  # truncado, como el backend
        if spent >= threshold:
            status = "EXCEEDED"
        elif spent >= threshold * SPENDING_WARNING_RATIO:
            status = "WARNING"
        else:
            status = "OK"
        rows.append((status, category, spent, threshold, percent))

    if not rows:
        return f"No hay datos de gasto para {period} en la billetera {currency}."

    order = {"EXCEEDED": 0, "WARNING": 1, "OK": 2}
    rows.sort(key=lambda r: (order[r[0]], -r[4]))

    lines = [f"Control de gastos — {period} — billetera {currency}:"]
    for status, category, spent, threshold, percent in rows:
        lines.append(
            f"- {category['name']}: {fmt_money(spent, currency)} de {fmt_money(threshold, currency)} "
            f"= {percent}% → {_STATUS_LABEL[status]}"
        )

    exceeded = sum(1 for r in rows if r[0] == "EXCEEDED")
    warning = sum(1 for r in rows if r[0] == "WARNING")
    lines.append(
        f"Resumen: {exceeded} con umbral superado, {warning} cerca de superar, "
        f"{len(rows) - exceeded - warning} en control."
    )
    return "\n".join(lines)
