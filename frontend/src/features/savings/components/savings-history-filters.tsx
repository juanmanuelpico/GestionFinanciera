import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollapsibleFilters } from '@/components/ui/collapsible-filters'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { currencyOptions, type Currency } from '@/types/finance'
import { savingEventTypeOptions, type SavingEventType } from '../types'

export type SavingEventTypeFilter = 'ALL' | SavingEventType
export type SavingCurrencyFilter = 'ALL' | Currency

export interface SavingsHistoryFilterValues {
  from: string
  to: string
  type: SavingEventTypeFilter
  currency: SavingCurrencyFilter
  search: string
}

interface SavingsHistoryFiltersProps {
  values: SavingsHistoryFilterValues
  onChange: (patch: Partial<SavingsHistoryFilterValues>) => void
  onClear: () => void
  canClear: boolean
}

export function SavingsHistoryFilters({
  values,
  onChange,
  onClear,
  canClear,
}: SavingsHistoryFiltersProps) {
  const activeFilterCount =
    (values.from ? 1 : 0) +
    (values.to ? 1 : 0) +
    (values.type !== 'ALL' ? 1 : 0) +
    (values.currency !== 'ALL' ? 1 : 0) +
    (values.search.trim() ? 1 : 0)

  return (
    <CollapsibleFilters
      activeCount={activeFilterCount}
      gridClassName="grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:items-end xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)_auto]"
    >
      <div className="min-w-0 space-y-2">
        <label
          htmlFor="savings-history-from"
          className="block text-sm font-medium"
        >
          Desde
        </label>
        <Input
          id="savings-history-from"
          type="date"
          value={values.from}
          onChange={(event) => onChange({ from: event.target.value })}
        />
      </div>

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="savings-history-to"
          className="block text-sm font-medium"
        >
          Hasta
        </label>
        <Input
          id="savings-history-to"
          type="date"
          value={values.to}
          onChange={(event) => onChange({ to: event.target.value })}
        />
      </div>

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="savings-history-type"
          className="block text-sm font-medium"
        >
          Tipo
        </label>
        <Select
          value={values.type}
          onValueChange={(value) =>
            onChange({ type: value as SavingEventTypeFilter })
          }
        >
          <SelectTrigger id="savings-history-type" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {savingEventTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="savings-history-currency"
          className="block text-sm font-medium"
        >
          Moneda
        </label>
        <Select
          value={values.currency}
          onValueChange={(value) =>
            onChange({ currency: value as SavingCurrencyFilter })
          }
        >
          <SelectTrigger id="savings-history-currency" aria-label="Moneda">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            {currencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="savings-history-search"
          className="block text-sm font-medium"
        >
          Buscar
        </label>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="savings-history-search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Observación del ahorro"
            className="pl-9"
            value={values.search}
            onChange={(event) => onChange({ search: event.target.value })}
          />
        </div>
      </div>

      <Button
        variant="outline"
        className="h-11 w-full sm:col-span-2 sm:h-10 lg:col-span-1 lg:w-auto"
        disabled={!canClear}
        onClick={onClear}
      >
        Limpiar filtros
      </Button>
    </CollapsibleFilters>
  )
}
