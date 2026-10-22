CREATE TABLE "cliente_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"autor" text NOT NULL,
	"texto" text NOT NULL,
	"desde" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cliente_comentarios" ADD CONSTRAINT "cliente_comentarios_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cliente_comentarios_project" ON "cliente_comentarios" USING btree ("project_id","created_at");