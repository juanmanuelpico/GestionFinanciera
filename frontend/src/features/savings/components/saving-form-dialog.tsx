import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
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
import { getApiErrorMessage } from '@/lib/errors'
import { dateInputToIso, formatCurrency } from '@/lib/format'
import { currencyOptions, type Currency } from '@/types/finance'
import {
  convertValue,
  resolveQuoteRate,
  walletNeedsManualRate,
} from '../estimate'
import { createSaving } from '../savings-api'
import { currencyNames, type DollarQuotes, type QuoteType } from '../types'
import { QuoteFields } from './quote-fields'

interface SavingFormDialogProps {
  open: boolean
  enabledCurrencies: Currency[]
  quotes: DollarQuotes | undefined
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface FormState {
  currency: Currency
  amount: string
  quoteType: QuoteType | undefined
  manualRate: string
  debitCurrency: Currency
  debitRate: string
  purchaseDate: string
  note: string
}

interface FormErrors {
  amount?: string
  quoteType?: string
  manualRate?: string
  debitRate?: string
  purchaseDate?: string
}

function todayInputValue(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'))
  return value.trim() && Number.isFinite(parsed) ? parsed : null
}

function initialState(): FormState {
  return {
    currency: 'ARS',
    amount: '',
    quoteType: undefined,
    manualRate: '',
    debitCurrency: 'ARS',
    debitRate: '',
    purchaseDate: todayInputValue(),
    note: '',
  }
}

export function SavingFormDialog({
  open,
  enabledCurrencies,
  quotes,
  onOpenChange,
  onSaved,
}: SavingFormDialogProps) {
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const options = currencyOptions.filter((option) =>
    enabledCurrencies.includes(option.value),
  )

  const update = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }))

  const savingRate = resolveQuoteRate(
    form.currency,
    form.quoteType,
    parseNumber(form.manualRate),
    quotes,
  )
  const needsWalletRate = walletNeedsManualRate(form.currency, form.debitCurrency)
  const walletRate = needsWalletRate ? parseNumber(form.debitRate) : savingRate
  const amount = parseNumber(form.amount)
  const estimate =
    amount !== null && amount > 0
      ? convertValue(
          amount,
          { currency: form.currency, rate: savingRate },
          { currency: form.debitCurrency, rate: walletRate },
        )
      : null

  const mutation = useMutation({
    mutationFn: createSaving,
    onSuccess: () => {
      onSaved()
      onOpenChange(false)
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialState())
      setErrors({})
      setSubmitError(null)
    }
    onOpenChange(next)
  }

  const validate = (): FormErrors => {
    const next: FormErrors = {}
    if (amount === null || amount <= 0) {
      next.amount = 'Ingresá una cantidad mayor a 0'
    }
    if (form.currency !== 'ARS') {
      if (!form.quoteType) {
        next.quoteType = 'Elegí la cotización'
      } else if (form.quoteType === 'MANUAL') {
        const manual = parseNumber(form.manualRate)
        if (manual === null || manual <= 0) {
          next.manualRate = 'Ingresá una cotización mayor a 0'
        }
      }
    }
    if (needsWalletRate) {
      const rate = parseNumber(form.debitRate)
      if (rate === null || rate <= 0) {
        next.debitRate = `Ingresá la cotización de ${form.debitCurrency}`
      }
    }
    if (!form.purchaseDate) {
      next.purchaseDate = 'Ingresá la fecha de compra'
    }
    return next
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    mutation.mutate({
      currency: form.currency,
      amount: amount as number,
      quoteType: form.currency === 'ARS' ? undefined : form.quoteType,
      quoteRate:
        form.quoteType === 'MANUAL'
          ? (parseNumber(form.manualRate) ?? undefined)
          : undefined,
      debitCurrency: form.debitCurrency,
      debitRate: needsWalletRate ? parseNumber(form.debitRate) ?? undefined : undefined,
      purchaseDate: dateInputToIso(form.purchaseDate, 'start') as string,
      note: form.note.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-12">
          <DialogTitle>Nuevo ahorro</DialogTitle>
          <DialogDescription>
            El estimado se descuenta del disponible de la billetera elegida.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="saving-currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(value) =>
                  update({
                    currency: value as Currency,
                    quoteType: value === 'EUR' ? 'MANUAL' : undefined,
                    manualRate: '',
                  })
                }
              >
                <SelectTrigger id="saving-currency" className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 *:data-[slot=select-value]:line-clamp-none!">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saving-amount">Cantidad a ahorrar</Label>
              <Input
                id="saving-amount"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                value={form.amount}
                onChange={(event) => update({ amount: event.target.value })}
                aria-invalid={Boolean(errors.amount)}
                className="h-11 sm:h-10"
              />
              {errors.amount && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.amount}
                </p>
              )}
            </div>
          </div>

          <QuoteFields
            idPrefix="saving"
            currency={form.currency}
            quoteType={form.quoteType}
            manualRate={form.manualRate}
            quotes={quotes}
            quoteTypeError={errors.quoteType}
            rateError={errors.manualRate}
            onQuoteTypeChange={(quoteType) => update({ quoteType })}
            onManualRateChange={(manualRate) => update({ manualRate })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="saving-wallet">Descontar de la billetera</Label>
              <Select
                value={form.debitCurrency}
                onValueChange={(value) =>
                  update({ debitCurrency: value as Currency, debitRate: '' })
                }
              >
                <SelectTrigger id="saving-wallet" className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 *:data-[slot=select-value]:line-clamp-none!">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {currencyNames[option.value]} ({option.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsWalletRate && (
              <div className="space-y-2">
                <Label htmlFor="saving-wallet-rate">
                  Cotización de {form.debitCurrency} (pesos por unidad)
                </Label>
                <Input
                  id="saving-wallet-rate"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  value={form.debitRate}
                  onChange={(event) => update({ debitRate: event.target.value })}
                  aria-invalid={Boolean(errors.debitRate)}
                  className="h-11 sm:h-10"
                />
                {errors.debitRate && (
                  <p className="text-destructive text-sm break-words" role="alert">
                    {errors.debitRate}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Estimado a descontar</p>
            <p className="text-lg font-semibold tabular-nums" aria-live="polite">
              {estimate === null
                ? 'Sin cotización'
                : formatCurrency(String(estimate), form.debitCurrency)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="saving-date">Fecha de compra</Label>
              <Input
                id="saving-date"
                type="date"
                value={form.purchaseDate}
                onChange={(event) => update({ purchaseDate: event.target.value })}
                aria-invalid={Boolean(errors.purchaseDate)}
                className="h-11 sm:h-10"
              />
              {errors.purchaseDate && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.purchaseDate}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saving-note">Observación</Label>
            <Textarea
              id="saving-note"
              value={form.note}
              maxLength={500}
              onChange={(event) => update({ note: event.target.value })}
            />
          </div>

          {submitError && (
            <p className="text-destructive text-sm break-words" role="alert">
              {submitError}
            </p>
          )}

          <DialogFooter className="sticky bottom-0 z-10 -mx-4 border-t bg-card px-4 py-3 sm:-mx-6 sm:px-6 sm:py-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-11 w-full sm:h-10 sm:w-auto"
            >
              {mutation.isPending ? 'Guardando…' : 'Guardar ahorro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
