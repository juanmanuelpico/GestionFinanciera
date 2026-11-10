import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Clock,
  PiggyBank,
  ReceiptText,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import { currencyNames } from '@/features/savings/types'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/types/finance'
import { DashboardStatCard } from '../components/dashboard-stat-card'
import { DollarQuotesStrip } from '../components/dollar-quotes-strip'
import { fetchDashboardSummary } from '../dashboard-api'

export function DashboardPage() {
  const preferences = usePreferencesQuery()
  const sections = preferences.data?.dashboardSections ?? []
  const summary = useQuery({
    queryKey: ['dashboard', 'summary', sections.join(',')],
    queryFn: fetchDashboardSummary,
    enabled: preferences.isSuccess,
  })

  const data = summary.data
  const isLoading = preferences.isPending || summary.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de tu situación financiera.
        </p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm" role="status">
              Cargando resumen…
            </p>
          </CardContent>
        </Card>
      )}

      {summary.isError && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-destructive text-sm break-words" role="alert">
              No pudimos cargar el resumen del Dashboard.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => void summary.refetch()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.sections.length === 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-muted-foreground text-sm">
              No elegiste ninguna sección para mostrar en el Dashboard.
            </p>
            <Button asChild variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
              <Link to="/settings">Elegir secciones</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.sections.includes('dollarQuotes') && (
        <DollarQuotesStrip quotes={data.dollarQuotes} />
      )}

      {data?.savings && <SavingsSection data={data.savings} />}

      {data?.fixedExpenses && (
        <section aria-labelledby="dashboard-fixed-expenses-title" className="space-y-3">
          <h2
            id="dashboard-fixed-expenses-title"
            className="text-lg font-semibold"
          >
            Gastos fijos del mes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStatCard
              label="Pagados"
              value={data.fixedExpenses.paid}
              icon={ReceiptText}
              zeroMessage="Todavía no pagaste ninguno."
            />
            <DashboardStatCard
              label="Pendientes"
              value={data.fixedExpenses.pending}
              icon={CalendarClock}
              zeroMessage="Pagaste todos tus gastos fijos del mes."
            />
            <DashboardStatCard
              label="Vencidos"
              value={data.fixedExpenses.overdue}
              icon={AlertTriangle}
              zeroMessage="Ninguno vencido."
            />
            <DashboardStatCard
              label="A vencer (3 días o menos)"
              value={data.fixedExpenses.dueSoon}
              icon={Clock}
              zeroMessage="Ninguno por vencer."
            />
          </div>
        </section>
      )}

      {data?.myDebts && (
        <section aria-labelledby="dashboard-my-debts-title" className="space-y-3">
          <h2 id="dashboard-my-debts-title" className="text-lg font-semibold">
            Mis deudas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStatCard
              label="Personas a las que les debés"
              value={data.myDebts.peopleOwed}
              icon={Users}
              zeroMessage="No le debés a nadie."
            />
            <DashboardStatCard
              label="Personas con deuda activa"
              value={data.myDebts.peopleWithActiveDebt}
              icon={Wallet}
              zeroMessage="No tenés personas con deuda activa."
            />
            <DashboardStatCard
              label="Deudas vencidas"
              value={data.myDebts.overdueDebts}
              icon={AlertTriangle}
              zeroMessage="No tenés deudas vencidas."
            />
            <DashboardStatCard
              label="Cuotas vencidas"
              value={data.myDebts.overdueInstallments}
              icon={Clock}
              zeroMessage="No tenés cuotas vencidas."
            />
          </div>
        </section>
      )}

      {data?.thirdPartyDebts && (
        <section
          aria-labelledby="dashboard-third-party-debts-title"
          className="space-y-3"
        >
          <h2
            id="dashboard-third-party-debts-title"
            className="text-lg font-semibold"
          >
            Deudas de terceros
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStatCard
              label="Personas que te deben"
              value={data.thirdPartyDebts.peopleWhoOwe}
              icon={Users}
              zeroMessage="Nadie te debe dinero."
            />
            <DashboardStatCard
              label="Personas con vencimientos impagos"
              value={data.thirdPartyDebts.peopleWithOverdue}
              icon={AlertTriangle}
              zeroMessage="Nadie tiene vencimientos impagos."
            />
            <DashboardStatCard
              label="Deudas activas"
              value={data.thirdPartyDebts.activeDebts}
              icon={CircleDollarSign}
              zeroMessage="No tenés deudas de terceros activas."
            />
            <DashboardStatCard
              label="Cuotas vencidas"
              value={data.thirdPartyDebts.overdueInstallments}
              icon={Clock}
              zeroMessage="No tenés cuotas vencidas."
            />
          </div>
        </section>
      )}
    </div>
  )
}

function SavingsSection({
  data,
}: {
  data: {
    enabledCurrencies: Currency[]
    amounts: Record<Currency, number>
  }
}) {
  const hasAny = data.enabledCurrencies.some(
    (currency) => data.amounts[currency] > 0,
  )

  return (
    <section aria-labelledby="dashboard-savings-title" className="space-y-3">
      <h2 id="dashboard-savings-title" className="text-lg font-semibold">
        Ahorros
      </h2>

      {hasAny ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.enabledCurrencies.map((currency) => {
            const amount = data.amounts[currency] ?? 0
            return (
              <Card key={currency}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="min-w-0 text-sm font-medium">
                    Ahorros en {currencyNames[currency]}
                  </CardTitle>
                  <PiggyBank
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold tabular-nums break-words sm:text-2xl">
                    {formatCurrency(String(amount), currency)}
                  </p>
                  {amount === 0 && (
                    <p className="text-success mt-1 text-xs">Sin ahorros.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-success text-sm">Todavía no registraste ahorros.</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
