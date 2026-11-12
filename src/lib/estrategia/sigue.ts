import { ESENCIA, ETAPA_LABEL, ETAPA_ORDER, type EstrategiaKey } from './stages'

/**
 * Qué sigue en la Estrategia, para la franja de la pantalla y para Claude. Primero lo que
 * espera revisión (el equipo es el cuello de botella); si no, la primera etapa sin aprobar,
 * en el orden del proceso. Los cuadros van al final: se llenan desde lo aprobado. Es el
 * mismo criterio que el Sistema M&B.
 */

export interface EtapaParaSeguir {
  key: EstrategiaKey
  status: string
  /** Tiene un borrador esperando que el equipo decida. */
  esperando: boolean
}

export interface QueSigueEstrategia {
  key: EstrategiaKey
  turno: 'revisar' | 'claude'
}

export function queSigueEstrategia(etapas: EtapaParaSeguir[]): QueSigueEstrategia | undefined {
  const porKey = new Map(etapas.map(e => [e.key, e]))
  const enOrden = ETAPA_ORDER.map(k => porKey.get(k)).filter((e): e is EtapaParaSeguir => !!e)
  const espera = enOrden.find(e => e.esperando)
  if (espera) return { key: espera.key, turno: 'revisar' }
  const falta = enOrden.find(e => e.status !== 'aprobada' && e.status !== 'no_aplica')
  return falta ? { key: falta.key, turno: 'claude' } : undefined
}

/** Lo que el equipo pega en el chat del proyecto para seguir con la Estrategia. */
export function mensajeEstrategia(key: EstrategiaKey, proyecto: string): string {
  return `Sigamos con la Estrategia de ${proyecto}. Lo que sigue: ${ETAPA_LABEL[key].toLowerCase()}. Cuando termines, guárdalo en la plataforma.`
}

/** Lo mismo, dicho para Claude: lo devuelve `estado_estrategia`. */
export function queSigueEstrategiaParaClaude(sigue: QueSigueEstrategia | undefined, faltanDeEsencia: number): string {
  if (!sigue) return 'La Estrategia está completa: no queda nada pendiente.'
  const etapa = ETAPA_LABEL[sigue.key]
  if (sigue.turno === 'revisar')
    return `El equipo tiene que revisar y aprobar ${etapa} en el panel. Si piden cambios, ajusta ese borrador; si no, espera.`
  const cuadros = sigue.key === 'cuadros'
    ? ' Los cuadros se arman con lo que la esencia ya tiene aprobado.'
    : sigue.key === 'naming'
      ? ' Sólo aplica si el proyecto necesita nombre nuevo: si la marca ya lo tiene, dile al equipo que la marque como que no aplica en el panel y sigue con los copies.'
    : sigue.key === 'copies'
      ? ' Arma la tabla de entregables de marca con el equipo: qué piezas son, sus especificaciones y los copies de cada una.'
    : ESENCIA.includes(sigue.key) && faltanDeEsencia > 1
      ? ` Quedan ${faltanDeEsencia} etapas de esencia; si el proyecto pide otro orden, puedes trabajarlas en ese orden.`
      : ''
  return `${etapa}: trabájala desde lo aprobado del Landscape y de la Estrategia.${cuadros} Cuando termines, guárdala con guardar_etapa, fase "estrategia", etapa "${sigue.key}".`
}
