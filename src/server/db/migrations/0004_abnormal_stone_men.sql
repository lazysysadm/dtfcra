ALTER TABLE "mission" DROP CONSTRAINT "mission_default_signer_id_client_contact_id_fk";
--> statement-breakpoint
DROP INDEX "timesheet_mission_period_version_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "timesheet_mission_period_idx" ON "timesheet" USING btree ("mission_id","year","month");--> statement-breakpoint
ALTER TABLE "client_contact" DROP COLUMN "is_signer";--> statement-breakpoint
ALTER TABLE "mission" DROP COLUMN "purchase_order_ref";--> statement-breakpoint
ALTER TABLE "mission" DROP COLUMN "day_cap";--> statement-breakpoint
ALTER TABLE "mission" DROP COLUMN "default_signer_id";--> statement-breakpoint
ALTER TABLE "timesheet" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "timesheet" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "timesheet" DROP COLUMN "submitted_at";--> statement-breakpoint
ALTER TABLE "timesheet" DROP COLUMN "validated_at";--> statement-breakpoint
ALTER TABLE "timesheet" DROP COLUMN "locked_at";--> statement-breakpoint
ALTER TABLE "timesheet" DROP COLUMN "pdf_sha256";