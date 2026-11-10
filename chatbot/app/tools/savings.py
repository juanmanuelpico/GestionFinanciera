# app/tools/savings.py
# Ahorros: disponible por billetera y resumen por moneda (con opcional filtro
# de moneda) consumiendo GET /savings/available y GET /savings/summary.

from app.tools.backend_api import api_get
from app.tools.common import VALID_CURRENCIES, fmt_money


def get_savings(token: str, currency: str = "") -> str:
    currency = (currency or "").upper()
    if currency and currency not in VALID_CURRENCIES:
        return "ERROR: moneda inválida. Las billeteras son ARS, USD o EUR."

    available = api_get("/savings/available", token) or {}
    summary = api_get("/savings/summary", token) or {}

    savings_by_currency = summary.get("savingsByCurrency") or {}
    converted = summary.get("convertedTotals") or summary.get("estimatedTotals") or {}

    currencies = [currency] if currency else list(VALID_CURRENCIES)

    lines = ["Situación de ahorros" + (f" (billetera {currency})" if currency else "") + ":"]
    for cur in currencies:
        lines.append(
            f"- {cur}: disponible {fmt_money(available.get(cur), cur)} | "
            f"ahorro registrado {fmt_money(savings_by_currency.get(cur), cur)}"
        )

    if converted and not currency:
        ars = converted.get("ars")
        usd = converted.get("usd")
        if ars is not None:
            lines.append(f"Total estimado en ARS (con cotizaciones actuales): {fmt_money(ars, 'ARS')}")
        if usd is not None:
            lines.append(f"Total estimado en USD (con cotizaciones actuales): {fmt_money(usd, 'USD')}")

    return "\n".join(lines)
