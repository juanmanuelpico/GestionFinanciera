import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Currency } from '@/types/finance'
import { currencyOptions } from '@/types/finance'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import type { AvailableByCurrency } from '@/features/savings/types'
import { createDebtSplit } from '../debts-api'
import { fromCents, parseAmount, toCents } from '../installment-preview'
import type { DebtActor, SplitPayer } from '../types'
import { ActorFormDialog } from './actor-form-dialog'
import { ActorSearchSelect } from './actor-search-select'

interface SplitRow {
  key: number
  actor: DebtActor | null
  amount: string
}

interface SplitFormErrors {
  currency?: string
  total?: string
  mine?: string
  payer?: string
  note?: string
  rows: (string | undefined)[]
}

const PAYER_USER = 'USER'

function parseCents(value: string, fallbackEmpty = true): number | null {
  const trimmed = value.trim()
  if (!trimmed) return fallbackEmpty ? 0 : null
  const parsed = parseAmount(trimmed)
  if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return toCents(parsed)
}

/** Reparte el resto entre las filas no fijadas: las primeras redondean abajo y la última absorbe el centavo suelto. */
function shareRemainingCents(
  remaining: number,
  count: number,
): number[] {
  if (count <= 0) return []
  if (remaining <= 0) return Array.from({ length: count }, () => 0)

  const base = Math.floor(remaining / count)
  const amounts = Array.from({ length: count }, (_, index) =>
    index === count - 1 ? remaining - base * (count - 1) : base,
  )
  return amounts
}

/**
 * Mantiene las primeras `locked` filas (las ya fijadas por el usuario) y
 * reparte el resto del gasto en partes iguales entre las filas de abajo.
 */
function redistribute(
  rows: SplitRow[],
  locked: number,
  totalCents: number | null,
  mineCents: number | null,
): SplitRow[] {
  const safeLocked = Math.min(Math.max(locked, 0), rows.length)
  const pinned = rows.slice(0, safeLocked)
  const pinnedCents = pinned.reduce(
    (acc, row) => acc + (parseCents(row.amount) ?? 0),
    0,
  )
  const free = rows.slice(safeLocked)

  if (free.length === 0) return pinned

  const remaining = (totalCents ?? 0) - (mineCents ?? 0) - pinnedCents
  const shares = shareRemainingCents(remaining, free.length)

  return [
    ...pinned,
    ...free.map((row, index) => ({
      ...row,
      amount: fromCents(shares[index] ?? 0),
    })),
  ]
}

