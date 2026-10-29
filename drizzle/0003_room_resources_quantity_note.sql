ALTER TABLE "room_resources" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "room_resources" ADD COLUMN "note" varchar(200);--> statement-breakpoint
ALTER TABLE "room_resources" ADD CONSTRAINT "room_resources_quantity_range" CHECK ("room_resources"."quantity" between 1 and 99);