# Decisiones — mellowbanana-platform

Entradas nuevas arriba. Formato: ver CONVENCION.md. Solo decisiones no triviales: si fue obvio o es fácilmente reversible, no va acá.

## 2026-10-22 — La fase de cualquier cliente se puede poner a mano

**Qué:** el tablero y el modal mueven cualquier cliente, también los que hacen su proceso en la
plataforma. Moverlo deja `fase_a_mano`: la fase es la que puso el equipo (y Landscape y Estrategia
siguen mostrando su avance real) hasta que alguien elija "Volver a calcularla sola".

**Por qué:** el estudio usa el tablero como su CRM, igual que Notion; que algunas tarjetas no se
pudieran mover se vivió como un error, no como una regla. La plataforma sigue siendo la verdad del
avance, pero el que decide dónde está el cliente es el equipo.

**Qué se descartó:** mantener la fase calculada intocable (la regla del 2026-10-21, revertida) y
pasar a "por fuera" a todo cliente movido (perdía el menú de la plataforma y el cálculo).

## 2026-10-21 — Clientes por fuera: el panel reemplaza al Tráfico de Notion

**Qué:** un cliente puede llevar su proceso por fuera de la plataforma (`project_seguimiento.por_fuera`).
Esos clientes se crean desde el panel o desde el chat (`actualizar_cliente`) sin entrevista, sus cinco
fases son las que marca el equipo y se mueven como en Notion: arrastrando la tarjeta en la vista
Tablero, con "Mover a" o desde su ficha. Mover a una fase deja lo anterior terminado y lo siguiente
sin empezar. Los clientes que hacen su proceso acá no cambian: Landscape y Estrategia se calculan
solos y no se mueven a mano. El orden de las fases pasó a Taller → Landscape → Estrategia → Naming
→ Diseño, el del cronograma del estudio en Notion (el Naming va después de la Estrategia).

**Por qué:** el estudio pidió traer sus clientes de Notion y la mayoría (Viajero, GWS, Smile, Píntala…)
nunca pasó por la plataforma. Calcularles fases desde datos vacíos los mostraba como "Sin
entrevistas"; dejarlos afuera mantenía dos tableros. Marcarlos "por fuera" deja un solo tablero con
dos tipos de cliente honestos.

**Qué se descartó:** fases manuales para todos los clientes (el tablero podría decir algo distinto de
lo que de verdad se aprobó), una fase "Artes finales" aparte (Feedback, Entregables y Campaña de Notion
quedan en Diseño con la nota que dice en qué andaban; se suma si el estudio la pide) y un importador
de CSV en el panel (la carga fue una vez; para lo demás está el chat).

## 2026-10-21 — Una cuenta por persona, sin correo, y la llave maestra de respaldo

**Qué:** cada persona del equipo entra con usuario y clave (tabla `usuarios`, clave derivada
con scrypt). Las cuentas las crea quien administra desde `/admin/equipo` y le pasa a cada uno
su usuario y su clave por donde quiera; cada quien cambia la suya. `ADMIN_PASSWORD` queda como
llave maestra: recupera el acceso y crea las primeras cuentas. La sesión es una cookie firmada
(HMAC con `SESSION_SECRET` o, si no está, la llave maestra) que dice quién entró; cada acción
confirma contra la base que la cuenta siga activa. Las aprobaciones guardan quién las hizo
(`approved_by`), tomado de la sesión y nunca del body.

