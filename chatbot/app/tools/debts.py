# app/tools/debts.py
# Deudas: GET /api/debts con kind PROPIA|TERCERO (obligatorio en el backend),
# status ACTIVA|FINALIZADA, actorType PERSONA|TARJETA, currency y search (nombre
# de persona). Las totals y "vencidas" se agregan ACÁ (el LLM no hace aritmética).

from datetime import date

from app.tools.backend_api import api_get
from app.tools.common import fmt_date, fmt_money, parse_amount, today_utc

KINDS = ("PROPIA", "TERCERO")
STATUSES = ("ACTIVA", "FINALIZADA")
ACTOR_TYPES = ("PERSONA", "TARJETA")
MAX_PAGES = 10  # tope de seguridad de paginación


def list_debts(token: str, kind: str = "PROPIA", status: str = "", actor_type: str = "",
               currency: str = "", search: str = "", page: int = 1) -> str:
    kind = (kind or "PROPIA").upper()
    if kind not in KINDS:
        return "ERROR: tipo de deuda inválido. Usá PROPIA (mis deudas) o TERCERO (me deben)."

    params: dict = {"kind": kind, "limit": 100, "page": max(page, 1)}
    if status:
        status = status.upper()
        if status in STATUSES:
            params["status"] = status
    if actor_type:
        at = actor_type.upper()
        if at in ACTOR_TYPES:
            params["actorType"] = at
    if currency:
        currency = currency.upper()
        if currency:
            params["currency"] = currency
    if search:
        params["search"] = search.strip()[:100]

    data = api_get("/debts", token, params)
    items = data.get("items", [])
    meta = data.get("meta", {})
    total = meta.get("total", len(items))

    if not items:
        filtros = f" (estado {params.get('status')})" if params.get("status") else ""
        buscado = f" de «{search}»" if search else ""
        quien = "me deben" if kind == "TERCERO" else "debo"
        return f"No hay deudas {('que ' + quien) if kind == 'TERCERO' else 'propias'}{buscado}{filtros}."

    today = today_utc()

    def overdue_amount(debt: dict) -> float:
        total_vencido = 0.0
        for inst in debt.get("installments") or []:
            remaining = parse_amount(inst.get("amount")) - parse_amount(inst.get("paidAmount"))
            due = str(inst.get("dueDate") or "")[:10]
            try:
                expired = date.fromisoformat(due) < today
            except ValueError:
                expired = False
            if remaining > 0 and expired:
                total_vencido += remaining
        return total_vencido

    # Totales por moneda
    totals: dict[str, dict[str, float]] = {}
    for debt in items:
        cur = debt.get("currency") or "ARS"
        bucket = totals.setdefault(cur, {"remaining": 0.0, "vencido": 0.0})
        bucket["remaining"] += parse_amount(debt.get("remainingAmount"))
        if debt.get("status") == "ACTIVA":
            bucket["vencido"] += overdue_amount(debt)

    quien = "te deben" if kind == "TERCERO" else "debés"
    lines = [f"Deudas {('de terceros que ' + quien) if kind == 'TERCERO' else 'propias'}: {total} registradas."]
    for cur, bucket in totals.items():
        line = f"- Total pendiente en {cur}: {fmt_money(bucket['remaining'], cur)}"
        if bucket["vencido"] > 0:
            line += f" (de las cuales {fmt_money(bucket['vencido'], cur)} están VENCIDAS - cuotas con vencimiento pasado)"
        lines.append(line)

    active_count = sum(1 for d in items if d.get("status") == "ACTIVA")
    lines.append(f"Estado de esta página: {active_count} activas de {len(items)} mostradas.")

    # Detalle de cada deuda (máx. 20 filas para no saturar)
    lines.append("Detalle:")
    for debt in items[:20]:
        actor = debt.get("actor") or {}
        name = actor.get("displayName") or "?"
        remaining = parse_amount(debt.get("remainingAmount"))
        vencido = overdue_amount(debt)
        mark = " [VENCIDA]" if vencido > 0 else ""
        next_due = fmt_date(debt.get("nextDueDate")) if debt.get("nextDueDate") else "—"
        lines.append(
            f"{debt.get('code')} «{name}» {debt.get('status')}{mark} — "
            f"quedan {fmt_money(remaining, debt.get('currency'))} de {fmt_money(debt.get('totalAmount'), debt.get('currency'))} "
            f"(próx. venc.: {next_due})"
        )

    # Si el usuario pregunta por una persona: las cuotas vencidas individuales
    if search:
        overdue_only = [d for d in items if overdue_amount(d) > 0]
        if overdue_only:
            lines.append("Personas con cuotas vencidas: " + ", ".join(
                f"{(d.get('actor') or {}).get('displayName', '?')} ({fmt_money(overdue_amount(d), d.get('currency'))})"
                for d in overdue_only
            ))

    if total > len(items):
        lines.append("(hay más deudas: se pueden pedir por página)")
    return "\n".join(lines)
