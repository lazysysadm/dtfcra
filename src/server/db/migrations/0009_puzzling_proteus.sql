ALTER TABLE "timesheet" DROP CONSTRAINT "timesheet_mission_id_mission_id_fk";
--> statement-breakpoint
DROP INDEX "audit_log_user_id_idx";--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
UPDATE "audit_log" SET "user_id" = NULL WHERE "user_id" IS NOT NULL AND "user_id" NOT IN (SELECT "id" FROM "user");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_created_idx" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "timesheet_entry_user_date_idx" ON "timesheet_entry" USING btree ("user_id","date");--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_month_check" CHECK ("timesheet"."month" between 1 and 12);--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_year_check" CHECK ("timesheet"."year" between 2000 and 2100);--> statement-breakpoint
ALTER TABLE "timesheet_entry" ADD CONSTRAINT "timesheet_entry_quantity_check" CHECK ("timesheet_entry"."quantity" >= 0 and "timesheet_entry"."quantity" <= 24);