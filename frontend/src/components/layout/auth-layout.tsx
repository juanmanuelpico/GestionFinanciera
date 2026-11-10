import { Wallet } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-primary text-primary-foreground hidden flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="size-6" />
          Gestión Financiera
        </div>

        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Todas tus finanzas, en un solo lugar.
          </h1>
          <p className="text-primary-foreground/80">
            Cuentas, movimientos, presupuestos y reportes. Una base sólida para
            administrar tu dinero con claridad.
          </p>
        </div>

        <p className="text-primary-foreground/60 text-sm">
          Scaffold listo para incorporar los casos de uso.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-sm">
          <div className="text-primary mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <Wallet className="size-5" />
            Finanzas
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
