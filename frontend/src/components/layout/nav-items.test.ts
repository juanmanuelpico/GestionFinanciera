import { describe, expect, it } from 'vitest'
import { navItems } from './nav-items'

describe('navItems', () => {
  it('ubica Movimientos justo después del Dashboard', () => {
    expect(navItems.map((item) => item.label)).toEqual([
      'Dashboard',
      'Movimientos',
      'Ahorros',
      'Deudas',
      'Gastos fijos',
      'Categorías',
      'Control de Gastos',
      'Reportes',
      'Chat',
      'Configuración',
    ])
    expect(navItems[1]).toMatchObject({
      to: '/movements',
      label: 'Movimientos',
    })
  })
})
