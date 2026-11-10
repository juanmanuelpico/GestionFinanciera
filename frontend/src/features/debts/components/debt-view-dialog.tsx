import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/format'
import { fetchDebt, fetchDebtSettlements } from '../debts-api'
import { debtStatusLabels, type Debt } from '../types'

interface DebtViewDialogProps {
  open: boolean
  debt: Debt | null
  onOpenChange: (open: boolean) => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 text-right font-medium break-words">
        {value}
      </span>
    </div>
  )
}

/**
 * Visualización completa de una deuda: datos, cuotas y cronología de
 * creación / pagos / cobros / liquidación, en solo lectura.
 */
export function DebtViewDialog({
  open,
  debt,
  onOpenChange,
}: DebtViewDialogProps) {
  const isThirdParty = debt?.kind === 'TERCERO'

  const detailQuery = useQuery({
    queryKey: ['debts', 'detail', debt?.id],
    queryFn: () => fetchDebt(debt!.id),
    enabled: open && Boolean(debt),
  })

  const settlementsQuery = useQuery({
    queryKey: ['debts', 'settlements', debt?.id],
    queryFn: () => fetchDebtSettlements(debt!.id),
    enabled: open && Boolean(debt),
  })

  const detail = detailQuery.data
  const settlements = settlementsQuery.data ?? []

  // Fecha de liquidación total: última operación vigente que dejó la deuda sin saldo.
  const settledSettlement =
    detail && detail.paymentProgress === 'FULL'
      ? [...settlements]
          .filter((item) => item.status === 'ACTIVA')
          .sort(
            (a, b) =>
              new Date(b.paymentDate).getTime() -
              new Date(a.paymentDate).getTime(),
          )[0]
      : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-2xl sm:pb-6">
        <DialogHeader className="pr-12">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {debt && (
              <span className="font-mono">{debt.code}</span>
            )}
            <span>{debt?.actor.displayName ?? 'Deuda'}</span>
            {debt && (
              <Badge
                variant={debt.status === 'ACTIVA' ? 'default' : 'outline'}
              >
                {debtStatusLabels[debt.status]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isThirdParty
              ? 'Préstamo que le hiciste a esta persona. Hacé Cobrar para liquidar cuotas.'
              : 'Deuda propia. Hacé Pagar para liquidar cuotas.'}
          </DialogDescription>
        </DialogHeader>

        {(detailQuery.isPending || settlementsQuery.isPending) && (
          <div className="space-y-3" aria-label="Cargando deuda">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="bg-muted h-10 animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {(detailQuery.isError || settlementsQuery.isError) && (
          <div className="space-y-3" role="alert">
            <p className="text-destructive text-sm break-words">
              {getApiErrorMessage(
                detailQuery.error ?? settlementsQuery.error,
              )}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => {
                void detailQuery.refetch()
                void settlementsQuery.refetch()
              }}
            >
              Reintentar
            </Button>
          </div>
        )}

        {open && detail && (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-sm font-medium">Descripción</p>
              <p className="text-sm break-words">
                {detail.note || '—'}
                {detail.splitCode && (
                  <span className="text-muted-foreground">
                    {' '}
                    · división {detail.splitCode}
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <InfoRow
                label="Billetera"
                value={`${detail.currency} · ${formatCurrency(detail.totalAmount, detail.currency)}`}
              />
              <InfoRow
                label={isThirdParty ? 'Cobrado' : 'Pagado'}
                value={formatCurrency(detail.paidAmount, detail.currency)}
              />
              <InfoRow
                label="Restante"
                value={formatCurrency(detail.remainingAmount, detail.currency)}
              />
              <InfoRow
                label={isThirdParty ? 'Cuotas cobradas' : 'Cuotas pagas'}
                value={`${detail.paidInstallments}/${detail.installmentCount}`}
              />
              <InfoRow
                label="Fecha de la operación"
                value={formatDateOnly(detail.operationDate)}
              />
              <InfoRow
                label={`Primer ${isThirdParty ? 'cobro' : 'vencimiento'}`}
                value={formatDateOnly(detail.firstDueDate)}
              />
              {detail.nextDueDate && (
                <InfoRow
                  label={`Próx. ${isThirdParty ? 'cobro' : 'vencimiento'}`}
                  value={formatDateOnly(detail.nextDueDate)}
                />
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Cuotas</p>
              <ul className="divide-y rounded-lg border">
                {detail.installments.map((installment) => (
                  <li
                    key={installment.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm"
                  >
                    <span className="shrink-0 font-medium tabular-nums">
                      Cuota {installment.number}/{detail.installmentCount}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      vto. {formatDateOnly(installment.dueDate)}
                    </span>
                    <span className="ml-auto text-right tabular-nums">
                      {formatCurrency(installment.amount, detail.currency)}
                      {Number(installment.paidAmount) > 0 && (
                        <span className="text-muted-foreground block text-xs">
                          {Number(installment.paidAmount) <
                          Number(installment.amount)
                            ? `${isThirdParty ? 'cobrado' : 'pagado'} ${formatCurrency(installment.paidAmount, detail.currency)}`
                            : installment.paidAt
                              ? `${isThirdParty ? 'cobrada' : 'pagada'} ${formatDateOnly(installment.paidAt)}`
                              : `${isThirdParty ? 'cobrada' : 'pagada'}`}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Historial</p>
              <ol className="space-y-2">
                <li className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="break-words">
                    Deuda creada ({detail.code})
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatDateTime(detail.createdAt)}
                  </span>
                </li>

                {settlements.length === 0 && (
                  <li className="text-muted-foreground px-3 py-1 text-sm">
                    Todavía no hay {isThirdParty ? 'cobros' : 'pagos'}{' '}
                    registrados.
                  </li>
                )}

                {[...settlements]
                  .sort(
                    (a, b) =>
                      new Date(b.paymentDate).getTime() -
                      new Date(a.paymentDate).getTime(),
                  )
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 break-words">
                        {item.status === 'REVERTIDA' ? (
                          <Badge variant="outline">
                            {isThirdParty ? 'Cobro' : 'Pago'} deshecho
                          </Badge>
                        ) : null}{' '}
                        {isThirdParty ? 'Cobro' : 'Pago'} de{' '}
                        {item.items
                          .map((entry) => entry.installmentNumber)
                          .sort((a, b) => a - b)
                          .join(', ')}{' '}
                        ·{' '}
                        <span className="tabular-nums">
                          {formatCurrency(item.totalAmount, item.walletCurrency)}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {formatDateOnly(item.paymentDate)}
                      </span>
                    </li>
                  ))}

                {settledSettlement && (
                  <li className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                    <span className="break-words">
                      {isThirdParty ? 'Cobrada en total' : 'Pagada en total'}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {formatDateOnly(settledSettlement.paymentDate)}
                    </span>
                  </li>
                )}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
