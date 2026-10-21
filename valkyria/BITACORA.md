# Bitácora — mellowbanana-platform

Entradas nuevas arriba. Formato: ver CONVENCION.md.

## 2026-10-21 (bis) — Que funcione de verdad: cuentas, avisos, el deck desde la plataforma y Estrategia

- **Hecho:** revisión funcional contra producción (el conector real devuelve `sigue`) y con los
  datos reales de Heroica. Se encontró y arregló:
  - La Entrega de Heroica tenía un borrador de Claude que la página nueva no mostraba (lo rompió
    el deploy del mismo día): paso opcional 6.0, se ve y se aprueba.
  - Las rutas de guardar/aprobar etapas, la descarga del deck y generar la propuesta (créditos del
    modelo) no pedían sesión. Ahora sí.
  - El Diagnóstico se marca como que no aplica (marca nueva) desde su sección.
  - `contexto_proyecto` trae `borradorSinAprobar`: un chat nuevo retoma o corrige lo pendiente.
  - Borrar un proyecto no limpiaba `landscape_pasos` ni `project_seguimiento`.
- **Pedido del estudio:**
  - Cuentas por persona (usuario y clave, sin correo) en `/admin/equipo`; la llave maestra queda de
    respaldo; el historial dice quién aprobó (`approved_by`). Ver DECISIONES.
  - Avisos: campana arriba de la barra con las entrevistas que llegaron sin mirar
    (`/admin/avisos`), sin tabla nueva. El correo sale cuando se termine de configurar Resend.
  - Conclusiones del Taller opcionales: se pegan en el Taller o Claude las guarda desde el chat
    (`guardar_conclusiones_taller`); si faltan, Claude pide los 4 competidores o parte del Enfoque.
    Tener conclusiones no cierra el taller: eso lo marca el equipo.
- **El deck sale de la plataforma:** paso 3.5 (desarrollo de las tendencias elegidas) y los casos, el
  brand assets y el círculo cromático se guardan como piezas aprobables en su sección.
  `/landscape/documento` junta todo lo aprobado en el orden del deck, para el template o PDF.
- **Estrategia** pasó al mismo formato de una página, con su franja y `sigue` para Claude: en
  Heroica había 13 borradores y ninguno aprobado.
- **Demo local:** la base PGlite se dañaba cada vez que se detenía el servidor; el cliente de la
  demo (sin commitear) ahora la cierra al recibir la señal de apagado.
- **Quedó:**
  - Subir a producción (migraciones 0005 y 0006 corren solas en el deploy). Después del deploy todos
    entran con la llave maestra una vez y crean las cuentas.
  - Correo de avisos: aceptar los términos de Resend en Vercel, `NOTIFY_EMAIL_TO` y un dominio
    verificado para `NOTIFY_EMAIL_FROM`.
  - Cambiar la llave maestra por una larga; recuperar el acceso a Neon.
  - 8 procesos `yes` corriendo hace 56 días en la máquina (no son de esta sesión) se comen la CPU.
  - Sin responder: Naming antes o después de Estrategia; si el equipo aprueba «Personalidad».

## 2026-10-19/21 — El panel para trabajar a la par con Claude: inicio, menú y Landscape en una página

- **Hecho:** el estudio no entendía cómo seguir el proceso entre las dos pantallas (claude.ai y
  el panel). Se rehízo en incrementos chicos, mostrados en vivo sobre la demo local de Heroica:
  - El inicio es el Sistema M&B (las cinco fases por cliente, como la tabla de Notion), con
    dirección visual "Papel" y buscador; un solo menú por cliente, de dos niveles.
  - El Landscape es **una página**: las seis etapas son secciones plegables (abierta la que
    tiene trabajo) y arriba va "Lo que sigue" con un solo botón. Los 15 pasos del documento
    del estudio son la receta de Claude, no renglones para el equipo: quedan 13 (Dropbox y
    template son uno; "entregas anteriores" pasa a ser insumo de la lista larga) y lo de
    afuera es una casilla en su sección que no frena lo que sigue. "Setup" pasa a "Enfoque".
  - **Un solo chat por cliente:** `estado_landscape` devuelve `sigue` (qué toca y dónde
    guardarlo), así que basta con "sigamos con <marca>"; `guardar_etapa` devuelve
    `verEnElPanel`. "Seguir en Claude" copia el mensaje y abre claude.ai.
  - Producción: titulares y rótulos en Geist mientras se aclara la licencia web de Favorit
    (ver DECISIONES). Borrar un proyecto ahora limpia `landscape_pasos` y
    `project_seguimiento`. Deploy `7420bb9`.
