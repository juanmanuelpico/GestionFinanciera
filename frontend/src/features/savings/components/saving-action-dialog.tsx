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
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import { currencyOptions, type Currency } from '@/types/finance'
import {
  convertValue,
  quoteOptionsFor,
  rateForCurrency,
  resolveQuoteRate,
  walletNeedsManualRate,
} from '../estimate'
import {
  adjustPosition,
  convertPosition,
  returnPosition,
} from '../savings-api'
import type {
  DollarQuotes,
  QuoteType,
  SavingsPosition,
} from '../types'
import { currencyNames } from '../types'
import { QuoteFields } from './quote-fields'

export type SavingAction = 'ajustar' | 'devolver' | 'convertir'

interface SavingActionDialogProps {
  currency: Currency | null
  position: SavingsPosition | null
  action: SavingAction | null
  enabledCurrencies: Currency[]
  quotes: DollarQuotes | undefined
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const actionTitles: Record<SavingAction, string> = {
  ajustar: 'Ajustar ahorro',
  devolver: 'Devolver al disponible',
  convertir: 'Convertir ahorro',
}

const actionDescriptions: Record<SavingAction, string> = {
  ajustar:
    'Sumá o quitá importe del ahorro. No modifica el dinero disponible; queda registrado en el historial.',
  devolver:
    'Elegí cuánto devolver en la moneda del ahorro. El importe vuelve al disponible de la billetera elegida.',
  convertir:
    'Elegí cuánto convertir y la cotización de origen (venta). No genera movimientos ni modifica el disponible.',
}

export function SavingActionDialog({
  currency,
  position,
  action,
  enabledCurrencies,
  quotes,
  onOpenChange,
  onDone,
}: SavingActionDialogProps) {
  if (!currency || !position || !action) {
    return null
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0 pr-12">
          <DialogTitle>{actionTitles[action]}</DialogTitle>
          <DialogDescription>{actionDescriptions[action]}</DialogDescription>
        </DialogHeader>
        <ActionForm
          key={`${currency}-${action}`}
          currency={currency}
          position={position}
          action={action}
          enabledCurrencies={enabledCurrencies}
          quotes={quotes}
          onOpenChange={onOpenChange}
          onDone={onDone}
        />
      </DialogContent>
    </Dialog>
  )
}

function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'))
  return value.trim() && Number.isFinite(parsed) ? parsed : null
}

