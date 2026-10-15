CREATE TYPE "public"."reservation_status" AS ENUM('CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'CONFIRMED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_time_order" CHECK ("reservations"."end_at" > "reservations"."start_at"),
	CONSTRAINT "reservations_duration_valid" CHECK ("reservations"."end_at" - "reservations"."start_at" between interval '15 minutes' and interval '4 hours')
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "room_resources" (
	"room_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	CONSTRAINT "room_resources_room_id_resource_id_pk" PRIMARY KEY("room_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"capacity" integer NOT NULL,
	"location" varchar(200),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_capacity_positive" CHECK ("rooms"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_resources" ADD CONSTRAINT "room_resources_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_resources" ADD CONSTRAINT "room_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservations_user_id_start_at_idx" ON "reservations" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE INDEX "reservations_room_id_start_at_idx" ON "reservations" USING btree ("room_id","start_at");--> statement-breakpoint
CREATE INDEX "room_resources_resource_id_idx" ON "room_resources" USING btree ("resource_id");