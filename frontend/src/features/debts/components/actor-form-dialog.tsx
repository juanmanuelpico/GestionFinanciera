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
import type { Currency } from '@/types/finance'
import { currencyOptions } from '@/types/finance'
import { getApiErrorMessage } from '@/lib/errors'
import { createDebtActor, updateDebtActor } from '../debts-api'
import {
  debtActorTypeLabels,
  type DebtActor,
  type DebtActorPayload,
  type DebtActorType,
} from '../types'

interface ActorFormState {
  type: DebtActorType
  firstName: string
  lastName: string
  phone: string
  email: string
  alias: string
  issuer: string
  brand: string
  lastFour: string
  closingDay: string
  paymentDueDay: string
  defaultWalletCurrency: string
}

type ActorFormErrors = Partial<Record<keyof ActorFormState, string>>

function actorToFormState(actor: DebtActor | null): ActorFormState {
  if (!actor) {
    return {
      type: 'PERSONA',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      alias: '',
      issuer: '',
      brand: '',
      lastFour: '',
      closingDay: '',
      paymentDueDay: '',
      defaultWalletCurrency: '',
    }
  }

  return {
    type: actor.type,
    firstName: actor.firstName ?? '',
    lastName: actor.lastName ?? '',
    phone: actor.phone ?? '',
    email: actor.email ?? '',
    alias: actor.alias ?? '',
    issuer: actor.issuer ?? '',
    brand: actor.brand ?? '',
    lastFour: actor.lastFour ?? '',
    closingDay: actor.closingDay ? String(actor.closingDay) : '',
    paymentDueDay: actor.paymentDueDay ? String(actor.paymentDueDay) : '',
    defaultWalletCurrency: actor.defaultWalletCurrency ?? '',
  }
}

function validateDay(value: string, label: string): string | undefined {
  if (!value.trim()) return `${label} es obligatorio`
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    return `${label} debe estar entre 1 y 31`
  }
  return undefined
}

interface ActorFormFieldsProps {
  actor: DebtActor | null
  enabledCurrencies: Currency[]
  lockType?: DebtActorType
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onCreated?: (actor: DebtActor) => void
}