**Por qué:** el estudio pidió "una llave por persona" y nada de correos ("lo complica
demasiado"). Antes la cookie guardaba la clave compartida tal cual y el historial decía
"Equipo" para todo.

**Qué se descartó:** entrar con Google o con link al correo (dependen de configurar servicios
externos); sesiones en tabla (una consulta por página en el proxy, sin ganar nada a esta
escala). Cambiar la llave maestra cierra todas las sesiones: es a propósito.

## 2026-10-21 — A producción con Geist mientras se aclara la licencia de Favorit

**Qué:** titulares y rótulos salen en Geist (Bold) y Geist Mono, cargadas desde Google con
`next/font/google`, en lugar de ABC Favorit. `.font-serif` fuerza Bold para que la jerarquía
quede igual que con Favorit, que sólo vino en ese peso. El cambio vive en `layout.tsx` y
`globals.css`; volver a Favorit es revertir esos dos archivos cuando lleguen los WOFF2.

**Por qué:** el equipo necesitaba el panel nuevo en producción y la rama no buildaba en un
clon limpio (las OTF están gitignoreadas, ver la decisión del 2026-08-27). Esperar la licencia
dejaba al equipo sin los cambios; Geist ya era la fuente del cuerpo y no requiere binarios.

**Qué se descartó:** esperar la licencia web; y meter las fuentes al deploy por otra vía
(repo privado, hosting aparte), que sigue siendo decisión del estudio.

## 2026-08-27 — Las fuentes con licencia no entran a un repo público

**Qué:** las OTF de ABC Favorit viven sólo en la copia local (`src/app/fonts/`, gitignoreado
junto con `docs/design/`). El código que las referencia sí está versionado; los binarios no. Se
reinstalan con `unzip -j "docs/design/ABC Favorit.zip" "ABC Favorit/*.otf" -d src/app/fonts`.

**Por qué:** `NeuralKaizen/mellowbanana-platform` es público. Commitear una tipografía comercial
ahí la deja descargable por cualquiera y clonada en cada fork —irreversible, porque el historial
de git y las cachés de GitHub no se borran—, que es exactamente lo que prohíbe la licencia de la
fundición. Aparte hay un problema anterior sin resolver: el zip que llegó son **OTF de escritorio**,
y `next/font/local` las republica en `/_next/static/media`, o sea que el deploy ya las expone
aunque el repo no. Falta confirmar con el estudio qué licencia se compró.

**Qué se descartó:** commitearlas igual y arreglarlo después (el historial no se limpia sin
reescribir la rama en un repo con forks); y hacer el repo privado en el momento, que es la salida
más simple pero es decisión del estudio, no de una sesión de código. Mientras tanto el trabajo
vive en la rama `diseno/favorit-fcf251`, que **no builda** en un clon limpio hasta que las fuentes
estén resueltas: `main` queda intacta y deployable a propósito.

## 2026-08-27 — Favorit Bold para titulares, Geist para cuerpo, Mono para rótulos

**Qué:** el hueco `font-serif` de Tailwind —que tenía Fraunces— pasa a ABC Favorit Bold, y
`font-mono` a ABC Favorit Mono. El cuerpo de texto sigue en Geist. Los 36 rótulos en versalitas
del panel y la entrevista ganaron `font-mono`.

**Por qué:** la licencia que llegó trae **un solo peso de la sans** (Bold) y las cuatro variantes
de la Mono. Con un peso no se sostiene texto corrido: las preguntas de la entrevista, las
respuestas normalizadas y el documento entregable son párrafos largos que necesitan la familia
completa, y Geist ya la tiene. Reutilizar el nombre `font-serif` en vez de renombrarlo a
`font-display` evita tocar ~30 archivos para un cambio puramente nominal; queda comentado en
`globals.css` para que no se lea como un descuido. Va con `font-synthesis-weight: none` en el
`body`: sin eso el navegador falsifica los pesos que le piden los titulares (`font-medium`,
`font-normal`) sobre la única cara disponible y los engorda.

**Qué se descartó:** poner el cuerpo en Favorit Mono Book —da el look de estudio pero castiga la
lectura de párrafos largos, que es el 80% de esta plataforma—, y esperar al peso Regular de la
sans antes de aplicar nada.

## 2026-08-27 — Los derivados del amarillo se recalculan, no se heredan

**Qué:** al pasar `--banana` de `#FFD400` a `#fcf251` se recalcularon con él `--aprobado`
(`#FFF3B8` → `#FEFBCE`), el chip de "crea un beneficio" (`#fbeecb` → `#FEF9B1`) y los textos que
van encima (`#8a6d0f`/`#8a6d10` → `#6b6610`). El rótulo de acento `#b08a1e` pasó a `#7d7710`.

**Por qué:** esos valores eran tintes del amarillo viejo, que era más cálido y anaranjado; al lado
del lima nuevo quedaban sucios. `--aprobado` se rehízo con la misma receta que lo generó (28% del
amarillo sobre blanco). El `#b08a1e` además daba 3.17:1 sobre crema a 10-11px, por debajo de AA;
el reemplazo da 4.56:1, y el `#6b6610` sobre chip da 5.63:1.

**Qué se descartó:** dejar los derivados como estaban —el amarillo nuevo contra los tintes cálidos
lee como error de impresión, no como paleta—, y rebajar el contraste para conservar el tono dorado.

## 2026-08-25 — `wrap={false}` solo sobre contenido de alto acotado, nunca sobre texto del LLM

**Qué:** en los documentos de react-pdf, `wrap={false}` queda reservado para bloques cuyo alto
conocemos y es chico (una fila de chips, una cabecera). Todo lo que sea texto libre —respuestas
de entrevista normalizadas, salidas del modelo— va partible, y la protección contra huérfanos se
hace con `minPresenceAhead`, que reserva puntos por delante en vez de prohibir el corte.

**Por qué:** `wrap={false}` no es una preferencia de maquetación, es una restricción dura. Cuando
el bloque no entra en el espacio restante, react-pdf lo empuja entero y deja un hueco; cuando no
entra ni en una página completa, no tiene a dónde empujarlo y lo dibuja desbordado, con lo que
sigue encima. Ninguno de los dos casos aparece con el contenido de ejemplo: aparecen recién con
una respuesta real larga, ya en manos del cliente. Es la segunda vez que el mismo bug se cobra un
entregable (antes en el deck, ahora en el brief), así que la regla se escribe en vez de
redescubrirse.

**Qué se descartó:** mantener el `wrap={false}` y recortar o paginar las respuestas a mano —el
texto es del entrevistado y no nos toca decidir dónde se corta. También quedó descartado testear
esto sólo contando páginas: se verificó empíricamente en el deck que el conteo no discrimina el
bug. La maquetación se mide leyendo la posición real de cada línea en el PDF de salida
(`src/lib/pdf/inspect.ts`), que es la única forma de ver el layout que react-pdf no expone.

## 2026-08-21 — El proyecto abre con el trabajo, no con la estructura

**Qué:** la portada del proyecto (`/admin/projects/[id]`) es la mesa de trabajo: decisiones pendientes con link directo, actividad reciente, y el recorrido plegado en tres tarjetas de fase. Ya no redirige a la etapa actual.

**Por qué:** en este flujo Claude escribe por MCP y el equipo decide: la pregunta al entrar no es "¿cómo navego 23 etapas?" sino "¿qué me toca?". El feedback del estudio ("cluster de información, difícil de navegar") pedía menos menú, no otro dibujo del mismo menú. Todas las señales ya existían (`esperanDecision`, `attentionItems`, actividad por versiones): la mesa las asciende de widget a portada.

**Qué se descartó:** las otras dos alternativas presentadas — fases como pestañas (B, sigue disponible como evolución del chrome de etapas) y dos intentos de línea/mapa del recorrido, que o no eran navegables (puntos sin nombre) o convergían con B. También se descartó quitar ya el índice lateral de las pantallas de etapa: la mesa entra como puerta sin romper el hábito, y el chrome de etapas se decide después con el estudio.

## 2026-08-21 — La empresa tipeada nunca pisa un proyecto ya asignado; el link manda

**Qué:** una sesión con `projectId` (por link `/?p=` o movida a mano desde el panel) conserva ese proyecto para siempre: la auto-asignación por nombre de empresa corre solo sobre sesiones sin proyecto, y el cierre de entrevista es idempotente (solo la primera completada tiene efectos: asignar, avisar por correo).

**Por qué:** el proyecto salía de texto libre del entrevistado, y el cierre re-asignaba en cada disparo — cualquier re-entrada al link deshacía el movimiento manual del equipo. La fuente de verdad correcta es la intención del estudio (el link que mandó, o a dónde movió la entrevista), no la ortografía del entrevistado.

**Qué se descartó:** matching difuso de nombres de empresa contra proyectos existentes (mágico y con falsos positivos entre marcas parecidas), y un campo "proyecto" visible en el formulario del entrevistado (el entrevistado no tiene por qué conocer la taxonomía interna del estudio). También un flag "asignada a mano" en la fila: con la regla "solo asignar cuando no hay proyecto" alcanza y no hay migración.

## 2026-08-10 — CSRF del consentimiento OAuth: verificación de Origin, no token sincronizador

**Qué:** el POST de `/api/oauth/authorize` rechaza con 403 cualquier pedido cuyo header `Origin` falte o no coincida en host con la URL propia. Se comparan hosts y no origins completos porque detrás del proxy de Vercel el protocolo de `req.url` no es de fiar.

**Por qué:** la revisión de seguridad del push marcó que emitir el código de autorización dependía de una sola defensa (la cookie `admin` con `SameSite=Lax`). Lax explícito ya bloquea el POST cross-site en navegadores modernos —el hallazgo no era explotable hoy—, pero el endpoint expone datos de marcas de terceros y la BCP de OAuth pide que el consentimiento se defienda solo. Los navegadores mandan `Origin` siempre en los POST, y este endpoint solo lo consume el formulario de consentimiento propio: exigirlo no rompe ningún cliente legítimo.

**Qué se descartó:** el token CSRF sincronizador (hidden field + cookie firmada) — más estado y más código para el mismo efecto en este flujo, donde no hay subdominios ni contenido de terceros en el origen propio. El orden de chequeos quedó: sesión (401) antes que Origin (403), para no cambiar el contrato existente del endpoint.
