import { useQuery } from '@tanstack/react-query'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import { fetchAvailable } from '@/features/savings/savings-api'
import { formatCurrency } from '@/lib/format'

const AVAILABLE_QUERY_KEY = ['savings', 'available'] as const

export function AvailableBalance() {
  const preferences = usePreferencesQuery()
  const available = useQuery({
    queryKey: AVAILABLE_QUERY_KEY,
    queryFn: fetchAvailable,
    enabled: preferences.isSuccess,
  })

  if (!preferences.data) {
    return null
  }

  const { headerCurrency } = preferences.data
  const balance = available.data?.[headerCurrency]

  return (
    <p
      className="border-primary/20 bg-primary-50 text-primary dark:bg-primary/10 inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1 text-lg font-semibold tabular-nums whitespace-nowrap md:text-2xl"
      aria-label="Dinero disponible"
      aria-live="polite"
    >
      {balance === undefined
        ? '—'
        : formatCurrency(String(balance), headerCurrency)}
    </p>
  )
}