- **Aprendido:** el build de producción en Vercel tiene un comando propio que corre
  `drizzle-kit migrate` antes de `next build`. Un cambio de esquema llega con
  `npx drizzle-kit generate` + commit (así llegó `drizzle/0004`); no hace falta `db:push` ni el
  link de la base. El script `asegurar-tablas.mjs` que se agregó creyendo lo contrario nunca
  corrió y se quitó.
- **Quedó:**
  - Nadie tiene acceso a Neon (se perdió el link de la base): sin eso no hay respaldos ni
    cambios a mano. Recuperarlo en console.neon.tech.
  - La clave del panel en producción es débil; cambiarla por una larga.
  - Estrategia sigue con el formato viejo (una página por etapa, sin "Seguir en Claude").
  - Pegar en el proyecto de claude.ai el párrafo nuevo de `docs/fase2/instrucciones-claude-ai.md`
    (opcional: la indicación ya viaja en las herramientas).
  - Sin responder: proteger con sesión `landscape/[stage]`, `estrategia/[stage]` y `deck`;
    Naming antes o después de Estrategia; si el equipo aprueba «Personalidad».
  - El checkbox de mission-control no se marcó: el `plan.md` de este proyecto no existe.

## 2026-10-13 — Guía de uso del equipo (plataforma + Claude) y revisión del flujo con el MCP

- **Hecho:** el estudio se perdía al llegar al Taller: el panel dice "Taller · Se trabaja en
  Miro · faltan las conclusiones" y no hay dónde cargarlas, así que nadie sabía cómo pasar al
  landscape ni cómo era el ciclo con Claude. Se armó una guía de uso como página HTML
  (`docs/guia-equipo/guia-src.html`, se compila con `scripts/build-guia.mjs`) publicada como
  artefacto de claude.ai; el fuente va al repo sin las fuentes (marcadores), la salida con
  ABC Favorit incrustada queda ignorada.
  - Fue a cuatro versiones por feedback del estudio: la primera describía el sistema; la que
    quedó muestra el recorrido con el chat y el panel simulados. Lo central son dos
    secciones: "Del Miro al Landscape" (subir el documento de cierre del taller al proyecto
    de claude.ai, mensaje de arranque con los 4 competidores, Setup, aprobar) y "Una etapa
    con Claude, de principio a fin" (pedir, corregir, guardar, aprobar, siguiente).
  - Texto en español neutro (tuteo). El estudio pidió explícitamente que no fuera voseo.
  - Prueba en vivo del MCP contra producción: lecturas y un `guardar_etapa` real funcionan.
    Quedó un borrador de prueba, marcado como tal, en estrategia/diagnostico de M&B: el
    historial es append-only, se tapa con el próximo borrador real.
- **Quedó:**
  - **El panel:** `tienePostTaller` sigue hardcodeado en `false` (`src/lib/pipeline/phases.ts`),
    por eso el subtítulo del proyecto miente para siempre. Acordado arreglarlo: cargar las
    conclusiones del taller desde el panel y poder marcar una etapa como `no_aplica` (hoy
    las rutas solo aceptan guardar/aprobar/reafirmar, y un landscape de marca nueva nunca
    llega a 6/6). La guía documenta las dos cosas como "lo estamos arreglando".
  - **El MCP:** revisado el flujo real; primer lote propuesto sin ejecutar: exponer los
    borradores vigentes en `contexto_proyecto`, llevar las instrucciones al servidor
    (`instructions` del MCP) en vez de pegarlas en cada proyecto de claude.ai, devolver el
    link al panel desde `guardar_etapa`, mandar el texto de la pregunta junto con cada
    respuesta de entrevista.
  - Confirmar con el estudio los nombres de menú de claude.ai en la sección "Conectar".

## 2026-08-27 — El amarillo nuevo y ABC Favorit; y el `.env.local` que estaba pisado

