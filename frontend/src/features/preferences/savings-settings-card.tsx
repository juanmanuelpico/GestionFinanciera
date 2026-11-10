import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { currencyOptions, type Currency } from '@/types/finance'
import { updatePreferences, type UserPreferences } from './preferences-api'
import { PREFERENCES_QUERY_KEY, usePreferencesQuery } from './preferences-query'
import { SettingsSection } from './settings-section'

export function SavingsSettingsCard() {
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

  const { enabledCurrencies, headerCurrency } = preferences.data

  const toggleCurrency = (currency: Currency) => {
    const isEnabled = enabledCurrencies.includes(currency)
    if (isEnabled && enabledCurrencies.length === 1) {
      setError('Debe quedar al menos una moneda habilitada')
      return
    }
    const next = isEnabled
      ? enabledCurrencies.filter((item) => item !== currency)
      : currencyOptions
          .map((option) => option.value)
          .filter((item) => item === currency || enabledCurrencies.includes(item))

    // La billetera del header siempre debe estar entre las habilitadas.
    const nextHeader = next.includes(headerCurrency) ? headerCurrency : next[0]
    mutation.mutate({ enabledCurrencies: next, headerCurrency: nextHeader })
  }

  return (
    <SettingsSection
      titleId="ahorros-title"
      title="Ahorros"
      description="Elegí las monedas que usás para ahorrar y la billetera que se muestra en el encabezado."
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Monedas habilitadas</p>
            <p className="text-muted-foreground text-xs">
              Las monedas deshabilitadas se ocultan del encabezado y de los
              formularios. Los ahorros existentes se conservan.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {currencyOptions.map((option) => {
              const pressed = enabledCurrencies.includes(option.value)
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  aria-pressed={pressed}
                  disabled={mutation.isPending}
                  onClick={() => toggleCurrency(option.value)}
                  className={cn(
                    'h-11 sm:h-10',
                    pressed && 'border-primary bg-accent text-accent-foreground',
                  )}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Billetera del encabezado</p>
            <p className="text-muted-foreground text-xs">
              Muestra el dinero disponible (ingresos menos egresos) de esta moneda.
            </p>
          </div>
          <Select
            value={headerCurrency}
            onValueChange={(value) =>
              mutation.mutate({ headerCurrency: value as Currency })
            }
            disabled={mutation.isPending}
          >
            <SelectTrigger
              aria-label="Billetera del encabezado"
              className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 sm:w-56 *:data-[slot=select-value]:line-clamp-none!"
            >
              <SelectValue />
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
