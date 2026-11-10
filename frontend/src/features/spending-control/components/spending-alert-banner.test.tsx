import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SpendingAlertBanner } from './spending-alert-banner'
import type { SpendingAlert } from '../types'

const baseAlert: SpendingAlert = {
  categoryId: 1,
  categoryName: 'Alimentos',
  currency: 'ARS',
  period: '2026-11',
  thresholdAmount: '100000.00',
  spentAmount: '84000.00',
  percent: 84,
  status: 'WARNING',
}

describe('SpendingAlertBanner', () => {
  it('no renderiza sin alerta', () => {
    const { container } = render(<SpendingAlertBanner alert={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('avisa al alcanzar el 80 % del umbral', () => {
    render(<SpendingAlertBanner alert={baseAlert} />)

    expect(
      screen.getByText('Vas por el 84 % del umbral de «Alimentos»'),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('text-warning')
  })

  it('marca el exceso del umbral en rojo', () => {
    render(
      <SpendingAlertBanner
        alert={{
          ...baseAlert,
          percent: 100,
          spentAmount: '100000.00',
          status: 'EXCEEDED',
        }}
      />,
    )

    expect(
      screen.getByText('Superaste el umbral de «Alimentos»'),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('text-destructive')
  })
})
