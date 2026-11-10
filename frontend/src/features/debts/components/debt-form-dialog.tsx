import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
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
import { currencyOptions, type Currency } from '@/types/finance'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, todayDateInputValue } from '@/lib/format'
import type { AvailableByCurrency } from '@/features/savings/types'
import { createDebt } from '../debts-api'
import {
  buildInstallmentPreview,
  formatCents,
  nextMonthDate,
  parseAmount,
  suggestCardFirstDueDate,
} from '../installment-preview'
import type { DebtActor, DebtKind } from '../types'
import { ActorSearchSelect } from './actor-search-select'

interface DebtFormState {
  actorType: 'PERSONA' | 'TARJETA'
  currency: string
  amount: string
  installments: string
  operationDate: string
  firstDueInput: string | null
  note: string
}

type DebtFormErrors = Partial<
  Record<keyof DebtFormState | 'actor', string>
>

const initialState = (): DebtFormState => ({
  actorType: 'PERSONA',
  currency: '',
  amount: '',
  installments: '1',
  operationDate: todayDateInputValue(),
  firstDueInput: null,
  note: '',
})

interface DebtFormFieldsProps {
  kind: DebtKind
  enabledCurrencies: Currency[]
  available: AvailableByCurrency | undefined
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function DebtFormFields({
  kind,
  enabledCurrencies,
  available,
  onOpenChange,
  onSaved,
}: DebtFormFieldsProps) {
  const isThirdParty = kind === 'TERCERO'

  const [form, setForm] = useState<DebtFormState>(initialState)
  const [actor, setActor] = useState<DebtActor | null>(null)
  const [errors, setErrors] = useState<DebtFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const effectiveActorType = isThirdParty ? 'PERSONA' : form.actorType

  const update = (patch: Partial<DebtFormState>) =>
    setForm((current) => ({ ...current, ...patch }))

  const cardSuggestion =
    actor?.type === 'TARJETA' && form.operationDate
      ? suggestCardFirstDueDate(
          form.operationDate,
          actor.closingDay ?? 1,
          actor.paymentDueDay ?? 1,
        )
      : null

  const effectiveFirstDue =
    form.firstDueInput ?? cardSuggestion ?? nextMonthDate(form.operationDate)

  const handleActorTypeChange = (value: 'PERSONA' | 'TARJETA') => {
    update({ actorType: value })
    setActor(null)
    setErrors({})
  }

  const handleActorSelected = (next: DebtActor) => {
    setActor(next)
    setErrors((current) => ({ ...current, actor: undefined }))

    if (
      next.type === 'TARJETA' &&
      next.defaultWalletCurrency &&
      enabledCurrencies.includes(next.defaultWalletCurrency)
    ) {
      update({ currency: next.defaultWalletCurrency })
    }
  }

  const amount = parseAmount(form.amount)
  const installmentCount = Number(form.installments)
  const preview =
    amount !== null &&
    amount > 0 &&
    Number.isInteger(installmentCount) &&
    installmentCount >= 1
      ? buildInstallmentPreview(amount, installmentCount)
      : null

  const mutation = useMutation({
    mutationFn: () =>
      createDebt({
        kind,
        actorId: actor!.id,
        currency: form.currency as Currency,
        totalAmount: amount as number,
        installmentCount,
        operationDate: form.operationDate,
        firstDueDate: effectiveFirstDue,
        note: form.note.trim(),
      }),
    onSuccess: () => {
      onSaved()
      onOpenChange(false)
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  })

  const validate = (): boolean => {
    const found: DebtFormErrors = {}

    if (!actor) found.actor = 'Elegí un actor'
    if (!form.currency) found.currency = 'Elegí una billetera'
    if (amount === null || amount <= 0) {
      found.amount = 'Ingresá un importe mayor a 0'
    } else if (!Number.isInteger(installmentCount) || installmentCount < 1) {
      found.installments = 'Ingresá una cantidad de cuotas válida'
    } else if (installmentCount > 120) {
      found.installments = 'La deuda no puede superar las 120 cuotas'
    }
    if (!form.operationDate) found.operationDate = 'Ingresá la fecha'
    if (!effectiveFirstDue) found.firstDueInput = 'Ingresá el primer vencimiento'
    if (!form.note.trim()) found.note = 'Ingresá una descripción'
    else if (form.note.trim().length > 500)
      found.note = 'La descripción no puede superar los 500 caracteres'

    setErrors(found)
    return Object.values(found).every((value) => !value)
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
  const availableForCurrency = form.currency
    ? available?.[form.currency as Currency]
    : undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {!isThirdParty && (
        <div className="space-y-2">
          <Label htmlFor="debt-actor-type">
            Origen de la deuda <span aria-hidden="true">*</span>
          </Label>
          <Select
            value={form.actorType}
            onValueChange={(value) =>
              handleActorTypeChange(value as 'PERSONA' | 'TARJETA')
            }
            disabled={mutation.isPending}
          >
            <SelectTrigger
              id="debt-actor-type"
              aria-label="Origen de la deuda"
              className="h-11 sm:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSONA">Préstamo de una persona</SelectItem>
              <SelectItem value="TARJETA">Compra con tarjeta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="debt-actor">
          {effectiveActorType === 'PERSONA' ? (
            <>
              {isThirdParty ? 'Persona que te debe' : 'Persona que te prestó'}{' '}
              <span aria-hidden="true">*</span>
            </>
          ) : (
            <>
              Tarjeta <span aria-hidden="true">*</span>
            </>
          )}
        </Label>
        <ActorSearchSelect
          id="debt-actor"
          actorType={effectiveActorType}
          selected={actor}
          onSelect={handleActorSelected}
          placeholder={
            effectiveActorType === 'PERSONA'
              ? 'Buscar persona por nombre…'
              : 'Buscar tarjeta…'
          }
          ariaInvalid={Boolean(errors.actor)}
          disabled={mutation.isPending}
        />
        {errors.actor && (
          <p className="text-destructive text-sm break-words" role="alert">
            {errors.actor}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="debt-currency">
            Billetera <span aria-hidden="true">*</span>
          </Label>
          <Select
            value={form.currency}
            onValueChange={(value) => update({ currency: value })}
            disabled={mutation.isPending}
          >
            <SelectTrigger
              id="debt-currency"
              aria-label="Billetera"
              aria-invalid={Boolean(errors.currency)}
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
              ? `Disponible: ${formatCurrency(String(availableForCurrency), form.currency)}`
              : 'Elegí la moneda; los pagos usan siempre esta billetera.'}
          </p>
          {errors.currency && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.currency}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="debt-amount">
            Importe total <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="debt-amount"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            className="h-11 sm:h-10"
            value={form.amount}
            aria-invalid={Boolean(errors.amount)}
            onChange={(event) => update({ amount: event.target.value })}
          />
          {errors.amount && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.amount}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="debt-installments">
            Cantidad de cuotas <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="debt-installments"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            className="h-11 sm:h-10"
            value={form.installments}
            aria-invalid={Boolean(errors.installments)}
            onChange={(event) => update({ installments: event.target.value })}
          />
          {errors.installments && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.installments}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="debt-operation-date">
            {effectiveActorType === 'TARJETA'
              ? 'Fecha de compra'
              : 'Fecha de la operación'}{' '}
            <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="debt-operation-date"
            type="date"
            className="h-11 sm:h-10"
            value={form.operationDate}
            aria-invalid={Boolean(errors.operationDate)}
            onChange={(event) =>
              update({ operationDate: event.target.value })
            }
          />
          {errors.operationDate && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.operationDate}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="debt-first-due">
            Primer {isThirdParty ? 'cobro' : 'vencimiento'}{' '}
            <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="debt-first-due"
            type="date"
            className="h-11 sm:h-10"
            value={effectiveFirstDue}
            aria-invalid={Boolean(errors.firstDueInput)}
            onChange={(event) =>
              update({ firstDueInput: event.target.value })
            }
          />
          {actor?.type === 'TARJETA' && (
            <p className="text-muted-foreground text-xs">
              Sugerido según el cierre (día {actor.closingDay}) y el
              vencimiento (día {actor.paymentDueDay}) de la tarjeta. Podés
              ajustarlo.
            </p>
          )}
          {errors.firstDueInput && (
            <p className="text-destructive text-sm break-words" role="alert">
              {errors.firstDueInput}
            </p>
          )}
        </div>
      </div>

      {preview && (
        <p
          className="text-success bg-success/10 rounded-lg px-3 py-2 text-sm break-words"
          role="status"
        >
          ✓ {installmentCount}{' '}
          {installmentCount === 1 ? 'cuota' : 'cuotas'} de{' '}
          {formatCents(preview.baseCents, form.currency || 'ARS')}
          {preview.lastCents !== preview.baseCents &&
            ` (la última de ${formatCents(preview.lastCents, form.currency || 'ARS')})`}
          .
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="debt-note">
          Descripción <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="debt-note"
          placeholder="Ej: zapatillas tamaño 42"
          maxLength={500}
          value={form.note}
          aria-invalid={Boolean(errors.note)}
          onChange={(event) => update({ note: event.target.value })}
        />
        {errors.note && (
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
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Guardando…' : 'Crear deuda'}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface DebtFormDialogProps {
  open: boolean
  kind: DebtKind
  enabledCurrencies: Currency[]
  available: AvailableByCurrency | undefined
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function DebtFormDialog({
  open,
  kind,
  enabledCurrencies,
  available,
  onOpenChange,
  onSaved,
}: DebtFormDialogProps) {
  const isThirdParty = kind === 'TERCERO'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-2xl sm:pb-6">
        <DialogHeader className="pr-12">
          <DialogTitle>
            {isThirdParty ? 'Nueva deuda de tercero' : 'Nueva deuda propia'}
          </DialogTitle>
          <DialogDescription>
            {isThirdParty
              ? 'Registrás un préstamo a una persona: se descuenta del disponible y cada cobro vuelve a sumarlo.'
              : 'Registrás un préstamo recibido o una compra en cuotas con tarjeta.'}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <DebtFormFields
            key={kind}
            kind={kind}
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
