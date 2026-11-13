ALTER TABLE "project_seguimiento" ADD COLUMN "fecha_inicio" text;--> statement-breakpoint
ALTER TABLE "project_seguimiento" ADD COLUMN "valor" bigint;--> statement-breakpoint
ALTER TABLE "project_seguimiento" ADD COLUMN "tareas" jsonb DEFAULT '{}'::jsonb NOT NULL;