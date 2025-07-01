CREATE TYPE "public"."telegram_group_type" AS ENUM('management', 'kitchen', 'service');--> statement-breakpoint
CREATE TABLE "telegram_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" bigint NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"group_type" "telegram_group_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_groups_chat_id_unique" UNIQUE("chat_id"),
	CONSTRAINT "restaurant_telegram_group_unique" UNIQUE("restaurant_id","group_type")
);
--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "telegram_groups" ADD CONSTRAINT "telegram_groups_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_groups_restaurant_idx" ON "telegram_groups" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "telegram_groups_chat_idx" ON "telegram_groups" USING btree ("chat_id");--> statement-breakpoint
ALTER TABLE "staff" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "staff" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "staff" DROP COLUMN "username";