// Compila la guía de uso del equipo (docs/guia-equipo/guia-src.html) incrustando
// ABC Favorit como base64. El fuente lleva los marcadores __FAVORIT_B64__ y
// __MONO_B64__; las OTF viven en docs/design/ (ignorado por git: licencia del
// estudio). Salidas, también ignoradas: docs/guia-equipo/out/
//   artifact.html   — para publicar como artefacto de claude.ai (sin doctype/body)
//   standalone.html — archivo suelto que se abre en el navegador
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const fuentes = join(raiz, 'docs/design/ABC Favorit')
const src = join(raiz, 'docs/guia-equipo/guia-src.html')
const out = join(raiz, 'docs/guia-equipo/out')

const b64 = f => readFileSync(join(fuentes, f)).toString('base64')
let h = readFileSync(src, 'utf8')
  .replace('__FAVORIT_B64__', b64('ABCFavorit-Bold.otf'))
  .replace('__MONO_B64__', b64('ABCFavoritMono-Book.otf'))

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'artifact.html'), h)

const i = h.indexOf('<div class="marco">')
writeFileSync(join(out, 'standalone.html'),
  '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  h.slice(0, i) + '</head>\n<body>\n' + h.slice(i) + '</body>\n</html>\n')

console.log(`guía compilada en ${out} (${(h.length / 1024).toFixed(0)} KB)`)
