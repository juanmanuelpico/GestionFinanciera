import { useMutation, useQuery } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDateOnly } from '@/lib/format'
import { fetchDebtSettlements, reverseDebtSettlement } from '../debts-api'
import type { Debt, DebtSettlement } from '../types'

interface DebtReversalDialogProps {
  open: boolean
  debt: Debt | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function settlementCuotas(settlement: DebtSettlement): string {
  const numbers = settlement.items.map((item) => item.installmentNumber)
  return `Cuota${numbers.length === 1 ? '' : 's'} ${numbers.join(', ')}`
}

export function DebtReversalDialog({
  open,
  debt,
  onOpenChange,
  onSaved,
}: DebtReversalDialogProps) {
  const [confirming, setConfirming] = useState<DebtSettlement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const settlementsQuery = useQuery({
    queryKey: ['debts', 'settlements', debt?.id],
    queryFn: () => fetchDebtSettlements(debt!.id),
    enabled: open && Boolean(debt),
  })

  const mutation = useMutation({
    mutationFn: (settlementId: string) =>
      reverseDebtSettlement(debt!.id, settlementId),
    onSuccess: () => {
      setConfirming(null)
      setError(null)
      onSaved()
      void settlementsQuery.refetch()
    },
    onError: (mutationError) => setError(getApiErrorMessage(mutationError)),
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirming(null)
      setError(null)
      mutation.reset()
    }
    onOpenChange(next)
  }

  const settlements = settlementsQuery.data ?? []
  const isCollection = debt?.kind === 'TERCERO'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-xl sm:pb-6">
        <DialogHeader className="pr-12">
          <DialogTitle>
            Deshacer cobros y pagos — {debt?.code} · {debt?.actor.displayName}
          </DialogTitle>
          <DialogDescription>
            Elegí la operación que querés revertir. Se crean movimientos
            inversos y las cuotas vuelven a quedar pendientes. El historial
            original se conserva.
          </DialogDescription>
        </DialogHeader>

        {settlementsQuery.isPending && (
          <div className="space-y-3" aria-label="Cargando operaciones">
            {[0, 1].map((item) => (
              <div key={item} className="bg-muted h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {settlementsQuery.isError && (
          <div className="space-y-3" role="alert">
            <p className="text-destructive text-sm break-words">
              {getApiErrorMessage(settlementsQuery.error)}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => void settlementsQuery.refetch()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {!settlementsQuery.isPending &&
          !settlementsQuery.isError &&
          settlements.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Esta deuda todavía no tiene cobros ni pagos para deshacer.
            </p>
          )}

        {settlements.length > 0 && !confirming && (
          <ul className="divide-y">
            {settlements.map((settlement) => (
              <li key={settlement.id} className="space-y-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words">
                      {isCollection ? 'Cobro' : 'Pago'} de{' '}
                      {settlement.installmentCount}{' '}
                      {settlement.installmentCount === 1 ? 'cuota' : 'cuotas'}
                    </p>
                    <p className="text-muted-foreground text-xs break-words">
                      {settlementCuotas(settlement)} ·{' '}
                      {formatDateOnly(settlement.paymentDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium whitespace-nowrap tabular-nums">
                      {formatCurrency(settlement.totalAmount, debt!.currency)}
                    </span>
                    {settlement.status === 'ACTIVA' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 min-w-11 sm:h-9"
                        onClick={() => {
                          setError(null)
                          setConfirming(settlement)
                        }}
                      >
                        <Undo2 />
                        Deshacer
                      </Button>
                    ) : (
                      <Badge variant="secondary">Deshecha</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {settlements.length > 0 && !confirming && (
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => handleOpenChange(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        )}

        {confirming && (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">
              ¿Deshacer {isCollection ? 'el cobro' : 'el pago'} de{' '}
              {formatCurrency(confirming.totalAmount, debt!.currency)}?
            </p>
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li>· {settlementCuotas(confirming)}</li>
              <li>
                · Se genera {confirming.items.length === 1 ? 'un movimiento inverso' : `${confirming.items.length} movimientos inversos`}{' '}
                de tipo {isCollection ? 'egreso' : 'ingreso'}.
              </li>
              <li>· Las cuotas vuelven a quedar pendientes.</li>
              {isCollection && (
                <li>
                  · Se validará tener saldo suficiente en la billetera{' '}
                  {debt!.currency} para la reversa.
                </li>
              )}
            </ul>

            {error && (
              <p className="text-destructive text-sm break-words" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                disabled={mutation.isPending}
                onClick={() => setConfirming(null)}
              >
                Volver
              </Button>
              <Button
                className="h-11 w-full sm:h-10 sm:w-auto"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(confirming.id)}
              >
                {mutation.isPending ? 'Desaciendo…' : 'Confirmar reversa'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