- **Hecho:** el estudio pasó su tipografía (`docs/design/ABC Favorit.zip`) y el amarillo de marca
  (`#fcf251`) para aplicarlos en la plataforma. Quedó aplicado y verificado: 522 tests en verde,
  `tsc --noEmit` limpio.
  - **El amarillo:** `--banana` pasa de `#FFD400` a `#fcf251`. Como casi todo el panel lo consume
    por el token, alcanzó con tocarlo en `globals.css`; las excepciones eran las dos paletas
    hardcodeadas de los PDF (`BriefDocument.tsx` en `#E9B949`, `DeckDocument.tsx` en `#ffd400`),
    que también se movieron. Los derivados (chips, textos sobre chips, rótulo de acento) se
    recalcularon en vez de heredarse — ver DECISIONES.
  - **La tipografía:** el zip trae **un solo peso de la sans** (Bold) más las cuatro variantes de
    la Mono. Favorit Bold ocupa el hueco `font-serif` que tenía Fraunces, así que los ~30 lugares
    que ya usaban esa clase se movieron sin tocarlos; los 36 rótulos en versalitas de 22 archivos
    ganaron `font-mono`. El cuerpo sigue en Geist a propósito. Fraunces salió del proyecto.
  - **Hoja visual del resultado** (compuesta con las fuentes reales embebidas, para mostrarle al
    estudio): https://claude.ai/code/artifact/9729564a-1150-4b3d-9d86-c4a8d2f8c00b

- **El bug que apareció en el medio — `/admin` daba 500, y no era el rediseño:**
  - **Causa:** `.env.local` tiene **15 claves cuyo valor es el string literal `[SENSITIVE]`**,
    firma de un `vercel env pull` — las variables marcadas *Sensitive* no se pueden releer y la
    CLI escribe ese placeholder encima del valor bueno. Una es `DATABASE_URL`, y
    `src/lib/db/client.ts:5` llama a `neon(process.env.DATABASE_URL!)` **a nivel de módulo**: el
    import explota antes de renderizar, así que cualquier página que lo importe da 500 y
    `npm run build` muere en "collect page data".
  - **Verificado que es preexistente:** mismo 500 en `/admin` autenticado con el árbol limpio
    (`git stash`) que con los cambios de diseño puestos, y el build falla igual en las dos ramas.
  - Ojo con el falso negativo: sin cookie `/admin` devuelve 307 a login y nunca llega al código de
    la base. Hay que probar autenticado o no se reproduce.
  - **No está arreglado**: el connection string real hay que copiarlo a mano desde Neon. Volver a
    correr `vercel env pull` **no** sirve, reescribe el mismo placeholder.

- **Quedó:**
  - **Restaurar `.env.local`.** Además de `DATABASE_URL`, están pisadas `OPENROUTER_API_KEY`
    (normalizador y generación del entregable) y `MCP_PUBLIC_URL` (metadata OAuth del MCP y los
    links del mail). Las otras doce son `VERCEL_GIT_*` y `VERCEL_URL`, metadata de build que en
    local no molesta.
  - **La licencia de ABC Favorit, bloqueante para deployar.** El zip son OTF de escritorio y
    `next/font/local` las republica en `/_next/static/media`, o sea descargables desde el sitio;
    eso suele necesitar licencia web aparte. Y este repo es **público**, así que los binarios
    quedaron gitignoreados y el trabajo vive en la rama `diseno/favorit-fcf251`, que **no builda
    en un clon limpio** hasta resolverlo. Ver DECISIONES. Si aparece la licencia web, pedir los
    WOFF2 (el Bold baja de 111 KB a un tercio) y los TTF, que hacen falta aparte para tipografiar
    los PDF: hoy siguen en Helvetica y Times porque react-pdf no carga OTF de forma confiable.
  - **Sin decidir:** los rótulos quedaron en Mono **Bold**, conservando los pesos que ya tenían.
    Falta ver con el estudio si van en Book, más liviano.
  - **Sugerido y no hecho:** validar `DATABASE_URL` en `client.ts` con un error que diga qué falta.
    El síntoma (500 en el panel) no apunta para nada a la causa (un `.env.local` pisado).
  - **El checkbox de mission-control sigue sin marcarse**: `~/VALKYRIA/mission-control/` no tiene
    el plan de este proyecto. Van tres sesiones con lo mismo; hay que crearlo o corregir la ruta
    que declara CLAUDE.md.

## 2026-08-25 — El PDF del brief se descargaba roto: texto encimado y media portada en blanco

