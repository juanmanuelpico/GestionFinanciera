# app/tools/dollar.py
# Cotización del dólar actual: GET /exchange-rates/dollar (blue, oficial y MEP,
# servido por el backend con caché de 5 minutos desde dolarapi.com).

from app.tools.backend_api import api_get
from app.tools.common import fmt_money

_LABELS = {"BLUE": "Dólar Blue", "OFICIAL": "Dólar Oficial", "MEP": "Dólar MEP (bolsa)"}


def get_dollar_quotes(token: str) -> str:
    quotes = api_get("/exchange-rates/dollar", token) or {}

    lines = ["Cotizaciones del dólar (ARS):"]
    for key, label in _LABELS.items():
        quote = quotes.get(key)
        if not quote:
            continue
        lines.append(
            f"- {label}: compra {fmt_money(quote.get('compra'))} | "
            f"venta {fmt_money(quote.get('venta'))} "
            f"(actualizado {quote.get('fechaActualizacion', '—')})"
        )

    if len(lines) == 1:
        return "No se pudieron obtener las cotizaciones del dólar en este momento."
    return "\n".join(lines)
