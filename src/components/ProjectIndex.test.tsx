// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectIndex, type SistemaDelProyecto } from './ProjectIndex'

// La cabecera y el marcador de fases manuales usan el router para refrescar; acá sólo se
// rinden, así que alcanza el stub, igual que en los tests de los workspaces.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }))
import type { FaseIndice } from '@/lib/pipeline/indice'

const L = '/admin/projects/p1/landscape'

const fases: FaseIndice[] = [
  {
    key: 'propuesta-valor', label: 'Taller', avance: 'Se trabaja en Miro',
    entradas: [
      { key: 'entrevistas', label: 'Entrevistas', href: '/admin/projects/p1/entrevistas', estado: 'aprobada', espera: false },
      { key: 'propuesta', label: 'Propuesta de valor', href: '/admin/projects/p1/propuesta', estado: 'aprobada', espera: false },
      { key: 'taller', label: 'Taller en Miro', href: '/admin/projects/p1/taller', estado: 'pendiente', espera: false },
    ],
  },
  {
    key: 'landscape', label: 'Landscape', avance: '2/6',
    entradas: [
      { key: 'landscape:setup', label: 'Enfoque', href: `${L}?etapa=setup`, estado: 'actual', espera: false },
      { key: 'landscape:contexto', label: 'Contexto del sector', href: `${L}?etapa=contexto`, estado: 'aprobada', espera: false },
      { key: 'landscape:panorama', label: 'Panorama de categoría', href: `${L}?etapa=panorama`, estado: 'pendiente', espera: true },
    ],
  },
  {
    key: 'estrategia', label: 'Estrategia', avance: '0/14',
    entradas: [
      { key: 'estrategia:diagnostico', label: 'Diagnóstico', href: '/admin/projects/p1/estrategia?etapa=diagnostico', estado: 'pendiente', bloque: 'Diagnóstico y consumidor', espera: false },
      { key: 'estrategia:personalidad', label: 'Personalidad', href: '/admin/projects/p1/estrategia?etapa=personalidad', estado: 'pendiente', espera: true },
    ],
  },
]

const sistema: SistemaDelProyecto = {
  fases: [
    { key: 'taller', label: 'Taller', estado: 'completa', detalle: 'Taller hecho' },
    { key: 'landscape', label: 'Landscape', estado: 'en_curso', detalle: '3 de 13 pasos', avance: '3/13' },
    { key: 'naming', label: 'Naming', estado: 'pendiente', detalle: 'Sin empezar' },
    { key: 'estrategia', label: 'Estrategia', estado: 'pendiente', detalle: 'Sin empezar', avance: '0/14' },
    { key: 'diseno', label: 'Diseño', estado: 'pendiente', detalle: 'Sin empezar' },
  ],
  actual: 'landscape',
  sigue: { quien: 'claude', texto: 'Le toca a Claude', detalle: 'Lista larga de tendencias', href: `${L}?paso=3.1` },
  pasos: [
    { id: '1.0', titulo: 'Enfoque del estudio', estado: 'hecho' },
    { id: '1.1', titulo: 'Carpeta y deck en Dropbox', estado: 'pendiente' },
    { id: '2.1', titulo: 'Fuentes del sector', estado: 'hecho' },
    { id: '2.2', titulo: 'Contexto del sector', estado: 'hecho' },
  ],
}

const menu = (props: Partial<Parameters<typeof ProjectIndex>[0]> = {}) =>
  render(<ProjectIndex projectId="p1" nombre="Café Lunar" subtitulo="Landscape · 3 de 13 pasos" fases={fases} sistema={sistema} {...props} />)

