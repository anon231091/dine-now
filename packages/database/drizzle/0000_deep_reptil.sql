CREATE TYPE "public"."item_size" AS ENUM('small', 'regular', 'large');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."spice_level" AS ENUM('none', 'regular', 'spicy', 'very_spicy');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'manager', 'kitchen', 'service');--> statement-breakpoint
CREATE TABLE "kitchen_loads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"current_orders" integer DEFAULT 0 NOT NULL,
	"average_preparation_time" integer DEFAULT 15 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_kh" varchar(100),
	"description" text,
	"description_kh" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"size" "item_size" NOT NULL,
	"name" varchar(50),
	"name_kh" varchar(50),
	"price" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "menu_item_size_unique" UNIQUE("menu_item_id","size")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_kh" varchar(100),
	"description" text,
	"description_kh" text,
	"image_url" text,
	"preparation_time_minutes" integer DEFAULT 15 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"spice_level" "spice_level" DEFAULT 'none',
	"notes" text,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_telegram_id" bigint NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"order_number" varchar(20) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"estimated_preparation_minutes" integer NOT NULL,
	"actual_preparation_minutes" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"ready_at" timestamp,
	"served_at" timestamp,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_kh" varchar(100),
	"description" text,
	"description_kh" text,
	"address" text NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"telegram_id" bigint NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50),
	"username" varchar(50),
	"role" "staff_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_telegram_unique" UNIQUE("restaurant_id","telegram_id")
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"number" varchar(10) NOT NULL,
	"qr_code" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tables_qr_code_unique" UNIQUE("qr_code"),
	CONSTRAINT "restaurant_table_unique" UNIQUE("restaurant_id","number")
);
--> statement-breakpoint
ALTER TABLE "kitchen_loads" ADD CONSTRAINT "kitchen_loads_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kitchen_loads_restaurant_idx" ON "kitchen_loads" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "kitchen_loads_last_updated_idx" ON "kitchen_loads" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "menu_categories_restaurant_idx" ON "menu_categories" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_categories_sort_order_idx" ON "menu_categories" USING btree ("restaurant_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_categories_name_idx" ON "menu_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "menu_item_variants_menu_item_idx" ON "menu_item_variants" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_item_variants_size_idx" ON "menu_item_variants" USING btree ("size");--> statement-breakpoint
CREATE INDEX "menu_item_variants_price_idx" ON "menu_item_variants" USING btree ("price");--> statement-breakpoint
CREATE INDEX "menu_item_variants_available_idx" ON "menu_item_variants" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "menu_item_variants_default_idx" ON "menu_item_variants" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "menu_item_variants_sort_order_idx" ON "menu_item_variants" USING btree ("menu_item_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_idx" ON "menu_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_available_idx" ON "menu_items" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "menu_items_name_idx" ON "menu_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "menu_items_sort_order_idx" ON "menu_items" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_menu_item_idx" ON "order_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "orders_customer_telegram_idx" ON "orders" USING btree ("customer_telegram_id");--> statement-breakpoint
CREATE INDEX "orders_restaurant_idx" ON "orders" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "orders_table_idx" ON "orders" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_status_restaurant_idx" ON "orders" USING btree ("status","restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurants_name_idx" ON "restaurants" USING btree ("name");--> statement-breakpoint
CREATE INDEX "restaurants_phone_idx" ON "restaurants" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "staff_restaurant_idx" ON "staff" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "staff_telegram_idx" ON "staff" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX "staff_role_idx" ON "staff" USING btree ("role");--> statement-breakpoint
CREATE INDEX "tables_qr_code_idx" ON "tables" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "tables_restaurant_idx" ON "tables" USING btree ("restaurant_id");