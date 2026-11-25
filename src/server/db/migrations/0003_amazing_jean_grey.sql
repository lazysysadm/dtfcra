CREATE TABLE "timesheet" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"mission_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"global_comment" text,
	"submitted_at" timestamp with time zone,
	"validated_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"pdf_sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_entry" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"date" date NOT NULL,
	"quantity" numeric(4, 2) NOT NULL,
	"type" text DEFAULT 'worked' NOT NULL,
	"comment" text
);
--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entry" ADD CONSTRAINT "timesheet_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entry" ADD CONSTRAINT "timesheet_entry_timesheet_id_timesheet_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "timesheet_mission_period_version_idx" ON "timesheet" USING btree ("mission_id","year","month","version");--> statement-breakpoint
CREATE INDEX "timesheet_user_id_idx" ON "timesheet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "timesheet_mission_id_idx" ON "timesheet" USING btree ("mission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timesheet_entry_timesheet_date_idx" ON "timesheet_entry" USING btree ("timesheet_id","date");--> statement-breakpoint
CREATE INDEX "timesheet_entry_timesheet_id_idx" ON "timesheet_entry" USING btree ("timesheet_id");