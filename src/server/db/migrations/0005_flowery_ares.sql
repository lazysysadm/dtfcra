CREATE TABLE "export_template" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"file_path" text NOT NULL,
	"mapping" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "export_template" ADD CONSTRAINT "export_template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission" ADD CONSTRAINT "mission_export_template_id_export_template_id_fk" FOREIGN KEY ("export_template_id") REFERENCES "public"."export_template"("id") ON DELETE set null ON UPDATE no action;