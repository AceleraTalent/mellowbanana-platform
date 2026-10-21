CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"usuario" text NOT NULL,
	"clave_hash" text NOT NULL,
	"es_admin" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"avisos_vistos_hasta" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_usuario" UNIQUE("usuario")
);
--> statement-breakpoint
ALTER TABLE "landscape_versions" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "strategy_versions" ADD COLUMN "approved_by" text;