function ActorFormFields({
  actor,
  enabledCurrencies,
  lockType,
  onOpenChange,
  onSaved,
  onCreated,
}: ActorFormFieldsProps) {
  const [form, setForm] = useState<ActorFormState>(() => ({
    ...actorToFormState(actor),
    ...(lockType ? { type: lockType } : {}),
  }))
  const [errors, setErrors] = useState<ActorFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const typeLocked = Boolean(lockType) || Boolean(actor && actor.debtCount > 0)

  const update = (patch: Partial<ActorFormState>) =>
    setForm((current) => ({ ...current, ...patch }))

  const mutation = useMutation({
    mutationFn: (payload: DebtActorPayload) =>
      actor ? updateDebtActor(actor.id, payload) : createDebtActor(payload),
    onSuccess: (created) => {
      if (!actor) onCreated?.(created)
      onSaved()
      onOpenChange(false)
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  })

  const buildPayload = (): DebtActorPayload | null => {
    const found: ActorFormErrors = {}

    if (form.type === 'PERSONA') {
      if (!form.firstName.trim()) found.firstName = 'El nombre es obligatorio'
      if (!form.lastName.trim()) found.lastName = 'El apellido es obligatorio'
      if (
        form.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ) {
        found.email = 'El email no es válido'
      }
      if (Object.values(found).some(Boolean)) {
        setErrors(found)
        return null
      }

      return {
        type: 'PERSONA',
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      }
    }

    if (!form.alias.trim()) found.alias = 'El alias es obligatorio'
    if (!form.issuer.trim()) found.issuer = 'El banco o emisor es obligatorio'
    if (!form.brand.trim()) found.brand = 'La marca es obligatoria'
    if (form.lastFour.trim() && !/^\d{4}$/.test(form.lastFour.trim())) {
      found.lastFour = 'Ingresá exactamente 4 dígitos'
    }
    found.closingDay = validateDay(form.closingDay, 'El día de cierre')
    found.paymentDueDay = validateDay(
      form.paymentDueDay,
      'El día de vencimiento',
    )
    if (!form.defaultWalletCurrency) {
      found.defaultWalletCurrency = 'Elegí la billetera de pago'
    }

    if (Object.values(found).some(Boolean)) {
      setErrors(found)
      return null
    }

    return {
      type: 'TARJETA',
      alias: form.alias.trim(),
      issuer: form.issuer.trim(),
      brand: form.brand.trim(),
      lastFour: form.lastFour.trim() || null,
      closingDay: Number(form.closingDay),
      paymentDueDay: Number(form.paymentDueDay),
      defaultWalletCurrency: form.defaultWalletCurrency as Currency,
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const payload = buildPayload()
    if (!payload) return

    mutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="actor-type">
          Tipo <span aria-hidden="true">*</span>
        </Label>
        <Select
          value={form.type}
          onValueChange={(value) => {
            update({ type: value as DebtActorType })
            setErrors({})
          }}
          disabled={typeLocked || mutation.isPending}
        >
          <SelectTrigger
            id="actor-type"
            aria-label="Tipo de actor"
            className="h-11 sm:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERSONA">Persona</SelectItem>
            <SelectItem value="TARJETA">Tarjeta</SelectItem>
          </SelectContent>
        </Select>
        {lockType && (
          <p className="text-muted-foreground text-xs break-words">
            En una división de gastos solo se agregan personas.
          </p>
        )}
        {!lockType && typeLocked && (
          <p className="text-muted-foreground text-xs break-words">
            No se puede cambiar el tipo porque el actor tiene deudas asociadas.
          </p>
        )}
      </div>

      {form.type === 'PERSONA' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="actor-firstName">
              Nombre <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-firstName"
              autoComplete="given-name"
              className="h-11 sm:h-10"
              value={form.firstName}
              aria-invalid={Boolean(errors.firstName)}
              onChange={(event) => update({ firstName: event.target.value })}
            />
            {errors.firstName && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-lastName">
              Apellido <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-lastName"
              autoComplete="family-name"
              className="h-11 sm:h-10"
              value={form.lastName}
              aria-invalid={Boolean(errors.lastName)}
              onChange={(event) => update({ lastName: event.target.value })}
            />
            {errors.lastName && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.lastName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-phone">Teléfono</Label>
            <Input
              id="actor-phone"
              type="tel"
              inputMode="tel"
              className="h-11 sm:h-10"
              placeholder="+54 11 5555-5555"
              value={form.phone}
              onChange={(event) => update({ phone: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-email">Email</Label>
            <Input
              id="actor-email"
              type="email"
              inputMode="email"
              className="h-11 sm:h-10"
              placeholder="juan@example.com"
              value={form.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => update({ email: event.target.value })}
            />
            {errors.email && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.email}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="actor-alias">
              Alias <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-alias"
              placeholder="Visa Galicia"
              className="h-11 sm:h-10"
              value={form.alias}
              aria-invalid={Boolean(errors.alias)}
              onChange={(event) => update({ alias: event.target.value })}
            />
            {errors.alias && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.alias}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-issuer">
              Banco o emisor <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-issuer"
              placeholder="Banco Galicia"
              className="h-11 sm:h-10"
              value={form.issuer}
              aria-invalid={Boolean(errors.issuer)}
              onChange={(event) => update({ issuer: event.target.value })}
            />
            {errors.issuer && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.issuer}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-brand">
              Marca <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-brand"
              placeholder="Visa"
              className="h-11 sm:h-10"
              value={form.brand}
              aria-invalid={Boolean(errors.brand)}
              onChange={(event) => update({ brand: event.target.value })}
            />
            {errors.brand && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.brand}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-lastFour">Últimos 4 dígitos</Label>
            <Input
              id="actor-lastFour"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              className="h-11 sm:h-10"
              value={form.lastFour}
              aria-invalid={Boolean(errors.lastFour)}
              onChange={(event) => update({ lastFour: event.target.value })}
            />
            {errors.lastFour && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.lastFour}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-closingDay">
              Día de cierre <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-closingDay"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="25"
              className="h-11 sm:h-10"
              value={form.closingDay}
              aria-invalid={Boolean(errors.closingDay)}
              onChange={(event) => update({ closingDay: event.target.value })}
            />
            {errors.closingDay && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.closingDay}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-paymentDueDay">
              Día de vencimiento <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="actor-paymentDueDay"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="10"
              className="h-11 sm:h-10"
              value={form.paymentDueDay}
              aria-invalid={Boolean(errors.paymentDueDay)}
              onChange={(event) =>
                update({ paymentDueDay: event.target.value })
              }
            />
            {errors.paymentDueDay && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.paymentDueDay}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="actor-defaultWallet">
              Billetera de pago predeterminada{' '}
              <span aria-hidden="true">*</span>
            </Label>
            <Select
              value={form.defaultWalletCurrency}
              onValueChange={(value) =>
                update({ defaultWalletCurrency: value })
              }
              disabled={mutation.isPending}
            >
              <SelectTrigger
                id="actor-defaultWallet"
                aria-label="Billetera de pago predeterminada"
                aria-invalid={Boolean(errors.defaultWalletCurrency)}
                className="h-11 sm:h-10"
              >
                <SelectValue placeholder="Elegí una billetera" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions
                  .filter((option) => enabledCurrencies.includes(option.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.defaultWalletCurrency && (
              <p className="text-destructive text-sm break-words" role="alert">
                {errors.defaultWalletCurrency}
              </p>
            )}
          </div>
        </div>
      )}

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
          {mutation.isPending
            ? 'Guardando…'
            : actor
              ? 'Guardar cambios'
              : `Crear ${debtActorTypeLabels[form.type].toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface ActorFormDialogProps {
  open: boolean
  actor: DebtActor | null
  enabledCurrencies: Currency[]
  lockType?: DebtActorType
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onCreated?: (actor: DebtActor) => void
}

export function ActorFormDialog({
  open,
  actor,
  enabledCurrencies,
  lockType,
  onOpenChange,
  onSaved,
  onCreated,
}: ActorFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-xl sm:pb-6">
        <DialogHeader className="pr-12">
          <DialogTitle>
            {actor ? 'Editar actor' : lockType ? 'Nueva persona' : 'Nuevo actor'}
          </DialogTitle>
          <DialogDescription>
            Los datos son de referencia. Nunca guardamos números completos,
            CVV ni claves.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ActorFormFields
            key={actor?.id ?? 'new'}
            actor={actor}
            enabledCurrencies={enabledCurrencies}
            lockType={lockType}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
