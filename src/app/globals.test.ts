import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const css = readFileSync(path.resolve(__dirname, './globals.css'), 'utf8')

describe('tokens del panel', () => {
  it('define los tokens del rediseño con los valores del spec', () => {
    for (const [token, valor] of [
      ['--banana', '#fcf251'],
      ['--ink', '#15120C'],
      ['--papel', '#F6F4EE'],
      ['--line', '#E2DED3'],
      ['--aprobado', '#FEFBCE'],
      ['--superficie', '#EFECE4'],
      ['--error', '#B3261E'],
    ]) {
      expect(css).toContain(`${token}: ${valor}`)
    }
  })

  it('conserva --cream, que sigue usando la entrevista pública', () => {
    expect(css).toContain('--cream')
  })

  it('conserva el bloque de prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
