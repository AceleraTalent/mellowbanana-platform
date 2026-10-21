// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PanelMovil } from './PanelMovil'

describe('PanelMovil', () => {
  it('arranca cerrado y abre el menú al tocarlo', () => {
    render(<PanelMovil><p>Barra del panel</p></PanelMovil>)
    const boton = screen.getByRole('button', { name: 'Abrir el menú' })
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Barra del panel')).toBeNull()
    fireEvent.click(boton)
    expect(screen.getByText('Barra del panel')).toBeTruthy()
  })

  it('Escape lo cierra', () => {
    render(<PanelMovil><p>Barra del panel</p></PanelMovil>)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Barra del panel')).toBeNull()
  })
})
