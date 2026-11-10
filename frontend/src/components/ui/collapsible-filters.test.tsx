import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CollapsibleFilters } from './collapsible-filters'

describe('CollapsibleFilters', () => {
  it('muestra el contenido y el toggle sin filtros activos', () => {
    render(
      <CollapsibleFilters>
        <label htmlFor="campo">Campo</label>
        <input id="campo" />
      </CollapsibleFilters>,
    )

    expect(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument()
    expect(screen.getByLabelText('Campo')).toBeInTheDocument()
  })

  it('abre y cierra el panel desde el botón Filtros', async () => {
    const user = userEvent.setup()
    render(
      <CollapsibleFilters>
        <label htmlFor="campo">Campo</label>
        <input id="campo" />
      </CollapsibleFilters>,
    )

    const toggle = screen.getByRole('button', { name: 'Filtros' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('Campo')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('indica la cantidad de filtros activos en el badge', () => {
    render(
      <CollapsibleFilters activeCount={2}>
        <label htmlFor="campo">Campo</label>
        <input id="campo" />
      </CollapsibleFilters>,
    )

    expect(
      screen.getByLabelText('2 filtros activos'),
    ).toBeInTheDocument()
  })
})
