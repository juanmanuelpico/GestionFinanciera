import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import {
  paymentMethodOptions,
  paymentMethodValues,
  type PaymentMethod,
} from '@/types/finance'
import { updatePreferences, type UserPreferences } from './preferences-api'
import { PREFERENCES_QUERY_KEY, usePreferencesQuery } from './preferences-query'
import { SettingsSection } from './settings-section'

export function PaymentMethodsSettingsCard() {
  const queryClient = useQueryClient()
  const preferences = usePreferencesQuery()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: Partial<UserPreferences>) => updatePreferences(payload),
    onMutate: () => setError(null),
    onError: (saveError) => setError(getApiErrorMessage(saveError)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY }),
  })

  if (!preferences.data) {
    return null
  }

  const { enabledPaymentMethods } = preferences.data

  const togglePaymentMethod = (method: PaymentMethod) => {
    const isEnabled = enabledPaymentMethods.includes(method)
    if (isEnabled && enabledPaymentMethods.length === 1) {
      setError('Debe quedar al menos un medio de pago habilitado')
      return
    }

    const next = isEnabled
      ? enabledPaymentMethods.filter((item) => item !== method)
      : paymentMethodValues.filter(
          (item) => item === method || enabledPaymentMethods.includes(item),
        )

    mutation.mutate({ enabledPaymentMethods: next })
  }

  return (
    <SettingsSection
      titleId="medios-de-pago-title"
      title="Medios de pago"
      description="Elegí los medios que usás para registrar movimientos. Los deshabilitados dejan de aparecer en el formulario."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {paymentMethodOptions.map((option) => {
              const enabled = enabledPaymentMethods.includes(option.value)
              const checkboxId = `payment-method-${option.value}`
              return (
                <div
                  key={option.value}
                  className={cn(
                    'relative flex min-h-11 items-center rounded-lg border transition-colors',
                    'hover:bg-accent/50 focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:outline-none active:bg-accent/70',
                    enabled && 'border-primary/40 bg-accent/40',
                    mutation.isPending && 'opacity-60',
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={enabled}
                    disabled={mutation.isPending}
                    onCheckedChange={() => togglePaymentMethod(option.value)}
                    className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
                  />
                  <Label
                    htmlFor={checkboxId}
                    className={cn(
                      'flex min-h-11 w-full items-center py-2 pr-3 pl-11 text-sm leading-snug font-normal',
                      mutation.isPending ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    <span className="min-w-0 break-words">{option.label}</span>
                  </Label>
                </div>
              )
            })}
          </div>

        <div aria-live="polite">
          {error && (
            <p className="text-destructive text-sm break-words" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}
