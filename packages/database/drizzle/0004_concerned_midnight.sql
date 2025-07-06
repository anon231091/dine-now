ALTER TABLE "telegram_groups" DROP CONSTRAINT "telegram_groups_chat_id_unique";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "updated_at";