- **Hecho:** el estudio avisó que el brief de Grupo Heroica salía mal. Confirmado sobre el PDF
  que mandaron (9 páginas): texto superpuesto, un espacio enorme en la portada y páginas a
  medio llenar. Los tres síntomas eran **un solo bug** (520 tests, tsc ok).
  - **Causa:** cada pregunta+respuesta iba en un `<View wrap={false}>`, que le prohíbe a
    react-pdf partir el bloque. Con respuestas cortas funcionaba; con las respuestas
    normalizadas de Heroica —de varios párrafos, más altas que una página entera— falla de
    dos formas. Si el bloque no entra en lo que queda de página, react-pdf lo empuja entero a
    la siguiente: ese es el hueco de la portada. Si no entra ni en una página completa, no lo
    puede empujar a ningún lado y lo dibuja desbordado, y el bloque siguiente se pinta encima:
    esa es la superposición. Medido: había texto en `y=1047` sobre una A4 de 842 pt.
  - **Arreglo:** fuera el `wrap={false}` de preguntas y respuestas; la protección de huérfanos
    que buscaba queda en `minPresenceAhead` (56 pt para el título de sección, 34 pt para la
    pregunta). Sobrevive solo en la fila de chips del proyectivo, de alto acotado. De paso,
    las páginas 2+ arrancaban pegadas al borde: la página gana `paddingTop` y la franja
    amarilla pasa a fija, en todas las hojas.
  - **Cómo se testea la maquetación:** `src/lib/pdf/inspect.ts` lee los content streams del
    PDF de salida (siguiendo `/Kids`, porque el orden de los objetos no es el de las páginas)
    y devuelve dónde cayó cada línea — react-pdf no expone el layout resuelto. Sobre eso,
    `BriefDocument.layout.test.tsx` exige que nada se dibuje fuera de la caja de contenido y
    que ninguna página intermedia quede casi vacía. Verificado que son guardas reales:
    reintroducir el `wrap={false}` pone dos de los tres tests en rojo.
  - Ya era la segunda vez del mismo bug en el repo (la primera, en `src/lib/deck`, dejó ahí
    los comentarios y el test canario). La regla quedó escrita en DECISIONES.
  - **Dos empates de milisegundo más, cerrados de paso**: verificando la suite antes de
    pushear aparecieron `reafirmar la aprobada disuelve el conflicto…` y `un borrador
    posterior no desplaza a la aprobada…` fallando de a ratos. Misma familia de siempre
    (`orderBy(desc(createdAt), desc(id))` y el uuid que no conserva orden de creación): son
    dos hermanos que la barrida de `ab706cb` no alcanzó. Reproducido con carga de CPU (1 de
    5 corridas sin el arreglo), y 11 corridas verdes seguidas con la separación de 2ms
    puesta, 5 de ellas bajo la misma carga.

- **Quedó:**
  - **Los asteriscos de Markdown crudos en el PDF** (`**Ventana de diferenciación:**`): no es
    maquetación, viene del texto que devuelve la normalización. Falta decidir si se limpian
    los `**` o se renderiza la negrita de verdad.
  - **El checkbox de mission-control no se marcó**: `~/VALKYRIA/mission-control/` solo tiene
    `intel-comercioexterior`; no existe el plan de este proyecto. Hay que crearlo o corregir
    la ruta que declara CLAUDE.md.
  - Sigue pendiente lo de siempre: la plantilla de PowerPoint y activar Resend (`PENDIENTE.md`).

## 2026-08-22 — Propuesta de valor: edición interna, 4 variables, sin síntesis, personalidad a Estrategia

- **Hecho:** los cuatro pedidos del usuario sobre la Propuesta de valor, según
  `plans/2026-08-22-propuesta-valor-edicion.md` (519 tests, 3 corridas limpias, tsc ok).
  - **Editor interno del entregable** (el insumo de la exportación a PowerPoint que viene):
    cada sección del documento gana "Editar" y se voltea a formulario — párrafos, listas de
    ítems con agregar/quitar, los 4 ejes, referentes y las filas del canvas. Guarda por
    `PATCH /api/projects/[id]/deliverable` con **los mismos validadores que se le exigen al
    modelo** y la cookie de admin (helper `esAdminRequest` compartido con la ruta de
    proyectos). `PartMeta.editedAt` fecha la edición sin pisar `generatedAt`; regenerar una
    parte editada pide confirmación porque la pisa. Ítems nuevos nacen `origen: 'equipo'`;
    citas y orígenes existentes se conservan (la cita es literal de la entrevista).
  - **Cuatro variables de comparación**: el prompt de competencia pide EXACTAMENTE 4 ejes y
    el validador lo exige (con el reintento de `callJson` como red). El editor siempre
    ofrece 4 filas, complete lo que complete un entregable viejo de 2.
  - **Sin síntesis**: fuera el bloque final de la sección 3 y la `formula` que lo armaba
    (schema, prompt, validador). Los entregables guardados con formula la conservan en su
    JSON; nadie la lee. El error de propuestaValor ausente sigue visible vía `tablaError`.
  - **Personalidad a Estrategia**: se sigue generando (alimenta a problema y perfil), pero
    su salida se guarda como **borrador de Claude en la etapa `personalidad` de Estrategia**
    (`sincronizarPersonalidadEnEstrategia`, idempotente por contenido para no ensuciar el
    historial en cada regeneración). Entra sola al circuito borrador→aprobar y a "Nos toca"
    de la mesa. El bloque "insumo interno" desapareció de la pantalla Propuesta.
  - Otro flake de empate de milisegundo cazado y cerrado con la separación de 2ms
    (`borrador sobre etapa aprobada`).

