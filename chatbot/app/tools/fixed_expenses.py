# app/tools/fixed_expenses.py
# Gastos fijos: GET /fixed-expenses (configuración), GET /fixed-expenses/projections
# (prevision mensual con estado PAGADO/PENDIENTE) y GET /:id/payments (historial).
# "Vencido" se deriva aquí: pendiente con vencimiento anterior a hoy.

from datetime import date

from app.tools.backend_api import api_get
from app.tools.common import (
    current_period,
    fmt_date,
    fmt_money,
    is_valid_period,
    normalize,
    parse_amount,
    today_utc,
)


def get_fixed_expenses(token: str, period: str = "") -> str:
    period = (period or current_period()).strip()
    if not is_valid_period(period):
        return "ERROR: período inválido. Usá formato YYYY-MM (ej. 2026-11)."

    projections = api_get("/fixed-expenses/projections", token, {"period": period}) or []
    if not projections:
        return f"No hay gastos fijos previstos para {period}."

    today = today_utc()
    pagados = pendientes = vencidos = 0.0
    pagados_n = pendientes_n = vencidos_n = 0

    lines = [f"Gastos fijos de {period}:"]
    for p in projections:
        cur = p.get("currency") or "ARS"
        amount = parse_amount(p.get("amount"))
        due = str(p.get("dueDate") or "")[:10]
        status = p.get("status")
        try:
            is_past = date.fromisoformat(due) < today
        except ValueError:
            is_past = False

        if status == "PAGADO":
            label = f"PAGADO el {fmt_date((p.get('payment') or {}).get('paidAt'))}"
            pagados += amount
            pagados_n += 1
        elif is_past:
            label = f"VENCIDO (vencía el {fmt_date(due)})"
            vencidos += amount
            vencidos_n += 1
        else:
            label = f"PENDIENTE (vence el {fmt_date(due)})"
            pendientes += amount
            pendientes_n += 1

        lines.append(f"- {p.get('title')} [{cur}]: {fmt_money(amount, cur)} — {label}")

    lines.append(
        f"Resumen: pagados {fmt_money(pagados)} ({pagados_n}) | "
        f"pendientes {fmt_money(pendientes)} ({pendientes_n}) | "
        f"vencidos {fmt_money(vencidos)} ({vencidos_n})"
    )
    lines.append("(los importes suman por moneda cuando es la misma; verificá si hay varias)")
    return "\n".join(lines)


def get_fixed_expense_history(token: str, title: str) -> str:
    title_norm = normalize(title or "")
    if not title_norm:
        return "ERROR: indicá el nombre del gasto fijo."

    expenses = api_get("/fixed-expenses", token) or []
    matches = [e for e in expenses if title_norm in normalize(e.get("title", ""))
               or normalize(e.get("title", "")) in title_norm]
    if not matches:
        names = ", ".join(e.get("title", "?") for e in expenses) or "(ninguno)"
        return f"ERROR: no existe el gasto fijo «{title}». Gastos disponibles: {names}."
    if len(matches) > 1:
        return "ERROR: «" + title + "» coincide con varios: " + ", ".join(
            m.get("title", "?") for m in matches
        ) + ". Precizá el nombre."

    expense = matches[0]
    history = api_get(f"/fixed-expenses/{expense['id']}/payments", token) or {}
    items = history.get("items") or []
    if not items:
        return f"El gasto fijo «{expense.get('title')}» todavía no tiene pagos registrados."

    lines = [f"Historial de pagos de «{expense.get('title')}» ({expense.get('currency')}):"]
    for payment in items[-12:]:
        lines.append(
            f"- {payment.get('period')}: {fmt_money(payment.get('amount'), payment.get('currency'))} "
            f"pagado el {fmt_date(payment.get('paidAt'))} (vencía el {fmt_date(payment.get('dueDate'))})"
        )
    return "\n".join(lines)
