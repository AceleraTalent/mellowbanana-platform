// Crea en la base las tablas que el código necesita y que todavía no existen. Corre antes
// del build en Vercel, con el DATABASE_URL del proyecto: así una tabla nueva llega a
// producción sin que nadie tenga que correr `db:push` a mano con la clave de la base.
//
// Sólo crea: `CREATE TABLE IF NOT EXISTS`, nunca altera ni borra nada. Es el mismo SQL que
// generó drizzle-kit (drizzle/0004_pasos_y_seguimiento.sql), con las claves foráneas dentro
// del CREATE para que repetirlo no falle. Fuera de Vercel no hace nada: los builds locales
// no tienen la base de producción.
import { neon } from '@neondatabase/serverless'

if (!process.env.VERCEL) {
  console.log('asegurar-tablas: fuera de Vercel, no hay nada que crear.')
  process.exit(0)
}
if (!process.env.DATABASE_URL) {
  console.error('asegurar-tablas: falta DATABASE_URL en el proyecto de Vercel.')
  process.exit(1)
}

const TABLAS = {
  landscape_pasos: `
    CREATE TABLE IF NOT EXISTS "landscape_pasos" (
      "project_id" uuid NOT NULL,
      "paso" text NOT NULL,
      "hecho_por" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "landscape_pasos_project_id_paso_pk" PRIMARY KEY("project_id","paso"),
      CONSTRAINT "landscape_pasos_project_id_projects_id_fk" FOREIGN KEY ("project_id")
        REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action
    )`,
  project_seguimiento: `
    CREATE TABLE IF NOT EXISTS "project_seguimiento" (
      "project_id" uuid PRIMARY KEY NOT NULL,
      "encargado" text,
      "notas" text,
      "fecha_entrega" text,
      "estado_manual" text,
      "fases" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "project_seguimiento_project_id_projects_id_fk" FOREIGN KEY ("project_id")
        REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action
    )`,
}

const sql = neon(process.env.DATABASE_URL)
for (const [nombre, ddl] of Object.entries(TABLAS)) {
  const [{ existe }] = await sql.query('select to_regclass($1) is not null as existe', [`public.${nombre}`])
  if (existe) {
    console.log(`asegurar-tablas: ${nombre} ya existe.`)
    continue
  }
  await sql.query(ddl)
  console.log(`asegurar-tablas: creé ${nombre}.`)
}