- **Quedó:**
  - **La plantilla de PowerPoint**: cuando el usuario la pase, construir la exportación del
    entregable editado sobre ella (a propósito fuera de este plan).
  - Los steps del entregable conservan sus `as any` pre-existentes (28 hallazgos de lint
    viejos, sin cambio).

## 2026-08-21 (ter) — La mesa de trabajo: el proyecto abre con el trabajo, no con la estructura

- **Hecho:** de las tres alternativas de navegación presentadas (artifact en PENDIENTE.md), el
  usuario eligió la C. `/admin/projects/[id]` deja de redirigir a la etapa actual y pasa a ser
  la **mesa de trabajo** (505 tests, 4 corridas limpias):
  - **Nos toca**: las decisiones que esperan al equipo con link directo. Dos fuentes que ya
    existían: `esperanDecision` (etapas con versión sin aprobar, vía el `espera` del índice) y
    `attentionItems` (lo grueso: "sin entrevistas", "propuesta lista"). La gruesa se calla
    cuando su fase ya tiene esperas finas (`armarNosToca`).
  - **Mientras no estabas**: un solo hilo con versiones de landscape + estrategia y entrevistas
    completadas (`armarMovimientos` + `listStrategyActivity`, espejo nuevo de
    `listLandscapeActivity`; `ActivityEntry` pasó a genérica en la clave de etapa).
  - **El recorrido**: la estructura completa plegada en tres tarjetas de fase con avance
    (`RecorridoPlegable`); tocar una despliega sus etapas como chips con nombre, estado y
    punto de espera. El índice se construye con `todas: true` para que una espera no quede
    escondida detrás del colapso "＋ n etapas más".
  - `CabeceraProyecto` ganó la variante `portada` (nombre 30px, mismo renombrar/borrar/volver).
    Las pantallas de etapa conservan el índice lateral por ahora: la mesa es la puerta, no
    reemplaza (todavía) el chrome de las etapas.
  - **Flakes de milisegundo, cerrados**: los tres tests que guardaban dos versiones en el mismo
    ms (strategy `viene de la más nueva…` y los dos de `long list ampliada`) ahora separan los
    guardados con 2ms reales — el desempate por uuid no conserva orden de creación y no hay
    serial sin migración. La suite corrió 4 veces limpia.

- **Quedó:**
  - Mostrarle la mesa al estudio; si convence, la iteración siguiente es aligerar el índice
    lateral de las etapas (o adoptar B como estructura, como sugiere la página de propuestas).
  - `next build` local falla por entorno (sin `DATABASE_URL` en la máquina; `.env.local` de
    `vercel link` solo trae el token OIDC). En Vercel construye. Un `vercel env pull` lo
    arregla local si hace falta.

## 2026-08-21 (bis) — Feedback del estudio: proyectos (volver al panel, renombrar, borrar)

- **Hecho:** los tres puntos del feedback sobre proyectos, en `main` (498 tests, tsc limpio).
  - **La navegación estaba rota de verdad, no solo escondida.** Adentro de un proyecto, el
    único link a `/admin` era el cuadrado M&B del riel — y el hover que intenta llegarle abre
    la barra de 230px *encima*, que solo listaba proyectos. Con mouse era imposible volver.
    Dos salidas ahora: "Todos los proyectos" como primer renglón de la barra abierta, y
    "← Proyectos" fijo en la cabecera del índice.
  - **Renombrar proyecto** (el cliente cambió el nombre del negocio): inline en la cabecera del
    índice. Cambia `name` y también `normalizedName`, para que la próxima entrevista que tipee
    el nombre nuevo caiga en este proyecto y no en un duplicado. Conflicto de unique → 400 con
    el motivo visible.
  - **Borrar proyecto con confirmación fuerte**: modal que exige tipear el nombre exacto y
    avisa qué se lleva (entrevistas, respuestas, entregable, historial de landscape y
    estrategia — hijos primero, sin transacción porque neon-http no da; un corte a mitad
    deja un estado que el segundo intento termina de limpiar). El `scripts/delete-project.ts`
    viejo quedó desactualizado (no borra las tablas de landscape/estrategia): la ruta nueva es
    la buena.
  - **Auth:** `PATCH`/`DELETE` de `/api/projects/[id]` exigen la cookie `admin` — el proxy solo
    protege páginas, no `/api`, y borrar es irreversible. El resto de las rutas del panel sigue
    sin chequeo (deuda pre-existente, anotada).
  - La cabecera nueva es `CabeceraProyecto` (cliente) adentro de `ProjectIndex`, que ahora pide
    `projectId`; los cinco call sites lo pasan.

