import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["USER", "ADMIN"]);
export const reservationStatus = pgEnum("reservation_status", [
  "CONFIRMED",
  "CANCELLED",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    // Nunca a senha: apenas o hash (BCrypt/Argon2).
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("USER"),
    ...timestamps,
  },
  (t) => [check("users_email_lowercase", sql`${t.email} = lower(${t.email})`)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    capacity: integer("capacity").notNull(),
    location: varchar("location", { length: 200 }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [check("rooms_capacity_positive", sql`${t.capacity} > 0`)],
);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// Muitos para muitos: uma sala tem vários recursos e um recurso está em várias salas.
export const roomResources = pgTable(
  "room_resources",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.resourceId] }),
    index("room_resources_resource_id_idx").on(t.resourceId),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: reservationStatus("status").notNull().default("CONFIRMED"),
    ...timestamps,
  },
  (t) => [
    check("reservations_time_order", sql`${t.endAt} > ${t.startAt}`),
    check(
      "reservations_duration_valid",
      sql`${t.endAt} - ${t.startAt} between interval '15 minutes' and interval '4 hours'`,
    ),
    index("reservations_user_id_start_at_idx").on(t.userId, t.startAt),
    index("reservations_room_id_start_at_idx").on(t.roomId, t.startAt),
  ],
);
