// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VistaEstrategia } from './estrategia'

describe('VistaEstrategia', () => {
  it('el diagnóstico pone el insight adelante y numera los diferenciales', () => {
    render(<VistaEstrategia etapa="diagnostico" content={{ problema: 'p', insight: 'El insight', ventaja: 'v', diferenciales: ['uno', 'dos'] }} />)
    expect(screen.getByText('Insight')).toBeTruthy()
    expect(screen.getByText('El insight')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Diferenciales/ })).toBeTruthy()
    expect(screen.getByText('dos')).toBeTruthy()
  })

  it('los valores van con su validación', () => {
    render(<VistaEstrategia etapa="valores" content={{ items: [{ valor: 'Apertura', validacion: 'Lo piden todas las entrevistas.' }] }} />)
    expect(screen.getByText('Apertura')).toBeTruthy()
    expect(screen.getByText('Lo piden todas las entrevistas.')).toBeTruthy()
  })

  it('la personalidad que se genera desde las entrevistas también se lee', () => {
    render(<VistaEstrategia etapa="personalidad" content={{ arquetipo: 'Explorador', atributos: ['Madura'], tensiones: ['Género'], queNoQuiereSer: ['Un boat show'] }} />)
    expect(screen.getByText('Explorador')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Tensiones por resolver/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Lo que no quiere ser/ })).toBeTruthy()
  })

  it('los cuadros finales se leen como fichas, con el nombre del campo legible', () => {
    render(<VistaEstrategia etapa="cuadros" content={{ brandEssence: { brandIdeal: 'Que el país mire al mar' }, consumidor: { que_busca: 'Negocios' } }} />)
    expect(screen.getByText('Brand ideal')).toBeTruthy()
    expect(screen.getByText('Que busca')).toBeTruthy()
  })

  it('lo que ninguna vista conoce no se pierde: va en “Más información”', () => {
    render(<VistaEstrategia etapa="tagline" content={{ texto: 'Donde el mar hace negocio.', alternativas: ['Otra opción'] }} />)
    expect(screen.getByText('Donde el mar hace negocio.')).toBeTruthy()
    expect(screen.getByText('Más información')).toBeTruthy()
    expect(screen.getByText('Otra opción')).toBeTruthy()
  })
})
