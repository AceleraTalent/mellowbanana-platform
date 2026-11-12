// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VistaEstrategia } from './estrategia'

describe('VistaEstrategia', () => {
  it('el diagnóstico pone el insight adelante, numera los diferenciales y cierra con el rumbo', () => {
    render(<VistaEstrategia etapa="diagnostico" content={{ problema: 'p', insight: 'El insight', ventaja: 'v', diferenciales: ['uno', 'dos'], rumbo: 'Hacia una marca de autor' }} />)
    expect(screen.getByText('Insight')).toBeTruthy()
    expect(screen.getByText('El insight')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Atributos diferenciales' })).toBeTruthy()
    expect(screen.getByText('dos')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Hacia dónde vamos' })).toBeTruthy()
    expect(screen.getByText('Hacia una marca de autor')).toBeTruthy()
  })

  it('un diagnóstico de antes del listado de entregables, sin rumbo, se sigue leyendo', () => {
    render(<VistaEstrategia etapa="diagnostico" content={{ problema: 'p', insight: 'i', ventaja: 'v', diferenciales: ['uno'] }} />)
    expect(screen.queryByRole('heading', { name: 'Hacia dónde vamos' })).toBeNull()
    expect(screen.getByText('uno')).toBeTruthy()
  })

  it('el consumidor trae perfil, motivaciones, tensiones y cómo pertenece al grupo', () => {
    render(<VistaEstrategia etapa="consumidor" content={{
      metodologia: 'Jobs to be done', perfil: 'Profesionales de 30 a 45', motivaciones: ['Verse al día'],
      tensiones: ['Le falta tiempo'], pertenencia: 'Se reconoce en lo que recomienda', frases: ['“Quiero algo mío”'],
    }} />)
    expect(screen.getByRole('heading', { name: 'Perfil' })).toBeTruthy()
    expect(screen.getByText('Motivaciones y necesidades')).toBeTruthy()
    expect(screen.getByText('Le falta tiempo')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Cómo pertenece al grupo' })).toBeTruthy()
    expect(screen.getByText('Quiero algo mío')).toBeTruthy()
  })

  it('el naming lista las propuestas con su racional y marca la recomendada', () => {
    render(<VistaEstrategia etapa="naming" content={{
      propuestas: [{ nombre: 'Alba', racional: 'Lo que empieza' }, { nombre: 'Norte', racional: 'Lo que guía' }],
      recomendado: 'norte',
    }} />)
    expect(screen.getByText('Alba')).toBeTruthy()
    expect(screen.getByText('Lo que guía')).toBeTruthy()
    expect(screen.getAllByText('Recomendado')).toHaveLength(1)
  })

  it('los copies van por entregable, con sus especificaciones', () => {
    render(<VistaEstrategia etapa="copies" content={{
      entregables: [{ entregable: 'Empaque', especificaciones: 'Cara frontal, 12 palabras', copies: ['Hecho despacio', 'Para compartir'] }],
    }} />)
    expect(screen.getByText('Empaque')).toBeTruthy()
    expect(screen.getByText('Cara frontal, 12 palabras')).toBeTruthy()
    expect(screen.getByText('Para compartir')).toBeTruthy()
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