- **Quedó:**
  - Presentar al estudio las alternativas de navegación (lateral actual vs fases como
    subsecciones vs una tercera): en curso, ver PENDIENTE.md.
  - Las demás rutas de `/api` del panel siguen abiertas sin cookie (pre-existente).
  - `scripts/delete-project.ts` podría reescribirse sobre `deleteProject` del store o borrarse.

## 2026-08-21 — Feedback del estudio: entrevistas en el proyecto correcto, movimiento que persiste, aviso por correo

- **Hecho:** los tres puntos del feedback del estudio sobre entrevistas, en `main` (485 tests).
  - **El movimiento ya no se deshace (el bug real).** `/api/sessions/[id]/complete` re-corría la
    auto-asignación por empresa en *cada* disparo: si el entrevistado volvía al link y terminaba
    de nuevo, la entrevista volvía sola al proyecto del que el equipo la había movido. Ahora la
    empresa tipeada asigna **solo cuando la sesión no tiene proyecto**, y `completeSession` es
    idempotente (`WHERE status != 'completed'` + `returning`): repetir el cierre no pisa
    `completedAt`, no re-asigna y no re-avisa. De paso, `assignSessionToProject` deja de fallar
    en silencio (404 si no existen la sesión o el proyecto, con test de que el PATCH lo traduce)
    y el `location.reload()` del panel solo corre si el servidor confirmó la escritura.
  - **Link de entrevista por proyecto.** La causa de "cae en el proyecto equivocado" era que el
    proyecto salía del texto libre que tipea el entrevistado como empresa ("Acme" ≠ "Acme S.A.S."
    → proyecto duplicado). Ahora cada proyecto tiene botón **"Copiar link de entrevista"**
    (`/?p=<projectId>`) en su pantalla de entrevistas: la sesión que arranca desde ahí nace ya
    asignada y la empresa tipeada deja de decidir. Un link roto o de proyecto borrado degrada a
    sesión sin proyecto (la entrevista nunca se bloquea) y el flujo viejo sin `?p=` sigue igual.
  - **Aviso por correo al completarse una entrevista.** `src/lib/email/notify.ts`: POST directo a
    la API de Resend (integración del marketplace de Vercel, sin SDK), disparado solo en la
    *primera* completada. `NOTIFY_EMAIL_TO` (acepta varios, separados por coma),
    `NOTIFY_EMAIL_FROM` opcional, link al panel armado con `MCP_PUBLIC_URL`. El correo es efecto,
    no condición: sin config o con Resend caído, la entrevista se completa igual y queda el log.

- **Quedó:**
  - **Provisionar Resend**: `vercel integration add resend` quedó esperando el paso de navegador
    (aceptar términos en el dashboard de Vercel, proyecto `forms-melo-banana`); después de eso,
    setear `NOTIFY_EMAIL_TO` (y `NOTIFY_EMAIL_FROM` si hay dominio verificado). Sin eso el aviso
    simplemente no sale.
  - Las entrevistas viejas mal agrupadas no se re-agrupan solas: se mueven a mano desde el panel
    (que ahora sí persiste).
  - El checkbox en mission-control no se marcó desde esta máquina (`~/VALKYRIA/mission-control`
    no existe acá).
  - **Un flake hermano sigue vivo:** `strategy-store.test.ts › viene de la más nueva a la más
    vieja` falla cuando dos versiones caen en el mismo milisegundo — el desempate por id es un
    uuid aleatorio, que no conserva orden de creación (`listLandscapeVersions` tiene exactamente
    el mismo agujero). Se arregló el caso gemelo de `listLandscapeActivity` (desempate semántico:
    en el empate, la aprobación va arriba del guardado), pero ordenar versiones por creación de
    verdad pide un serial en la tabla, o sea migración: quedó afuera a propósito.

## 2026-08-12/13 — Rediseño completo del panel interno (11 tareas, rama sin mergear)

