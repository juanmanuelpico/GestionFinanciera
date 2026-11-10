# app/tools/common.py
# Utilidades compartidas por las tools: normalización de texto, fechas y formato
# de importes. Las tools devuelven TEXTO compacto al LLM (no JSON crudo) para
# que no haga aritmética sobre datos paginados.

import unicodedata
from datetime import date, datetime, timezone

VALID_CURRENCIES = ("ARS", "USD", "EUR")


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def current_period() -> str:
    """Mes actual en formato YYYY-MM (convención de reports/gastos fijos)."""
    d = today_utc()
    return f"{d.year:04d}-{d.month:02d}"


def is_valid_date(value: str | None) -> bool:
    if not value:
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def is_valid_period(value: str | None) -> bool:
    if not value:
        return False
    try:
        datetime.strptime(value, "%Y-%m")
        return True
    except ValueError:
        return False


def normalize(text: str) -> str:
    """Minúsculas y sin acentos, para casar nombres de categoría/título."""
    cleaned = unicodedata.normalize("NFKD", str(text))
    stripped = "".join(c for c in cleaned if not unicodedata.combining(c))
    return stripped.lower().strip()


def parse_amount(value) -> float:
    """Convierte los importes string ('1500.50') del backend a float."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def fmt_money(value, currency: str = "ARS") -> str:
    amount = parse_amount(value)
    return f"{amount:,.2f} {currency}"


def fmt_date(value) -> str:
    """'2026-11-09T14:30:00.000Z' o '2026-11-09' -> '09/11/2026'."""
    if not value:
        return "—"
    try:
        text = str(value)
        if "T" in text:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).date().strftime("%d/%m/%Y")
        return date.fromisoformat(text[:10]).strftime("%d/%m/%Y")
    except ValueError:
        return str(value)


def day_of(value) -> int | None:
    """Día del mes de una fecha ISO (para comparar vencimientos)."""
    try:
        return date.fromisoformat(str(value)[:10]).day
    except (ValueError, TypeError):
        return None
