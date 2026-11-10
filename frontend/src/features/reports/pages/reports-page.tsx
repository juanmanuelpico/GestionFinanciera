import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CollapsibleFilters } from '@/components/ui/collapsible-filters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import type { Currency } from '@/types/finance'
import { currencyOptions } from '@/types/finance'
import { getApiErrorMessage } from '@/lib/errors'
import { DebtsReportTab } from '../components/debts-report-tab'
import { FixedExpensesReportTab } from '../components/fixed-expenses-report-tab'
import { MovementsReportTab } from '../components/movements-report-tab'
import { SavingsReportTab } from '../components/savings-report-tab'
import { SpendingControlReportTab } from '../components/spending-control-report-tab'
import {
  activePreset,
  isSamePeriod,
  monthOptionLabel,
  presetPeriod,
  recentMonthOptions,
  periodPresets,
  type ReportPeriod,
} from '../report-period'

type TabValue =
  'ahorros' | 'movimientos' | 'deudas' | 'gastos-fijos' | 'control'

const TAB_VALUES: TabValue[] = [
  'ahorros',
  'movimientos',
  'deudas',
  'gastos-fijos',
  'control',
]

function toTabValue(value: string | null): TabValue {
  return TAB_VALUES.includes(value as TabValue)
    ? (value as TabValue)
    : 'ahorros'
}

const MONTH_OPTIONS = recentMonthOptions(24)

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = toTabValue(searchParams.get('tab'))

  const preferences = usePreferencesQuery()

  const [period, setPeriod] = useState<ReportPeriod>(() =>
    presetPeriod('LAST_12'),
  )
  const [currencyChoice, setCurrencyChoice] = useState<Currency | null>(null)

  const enabledCurrencies: Currency[] = preferences.data?.enabledCurrencies ?? [
    'ARS',
  ]
  const headerCurrency: Currency = preferences.data?.headerCurrency ?? 'ARS'
  const currency = currencyChoice ?? headerCurrency

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'ahorros' ? {} : { tab: value })
  }

  const handleFromChange = (value: string) => {
    setPeriod((current) => ({
      from: value,
      to: value > current.to ? value : current.to,
    }))
  }

  const handleToChange = (value: string) => {
    setPeriod((current) => ({
      from: value < current.from ? value : current.from,
      to: value,
    }))
  }

  const clearFilters = () => {
    setPeriod(presetPeriod('LAST_12'))
    setCurrencyChoice(null)
  }

  const isDefaultPeriod = isSamePeriod(period, presetPeriod('LAST_12'))
  const hasFilters = !isDefaultPeriod || currencyChoice !== null
  const activeFilterCount =
    (isDefaultPeriod ? 0 : 1) + (currencyChoice !== null ? 1 : 0)

  if (preferences.isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reportes y Estadísticas
          </h1>
        </div>
        <Card>
          <CardContent className="space-y-3 p-6" role="alert">
            <p className="text-destructive text-sm break-words">
              {getApiErrorMessage(preferences.error)}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => void preferences.refetch()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filters = { from: period.from, to: period.to, currency }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reportes y Estadísticas
        </h1>
        <p className="text-muted-foreground">
          Analizá tus finanzas por módulo: gráficos, promedios y rankings.
        </p>
      </div>

      <CollapsibleFilters
        activeCount={activeFilterCount}
        gridClassName="gap-3 px-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_auto] lg:items-end sm:px-6"
      >
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <p className="text-sm leading-none font-medium">Período</p>
          <div className="flex flex-wrap gap-2">
            {periodPresets.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={
                  activePreset(period) === preset.value ? 'default' : 'outline'
                }
                size="sm"
                className="h-11 sm:h-10"
                onClick={() => setPeriod(presetPeriod(preset.value))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="report-from" className="text-sm font-medium">
            Desde
          </label>
          <Select
            value={period.from}
            onValueChange={handleFromChange}
            disabled={!preferences.isSuccess}
          >
            <SelectTrigger id="report-from" className="h-11 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month} value={month}>
                  {monthOptionLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="report-to" className="text-sm font-medium">
            Hasta
          </label>
          <Select
            value={period.to}
            onValueChange={handleToChange}
            disabled={!preferences.isSuccess}
          >
            <SelectTrigger id="report-to" className="h-11 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month} value={month}>
                  {monthOptionLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="report-currency" className="text-sm font-medium">
            Billetera
          </label>
          <Select
            value={currency}
            onValueChange={(value) => setCurrencyChoice(value as Currency)}
            disabled={!preferences.isSuccess}
          >
            <SelectTrigger
              id="report-currency"
              aria-label="Billetera del reporte"
              className="h-11 sm:h-10"
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

        <Button
          variant="outline"
          className="h-11 w-full sm:col-span-2 lg:col-span-1 lg:h-10 lg:w-auto"
          disabled={!hasFilters}
          onClick={clearFilters}
        >
          Limpiar filtros
        </Button>
      </CollapsibleFilters>

      {preferences.isPending ? (
        <div className="space-y-3" aria-label="Cargando reportes">
          <div className="bg-muted h-10 animate-pulse rounded-lg" />
          <div className="bg-muted h-64 animate-pulse rounded-xl" />
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gap-4 sm:gap-6"
        >
          <TabsList
            className="max-w-full justify-start overflow-x-auto"
            aria-label="Secciones de reportes"
          >
            <TabsTrigger value="ahorros">Ahorros</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
            <TabsTrigger value="deudas">Deudas</TabsTrigger>
            <TabsTrigger value="gastos-fijos">Gastos Fijos</TabsTrigger>
            <TabsTrigger value="control">Control de Gastos</TabsTrigger>
          </TabsList>

          <TabsContent value="ahorros">
            <SavingsReportTab filters={filters} />
          </TabsContent>

          <TabsContent value="movimientos">
            <MovementsReportTab filters={filters} />
          </TabsContent>

          <TabsContent value="deudas">
            <DebtsReportTab filters={filters} />
          </TabsContent>

          <TabsContent value="gastos-fijos">
            <FixedExpensesReportTab filters={filters} />
          </TabsContent>

          <TabsContent value="control">
            <SpendingControlReportTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
