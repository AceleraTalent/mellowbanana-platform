import Link from 'next/link'
import { db } from '@/lib/db/client'
import { cargarSistema } from '@/lib/seguimiento/cargar'
import { avisosRecientes } from '@/lib/avisos'
import { haceCuanto } from '@/lib/landscape/stages'
import { FASES, FASE_LABEL } from '@/lib/seguimiento/sistema'
import { quienEntro } from '@/lib/admin/auth'
import { esDireccion, paraQuien } from '@/lib/admin/permisos'
import { AdminShell } from '@/components/AdminShell'
import { Estadistica } from '@/components/sistema/Estadistica'
import { Avatar, FASE_BAJADA, SelloFase } from '@/components/sistema/fase'
import { CHIP, MARCA } from '@/components/sistema/chips'
import { diasHasta, valorCorto } from '@/components/sistema/cliente'

export const dynamic = 'force-dynamic'

const TONO = 'bg-[var(--aprobado)] text-[var(--ink)]'

/**
 * El panorama del estudio: cuántos clientes hay en cada fase, qué espera al equipo y qué
 * entregas ya vencieron. Todo sale del mismo Sistema M&B que el Pipeline; acá no se edita,
 * cada cifra lleva a la lista donde sí.
 */
export default async function Panorama() {
  const ahora = new Date()
  const [todas, avisos, quien] = await Promise.all([cargarSistema(db, ahora), avisosRecientes(db, 6), quienEntro()])
  const filas = paraQuien(todas, quien)
  const direccion = esDireccion(quien)
  const enCurso = filas.filter(f => f.sigue.quien !== 'listo')
  const terminados = filas.length - enCurso.length
  const nosToca = enCurso.filter(f => f.sigue.quien === 'revisar' || f.sigue.quien === 'equipo')
  const vencidas = enCurso.filter(f => f.seguimiento.fechaEntrega && diasHasta(f.seguimiento.fechaEntrega, ahora) < 0)
  const conValor = filas.filter(f => f.seguimiento.valor !== null)
  const valor = conValor.reduce((t, f) => t + (f.seguimiento.valor ?? 0), 0)

  return (
    <AdminShell sistema={filas} seccion="panorama">
      <header>
        <h1 className="font-serif text-[30px] leading-[1.1] text-[var(--ink)]">Panorama del estudio</h1>
        <p className="mt-1.5 text-[15px] text-[var(--secundario)]">Todos los clientes y sus etapas en una sola vista</p>
      </header>

      <ol className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FASES.map((f, i) => {
          const suyas = enCurso.filter(x => x.actual === f)
          const tocan = suyas.filter(x => x.sigue.quien === 'revisar' || x.sigue.quien === 'equipo').length
          const tarde = suyas.filter(x => x.seguimiento.fechaEntrega && diasHasta(x.seguimiento.fechaEntrega, ahora) < 0).length
          const parte = enCurso.length ? Math.round((suyas.length / enCurso.length) * 100) : 0
          return (
            <li key={f}>
              <Link href={`/admin?vista=lista&fase=${f}`} className="tarjeta group flex h-full flex-col p-6 transition-[border-color,transform] hover:-translate-y-px hover:border-[var(--apagado)]">
                <span className="flex items-start justify-between">
                  <SelloFase fase={f} size={48} />
                  <span aria-hidden="true" className="font-mono text-[12px] font-bold text-[var(--rotulo)]">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <span className="rotulo mt-5">{FASE_LABEL[f]}</span>
                <span className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[44px] font-extrabold leading-none tracking-[-.03em] text-[var(--ink)]">{suyas.length}</span>
                  <span className="text-[15px] text-[var(--secundario)]">{suyas.length === 1 ? 'cliente' : 'clientes'}</span>
                </span>
                <span className="mt-2 text-[14.5px] text-[var(--secundario)]">{FASE_BAJADA[f]}</span>
                <span className="mt-5 flex items-center gap-3">
                  <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--superficie)]"><span className="block h-full rounded-full bg-[var(--ink)]" style={{ width: `${parte}%` }} /></span>
                  <span className="w-9 text-right text-[12.5px] tabular-nums text-[var(--secundario)]">{parte}%</span>
                </span>
                <span className="mt-4 flex items-center justify-between border-t border-dashed border-[var(--line)] pt-3.5 text-[13.5px] font-semibold">
                  <span className={tarde ? 'text-[var(--error)]' : 'text-[var(--ink)]'}>
                    {tocan ? `${tocan} ${tocan === 1 ? 'espera' : 'esperan'} al equipo` : tarde ? `${tarde} con entrega vencida` : suyas.length ? 'Nada espera al equipo' : 'Nadie en esta fase'}
                    {tocan > 0 && tarde > 0 && <span className="font-medium text-[var(--error)]"> · {tarde} con entrega vencida</span>}
                  </span>
                  <span aria-hidden="true" className="text-[var(--rotulo)] transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            </li>
          )
        })}
        <li>
          <div className="tarjeta flex h-full flex-col p-6">
            <span className="flex items-start justify-between">
              <SelloFase fase="terminado" size={48} />
              <span aria-hidden="true" className="font-mono text-[12px] font-bold text-[var(--rotulo)]">{String(FASES.length + 1).padStart(2, '0')}</span>
            </span>
            <span className="rotulo mt-5">Terminado</span>
            <span className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[44px] font-extrabold leading-none tracking-[-.03em] text-[var(--ink)]">{terminados}</span>
              <span className="text-[15px] text-[var(--secundario)]">{terminados === 1 ? 'cliente' : 'clientes'}</span>
            </span>
            <span className="mt-2 text-[14.5px] text-[var(--secundario)]">{FASE_BAJADA.terminado}</span>
            <span className="mt-auto border-t border-dashed border-[var(--line)] pt-3.5 text-[13.5px] font-semibold text-[var(--ink)]">
              {terminados ? 'Se ven plegados al final del Kanban' : 'Todavía no se entregó ninguno'}
            </span>
          </div>
        </li>
      </ol>

      <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${direccion ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <Estadistica rotulo="Clientes en curso" valor={String(enCurso.length)} unidad={`de ${filas.length}`} pie={`En ${FASES.length} fases`} tono={TONO}
          icono={<><path d="M3 5a2 2 0 0 1 2-2h3l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>} />
        <Estadistica rotulo="Esperan al equipo" valor={String(nosToca.length)} pie={nosToca.length ? 'Por revisar o por hacer' : 'Nada pendiente del equipo'} tono={nosToca.length ? 'bg-[var(--banana)] text-[var(--ink)]' : TONO}
          icono={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />
        <Estadistica rotulo="Entregas vencidas" valor={String(vencidas.length)} pie={vencidas.length ? 'La fecha de entrega ya pasó' : 'Ninguna entrega atrasada'} tono={vencidas.length ? 'bg-[var(--ink)] text-white' : TONO}
          icono={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>} />
        {direccion && <Estadistica rotulo="Valor anotado" valor={conValor.length ? valorCorto(valor) : '—'} pie={conValor.length ? `En ${conValor.length} de ${filas.length} clientes` : 'Ningún cliente tiene valor. Se pone en “Editar cliente”.'} tono={TONO}
          icono={<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>} />}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="tarjeta p-6">
          <h2 className="rotulo">Esperan al equipo</h2>
          {nosToca.length === 0 ? <p className="mt-4 text-[14.5px] text-[var(--secundario)]">Nada espera al equipo en este momento.</p> : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {nosToca.slice(0, 6).map(f => (
                <li key={f.id}>
                  <Link href={f.href} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3 hover:bg-[var(--superficie)]">
                    <Avatar nombre={f.nombre} size={34} cuadrado />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-[var(--ink)]">{f.nombre}</span>
                      <span className="block truncate text-[13px] text-[var(--secundario)]">{FASE_LABEL[f.actual]}</span>
                    </span>
                    <span className={`inline-flex flex-none rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold ${CHIP[f.sigue.quien]}`}>{MARCA[f.sigue.quien]}{f.sigue.texto}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {nosToca.length > 6 && <p className="mt-3 text-[13px] text-[var(--secundario)]">Y {nosToca.length - 6} más en el Pipeline.</p>}
        </section>
        <section className="tarjeta p-6">
          <h2 className="rotulo">Actividad reciente</h2>
          {avisos.length === 0 ? <p className="mt-4 text-[14.5px] text-[var(--secundario)]">Todavía no hay avisos. Llegan cuando un cliente termina su entrevista.</p> : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {avisos.map(a => (
                <li key={a.id}>
                  <Link href={a.href} className="-mx-2 flex items-baseline justify-between gap-4 rounded-[10px] px-2 py-3 hover:bg-[var(--superficie)]">
                    <span className="min-w-0">
                      <span className="text-[14.5px] text-[var(--ink)]">{a.texto}</span>
                      {a.detalle && <span className="ml-2 text-[13px] text-[var(--secundario)]">{a.detalle}</span>}
                    </span>
                    <span className="flex-none text-[12.5px] text-[var(--rotulo)]">{haceCuanto(a.cuando, ahora)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  )
}
