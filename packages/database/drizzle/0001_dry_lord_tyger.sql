ALTER TABLE "tables" DROP CONSTRAINT "tables_qr_code_unique";--> statement-breakpoint
DROP INDEX "tables_qr_code_idx";--> statement-breakpoint
ALTER TABLE "tables" DROP COLUMN "qr_code";