interface ActionFormProps {
  currency: Currency
  position: SavingsPosition
  action: SavingAction
  enabledCurrencies: Currency[]
  quotes: DollarQuotes | undefined
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

function ActionForm(props: ActionFormProps) {
  const { currency, position, action, enabledCurrencies, quotes, onOpenChange, onDone } = props
  const [amount, setAmount] = useState('')
  const [operation, setOperation] = useState<'SUMAR' | 'RESTAR'>('SUMAR')
  const [returnAmount, setReturnAmount] = useState(() => String(position.amount))
  const [wallet, setWallet] = useState<Currency>('ARS')
  const [walletRate, setWalletRate] = useState('')
  const [target, setTarget] = useState<Currency | undefined>(
    () => enabledCurrencies.find((item) => item !== currency),
  )
  const [targetQuote, setTargetQuote] = useState<QuoteType | undefined>(undefined)
  const [targetManualRate, setTargetManualRate] = useState('')
  const [convertAmount, setConvertAmount] = useState(() => String(position.amount))
  const [sourceQuote, setSourceQuote] = useState<QuoteType | undefined>(() =>
    currency === 'ARS' ? undefined : 'MANUAL',
  )
  const [sourceManualRate, setSourceManualRate] = useState(() =>
    position.quoteRate === null ? '' : String(position.quoteRate),
  )
  const [error, setError] = useState<string | null>(null)

  const options = currencyOptions.filter((option) =>
    enabledCurrencies.includes(option.value),
  )
  const sourceRate = rateForCurrency(currency, position.quoteRate)
  const convertSourceRate = resolveQuoteRate(
    currency,
    sourceQuote,
    parseNumber(sourceManualRate),
    quotes,
  )
  const convertSource = { currency, rate: convertSourceRate }
  const convertValueAmount = parseNumber(convertAmount)
  const convertRemaining =
    convertValueAmount !== null &&
    convertValueAmount > 0 &&
    convertValueAmount <= position.amount
      ? round(position.amount - convertValueAmount)
      : null

  const returnSourceNeedsQuote = wallet !== currency && currency !== 'ARS'
  const returnSourceRate = returnSourceNeedsQuote
    ? resolveQuoteRate(
        currency,
        sourceQuote,
        parseNumber(sourceManualRate),
        quotes,
      )
    : sourceRate
  const returnSource = { currency, rate: returnSourceRate }

  const mutation = useMutation({
    mutationFn: () => {
      if (action === 'ajustar') {
        return adjustPosition(currency, {
          operation,
          amount: parseNumber(amount) as number,
        })
      }
      if (action === 'devolver') {
        return returnPosition(currency, {
          amount: parseNumber(returnAmount) as number,
          walletCurrency: wallet,
          sourceQuoteType: returnSourceNeedsQuote ? sourceQuote : undefined,
          sourceQuoteRate:
            returnSourceNeedsQuote && sourceQuote === 'MANUAL'
              ? (parseNumber(sourceManualRate) ?? undefined)
              : undefined,
          walletRate: walletNeedsManualRate(currency, wallet)
            ? (parseNumber(walletRate) ?? undefined)
            : undefined,
        })
      }
      return convertPosition(currency, {
        amount: parseNumber(convertAmount) as number,
        currency: target as Currency,
        sourceQuoteType: currency === 'ARS' ? undefined : sourceQuote,
        sourceQuoteRate:
          currency !== 'ARS' && sourceQuote === 'MANUAL'
            ? (parseNumber(sourceManualRate) ?? undefined)
            : undefined,
        quoteType: targetQuote,
        quoteRate:
          targetQuote === 'MANUAL' ? (parseNumber(targetManualRate) ?? undefined) : undefined,
      })
    },
    onSuccess: () => {
      onDone()
      onOpenChange(false)
    },
    onError: (mutationError) => setError(getApiErrorMessage(mutationError)),
  })

  // Vista previa de cada acción con la misma fórmula del backend.
  let preview: string | null = null
  if (action === 'ajustar') {
    const delta = parseNumber(amount)
    if (delta !== null && delta > 0) {
      const next = operation === 'SUMAR' ? position.amount + delta : position.amount - delta
      preview = next < 0 ? null : formatCurrency(String(round(next)), currency)
    }
  } else if (action === 'devolver') {
    const value = parseNumber(returnAmount)
    const walletTargetRate = walletNeedsManualRate(currency, wallet)
      ? parseNumber(walletRate)
      : null
    const converted =
      value === null || value <= 0
        ? null
        : convertValue(value, returnSource, {
            currency: wallet,
            rate: walletTargetRate,
          })
    preview = converted === null ? 'Sin cotización' : formatCurrency(String(converted), wallet)
  } else if (target) {
    const targetRate = resolveQuoteRate(
      target,
      targetQuote,
      parseNumber(targetManualRate),
      quotes,
    )
    const value =
      convertValueAmount === null || convertValueAmount <= 0
        ? null
        : convertValue(convertValueAmount, convertSource, {
            currency: target,
            rate: targetRate,
          })
    preview = value === null ? 'Sin cotización' : formatCurrency(String(value), target)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (action === 'ajustar') {
      const delta = parseNumber(amount)
      if (delta === null || delta <= 0) return setError('Ingresá un importe mayor a 0')
      if (operation === 'RESTAR' && delta > position.amount) {
        return setError('No podés quitar más de lo que tiene ahorrado')
      }
    }
    if (action === 'devolver') {
      const value = parseNumber(returnAmount)
      if (value === null || value <= 0) return setError('Ingresá un importe mayor a 0')
      if (value > position.amount) {
        return setError('No podés devolver más de lo que tiene ahorrado')
      }
      if (returnSourceNeedsQuote) {
        if (!sourceQuote) return setError('Elegí la cotización de origen')
        if (
          sourceQuote === 'MANUAL' &&
          (parseNumber(sourceManualRate) ?? 0) <= 0
        ) {
          return setError('Ingresá una cotización de origen mayor a 0')
        }
      }
      if (walletNeedsManualRate(currency, wallet)) {
        const rate = parseNumber(walletRate)
        if (rate === null || rate <= 0) return setError(`Ingresá la cotización de ${wallet}`)
      }
    }
    if (action === 'convertir') {
      if (convertValueAmount === null || convertValueAmount <= 0) {
        return setError('Ingresá un importe mayor a 0')
      }
      if (convertValueAmount > position.amount) {
        return setError('No podés convertir más de lo que tiene ahorrado')
      }
      if (currency !== 'ARS') {
        if (!sourceQuote) return setError('Elegí la cotización de origen')
        if (
          sourceQuote === 'MANUAL' &&
          (parseNumber(sourceManualRate) ?? 0) <= 0
        ) {
          return setError('Ingresá una cotización de origen mayor a 0')
        }
      }
      if (!target) return setError('Elegí la moneda de destino')
      if (!targetQuote && target !== 'ARS') return setError('Elegí la cotización')
      if (targetQuote === 'MANUAL' && (parseNumber(targetManualRate) ?? 0) <= 0) {
        return setError('Ingresá una cotización mayor a 0')
      }
    }

    mutation.mutate()
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
        <p className="text-sm">
          Ahorro actual:{' '}
          <span className="font-semibold tabular-nums">
            {formatCurrency(String(position.amount), currency)}
          </span>
        </p>

        {action === 'ajustar' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="adjust-operation">Operación</Label>
              <Select
                value={operation}
                onValueChange={(value) => setOperation(value as 'SUMAR' | 'RESTAR')}
              >
                <SelectTrigger id="adjust-operation" className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 *:data-[slot=select-value]:line-clamp-none!">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUMAR">Agregar al ahorro</SelectItem>
                  <SelectItem value="RESTAR">Quitar del ahorro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="adjust-amount">Importe ({currency})</Label>
              <Input
                id="adjust-amount"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-11 sm:h-10"
              />
            </div>
          </div>
        )}

        {action === 'devolver' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="return-amount">Importe a devolver ({currency})</Label>
              <Input
                id="return-amount"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                value={returnAmount}
                onChange={(event) => setReturnAmount(event.target.value)}
                className="h-11 sm:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-wallet">Devolver a la billetera</Label>
              <Select value={wallet} onValueChange={(value) => setWallet(value as Currency)}>
                <SelectTrigger id="return-wallet" className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 *:data-[slot=select-value]:line-clamp-none!">
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
            {returnSourceNeedsQuote && (
              <section aria-label="Cotización de origen" className="space-y-4">
                <p className="text-sm font-medium">
                  Cotización de origen ({currency})
                </p>
                <QuoteFields
                  idPrefix="return-source"
                  currency={currency}
                  quoteType={sourceQuote}
                  manualRate={sourceManualRate}
                  quotes={quotes}
                  onQuoteTypeChange={setSourceQuote}
                  onManualRateChange={setSourceManualRate}
                />
              </section>
            )}
            {walletNeedsManualRate(currency, wallet) && (
              <div className="space-y-2">
                <Label htmlFor="return-wallet-rate">
                  Cotización de {wallet} (pesos por unidad)
                </Label>
                <Input
                  id="return-wallet-rate"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  value={walletRate}
                  onChange={(event) => setWalletRate(event.target.value)}
                  className="h-11 sm:h-10"
                />
              </div>
            )}
          </>
        )}

