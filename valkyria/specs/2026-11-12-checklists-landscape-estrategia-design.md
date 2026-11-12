# Checklists del estudio en Landscape y Estrategia

Fecha: 2026-11-12. Fuente: dos listados que el estudio le pasó a Tina y el usuario pegó en el chat:
el "Checklist de investigación (versión general)" y "Fase 3 — Estrategia · Listado de entregables".
El usuario pidió implementarlos "de la mejor manera posible" y se saltó las preguntas de diseño:
todo lo que sigue, salvo los listados, son decisiones de Claude (ver DECISIONES, 2026-11-12).

## Qué se buscaba

Que la plataforma pida y muestre exactamente lo que el estudio entrega, punto por punto. La mayor
parte ya existía; esto completa los huecos sin romper lo guardado.

## Checklist de investigación → Landscape

| Punto del checklist | Dónde vive | Qué cambió |
|---|---|---|
| 1. Datos del sector (global y Colombia) | paso 2.2, etapa `contexto` | Siete bloques (`src/lib/landscape/checklist.ts`): cifras, drivers, consumidor, retos, oportunidades, oportunidad_marca, conclusion. Cada sección del contexto declara su `bloque`. |
| 2. 4 o 5 tendencias | pasos 3.1 y 3.3 | Nada: ya estaba. |
| 3. Casos | paso 3.4 | Nada. |
| 4. Panorama de la categoría | paso 4.1 | El benchmarking cierra con `sintesis: { patrones, oportunidades }`, que el panel muestra como "Patrones y oportunidades". |
| 5. Cuadro de brand assets | paso 4.2 | Nada. |
| 6. Círculo cromático | paso 4.3 | Nada. |
| 7. Rebranding | paso 5.1 | El texto del paso nombra la pregunta al cliente: ¿evolución o revolución? |

El contexto no se valida con rechazo: es un aviso. Al guardar con `guardar_etapa`, Claude recibe la
lista de bloques que faltan; el panel la muestra como "Falta del checklist de investigación". Un
contexto que no declara ningún bloque (los anteriores a este cambio) no muestra nada.

## Listado de entregables → Estrategia

De 14 etapas a 18, en cuatro bloques con los nombres del listado.

| Bloque | Etapas | Qué cambió |
|---|---|---|
| Diagnóstico y consumidor | `diagnostico`, `consumidor` | Diagnóstico suma `rumbo` (hacia dónde vamos). Consumidor suma `perfil`, `motivaciones`, `tensiones` y `pertenencia`. |
| Esencia de marca | 13 etapas | Nuevas: `objetivo` (primera) y `onlyness` (después de los ingredients). Los atributos diferenciales siguen en `diagnostico.diferenciales`, con ese título. |
| Narrativa y presentación | `cuadros` | Sólo el nombre del bloque (antes "Cierre"). |
| Naming y copies | `naming`, `copies` | Nuevo. `naming` es `{ propuestas: [{ nombre, racional, disponibilidad? }], recomendado?, criterios? }` y el equipo lo puede marcar como que no aplica. `copies` es `{ entregables: [{ entregable, especificaciones, copies: [] }] }`. |

Los campos nuevos son obligatorios al guardar por el conector (`validar-estrategia.ts`). Lo ya
guardado sin ellos se sigue leyendo: las vistas no los exigen.

## Lo que no entra

- El tablero no cambia: la fase "Naming" del Sistema M&B sigue siendo la que marca el equipo.
- No hay migración: `stage` es texto y las etapas nuevas aparecen solas como pendientes.
- El comparador de versiones sigue usando el render genérico, como antes.
