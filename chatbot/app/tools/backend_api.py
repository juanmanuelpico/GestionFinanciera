# app/tools/backend_api.py
# Cliente HTTP de bajo nivel hacia el backend NestJS (Gestion Financiera).
#
# El chatbot NO tiene credenciales propias: cada request lleva el token JWT del
# usuario (Authorization: Bearer) y el backend filtra los datos por CurrentUser.
# Todas las respuestas llegan envueltas en { success, data } y se desenvuelven
# aqui; los errores se traducen a BackendError con un mensaje legible.

from typing import Any

import httpx

from app.config import settings

# Timeout generoso: cada tool hace 1-2 requests internos
DEFAULT_TIMEOUT = 15.0


class BackendError(Exception):
    """Error de una llamada al backend NestJS con detalle legible."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"HTTP {status_code}: {detail}")


class UnauthorizedBackendError(BackendError):
    """El token del usuario expiro o es invalido (HTTP 401 del backend)."""

    def __init__(self, detail: str = "La sesion del usuario expiro. Volvé a iniciar sesión."):
        super().__init__(401, detail)


def _extract_detail(response: httpx.Response) -> str:
    """Extrae el mensaje de error del envelope { success: false, ... }."""
    try:
        body = response.json()
    except ValueError:
        return response.text[:300] or f"Error HTTP {response.status_code}"

    if isinstance(body, dict):
        message = body.get("message")
        if isinstance(message, list):
            return "; ".join(str(m) for m in message)
        if message:
            return str(message)
        error = body.get("error")
        if error:
            return str(error)
    return f"Error HTTP {response.status_code}"


def _request(method: str, path: str, token: str, params: dict | None = None,
             json_body: dict | None = None) -> Any:
    if not token:
        raise UnauthorizedBackendError("Falta el token de acceso del usuario.")

    headers = {"Authorization": f"Bearer {token}"}
    clean_params = {k: v for k, v in (params or {}).items() if v is not None}

    try:
        response = httpx.request(
            method,
            f"{settings.backend_api_url}{path}",
            headers=headers,
            params=clean_params or None,
            json=json_body,
            timeout=DEFAULT_TIMEOUT,
        )
    except httpx.RequestError as exc:
        raise BackendError(0, f"No se pudo conectar al backend ({exc.__class__.__name__}).") from exc

    if response.status_code == 401:
        raise UnauthorizedBackendError()

    if response.status_code >= 400:
        raise BackendError(response.status_code, _extract_detail(response))

    if response.status_code == 204 or not response.content:
        return None

    body = response.json()
    if isinstance(body, dict) and body.get("success") is True:
        return body.get("data")
    return body


def api_get(path: str, token: str, params: dict | None = None) -> Any:
    return _request("GET", path, token, params=params)


def api_post(path: str, token: str, json_body: dict) -> Any:
    return _request("POST", path, token, json_body=json_body)
