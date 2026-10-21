CREATE TABLE "landscape_pasos" (
	"project_id" uuid NOT NULL,
	"paso" text NOT NULL,
	"hecho_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landscape_pasos_project_id_paso_pk" PRIMARY KEY("project_id","paso")
);
--> statement-breakpoint
CREATE TABLE "project_seguimiento" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"encargado" text,
	"notas" text,
	"fecha_entrega" text,
	"estado_manual" text,
	"fases" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "landscape_pasos" ADD CONSTRAINT "landscape_pasos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_seguimiento" ADD CONSTRAINT "project_seguimiento_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;