describe('ProjectIndex', () => {
  it('muestra el nombre del proyecto y su subtítulo', () => {
    menu()
    expect(screen.getByText('Café Lunar')).toBeTruthy()
    expect(screen.getByText('Landscape · 3 de 13 pasos')).toBeTruthy()
  })

  it('lista las cinco fases del Sistema M&B, en orden y con su avance', () => {
    const { container } = menu()
    const fasesEnOrden = [...container.querySelectorAll('ol > li')].map(li => li.textContent)
    expect(fasesEnOrden).toHaveLength(5)
    expect(fasesEnOrden[0]).toMatch(/^Taller.*Listo/)
    expect(fasesEnOrden[1]).toMatch(/^2Landscape3\/13/)
    expect(fasesEnOrden[2]).toMatch(/^3Naming.*Sin empezar/)
    expect(fasesEnOrden[3]).toMatch(/^4Estrategia0\/14/)
    expect(fasesEnOrden[4]).toMatch(/^5Diseño.*Sin empezar/)
  })

  it('abre sólo la fase en la que uno está parado', () => {
    menu()
    expect(screen.getByRole('link', { name: /Contexto del sector/ })).toBeTruthy()
    // Las etapas de las fases cerradas no se listan.
    expect(screen.queryByRole('link', { name: /Personalidad/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Entrevistas/ })).toBeNull()
  })

  it('una fase cerrada lleva a lo primero que falta en ella', () => {
    menu()
    expect(screen.getByRole('link', { name: /Estrategia/ }).getAttribute('href')).toBe('/admin/projects/p1/estrategia')
  })

  it('marca la etapa actual con aria-current="page" y sólo esa: los pasos no se listan', () => {
    menu()
    const actuales = screen.getAllByRole('link').filter(a => a.getAttribute('aria-current') === 'page')
    expect(actuales).toHaveLength(1)
    expect(actuales[0].textContent).toMatch(/^Enfoque/)
    expect(screen.queryByText('Carpeta y deck en Dropbox')).toBeNull()
  })

  it('cada sección del Landscape se ve lista por sus pasos, sin cuenta de pasos', () => {
    menu({ fases: fases.map(f => ({ ...f, entradas: f.entradas.map(e => ({ ...e, estado: e.estado === 'actual' ? 'pendiente' as const : e.estado })) })), enResumen: true })
    // Contexto: sus dos pasos listos. Enfoque: le falta la carpeta, aunque la etapa estuviera aprobada.
    const contexto = screen.getByRole('link', { name: /Contexto del sector/ })
    expect(contexto.querySelector('svg path')).toBeTruthy()
    expect(contexto.textContent).not.toContain('2/2')
    expect(screen.getByRole('link', { name: /^Enfoque/ }).querySelector('svg path')).toBeNull()
  })

  it('la etapa que espera al equipo lo marca con el punto banana y además lo dice', () => {
    menu()
    const panorama = screen.getByRole('link', { name: /Panorama/ })
    expect(panorama.querySelector('span.bg-\\[var\\(--banana\\)\\]')).toBeTruthy()
    expect(panorama.textContent).toContain('Espera al equipo')
  })

  it('fuera del Landscape, dice qué sigue, con el mismo chip del inicio, y lleva ahí', () => {
    menu({ fases: fases.map(f => ({ ...f, entradas: f.entradas.map(e => ({ ...e, estado: e.key === 'propuesta' ? 'actual' as const : e.estado === 'actual' ? 'pendiente' as const : e.estado })) })) })
    const sigue = screen.getByRole('link', { name: /Lo que sigue/ })
    expect(sigue.textContent).toContain('Le toca a Claude')
    expect(sigue.textContent).toContain('Lista larga de tendencias')
    expect(sigue.getAttribute('href')).toBe(`${L}?paso=3.1`)
  })

  it('en cualquier sección del Landscape no repite lo que sigue: la página abre con eso', () => {
    // Se está en Enfoque y lo que sigue es de Tendencias: es la misma página.
    menu()
    expect(screen.queryByText('Lo que sigue')).toBeNull()
  })

  it('en el resumen marca “Resumen” y abre la fase en curso del Sistema', () => {
    const sinActiva = fases.map(f => ({ ...f, entradas: f.entradas.map(e => ({ ...e, estado: e.estado === 'actual' ? 'pendiente' as const : e.estado })) }))
    menu({ fases: sinActiva, enResumen: true })
    const resumen = screen.getByRole('link', { name: 'Resumen' })
    expect(resumen.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /Contexto del sector/ })).toBeTruthy()
    // “Nos toca”, en el cuerpo del resumen, ya arranca con lo que sigue.
    expect(screen.queryByText('Lo que sigue')).toBeNull()
  })

  it('naming y diseño no tienen pantalla: se abren para marcar en qué van', () => {
    menu()
    expect(screen.getByRole('radiogroup', { name: 'En qué va Naming' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'En qué va Diseño' })).toBeTruthy()
  })

  it('el taller que el equipo cerró se ve hecho aunque la plataforma no lo vea', () => {
    menu({ fases: fases.map(f => f.key === 'propuesta-valor' ? f : { ...f, entradas: f.entradas.map(e => ({ ...e, estado: 'pendiente' as const })) }), enResumen: true, sistema: { ...sistema, actual: 'taller' } })
    const taller = screen.getByRole('link', { name: /Taller en Miro/ })
    expect(taller.querySelector('svg path')).toBeTruthy()
  })

  it('muestra el rótulo del bloque cuando la fase está abierta', () => {
    menu({ sistema: { ...sistema, actual: 'estrategia' }, fases: fases.map(f => ({ ...f, entradas: f.entradas.map(e => ({ ...e, estado: e.key === 'estrategia:diagnostico' ? 'actual' as const : e.estado === 'actual' ? 'pendiente' as const : e.estado })) })) })
    expect(screen.getByText('Diagnóstico y consumidor')).toBeTruthy()
  })

  it('sin el Sistema, cae a las tres fases del índice', () => {
    const { container } = menu({ sistema: undefined })
    expect(container.querySelectorAll('ol > li')).toHaveLength(3)
    expect(screen.queryByText('Lo que sigue')).toBeNull()
  })
})
