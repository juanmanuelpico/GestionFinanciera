import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PREFERENCES_QUERY_KEY,
  usePreferencesQuery,
} from '@/features/preferences/preferences-query'
import { updatePreferences } from '@/features/preferences/preferences-api'
import { currencyOptions, type Currency } from '@/types/finance'

export function WalletSelector() {
  const queryClient = useQueryClient()
  const preferences = usePreferencesQuery()

  const mutation = useMutation({
    mutationFn: (headerCurrency: Currency) =>
      updatePreferences({ headerCurrency }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY }),
  })

  if (!preferences.data) {
    return null
  }

  const { enabledCurrencies, headerCurrency } = preferences.data
  const options = currencyOptions.filter((option) =>
    enabledCurrencies.includes(option.value),
  )

  return (
    <Select
      value={headerCurrency}
      onValueChange={(value) => mutation.mutate(value as Currency)}
      disabled={mutation.isPending}
    >
      <SelectTrigger
        aria-label="Billetera"
        className="h-11 w-auto min-w-24 data-[size=default]:h-11 sm:h-9 sm:data-[size=default]:h-9"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
