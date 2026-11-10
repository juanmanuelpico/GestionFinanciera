import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { fetchAvailable } from '@/features/savings/savings-api'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import type { Currency } from '@/types/finance'
import { ActorsTab } from '../components/actors-tab'
import { ActorFormDialog } from '../components/actor-form-dialog'
import { DebtFormDialog } from '../components/debt-form-dialog'
import { DebtSplitsTab } from '../components/debt-splits-tab'
import { DebtsTab } from '../components/debts-tab'
import { SplitExpenseDialog } from '../components/split-expense-dialog'
import type { DebtKind } from '../types'

type TabValue = 'propias' | 'terceros' | 'actores' | 'division'

const TAB_VALUES: TabValue[] = ['propias', 'terceros', 'actores', 'division']

function toTabValue(value: string | null): TabValue {
  return TAB_VALUES.includes(value as TabValue)
    ? (value as TabValue)
    : 'propias'
}

export function DebtsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = toTabValue(searchParams.get('tab'))

  const preferences = usePreferencesQuery()
  const enabledCurrencies: Currency[] =
    preferences.data?.enabledCurrencies ?? ['ARS']

  const availableQuery = useQuery({
    queryKey: ['savings', 'available'],
    queryFn: fetchAvailable,
    enabled: preferences.isSuccess,
  })

  const [debtFormKind, setDebtFormKind] = useState<DebtKind | null>(null)
  const [actorFormOpen, setActorFormOpen] = useState(false)
  const [splitFormOpen, setSplitFormOpen] = useState(false)

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'propias' ? {} : { tab: value })
  }

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['debts'] })
    void queryClient.invalidateQueries({ queryKey: ['debt-actors'] })
    void queryClient.invalidateQueries({ queryKey: ['debt-splits'] })
    void queryClient.invalidateQueries({ queryKey: ['savings'] })
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
  }

  const openCreate = () => {
    if (activeTab === 'actores') {
      setActorFormOpen(true)
      return
    }

    if (activeTab === 'division') {
      setSplitFormOpen(true)
      return
    }

    setDebtFormKind(activeTab === 'terceros' ? 'TERCERO' : 'PROPIA')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deudas</h1>
          <p className="text-muted-foreground">
            Gestioná préstamos recibidos, compras en cuotas y dinero prestado.
          </p>
        </div>
        <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={openCreate}>
          <Plus />
          Agregar
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="gap-4 sm:gap-6"
      >
        <TabsList
          className="max-w-full justify-start overflow-x-auto"
          aria-label="Secciones de deudas"
        >
          <TabsTrigger value="propias">Deudas Propias</TabsTrigger>
          <TabsTrigger value="terceros">Deudas de Terceros</TabsTrigger>
          <TabsTrigger value="division">División de Gastos</TabsTrigger>
          <TabsTrigger value="actores">Actores</TabsTrigger>
        </TabsList>

        <TabsContent value="propias">
          <DebtsTab
            kind="PROPIA"
            enabledCurrencies={enabledCurrencies}
            onGoToActors={() => handleTabChange('actores')}
          />
        </TabsContent>

        <TabsContent value="terceros">
          <DebtsTab
            kind="TERCERO"
            enabledCurrencies={enabledCurrencies}
            onGoToActors={() => handleTabChange('actores')}
          />
        </TabsContent>

        <TabsContent value="division">
          <DebtSplitsTab onChanged={invalidateAll} />
        </TabsContent>

        <TabsContent value="actores">
          <ActorsTab enabledCurrencies={enabledCurrencies} />
        </TabsContent>
      </Tabs>

      <DebtFormDialog
        open={debtFormKind !== null}
        kind={debtFormKind ?? 'PROPIA'}
        enabledCurrencies={enabledCurrencies}
        available={availableQuery.data}
        onOpenChange={(next) => {
          if (!next) setDebtFormKind(null)
        }}
        onSaved={invalidateAll}
      />

      <ActorFormDialog
        open={actorFormOpen}
        actor={null}
        enabledCurrencies={enabledCurrencies}
        onOpenChange={setActorFormOpen}
        onSaved={invalidateAll}
      />

      <SplitExpenseDialog
        open={splitFormOpen}
        enabledCurrencies={enabledCurrencies}
        available={availableQuery.data}
        onOpenChange={setSplitFormOpen}
        onSaved={invalidateAll}
      />
    </div>
  )
}
