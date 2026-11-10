import { Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { navItems } from './nav-items'

export function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 border-r md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6 text-lg font-semibold">
        <Wallet className="text-primary size-5" />
        Finanzas
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="text-muted-foreground border-t p-4 text-xs">
        v0.1.0 · Entorno de desarrollo
      </div>
    </aside>
  )
}