interface SplitFormFieldsProps {
  enabledCurrencies: Currency[]
  available: AvailableByCurrency | undefined
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function SplitFormFields({
  enabledCurrencies,
  available,
  onOpenChange,
  onSaved,
}: SplitFormFieldsProps) {
  const [currency, setCurrency] = useState('')
  const [total, setTotal] = useState('')
  const [mine, setMine] = useState('')
  const [note, setNote] = useState('')
  const [payer, setPayer] = useState<SplitPayer>(PAYER_USER)
  const [payerActorId, setPayerActorId] = useState<string | null>(null)
  const [rows, setRows] = useState<SplitRow[]>([
    { key: 1, actor: null, amount: '' },
  ])
  const [lockCount, setLockCount] = useState(0)
  const nextKeyRef = useRef(2)
  const [creatingActorForRow, setCreatingActorForRow] = useState<number | null>(
    null,
  )
  const [errors, setErrors] = useState<SplitFormErrors | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const totalCents = parseCents(total)
  const mineCents = parseCents(mine)

  const handleTotalChange = (value: string) => {
    setTotal(value)
    const nextTotal = parseCents(value)
    setRows((current) => redistribute(current, lockCount, nextTotal, mineCents))
  }

  const handleMineChange = (value: string) => {
    setMine(value)
    const nextMine = parseCents(value)
    setRows((current) => redistribute(current, lockCount, totalCents, nextMine))
  }

  const handleRowAmountChange = (index: number, value: string) => {
    setLockCount(index + 1)
    setRows((current) => {
      const next = current.map((row, position) =>
        position === index ? { ...row, amount: value } : row,
      )
      return redistribute(next, index + 1, totalCents, mineCents)
    })
  }

  const handleAddRow = () => {
    const key = nextKeyRef.current
    nextKeyRef.current += 1
    setRows((current) => {
      const next = [...current, { key, actor: null, amount: '' }]
      return redistribute(next, lockCount, totalCents, mineCents)
    })
  }

  const handleRemoveRow = (index: number) => {
    const removed = rows[index]
    const newLock = Math.min(lockCount, index)
    setLockCount(newLock)

    setRows((current) => {
      const next = current.filter((_, position) => position !== index)
      return redistribute(next, newLock, totalCents, mineCents)
    })

    if (removed?.actor && payerActorId === removed.actor.id) {
      setPayer(PAYER_USER)
      setPayerActorId(null)
    }
  }

  const handleActorSelected = (index: number, actor: DebtActor) => {
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, actor } : row,
      ),
    )
  }

  const handleActorCreated = (actor: DebtActor) => {
    if (creatingActorForRow === null) return
    const index = creatingActorForRow
    setCreatingActorForRow(null)
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, actor } : row,
      ),
    )
  }

  const selectedActors = rows
    .map((row) => row.actor)
    .filter((actor): actor is DebtActor => actor !== null)

  const partsCents = useMemo(() => {
    const rowsSum = rows.reduce(
      (acc, row) => acc + (parseCents(row.amount) ?? 0),
      0,
    )
    return rowsSum + (mineCents ?? 0)
  }, [rows, mineCents])

  const totalsMatch =
    totalCents !== null &&
    mineCents !== null &&
    rows.every((row) => parseCents(row.amount) !== null) &&
    partsCents === totalCents

  const mutation = useMutation({
    mutationFn: () =>
      createDebtSplit({
        currency: currency as Currency,
        totalAmount: (totalCents ?? 0) / 100,
        userAmount: (mineCents ?? 0) / 100,
        payer: payer === 'ACTOR' ? 'ACTOR' : 'USER',
        payerActorId: payer === 'ACTOR' ? payerActorId : null,
        items: rows.map((row) => ({
          actorId: row.actor!.id,
          amount: (parseCents(row.amount) ?? 0) / 100,
        })),
        note: note.trim(),
      }),
    onSuccess: () => {
      onSaved()
      onOpenChange(false)
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  })

  const validate = (): boolean => {
    const found: SplitFormErrors = {
      rows: rows.map(() => undefined),
    }

    if (!currency) found.currency = 'Elegí una billetera'
    if (totalCents === null || totalCents <= 0) {
      found.total = 'Ingresá un total mayor a 0'
    }
    if (mineCents === null) found.mine = 'Ingresá un importe válido'
    if (!note.trim()) found.note = 'Ingresá una descripción del gasto'
    else if (note.trim().length > 500)
      found.note = 'La descripción no puede superar los 500 caracteres'

    const actorIds = new Set<string>()
    rows.forEach((row, index) => {
      if (!row.actor) {
        found.rows[index] = 'Elegí un actor'
      } else if (actorIds.has(row.actor.id)) {
        found.rows[index] = 'Ese actor ya está en la lista'
      } else {
        actorIds.add(row.actor.id)
      }
      if (parseCents(row.amount) === null) {
        found.rows[index] = found.rows[index] ?? 'Ingresá un importe válido'
      }
    })

    if (payer === 'ACTOR') {
      if (!payerActorId) found.payer = 'Elegí quién pagó la cuenta'
      else if (mineCents === null || mineCents <= 0) {
        found.payer = 'Si pagó otra persona, tu parte debe ser mayor a 0'
      }
    }

    if (!totalsMatch && !found.total && !found.mine && !found.currency) {
      found.total =
        totalCents !== null
          ? partsCents < totalCents
            ? `Faltan ${formatCurrency(String((totalCents - partsCents) / 100), currency || 'ARS')} para llegar al total`
            : `Sobran ${formatCurrency(String((partsCents - totalCents) / 100), currency || 'ARS')} respecto del total`
          : 'Ingresá un total mayor a 0'
    }

    setErrors(found)
    return (
      !found.currency &&
      !found.total &&
      !found.mine &&
      !found.payer &&
      !found.note &&
      found.rows.every((value) => !value) &&
      totalsMatch
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    if (!validate()) return
    mutation.mutate()
  }

  const walletOptions = currencyOptions.filter((option) =>
    enabledCurrencies.includes(option.value),
  )
  const availableForCurrency = currency
    ? available?.[currency as Currency]
    : undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="split-currency">
            Billetera <span aria-hidden="true">*</span>
          </Label>
          <Select
            value={currency}
            onValueChange={setCurrency}
            disabled={mutation.isPending}
          >
            <SelectTrigger
              id="split-currency"
              aria-label="Billetera"
              aria-invalid={Boolean(errors?.currency)}
              className="h-11 sm:h-10"
            >
              <SelectValue placeholder="Elegí una billetera" />
            </SelectTrigger>
            <SelectContent>
              {walletOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {availableForCurrency !== undefined
              ? `Disponible: ${formatCurrency(String(availableForCurrency), currency)}`
              : 'Elegí la moneda del gasto común.'}
          </p>
          {errors?.currency && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.currency}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="split-total">
            Gasto total <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="split-total"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            className="h-11 sm:h-10"
            value={total}
            aria-invalid={Boolean(errors?.total)}
            onChange={(event) => handleTotalChange(event.target.value)}
          />
          {errors?.total && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.total}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="split-mine">
          Tu parte del gasto <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="split-mine"
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          className="h-11 sm:h-10"
          value={mine}
          aria-invalid={Boolean(errors?.mine)}
          onChange={(event) => handleMineChange(event.target.value)}
        />
        {errors?.mine && (
          <p className="text-destructive text-sm break-words" role="alert">
            {errors.mine}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm leading-none font-medium">
            Actores de la división
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 sm:h-9"
            disabled={mutation.isPending || rows.some((row) => !row.actor)}
            onClick={handleAddRow}
          >
            <Plus />
            Agregar actor
          </Button>
        </div>

        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end"
            >
              <div className="min-w-0">
                <Label
                  htmlFor={`split-actor-${index}`}
                  className="sr-only"
                >
                  Actor {index + 1}
                </Label>
                <ActorSearchSelect
                  id={`split-actor-${index}`}
                  actorType="PERSONA"
                  selected={row.actor}
                  onSelect={(actor) => handleActorSelected(index, actor)}
                  placeholder="Buscar persona por nombre…"
                  ariaInvalid={Boolean(errors?.rows[index])}
                  disabled={mutation.isPending}
                  onCreate={() => setCreatingActorForRow(index)}
                />
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor={`split-amount-${index}`} className="sr-only">
                  Importe de {row.actor?.displayName ?? `actor ${index + 1}`}
                </Label>
                <Input
                  id={`split-amount-${index}`}
                  inputMode="decimal"
                  placeholder="0,00"
                  autoComplete="off"
                  className="h-11 sm:h-10"
                  value={row.amount}
                  aria-invalid={Boolean(errors?.rows[index])}
                  onChange={(event) =>
                    handleRowAmountChange(index, event.target.value)
                  }
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 text-muted-foreground sm:size-9"
                aria-label={`Quitar actor ${index + 1}`}
                disabled={mutation.isPending || rows.length <= 1}
                onClick={() => handleRemoveRow(index)}
              >
                <Trash2 />
              </Button>

              {errors?.rows[index] && (
                <p
                  className="text-destructive text-sm break-words sm:col-span-3"
                  role="alert"
                >
                  {errors.rows[index]}
                </p>
              )}
            </li>
          ))}
        </ul>

        <p
          className={
            totalsMatch
              ? 'text-success text-sm tabular-nums'
              : 'text-destructive text-sm tabular-nums break-words'
          }
          role="status"
          aria-live="polite"
        >
          {totalsMatch
            ? '✓ Las partes suman exactamente el gasto total.'
            : `La suma de las partes debe ser igual al total (suman ${formatCurrency(
                String(partsCents / 100),
                currency || 'ARS',
              )}).`}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="split-payer">
          ¿Quién pagó el total de la cuenta?{' '}
          <span aria-hidden="true">*</span>
        </Label>
        <Select
          value={payer === 'ACTOR' ? `ACTOR:${payerActorId}` : PAYER_USER}
          onValueChange={(value) => {
            if (value === PAYER_USER) {
              setPayer(PAYER_USER)
              setPayerActorId(null)
            } else {
              setPayer('ACTOR')
              setPayerActorId(value.slice('ACTOR:'.length))
            }
          }}
          disabled={mutation.isPending}
        >
          <SelectTrigger
            id="split-payer"
            aria-label="Quién pagó el total de la cuenta"
            aria-invalid={Boolean(errors?.payer)}
            className="h-11 sm:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PAYER_USER}>Yo (lo descuenta del disponible)</SelectItem>
            {selectedActors.map((actor) => (
              <SelectItem key={actor.id} value={`ACTOR:${actor.id}`}>
                {actor.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs break-words">
          {payer === 'ACTOR'
            ? 'Se crea una deuda propia con esa persona solo por tu parte; el resto no se registra.'
            : 'Se crea una deuda con cada actor por su parte y el total del gasto se descuenta del disponible.'}
        </p>
        {errors?.payer && (
          <p className="text-destructive text-sm break-words" role="alert">
            {errors.payer}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="split-note">
          Descripción del gasto <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="split-note"
          placeholder="Ej: asado del sábado"
          maxLength={500}
          value={note}
          aria-invalid={Boolean(errors?.note)}
          onChange={(event) => setNote(event.target.value)}
        />
        {errors?.note && (
          <p className="text-destructive text-sm break-words" role="alert">
            {errors.note}
          </p>
        )}
      </div>

      <div aria-live="polite">
        {submitError && (
          <p className="text-destructive text-sm break-words" role="alert">
            {submitError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full sm:h-10 sm:w-auto"
          disabled={mutation.isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-11 w-full sm:h-10 sm:w-auto"
          disabled={mutation.isPending || !totalsMatch}
        >
          {mutation.isPending ? 'Guardando…' : 'Confirmar división'}
        </Button>
      </DialogFooter>

      <ActorFormDialog
        open={creatingActorForRow !== null}
        actor={null}
        enabledCurrencies={enabledCurrencies}
        lockType="PERSONA"
        onOpenChange={(next) => {
          if (!next) setCreatingActorForRow(null)
        }}
        onSaved={() => {
          /* el reparto y la preselección ocurren en onCreated */
        }}
        onCreated={handleActorCreated}
      />
    </form>
  )
}

interface SplitExpenseDialogProps {
  open: boolean
  enabledCurrencies: Currency[]
  available: AvailableByCurrency | undefined
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function SplitExpenseDialog({
  open,
  enabledCurrencies,
  available,
  onOpenChange,
  onSaved,
}: SplitExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-2xl sm:pb-6">
        <DialogHeader className="pr-12">
          <DialogTitle>Nueva división de gastos</DialogTitle>
          <DialogDescription>
            Registrás un gasto común: cargás el total, tu parte y lo que gastó
            cada persona. Se generan las deudas correspondientes.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <SplitFormFields
            enabledCurrencies={enabledCurrencies}
            available={available}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
