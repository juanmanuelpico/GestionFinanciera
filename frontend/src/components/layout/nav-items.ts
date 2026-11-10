import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  Coins,
  HandCoins,
  LayoutDashboard,
  MessageCircle,
  PiggyBank,
  Settings,
  Tags,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movements', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/savings', label: 'Ahorros', icon: Coins },
  { to: '/debts', label: 'Deudas', icon: HandCoins },
  { to: '/fixed-expenses', label: 'Gastos fijos', icon: CalendarClock },
  { to: '/categories', label: 'Categorías', icon: Tags },
  { to: '/budgets', label: 'Control de Gastos', icon: PiggyBank },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/settings', label: 'Configuración', icon: Settings },
]