- **Hecho:** rediseño de punta a punta del panel autenticado, sobre `fase3-pipeline-estrategia`
  (40 commits, 56 archivos, 474 tests). Salió del feedback del usuario: *"los colores, el layout y
  todo se me hace incómodo"* y *"no es intuitivo ni fácil de navegar por el cluster de
  información"*. Spec en `specs/2026-08-12-rediseno-panel-interno-design.md`, plan de 11 tareas en
  `plans/2026-08-12-rediseno-panel-interno.md`, ejecutado con subagentes (implementador + revisor
  por tarea, ronda de arreglos, re-revisión acotada).
  - **Lenguaje visual:** el amarillo de la marca deja de ser adorno y pasa a ser superficie (la
    barra lateral entera). Fuera las tarjetas y las sombras: hairlines `1px solid var(--line)` y
    `1.5px solid var(--ink)` donde una sección pesa. Escala tipográfica real y tokens
    (`--banana --ink --line --aprobado --superficie --error --cuerpo --secundario --rotulo
    --apagado`) en vez de cuatro grises casi iguales.
  - **Navegación:** de **cinco barras apiladas a una**. La barra amarilla tiene tres estados
    (ancha en el listado, riel de iniciales adentro de un proyecto, abierta encima al pasar el
    mouse) y al lado vive el índice: fases como títulos, etapas como renglones, colapso cuando
    una fase pasa de seis. `ProjectHeader` eliminado.
  - **El panel es una sala de revisión, no un editor.** La etapa se rinde como documento editorial
    (rótulo al margen, columna de lectura de 60ch) con la decisión fija al pie. El conflicto
    "aprobada vs lo que Claude escribió después" pasó de un aviso de 12px a ser la pantalla, con
    dos columnas y las dos decisiones.
  - **Vocabulario alineado** con el que usa el equipo: `Grupo`→`Fase`, `GRUPOS_ETAPAS`→`BLOQUES`,
    etapa = paso de una fase.
  - **Decisión del usuario:** "Mantener versión" **persiste**. Reafirmar appendea una versión con
    el contenido aprobado firmada por el equipo; por la regla que el store ya tenía
    (`borradorNuevo = aprobadaMasNueva && masNueva && !masNueva.approvedAt`) el conflicto se
    disuelve solo, **sin migración** y sin borrar lo que Claude escribió.
  - **Suite arreglada:** `makeTestDb()` levantaba una instancia PGlite entera por `beforeEach`.
    Ahora es una por archivo con `TRUNCATE ... RESTART IDENTITY CASCADE` (tablas leídas de
    `pg_tables`, así una tabla nueva queda cubierta sola) más `maxWorkers: 2`. De 170-270s con
    1-15 fallos por corrida, a **~40s y 474/474 estable**.

- **Quedó (deuda con nombre y dirección):**
  - `src/lib/deck/DeckDocument.tsx` conserva el `--ink` viejo (`#1a1510`) y un gris viejo: el PDF
    que descarga el estudio usa colores distintos a los del panel. El plan excluyó `lib/deck`
    explícitamente; son dos líneas.
  - `DeliverableDocument` y `DeliverablePanel` perdieron `shadow-sm` pero conservan
    `rounded-2xl` + borde + fondo blanco: siguen leyendo como tarjeta.
  - La ratificación se lee en la actividad como "guardó" + "aprobó", indistinguible de una
    escritura común. Pagable sin migrar con `author === 'humano'` + `versionDeOrigen(v) !== null`,
    que discrimina fuerte porque el MCP fuerza `author: 'claude'`.
  - `tienePostTaller` sigue hardcodeada en `false` (heredado): la fase Taller nunca se completa.
  - `estabilizar` quedó exportada en `store.ts` sin consumidor externo.

- **Lecciones que valen para la próxima ejecución:**
  - **Un test que protege el diseño viejo no es cobertura que haya que preservar.** Dar a la vez
    "no rompas los tests existentes" y "sacá la caja `bg-[#faf7ee]`" fue una instrucción
    contradictoria; el test afirmaba sobre la clase CSS que la tarea venía a retirar. Reescribirlo
    para medir semántica lo dejó **más fuerte**, no más débil.
  - **Verificaciones que mienten.** Aparecieron tres: `-t "tipograf"` nunca matcheaba el test real
    (el título lleva tilde) y devolvía 474 skipped con cara de PASS; el canario visual usaba lista
    blanca y no miraba `PhaseNote.tsx`, que tenía restos; y `poolOptions` en vitest 4 no se aplica.
    Moraleja: pedir siempre que se **pruebe que el test falla** cuando el defecto está presente.
  - **Tres corridas limpias no son prueba de un flake dependiente de carga.** Di por bueno un
    arreglo que sólo había movido el fallo del hook al cuerpo del test. Un implementador se negó
    a aceptar mi premisa y lo demostró corriendo aislados los archivos rojos.
  - **Partir las tareas grandes en varios commits salva trabajo:** dos sesiones se cortaron a
    mitad y lo commiteado sobrevivió.

