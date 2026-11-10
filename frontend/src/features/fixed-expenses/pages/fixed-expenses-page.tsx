import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  History,
  Pencil,
  Plus,
  Power,
  Search,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CollapsibleFilters } from '@/components/ui/collapsible-filters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchCategories } from '@/features/categories/categories-api'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDateOnly } from '@/lib/format'
import { paymentMethodValues } from '@/types/finance'
import {
  fetchFixedExpenses,
  fetchProjections,
  updateFixedExpense,
} from '../fixed-expenses-api'
import { FixedExpenseFormDialog } from '../components/fixed-expense-form-dialog'
import { PayFixedExpenseDialog } from '../components/pay-fixed-expense-dialog'
import { SpendingAlertBanner } from '@/features/spending-control/components/spending-alert-banner'
import type { SpendingAlert } from '@/features/spending-control/types'
import {
  currentPeriodValue,
  formatPeriodLabel,
  isPayablePeriod,
  shiftPeriod,
} from '../recurrence'
import {
  formatFrequencyLabel,
  type FixedExpense,
  type FixedExpenseProjection,
} from '../types'

function ProjectionStatusBadge({
  projection,
}: {
  projection: FixedExpenseProjection
}) {
  if (projection.status === 'PAGADO') {
    return <Badge variant="default">Pagado</Badge>
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Pendiente</Badge>
      {!projection.active && <Badge variant="secondary">Inactivo</Badge>}
    </div>
  )
}

interface FilterBarProps {
  idPrefix: string
  search: string
  onSearchChange: (value: string) => void
  categoryId: string
  onCategoryChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  statusOptions: { value: string; label: string }[]
  categories: { id: number; name: string }[]
  hasFilters: boolean
  onClear: () => void
}

function FilterBar({
  idPrefix,
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  statusOptions,
  categories,
  hasFilters,
  onClear,
}: FilterBarProps) {
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryId !== 'ALL' ? 1 : 0) +
    (status !== 'ALL' ? 1 : 0)

  return (
    <CollapsibleFilters
      activeCount={activeFilterCount}
      gridClassName="gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto] lg:items-end"
    >
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-search`}>Gasto</Label>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id={`${idPrefix}-search`}
            type="search"
            placeholder="Buscar por nombre"
            className="h-11 pl-9 sm:h-10"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-category`}>Categoría</Label>
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger
            id={`${idPrefix}-category`}
            aria-label="Categoría"
            className="h-11 sm:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-status`}>Estado</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger
            id={`${idPrefix}-status`}
            aria-label="Estado"
            className="h-11 sm:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="h-11 w-full sm:col-span-2 sm:h-10 lg:col-span-1 lg:w-auto"
        disabled={!hasFilters}
        onClick={onClear}
      >
        Limpiar filtros
      </Button>
    </CollapsibleFilters>
  )
}

