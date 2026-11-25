CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"legal_name" text NOT NULL,
	"siret" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_contact" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"is_signer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freelancer_profile" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"legal_name" text NOT NULL,
	"legal_form" text,
	"siret" text,
	"address" text,
	"vat_number" text,
	"logo_path" text,
	"brand_color" text DEFAULT '#0f172a' NOT NULL,
	"holiday_territory" text DEFAULT 'metropole' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "freelancer_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "mission" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"purchase_order_ref" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"tjm_cents" integer NOT NULL,
	"unit" text DEFAULT 'day' NOT NULL,
	"hours_per_day" numeric(4, 2) DEFAULT '7' NOT NULL,
	"day_cap" integer,
	"holiday_territory" text DEFAULT 'metropole' NOT NULL,
	"default_signer_id" uuid,
	"export_template_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contact" ADD CONSTRAINT "client_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contact" ADD CONSTRAINT "client_contact_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelancer_profile" ADD CONSTRAINT "freelancer_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission" ADD CONSTRAINT "mission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission" ADD CONSTRAINT "mission_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission" ADD CONSTRAINT "mission_default_signer_id_client_contact_id_fk" FOREIGN KEY ("default_signer_id") REFERENCES "public"."client_contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_user_id_idx" ON "client" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_contact_client_id_idx" ON "client_contact" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_contact_user_id_idx" ON "client_contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mission_user_id_idx" ON "mission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mission_client_id_idx" ON "mission" USING btree ("client_id");