- **Sigue:** revisión final de rama (en curso) → verificación manual del usuario en el navegador
  (checklist al final del plan: el clic sobre el botón `»` de la barra, que la entrevista pública
  no haya cambiado de aspecto, el layout de tres zonas, y móvil) → merge a `main`.

## 2026-08-11 — Fase 3 implementada + rediseño de la navegación (rama sin mergear)
- **Hecho:** pipeline de estrategia completo en `fase3-pipeline-estrategia` (14 etapas versionadas, MCP, panel, instrucciones — 10 tareas con revisión por subagentes + revisión final de rama). Tras el feedback de UX: cabecera por 3 grupos ("Entrevistas / Propuesta de valor" con tabs · Landscape · Estrategia), fase Entrega eliminada (era un cascarón), carril de estrategia agrupado desplegable con siguiente/anterior, y `pantallaActual` para que el punto de entrada al proyecto siga el avance fino. Migración 0003 ya aplicada a Neon; demo sembrada en Cafe Lunar.
- **Quedó:** rama sin mergear a la espera del visto bueno del usuario en el dev server (puerto 3001; el 3000 lo tomó otro proyecto). Minors aparcados con fallo en las revisiones (tablist sobre links, N+1 aceptado, `tienePostTaller` sigue hardcodeada false, breadcrumb con 14 fijo vs no_aplica).
- **Sigue:** recorrido del usuario → merge a main (deploy corre la migración, ya idempotente) → marcar checkboxes de etapa 3 en mission-control → adopción real del equipo.

## 2026-08-10 — MCP mergeado y en producción, con endurecimiento CSRF
- **Hecho:** `fase2-mcp-servidor` mergeado a `main` (fast-forward, 294 tests verdes) y desplegado: migraciones corren en el build (`vercel.json`), tablas OAuth creadas, metadata OAuth y 401 del MCP verificados en producción. La revisión de seguridad del push marcó CSRF en el consentimiento OAuth; no era explotable (cookie con `SameSite=Lax` explícito) pero se agregó la segunda capa: el POST exige `Origin` propio o devuelve 403 (TDD, 17 tests del archivo verdes). Central VALKYRIA: plan pusheado a `NeuralKaizen/mission-control`, el proyecto ya es visible en la plataforma.
- **Quedó:** el flake conocido de pglite bajo carga sigue apareciendo en corridas frías de la suite completa (verde al repetir). Vercel y el package.json ya dicen `mellowbanana-platform`, pero el proyecto Vercel sigue llamándose `forms-melo-banana` (el dominio no cambia).
- **Sigue:** restos del spec de fase 2 (PV post-taller versionada, catálogo del archivo) o directo al spec de fase 3 — a decidir en la próxima sesión.

## 2026-08-10 — Etapas reales definidas: rumbo a la Fase 3 (pipeline de estrategia)
- **Hecho:** plan maestro real en mission-control. Etapa 1 (entrevista + entregable pre-taller) cerrada; etapa 2 (landscape + columna vertebral) casi cerrada — falta mergear `fase2-mcp-servidor`, los restos del spec (PV post-taller versionada, catálogo del archivo) y la adopción real; etapa 3 = pipeline de estrategia sobre `docs/fase3/Procesos Estrategia y Naming.pdf` (bloques 0–5); etapa 4 (naming/copies) con alcance por confirmar.
- **Quedó:** ningún código tocado; el servidor MCP sigue sin mergear.
- **Sigue:** mergear el MCP a `main` y arrancar el spec de fase 3 (mapear los bloques del proceso a la regla produce/consume contexto).

## 2026-08-10 — Proyecto incorporado a la convención VALKYRIA
- **Hecho:** estructura `valkyria/` creada con `/mission init`. Rename completo: repo GitHub `forms-melo-banana` → `mellowbanana-platform`, directorio local `~/Lucianos/mellowbanana-platform`, remote `origin` y `name` de package.json actualizados.
- **Quedó:** plan maestro en etapa 0 (arranque).
- **Sigue:** definir las etapas reales del proyecto en su `plan.md`.
