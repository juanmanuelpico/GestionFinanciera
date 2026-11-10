# app/tools/registry.py
# Registro de las tools LangChain del asistente. Se construyen POR REQUEST porque
# cada tool lleva incrustado el token JWT del usuario (passthrough): el chatbot
# nunca guarda credenciales y el backend NestJS filtra todo por CurrentUser.
#
# Alcance EXPLICITO (límite de producto): solo las tools de acá existen. Cualquier
# otra operación (modificar/eliminar registros, otros módulos) no está disponible.

from langchain_core.tools import tool

from app.tools import debts, dollar, fixed_expenses, movements, savings, spending
from app.tools.backend_api import BackendError, UnauthorizedBackendError

# Events reconocidos (marca estructurada para el frontend, ver ChatResponse.events)
MOVEMENT_CREATED_EVENT = "movement-created"


def _friendly_error(exc: Exception) -> str:
    if isinstance(exc, UnauthorizedBackendError):
        return ("ERROR DE SESION: la sesión del usuario expiró o perdió permisos. "
                "Pedile que vuelva a iniciar sesión en la app.")
    if isinstance(exc, BackendError):
        return f"ERROR DEL SISTEMA: {exc.detail}"
    return f"ERROR INESPERADO: {exc.__class__.__name__}"


def build_tools(token: str, events: list[str] | None = None) -> list:
    """Devuelve las tools del agente ligadas al token del usuario.

    `events`: lista sink por request; las escrituras exitosas agregan su marca
    (ej. "movement-created") para que el frontend refresque las vistas afectadas.
    """
    sink = events if events is not None else []

    @tool
    def listar_movimientos(date_from: str, date_to: str, movement_type: str = "",
                           category_id: int = 0, page: int = 1) -> str:
        """Lista los movimientos del usuario en un rango de fechas.

        date_from y date_to son OBLIGATORIAS, formato YYYY-MM-DD. Si el usuario no dio una
        fecha, NO usar esta tool: pedirle primero la fecha y no ejecutar nada.
        movement_type opcional: INGRESO o EGRESO. category_id opcional (número de categoría).
        page opcional para más resultados.
        """
        try:
            return movements.list_movements(token, date_from, date_to, movement_type,
                                             int(category_id), int(page))
        except Exception as exc:  # noqa: BLE001 - se traduce a texto amigable para el LLM
            return _friendly_error(exc)

    @tool
    def crear_movimiento(movement_type: str, amount: float, category_name: str,
                         currency: str = "ARS", movement_date: str = "",
                         payment_method: str = "", note: str = "") -> str:
        """Registra un gasto (EGRESO) o ingreso (INGRESO) del usuario.

        movement_type: EGRESO (también acepta 'gasto') o INGRESO (también 'ganancia').
        amount: número positivo. category_name: nombre de la
        categoría del usuario (se valida que exista y sea del tipo correcto).
        currency: billetera ARS/USD/EUR; si el usuario no la indica, usar ARS.
        movement_date: YYYY-MM-DD; si no se informa se usa hoy.
        payment_method opcional: EFECTIVO, DEBITO, CREDITO, TRANSFERENCIA, MERCADO_PAGO u OTRO.
        note opcional: descripción corta. La observación final SIEMPRE queda
        marcada con "Registro chatbot" (combinada con la nota si el usuario dió una).
        """
        try:
            result = movements.create_movement(token, movement_type, float(amount), category_name,
                                               currency, movement_date, payment_method, note)
            if result.get("created"):
                sink.append(MOVEMENT_CREATED_EVENT)
            return result["message"]
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def ver_ahorros(currency: str = "") -> str:
        """Informa el disponible por billetera y el ahorro del usuario.

        currency opcional: ARS, USD o EUR para filtrar solo esa moneda. Si el usuario no
        especifica moneda, devolver todas.
        """
        try:
            return savings.get_savings(token, currency)
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def ver_dolar() -> str:
        """Cotización actual del dólar: blue, oficial y MEP (compra y venta en ARS)."""
        try:
            return dollar.get_dollar_quotes(token)
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def listar_deudas(kind: str = "PROPIA", status: str = "", actor_type: str = "",
                      currency: str = "", search: str = "", page: int = 1) -> str:
        """Lista deudas e informa totales pendientes y vencidos.

        kind OBLIGATORIO conceptual: PROPIA (deudas que el usuario tiene, incluye tarjetas)
        o TERCERO (dinero que le deben a él). status opcional: ACTIVA o FINALIZADA.
        actor_type opcional: PERSONA o TARJETA. currency opcional: ARS/USD/EUR.
        search: nombre de una persona específica (ej. para 'cuánto me debe Juan').
        Cubre: cuánto le deben en total, deuda con una persona, activas, vencidas, propias.
        """
        try:
            return debts.list_debts(token, kind, status, actor_type, currency, search, int(page))
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def ver_gastos_fijos(period: str = "") -> str:
        """Gastos fijos del mes: pagados (con fecha de pago), pendientes (con vencimiento)
        y vencidos (pendientes cuyo vencimiento ya pasó). period opcional YYYY-MM; default mes actual.
        """
        try:
            return fixed_expenses.get_fixed_expenses(token, period)
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def ver_gasto_fijo(title: str) -> str:
        """Historial de pagos de UN gasto fijo específico (importes y fechas de pago).

        title: nombre del gasto fijo (ej. 'Alquiler').
        """
        try:
            return fixed_expenses.get_fixed_expense_history(token, title)
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def ver_control_gastos(period: str = "", currency: str = "ARS", category_name: str = "") -> str:
        """Estado del control de gastos por categoría con umbral: UMBRAL SUPERADO (>=100%),
        CERCA DE SUPERAR (>=80%) o EN CONTROL, con gastado/umbral/porcentaje.

        period opcional YYYY-MM (default mes actual). currency default ARS.
        category_name opcional: nombre de una categoría específica; sin él, todas.
        """
        try:
            return spending.get_spending_control(token, period, currency, category_name)
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    @tool
    def listar_categorias() -> str:
        """Lista las categorías del usuario con id, tipo y umbral (si tiene).
        Útil para resolver el id de categoría antes de listar movimientos filtrados por categoría.
        """
        try:
            return movements.list_categories(token)
        except Exception as exc:  # noqa: BLE001
            return _friendly_error(exc)

    return [
        listar_movimientos,
        crear_movimiento,
        ver_ahorros,
        ver_dolar,
        listar_deudas,
        ver_gastos_fijos,
        ver_gasto_fijo,
        ver_control_gastos,
        listar_categorias,
    ]