        {action === 'convertir' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="convert-amount">Importe a convertir ({currency})</Label>
              <Input
                id="convert-amount"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                value={convertAmount}
                onChange={(event) => setConvertAmount(event.target.value)}
                className="h-11 sm:h-10"
              />
              {convertRemaining !== null && convertRemaining > 0 && (
                <p className="text-muted-foreground text-xs">
                  Quedan {formatCurrency(String(convertRemaining), currency)} en{' '}
                  {currencyNames[currency]}.
                </p>
              )}
            </div>

            {currency !== 'ARS' && (
              <section aria-label="Cotización de origen" className="space-y-4">
                <p className="text-sm font-medium">
                  Cotización de origen ({currency})
                </p>
                <QuoteFields
                  idPrefix="convert-source"
                  currency={currency}
                  quoteType={sourceQuote}
                  manualRate={sourceManualRate}
                  quotes={quotes}
                  onQuoteTypeChange={setSourceQuote}
                  onManualRateChange={setSourceManualRate}
                />
              </section>
            )}

            <div className="space-y-2">
              <Label htmlFor="convert-currency">Moneda de destino</Label>
              <Select
                value={target ?? ''}
                onValueChange={(value) => {
                  setTarget(value as Currency)
                  setTargetQuote(value === 'EUR' ? 'MANUAL' : undefined)
                }}
              >
                <SelectTrigger id="convert-currency" className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 *:data-[slot=select-value]:line-clamp-none!">
                  <SelectValue placeholder="Elegí la moneda" />
                </SelectTrigger>
                <SelectContent>
                  {options
                    .filter((option) => option.value !== currency)
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {target && (
              <section aria-label="Cotización de destino" className="space-y-4">
                <QuoteFields
                  idPrefix="convert"
                  currency={target}
                  quoteType={targetQuote}
                  manualRate={targetManualRate}
                  quotes={quotes}
                  onQuoteTypeChange={setTargetQuote}
                  onManualRateChange={setTargetManualRate}
                />
              </section>
            )}
            {target && quoteOptionsFor(target).length === 0 && (
              <p className="text-muted-foreground text-xs">
                La conversión a pesos usa la cotización de origen elegida.
              </p>
            )}
          </>
        )}

        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">
            {action === 'devolver' ? 'Vuelve al disponible' : 'Nuevo importe'}
          </p>
          <p
            className="text-lg font-semibold break-words tabular-nums"
            aria-live="polite"
          >
            {preview ?? '—'}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-destructive text-sm break-words" role="alert">
          {error}
        </p>
      )}

      <DialogFooter className="shrink-0 border-t pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-4 sm:pb-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full sm:h-10 sm:w-auto"
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="h-11 w-full sm:h-10 sm:w-auto"
        >
          {mutation.isPending ? 'Guardando…' : 'Confirmar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
