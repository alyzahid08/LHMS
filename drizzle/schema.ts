import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "resident"]);
export const residentStatus = pgEnum("resident_status", ["active", "checked_out"]);
export const roomType = pgEnum("room_type", ["single", "two_sharing", "three_sharing", "attached_bath"]);
export const paymentMethod = pgEnum("payment_method", ["cash", "bank_transfer", "card", "other"]);
export const complaintCategory = pgEnum("complaint_category", ["ac", "electricity", "plumbing", "wifi", "cleaning", "other"]);
export const complaintStatus = pgEnum("complaint_status", ["pending", "in_progress", "resolved"]);
export const approvalStatus = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const noticeStatus = pgEnum("notice_status", ["draft", "published"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 128 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }).default("local"),
  role: userRole("role").default("resident").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomNumber: varchar("room_number", { length: 24 }).notNull().unique(),
  roomType: roomType("room_type").notNull(),
  totalBeds: integer("total_beds").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const beds = pgTable(
  "beds",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull().references(() => rooms.id, { onDelete: "restrict" }),
    bedNumber: varchar("bed_number", { length: 24 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex("beds_room_bed_number_unique").on(table.roomId, table.bedNumber)],
);

export const residents = pgTable(
  "residents",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").unique().references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    cnicEncrypted: text("cnic_encrypted").notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    guardianName: text("guardian_name"),
    guardianPhone: varchar("guardian_phone", { length: 40 }),
    instituteName: text("institute_name"),
    instituteId: varchar("institute_id", { length: 80 }),
    admissionDate: date("admission_date").notNull(),
    currentRoomId: integer("current_room_id").references(() => rooms.id, { onDelete: "set null" }),
    currentBedId: integer("current_bed_id").unique().references(() => beds.id, { onDelete: "set null" }),
    monthlyRent: numeric("monthly_rent", { precision: 12, scale: 2 }).notNull(),
    status: residentStatus("status").default("active").notNull(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex("residents_cnic_unique").on(table.cnicEncrypted)],
);

export const roomAssignments = pgTable("room_assignments", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").notNull().references(() => residents.id, { onDelete: "restrict" }),
  roomId: integer("room_id").notNull().references(() => rooms.id, { onDelete: "restrict" }),
  bedId: integer("bed_id").notNull().references(() => beds.id, { onDelete: "restrict" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  assignedBy: integer("assigned_by").references(() => users.id, { onDelete: "set null" }),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").notNull().references(() => residents.id, { onDelete: "restrict" }),
  rentalMonth: varchar("rental_month", { length: 7 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  method: paymentMethod("method").notNull(),
  reference: varchar("reference", { length: 100 }),
  note: text("note"),
  recordedBy: integer("recorded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").notNull().references(() => residents.id, { onDelete: "restrict" }),
  category: complaintCategory("category").notNull(),
  description: text("description").notNull(),
  status: complaintStatus("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").notNull().references(() => residents.id, { onDelete: "restrict" }),
  visitorName: text("visitor_name").notNull(),
  cnicEncrypted: text("cnic_encrypted"),
  phone: varchar("phone", { length: 40 }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(),
  requestedByResident: boolean("requested_by_resident").default(false).notNull(),
  approvalStatus: approvalStatus("approval_status").default("pending").notNull(),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  entryTime: timestamp("entry_time", { withTimezone: true }),
  exitTime: timestamp("exit_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  status: noticeStatus("status").default("draft").notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: integer("entity_id"),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