export function FixedExpensesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState('forecast')
  const [period, setPeriod] = useState(() => currentPeriodValue())

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(
    null,
  )
  const [payingProjection, setPayingProjection] =
    useState<FixedExpenseProjection | null>(null)

  const [forecastSearch, setForecastSearch] = useState('')
  const [forecastCategory, setForecastCategory] = useState('ALL')
  const [forecastStatus, setForecastStatus] = useState('ALL')
  const [manageSearch, setManageSearch] = useState('')
  const [spendingAlert, setSpendingAlert] = useState<SpendingAlert | null>(null)
  const [manageCategory, setManageCategory] = useState('ALL')
  const [manageStatus, setManageStatus] = useState('ALL')

  const preferences = usePreferencesQuery()
  const enabledCurrencies = preferences.data?.enabledCurrencies ?? ['ARS']
  const defaultCurrency = preferences.data?.headerCurrency ?? 'ARS'
  const enabledPaymentMethods =
    preferences.data?.enabledPaymentMethods ?? paymentMethodValues

  const projectionsQuery = useQuery({
    queryKey: ['fixed-expenses', 'projections', period],
    queryFn: () => fetchProjections(period),
  })

  const expensesQuery = useQuery({
    queryKey: ['fixed-expenses', 'all'],
    queryFn: fetchFixedExpenses,
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => fetchCategories(),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateFixedExpense(id, { active }),
    onSuccess: () => invalidateLists(),
  })

  const projections = useMemo(
    () => projectionsQuery.data ?? [],
    [projectionsQuery.data],
  )
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data])
  const expenseCategories = (categoriesQuery.data ?? []).filter(
    (category) => !category.type || category.type === 'EGRESO',
  )

  const filteredProjections = useMemo(() => {
    const term = forecastSearch.trim().toLowerCase()

    return projections.filter((projection) => {
      if (term && !projection.title.toLowerCase().includes(term)) {
        return false
      }
      if (
        forecastCategory !== 'ALL' &&
        String(projection.categoryId) !== forecastCategory
      ) {
        return false
      }
      if (forecastStatus !== 'ALL' && projection.status !== forecastStatus) {
        return false
      }
      return true
    })
  }, [projections, forecastSearch, forecastCategory, forecastStatus])

  const filteredExpenses = useMemo(() => {
    const term = manageSearch.trim().toLowerCase()

    return expenses.filter((expense) => {
      if (term && !expense.title.toLowerCase().includes(term)) {
        return false
      }
      if (
        manageCategory !== 'ALL' &&
        String(expense.categoryId) !== manageCategory
      ) {
        return false
      }
      if (
        manageStatus !== 'ALL' &&
        expense.active !== (manageStatus === 'ACTIVO')
      ) {
        return false
      }
      return true
    })
  }, [expenses, manageSearch, manageCategory, manageStatus])

  const hasForecastFilters =
    Boolean(forecastSearch.trim()) ||
    forecastCategory !== 'ALL' ||
    forecastStatus !== 'ALL'

  const hasManageFilters =
    Boolean(manageSearch.trim()) ||
    manageCategory !== 'ALL' ||
    manageStatus !== 'ALL'

  const clearForecastFilters = () => {
    setForecastSearch('')
    setForecastCategory('ALL')
    setForecastStatus('ALL')
  }

  const clearManageFilters = () => {
    setManageSearch('')
    setManageCategory('ALL')
    setManageStatus('ALL')
  }

  function invalidateLists() {
    void queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
    void queryClient.invalidateQueries({ queryKey: ['savings'] })
    void queryClient.invalidateQueries({ queryKey: ['spending-control'] })
  }

  const openCreate = () => {
    setEditingExpense(null)
    setFormOpen(true)
  }

  const openEdit = (expense: FixedExpense) => {
    setEditingExpense(expense)
    setFormOpen(true)
  }

  const goToHistory = (fixedExpenseId: string) => {
    navigate(`/fixed-expenses/${fixedExpenseId}/history`)
  }

  const canPayCurrent = isPayablePeriod(period)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Gastos fijos
          </h1>
          <p className="text-muted-foreground">
            Registrá tus compromisos recurrentes y pagalos desde la previsión
            mensual.
          </p>
        </div>
        <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={openCreate}>
          <Plus />
          Nuevo gasto fijo
        </Button>
      </div>

      <SpendingAlertBanner alert={spendingAlert} />

      <Tabs value={tab} onValueChange={setTab} className="gap-4 sm:gap-6">
        <TabsList
          className="max-w-full justify-start overflow-x-auto"
          aria-label="Secciones de gastos fijos"
        >
          <TabsTrigger value="forecast">Previsión mensual</TabsTrigger>
          <TabsTrigger value="manage">Mis gastos fijos</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-end sm:px-6">
              <div className="space-y-2 sm:w-48">
                <Label htmlFor="fixed-expenses-period">Mes</Label>
                <Input
                  id="fixed-expenses-period"
                  type="month"
                  value={period}
                  onChange={(event) => {
                    if (event.target.value) {
                      setPeriod(event.target.value)
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1 sm:h-10 sm:flex-none"
                  aria-label="Mes anterior"
                  onClick={() =>
                    setPeriod((current) => shiftPeriod(current, -1))
                  }
                >
                  <ChevronLeft />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  className="h-11 flex-1 sm:h-10 sm:flex-none"
                  aria-label="Mes siguiente"
                  onClick={() =>
                    setPeriod((current) => shiftPeriod(current, 1))
                  }
                >
                  Siguiente
                  <ChevronRight />
                </Button>
              </div>
            </CardContent>
          </Card>

          <FilterBar
            idPrefix="fixed-expenses-forecast"
            search={forecastSearch}
            onSearchChange={setForecastSearch}
            categoryId={forecastCategory}
            onCategoryChange={setForecastCategory}
            status={forecastStatus}
            onStatusChange={setForecastStatus}
            statusOptions={[
              { value: 'ALL', label: 'Todos' },
              { value: 'PENDIENTE', label: 'Pendiente' },
              { value: 'PAGADO', label: 'Pagado' },
            ]}
            categories={expenseCategories}
            hasFilters={hasForecastFilters}
            onClear={clearForecastFilters}
          />

          <Card className="py-0">
            <CardContent className="p-0">
              {projectionsQuery.isPending && (
                <div
                  className="space-y-3 p-4"
                  aria-label="Cargando previsiones"
                >
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="bg-muted h-14 animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              )}

              {projectionsQuery.isError && (
                <div className="space-y-3 p-6" role="alert">
                  <p className="text-destructive text-sm break-words">
                    {getApiErrorMessage(projectionsQuery.error)}
                  </p>
                  <Button
                    variant="outline"
                    className="h-11 w-full sm:h-10 sm:w-auto"
                    onClick={() => void projectionsQuery.refetch()}
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              {!projectionsQuery.isPending &&
                !projectionsQuery.isError &&
                projections.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <CalendarClock className="text-muted-foreground size-10" />
                    <div className="space-y-1">
                      <p className="font-medium">
                        Ningún gasto fijo vence en {formatPeriodLabel(period)}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Cargá tus compromisos recurrentes para verlos acá cada
                        mes.
                      </p>
                    </div>
                    <Button
                      className="h-11 w-full sm:h-10 sm:w-auto"
                      onClick={openCreate}
                    >
                      <Plus />
                      Nuevo gasto fijo
                    </Button>
                  </div>
                )}

              {!projectionsQuery.isPending &&
                !projectionsQuery.isError &&
                projections.length > 0 &&
                filteredProjections.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <CalendarClock className="text-muted-foreground size-10" />
                    <div className="space-y-1">
                      <p className="font-medium">
                        No hay gastos que coincidan con los filtros
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Probá con otro gasto, categoría o estado.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 w-full sm:h-10 sm:w-auto"
                      onClick={clearForecastFilters}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}

              {!projectionsQuery.isPending &&
                !projectionsQuery.isError &&
                filteredProjections.length > 0 && (
                  <>
                    <div className="hidden lg:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Gasto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Vence</TableHead>
                            <TableHead className="text-right">
                              Importe estimado
                            </TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">
                              Acciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProjections.map((projection) => (
                            <TableRow
                              key={`${projection.fixedExpenseId}-${projection.period}`}
                            >
                              <TableCell className="whitespace-normal break-words font-medium">
                                {projection.title}
                              </TableCell>
                              <TableCell className="whitespace-normal break-words">
                                {projection.category.name}
                              </TableCell>
                              <TableCell className="whitespace-nowrap tabular-nums">
                                {formatDateOnly(projection.dueDate)}
                              </TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                                {formatCurrency(
                                  projection.amount,
                                  projection.currency,
                                )}
                              </TableCell>
                              <TableCell>
                                <ProjectionStatusBadge
                                  projection={projection}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {projection.status === 'PENDIENTE' &&
                                    projection.active &&
                                    canPayCurrent && (
                                      <Button
                                        size="sm"
                                        className="h-11 px-3 sm:h-9"
                                        onClick={() =>
                                          setPayingProjection(projection)
                                        }
                                      >
                                        Pagar
                                      </Button>
                                    )}
                                  {projection.status === 'PAGADO' &&
                                    projection.payment && (
                                      <span className="text-muted-foreground self-center text-xs tabular-nums">
                                        {formatCurrency(
                                          projection.payment.amount,
                                          projection.payment.currency,
                                        )}
                                      </span>
                                    )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Ver historial de ${projection.title}`}
                                    onClick={() =>
                                      goToHistory(projection.fixedExpenseId)
                                    }
                                  >
                                    <History />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <ul className="divide-y lg:hidden">
                      {filteredProjections.map((projection) => (
                        <li
                          key={`${projection.fixedExpenseId}-${projection.period}`}
                          className="space-y-3 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium break-words">
                                {projection.title}
                              </p>
                              <p className="text-muted-foreground text-sm break-words">
                                {projection.category.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Vence el {formatDateOnly(projection.dueDate)} ·{' '}
                                {formatFrequencyLabel(
                                  projection.intervalMonths,
                                )}
                              </p>
                            </div>
                            <p className="text-destructive ml-auto shrink-0 text-right font-semibold tabular-nums">
                              −{' '}
                              {formatCurrency(
                                projection.amount,
                                projection.currency,
                              )}
                            </p>
                          </div>

                          <ProjectionStatusBadge projection={projection} />

                          {projection.status === 'PAGADO' &&
                            projection.payment && (
                              <p className="text-muted-foreground text-xs tabular-nums">
                                Pagado{' '}
                                {formatCurrency(
                                  projection.payment.amount,
                                  projection.payment.currency,
                                )}
                              </p>
                            )}

                          <div className="flex gap-2">
                            {projection.status === 'PENDIENTE' &&
                              projection.active &&
                              canPayCurrent && (
                                <Button
                                  className="h-11 flex-1"
                                  onClick={() =>
                                    setPayingProjection(projection)
                                  }
                                >
                                  Pagar
                                </Button>
                              )}
                            <Button
                              variant="outline"
                              className="h-11 flex-1"
                              onClick={() =>
                                goToHistory(projection.fixedExpenseId)
                              }
                            >
                              <History />
                              Historial
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <FilterBar
            idPrefix="fixed-expenses-manage"
            search={manageSearch}
            onSearchChange={setManageSearch}
            categoryId={manageCategory}
            onCategoryChange={setManageCategory}
            status={manageStatus}
            onStatusChange={setManageStatus}
            statusOptions={[
              { value: 'ALL', label: 'Todos' },
              { value: 'ACTIVO', label: 'Activo' },
              { value: 'INACTIVO', label: 'Inactivo' },
            ]}
            categories={expenseCategories}
            hasFilters={hasManageFilters}
            onClear={clearManageFilters}
          />

          <Card className="py-0">
            <CardContent className="p-0">
              {expensesQuery.isPending && (
                <div
                  className="space-y-3 p-4"
                  aria-label="Cargando gastos fijos"
                >
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="bg-muted h-14 animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              )}

              {expensesQuery.isError && (
                <div className="space-y-3 p-6" role="alert">
                  <p className="text-destructive text-sm break-words">
                    {getApiErrorMessage(expensesQuery.error)}
                  </p>
                  <Button
                    variant="outline"
                    className="h-11 w-full sm:h-10 sm:w-auto"
                    onClick={() => void expensesQuery.refetch()}
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              {!expensesQuery.isPending &&
                !expensesQuery.isError &&
                expenses.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <CalendarClock className="text-muted-foreground size-10" />
                    <div className="space-y-1">
                      <p className="font-medium">
                        Todavía no registraste gastos fijos
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Alquiler, servicios, patente… definí cuánto vence, cada
                        cuántos meses y su categoría.
                      </p>
                    </div>
                    <Button
                      className="h-11 w-full sm:h-10 sm:w-auto"
                      onClick={openCreate}
                    >
                      <Plus />
                      Nuevo gasto fijo
                    </Button>
                  </div>
                )}

              {!expensesQuery.isPending &&
                !expensesQuery.isError &&
                expenses.length > 0 &&
                filteredExpenses.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <CalendarClock className="text-muted-foreground size-10" />
                    <div className="space-y-1">
                      <p className="font-medium">
                        No hay gastos que coincidan con los filtros
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Probá con otro gasto, categoría o estado.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 w-full sm:h-10 sm:w-auto"
                      onClick={clearManageFilters}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}

              {!expensesQuery.isPending &&
                !expensesQuery.isError &&
                filteredExpenses.length > 0 && (
                  <>
                    <div className="hidden lg:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Gasto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Frecuencia</TableHead>
                            <TableHead>Próximo vencimiento</TableHead>
                            <TableHead className="text-right">
                              Importe
                            </TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">
                              Acciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell className="whitespace-normal break-words font-medium">
                                {expense.title}
                              </TableCell>
                              <TableCell className="whitespace-normal break-words">
                                {expense.category.name}
                              </TableCell>
                              <TableCell>
                                {formatFrequencyLabel(expense.intervalMonths)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap tabular-nums">
                                {expense.nextDueDate
                                  ? formatDateOnly(expense.nextDueDate)
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                                {formatCurrency(
                                  expense.amount,
                                  expense.currency,
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    expense.active ? 'default' : 'secondary'
                                  }
                                >
                                  {expense.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Editar ${expense.title}`}
                                    onClick={() => openEdit(expense)}
                                  >
                                    <Pencil />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`${
                                      expense.active ? 'Desactivar' : 'Activar'
                                    } ${expense.title}`}
                                    disabled={toggleActiveMutation.isPending}
                                    onClick={() =>
                                      toggleActiveMutation.mutate({
                                        id: expense.id,
                                        active: !expense.active,
                                      })
                                    }
                                  >
                                    <Power />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Ver historial de ${expense.title}`}
                                    onClick={() => goToHistory(expense.id)}
                                  >
                                    <History />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <ul className="divide-y lg:hidden">
                      {filteredExpenses.map((expense) => (
                        <li key={expense.id} className="space-y-3 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium break-words">
                                {expense.title}
                              </p>
                              <p className="text-muted-foreground text-sm break-words">
                                {expense.category.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {formatFrequencyLabel(expense.intervalMonths)} ·{' '}
                                {expense.nextDueDate
                                  ? `próximo: ${formatDateOnly(expense.nextDueDate)}`
                                  : 'inactivo'}
                              </p>
                            </div>
                            <p className="ml-auto shrink-0 text-right font-semibold tabular-nums">
                              {formatCurrency(expense.amount, expense.currency)}
                            </p>
                          </div>

                          <Badge
                            variant={expense.active ? 'default' : 'secondary'}
                          >
                            {expense.active ? 'Activo' : 'Inactivo'}
                          </Badge>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              className="h-11 flex-1"
                              onClick={() => openEdit(expense)}
                            >
                              <Pencil />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              className="h-11 flex-1"
                              disabled={toggleActiveMutation.isPending}
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: expense.id,
                                  active: !expense.active,
                                })
                              }
                            >
                              <Power />
                              {expense.active ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              variant="outline"
                              className="h-11 flex-1"
                              onClick={() => goToHistory(expense.id)}
                            >
                              <History />
                              Historial
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

              {toggleActiveMutation.isError && (
                <p
                  className="text-destructive px-4 py-3 text-sm break-words"
                  role="alert"
                >
                  {getApiErrorMessage(toggleActiveMutation.error)}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FixedExpenseFormDialog
        open={formOpen}
        expense={editingExpense}
        categories={expenseCategories}
        enabledCurrencies={enabledCurrencies}
        defaultCurrency={defaultCurrency}
        onOpenChange={setFormOpen}
        onSaved={invalidateLists}
      />

      <PayFixedExpenseDialog
        open={Boolean(payingProjection)}
        projection={payingProjection}
        enabledPaymentMethods={[...enabledPaymentMethods]}
        onOpenChange={(next) => {
          if (!next) {
            setPayingProjection(null)
          }
        }}
        onSaved={(alert) => {
          setSpendingAlert(alert)
          invalidateLists()
        }}
      />
    </div>
  )
}
