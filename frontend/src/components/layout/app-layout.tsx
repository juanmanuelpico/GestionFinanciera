import { useEffect, useRef } from 'react'
import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/lib/utils'
import { AvailableBalance } from './available-balance'
import { navItems } from './nav-items'
import { Sidebar } from './sidebar'
import { WalletSelector } from './wallet-selector'

export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)

  // En mobile la nav horizontal tiene más ítems que los que entran en pantalla;
  // al entrar directo a una ruta (deep link, back) el ítem activo puede nacer
  // fuera del área visible. Lo traemos al viewport de la barra sin mover la
  // página (block: 'nearest'). En md+ la barra está oculta: es un no-op.
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="page"]')
    if (active instanceof HTMLElement) {
      active.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    }
  }, [location.pathname])

  const handleLogout = () => {
    void logout().finally(() => navigate('/login', { replace: true }))
  }

  return (
    <div className="bg-muted/40 flex min-h-svh">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background flex min-h-16 flex-wrap items-center gap-2 border-b px-4 py-2 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0">
          <div className="text-primary flex shrink-0 items-center gap-2 font-semibold md:hidden">
            Finanzas
          </div>

          <div className="hidden lg:block lg:flex-1" aria-hidden="true" />

          <div className="order-last flex w-full min-w-0 justify-center lg:order-none lg:w-auto lg:flex-1">
            <AvailableBalance />
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4 lg:ml-0 lg:flex-1 lg:justify-end">
            <WalletSelector />
            <div className="hidden min-w-0 text-right xl:block">
              <p className="truncate text-sm font-medium" title={user?.name}>
                {user?.name}
              </p>
              <p
                className="text-muted-foreground truncate text-xs"
                title={user?.email}
              >
                {user?.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Salir"
              className="size-11 shrink-0 sm:h-9 sm:w-auto"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <nav ref={navRef} className="bg-background flex gap-2 overflow-x-auto border-b px-2 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
