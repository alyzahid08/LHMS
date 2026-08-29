import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME } from "../../shared/const";
import {
  activityLog,
  beds,
  complaints,
  notices,
  payments,
  residents,
  roomAssignments,
  rooms,
  users,
  visitors,
} from "../../drizzle/schema";
import { getDb, getUserByUsername } from "../db";
import { bedAssignmentConflict, calculatePaymentStatus, canTransitionComplaint, residentOwnsProfile } from "../domainRules";
import { decryptSensitive, encryptSensitive, maskIdentity } from "../security";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM format.");
const residentInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  cnic: z.string().trim().min(5).max(30),
  phone: z.string().trim().min(7).max(40),
  guardianName: z.string().trim().max(120).optional(),
  guardianPhone: z.string().trim().max(40).optional(),
  instituteName: z.string().trim().max(160).optional(),
  instituteId: z.string().trim().max(80).optional(),
  admissionDate: z.string().date(),
  monthlyRent: z.coerce.number().positive().max(10000000),
  username: z.string().trim().toLowerCase().min(3).max(64).regex(/^[a-z0-9._-]+$/),
  temporaryPassword: z.string().min(10).max(128),
});

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Levelose PostgreSQL is not configured. Add LEVELOSE_DATABASE_URL and run migrations." });
  return db;
}

async function logActivity(actorId: number | null, action: string, entityType: string, entityId: number | null, summary: string) {
  const db = await requireDb();
  await db.insert(activityLog).values({ actorId, action, entityType, entityId, summary });
}

async function currentResidentForUser(userId: number) {
  const db = await requireDb();
  const record = await db.select().from(residents).where(eq(residents.userId, userId)).limit(1);
  if (!record[0]) throw new TRPCError({ code: "FORBIDDEN", message: "No resident profile is linked to this account." });
  if (!residentOwnsProfile(userId, record[0].userId)) throw new TRPCError({ code: "FORBIDDEN", message: "Resident profile ownership could not be verified." });
  return record[0];
}

function memberView(resident: typeof residents.$inferSelect) {
  return {
    ...resident,
    cnic: maskIdentity(decryptSensitive(resident.cnicEncrypted)),
    cnicEncrypted: undefined,
  };
}

export const leveloseRouter = router({
  auth: router({
    setupStatus: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { databaseConfigured: false, adminExists: false };
      const result = await db.select({ total: count() }).from(users).where(eq(users.role, "admin"));
      return { databaseConfigured: true, adminExists: Number(result[0]?.total ?? 0) > 0 };
    }),
    login: publicProcedure.input(z.object({ username: z.string().trim().toLowerCase(), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (!(await getDb())) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Local PostgreSQL is not configured. Set LEVELOSE_DATABASE_URL, run the migration, and create the first administrator before signing in." });
      const user = await getUserByUsername(input.username);
      if (!user || !user.passwordHash || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password." });
      }
      const token = await sdk.createSessionToken(user.openId, { name: user.name || user.username || "Levelose user", expiresInMs: 1000 * 60 * 60 * 12 });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 12 });
      await logActivity(user.id, "signed_in", "user", user.id, `${user.name || user.username} signed in.`);
      return { success: true, role: user.role };
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await getUserByUsername(ctx.user.username || "");
      if (!user?.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      const db = await requireDb();
      await db.update(users).set({ passwordHash: await bcrypt.hash(input.newPassword, 12), updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
      await logActivity(ctx.user.id, "changed_password", "user", ctx.user.id, "Password was changed.");
      return { success: true };
    }),
  }),
  dashboard: router({
    summary: adminProcedure.query(async () => {
      const db = await requireDb();
      const [residentCount, roomCount, bedCount, occupiedCount, complaintCount, recent] = await Promise.all([
        db.select({ total: count() }).from(residents).where(eq(residents.status, "active")),
        db.select({ total: count() }).from(rooms),
        db.select({ total: count() }).from(beds).where(eq(beds.isActive, true)),
        db.select({ total: count() }).from(residents).where(and(eq(residents.status, "active"), sql`${residents.currentBedId} is not null`)),
        db.select({ total: count() }).from(complaints).where(inArray(complaints.status, ["pending", "in_progress"])),
        db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(8),
      ]);
      const month = new Date().toISOString().slice(0, 7);
      const active = await db.select({ id: residents.id, monthlyRent: residents.monthlyRent }).from(residents).where(eq(residents.status, "active"));
      const paid = await db.select({ residentId: payments.residentId, amount: payments.amount }).from(payments).where(eq(payments.rentalMonth, month));
      const totals = new Map<number, number>();
      paid.forEach(record => totals.set(record.residentId, (totals.get(record.residentId) || 0) + Number(record.amount)));
      const pendingPayments = active.filter(resident => (totals.get(resident.id) || 0) < Number(resident.monthlyRent)).length;
      const totalBeds = Number(bedCount[0]?.total || 0);
      const occupiedBeds = Number(occupiedCount[0]?.total || 0);
      return {
        residents: Number(residentCount[0]?.total || 0), rooms: Number(roomCount[0]?.total || 0), totalBeds, occupiedBeds,
        availableBeds: Math.max(0, totalBeds - occupiedBeds), pendingPayments, pendingComplaints: Number(complaintCount[0]?.total || 0), recent,
      };
    }),
  }),
  residents: router({
    list: adminProcedure.input(z.object({ search: z.string().trim().optional(), status: z.enum(["active", "checked_out"]).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(50).default(10) }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      const filters = [];
      if (input?.status) filters.push(eq(residents.status, input.status));
      if (input?.search) filters.push(ilike(residents.fullName, `%${input.search}%`));
      const where = filters.length ? and(...filters) : undefined;
      const records = await db.select({ resident: residents, roomNumber: rooms.roomNumber, bedNumber: beds.bedNumber }).from(residents).leftJoin(rooms, eq(residents.currentRoomId, rooms.id)).leftJoin(beds, eq(residents.currentBedId, beds.id)).where(where).orderBy(desc(residents.createdAt)).limit(input?.pageSize ?? 10).offset(((input?.page ?? 1) - 1) * (input?.pageSize ?? 10));
      const all = await db.select({ total: count() }).from(residents).where(where);
      return { records: records.map(record => ({ ...memberView(record.resident), roomNumber: record.roomNumber, bedNumber: record.bedNumber })), total: Number(all[0]?.total || 0) };
    }),
    profile: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const db = await requireDb();
      const row = await db.select({ resident: residents, roomNumber: rooms.roomNumber, bedNumber: beds.bedNumber }).from(residents).leftJoin(rooms, eq(residents.currentRoomId, rooms.id)).leftJoin(beds, eq(residents.currentBedId, beds.id)).where(eq(residents.id, input.id)).limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Resident not found." });
      return { ...memberView(row[0].resident), roomNumber: row[0].roomNumber, bedNumber: row[0].bedNumber };
    }),
    create: adminProcedure.input(residentInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      if (await getUserByUsername(input.username)) throw new TRPCError({ code: "CONFLICT", message: "That resident username is already in use." });
      const result = await db.transaction(async tx => {
        const createdUser = await tx.insert(users).values({ openId: `local:${input.username}`, username: input.username, passwordHash: await bcrypt.hash(input.temporaryPassword, 12), name: input.fullName, role: "resident" }).returning({ id: users.id });
        const createdResident = await tx.insert(residents).values({ userId: createdUser[0].id, fullName: input.fullName, cnicEncrypted: encryptSensitive(input.cnic), phone: input.phone, guardianName: input.guardianName || null, guardianPhone: input.guardianPhone || null, instituteName: input.instituteName || null, instituteId: input.instituteId || null, admissionDate: input.admissionDate, monthlyRent: String(input.monthlyRent) }).returning({ id: residents.id });
        return createdResident[0];
      });
      await logActivity(ctx.user.id, "created", "resident", result.id, `Added resident ${input.fullName}.`);
      return result;
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), fullName: z.string().trim().min(2).max(120), phone: z.string().trim().min(7).max(40), guardianName: z.string().trim().max(120).optional(), guardianPhone: z.string().trim().max(40).optional(), instituteName: z.string().trim().max(160).optional(), instituteId: z.string().trim().max(80).optional(), monthlyRent: z.coerce.number().positive().max(10000000) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...values } = input;
      await db.update(residents).set({ ...values, guardianName: values.guardianName || null, guardianPhone: values.guardianPhone || null, instituteName: values.instituteName || null, instituteId: values.instituteId || null, monthlyRent: String(values.monthlyRent), updatedAt: new Date() }).where(eq(residents.id, id));
      await logActivity(ctx.user.id, "updated", "resident", id, `Updated resident ${values.fullName}.`);
      return { success: true };
    }),
    deactivate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const resident = await db.select().from(residents).where(eq(residents.id, input.id)).limit(1);
      if (!resident[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Resident not found." });
      await db.transaction(async tx => {
        await tx.update(residents).set({ status: "checked_out", currentBedId: null, currentRoomId: null, deactivatedAt: new Date(), updatedAt: new Date() }).where(eq(residents.id, input.id));
        await tx.update(roomAssignments).set({ releasedAt: new Date() }).where(and(eq(roomAssignments.residentId, input.id), isNull(roomAssignments.releasedAt)));
        if (resident[0].userId) await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, resident[0].userId));
      });
      await logActivity(ctx.user.id, "checked_out", "resident", input.id, `Checked out ${resident[0].fullName}.`);
      return { success: true };
    }),
  }),
  rooms: router({
    list: adminProcedure.query(async () => {
      const db = await requireDb();
      const roomRows = await db.select().from(rooms).orderBy(asc(rooms.roomNumber));
      const bedRows = await db.select({ bed: beds, residentName: residents.fullName, residentId: residents.id }).from(beds).leftJoin(residents, and(eq(residents.currentBedId, beds.id), eq(residents.status, "active"))).orderBy(asc(beds.bedNumber));
      return roomRows.map(room => {
        const roomBeds = bedRows.filter(row => row.bed.roomId === room.id);
        return { ...room, beds: roomBeds.map(row => ({ ...row.bed, residentName: row.residentName, residentId: row.residentId })), occupiedBeds: roomBeds.filter(row => row.residentId).length, availableBeds: roomBeds.filter(row => !row.residentId && row.bed.isActive).length };
      });
    }),
    create: adminProcedure.input(z.object({ roomNumber: z.string().trim().min(1).max(24), roomType: z.enum(["single", "two_sharing", "three_sharing", "attached_bath"]), totalBeds: z.number().int().min(1).max(12) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const created = await db.transaction(async tx => {
        const room = await tx.insert(rooms).values(input).returning({ id: rooms.id, roomNumber: rooms.roomNumber });
        await tx.insert(beds).values(Array.from({ length: input.totalBeds }, (_, index) => ({ roomId: room[0].id, bedNumber: `Bed ${index + 1}` })));
        return room[0];
      });
      await logActivity(ctx.user.id, "created", "room", created.id, `Created room ${created.roomNumber}.`);
      return created;
    }),
    assignBed: adminProcedure.input(z.object({ residentId: z.number().int().positive(), bedId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.transaction(async tx => {
        const [resident] = await tx.select().from(residents).where(eq(residents.id, input.residentId)).limit(1);
        const [bed] = await tx.select().from(beds).where(and(eq(beds.id, input.bedId), eq(beds.isActive, true))).limit(1);
        if (!resident || resident.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Only active residents can be assigned." });
        if (!bed) throw new TRPCError({ code: "NOT_FOUND", message: "Available bed not found." });
        const [room] = await tx.select().from(rooms).where(eq(rooms.id, bed.roomId)).limit(1);
        const occupied = await tx.select({ id: residents.id }).from(residents).where(and(eq(residents.currentBedId, bed.id), eq(residents.status, "active"))).limit(1);
        if (bedAssignmentConflict(occupied[0]?.id, resident.id)) throw new TRPCError({ code: "CONFLICT", message: "This bed is already assigned." });
        await tx.update(roomAssignments).set({ releasedAt: new Date() }).where(and(eq(roomAssignments.residentId, resident.id), isNull(roomAssignments.releasedAt)));
        await tx.update(residents).set({ currentBedId: bed.id, currentRoomId: bed.roomId, updatedAt: new Date() }).where(eq(residents.id, resident.id));
        await tx.insert(roomAssignments).values({ residentId: resident.id, roomId: bed.roomId, bedId: bed.id, assignedBy: ctx.user.id });
        return { residentName: resident.fullName, roomNumber: room?.roomNumber || "room", bedNumber: bed.bedNumber };
      });
      await logActivity(ctx.user.id, "assigned", "bed", input.bedId, `Assigned ${result.residentName} to ${result.roomNumber}, ${result.bedNumber}.`);
      return { success: true };
    }),
  }),
  payments: router({
    list: adminProcedure.input(z.object({ residentId: z.number().int().positive().optional(), rentalMonth: monthSchema.optional() }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      const filters = [];
      if (input?.residentId) filters.push(eq(payments.residentId, input.residentId));
      if (input?.rentalMonth) filters.push(eq(payments.rentalMonth, input.rentalMonth));
      return db.select({ payment: payments, residentName: residents.fullName, monthlyRent: residents.monthlyRent }).from(payments).innerJoin(residents, eq(payments.residentId, residents.id)).where(filters.length ? and(...filters) : undefined).orderBy(desc(payments.paymentDate), desc(payments.id));
    }),
    balances: adminProcedure.input(z.object({ rentalMonth: monthSchema }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      const rentalMonth = input?.rentalMonth || new Date().toISOString().slice(0, 7);
      const activeResidents = await db.select({ id: residents.id, fullName: residents.fullName, monthlyRent: residents.monthlyRent }).from(residents).where(eq(residents.status, "active"));
      const transactions = await db.select({ residentId: payments.residentId, amount: payments.amount }).from(payments).where(eq(payments.rentalMonth, rentalMonth));
      const received = new Map<number, number>();
      transactions.forEach(transaction => received.set(transaction.residentId, (received.get(transaction.residentId) || 0) + Number(transaction.amount)));
      return activeResidents.map(resident => { const paid = received.get(resident.id) || 0; const rent = Number(resident.monthlyRent); return { ...resident, rentalMonth, paid, ...calculatePaymentStatus(rent, paid) }; });
    }),
    record: adminProcedure.input(z.object({ residentId: z.number().int().positive(), rentalMonth: monthSchema, amount: z.coerce.number().positive().max(10000000), paymentDate: z.string().date(), method: z.enum(["cash", "bank_transfer", "card", "other"]), reference: z.string().trim().max(100).optional(), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [resident] = await db.select().from(residents).where(eq(residents.id, input.residentId)).limit(1);
      if (!resident) throw new TRPCError({ code: "NOT_FOUND", message: "Resident not found." });
      const total = await db.select({ received: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(and(eq(payments.residentId, input.residentId), eq(payments.rentalMonth, input.rentalMonth)));
      if (Number(total[0]?.received || 0) + input.amount > Number(resident.monthlyRent)) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment exceeds the remaining monthly balance." });
      const payment = await db.insert(payments).values({ ...input, amount: String(input.amount), reference: input.reference || null, note: input.note || null, recordedBy: ctx.user.id }).returning({ id: payments.id });
      await logActivity(ctx.user.id, "recorded", "payment", payment[0].id, `Recorded rent payment for ${resident.fullName} (${input.rentalMonth}).`);
      return payment[0];
    }),
    receipt: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({ payment: payments, residentName: residents.fullName, phone: residents.phone, roomNumber: rooms.roomNumber, bedNumber: beds.bedNumber }).from(payments).innerJoin(residents, eq(payments.residentId, residents.id)).leftJoin(rooms, eq(residents.currentRoomId, rooms.id)).leftJoin(beds, eq(residents.currentBedId, beds.id)).where(eq(payments.id, input.id)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found." });
      return rows[0];
    }),
  }),
  complaints: router({
    list: protectedProcedure.input(z.object({ status: z.enum(["pending", "in_progress", "resolved"]).optional() }).optional()).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const filters = [];
      if (ctx.user.role === "resident") { const resident = await currentResidentForUser(ctx.user.id); filters.push(eq(complaints.residentId, resident.id)); }
      if (input?.status) filters.push(eq(complaints.status, input.status));
      return db.select({ complaint: complaints, residentName: residents.fullName, roomNumber: rooms.roomNumber }).from(complaints).innerJoin(residents, eq(complaints.residentId, residents.id)).leftJoin(rooms, eq(residents.currentRoomId, rooms.id)).where(filters.length ? and(...filters) : undefined).orderBy(desc(complaints.createdAt));
    }),
    create: protectedProcedure.input(z.object({ residentId: z.number().int().positive().optional(), category: z.enum(["ac", "electricity", "plumbing", "wifi", "cleaning", "other"]), description: z.string().trim().min(10).max(1000) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const residentId = ctx.user.role === "resident" ? (await currentResidentForUser(ctx.user.id)).id : input.residentId;
      if (!residentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a resident." });
      const complaint = await db.insert(complaints).values({ residentId, category: input.category, description: input.description }).returning({ id: complaints.id });
      await logActivity(ctx.user.id, "created", "complaint", complaint[0].id, `Created a ${input.category} complaint.`);
      return complaint[0];
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "in_progress", "resolved"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [current] = await db.select({ status: complaints.status }).from(complaints).where(eq(complaints.id, input.id)).limit(1);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found." });
      if (!canTransitionComplaint(current.status, input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Complaints must follow Pending → In Progress → Resolved." });
      await db.update(complaints).set({ status: input.status, updatedAt: new Date(), resolvedAt: input.status === "resolved" ? new Date() : null }).where(eq(complaints.id, input.id));
      await logActivity(ctx.user.id, "updated", "complaint", input.id, `Set complaint status to ${input.status}.`);
      return { success: true };
    }),
  }),
  visitors: router({
    list: protectedProcedure.input(z.object({ approvalStatus: z.enum(["pending", "approved", "rejected"]).optional() }).optional()).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const filters = [];
      if (ctx.user.role === "resident") { const resident = await currentResidentForUser(ctx.user.id); filters.push(eq(visitors.residentId, resident.id)); }
      if (input?.approvalStatus) filters.push(eq(visitors.approvalStatus, input.approvalStatus));
      return db.select({ visitor: visitors, residentName: residents.fullName, roomNumber: rooms.roomNumber }).from(visitors).innerJoin(residents, eq(visitors.residentId, residents.id)).leftJoin(rooms, eq(residents.currentRoomId, rooms.id)).where(filters.length ? and(...filters) : undefined).orderBy(desc(visitors.createdAt));
    }),
    request: protectedProcedure.input(z.object({ residentId: z.number().int().positive().optional(), visitorName: z.string().trim().min(2).max(120), cnic: z.string().trim().min(5).max(30).optional(), phone: z.string().trim().min(7).max(40), relationship: z.string().trim().min(2).max(100) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const residentId = ctx.user.role === "resident" ? (await currentResidentForUser(ctx.user.id)).id : input.residentId;
      if (!residentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a resident." });
      const record = await db.insert(visitors).values({ residentId, visitorName: input.visitorName, cnicEncrypted: input.cnic ? encryptSensitive(input.cnic) : null, phone: input.phone, relationship: input.relationship, requestedByResident: ctx.user.role === "resident", approvalStatus: ctx.user.role === "admin" ? "approved" : "pending", approvedBy: ctx.user.role === "admin" ? ctx.user.id : null }).returning({ id: visitors.id });
      await logActivity(ctx.user.id, "created", "visitor", record[0].id, `Recorded visitor request for ${input.visitorName}.`);
      return record[0];
    }),
    decide: adminProcedure.input(z.object({ id: z.number().int().positive(), approvalStatus: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(visitors).set({ approvalStatus: input.approvalStatus, approvedBy: ctx.user.id, updatedAt: new Date() }).where(eq(visitors.id, input.id));
      await logActivity(ctx.user.id, "updated", "visitor", input.id, `${input.approvalStatus} a visitor request.`);
      return { success: true };
    }),
    updateEntryExit: adminProcedure.input(z.object({ id: z.number().int().positive(), action: z.enum(["entry", "exit"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [visitor] = await db.select().from(visitors).where(eq(visitors.id, input.id)).limit(1);
      if (!visitor || visitor.approvalStatus !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved visitors can be checked in or out." });
      await db.update(visitors).set({ [input.action === "entry" ? "entryTime" : "exitTime"]: new Date(), updatedAt: new Date() }).where(eq(visitors.id, input.id));
      await logActivity(ctx.user.id, input.action === "entry" ? "checked_in" : "checked_out", "visitor", input.id, `Visitor ${input.action} recorded.`);
      return { success: true };
    }),
  }),
  notices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(notices).where(ctx.user.role === "admin" ? undefined : eq(notices.status, "published")).orderBy(desc(notices.publishedAt), desc(notices.createdAt));
    }),
    create: adminProcedure.input(z.object({ title: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(5000), status: z.enum(["draft", "published"]).default("draft") })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const record = await db.insert(notices).values({ ...input, authorId: ctx.user.id, publishedAt: input.status === "published" ? new Date() : null }).returning({ id: notices.id });
      await logActivity(ctx.user.id, "created", "notice", record[0].id, `Created ${input.status} notice: ${input.title}.`);
      return record[0];
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(5000), status: z.enum(["draft", "published"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(notices).set({ title: input.title, body: input.body, status: input.status, publishedAt: input.status === "published" ? new Date() : null, updatedAt: new Date() }).where(eq(notices.id, input.id));
      await logActivity(ctx.user.id, "updated", "notice", input.id, `Updated notice: ${input.title}.`);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(notices).where(eq(notices.id, input.id));
      await logActivity(ctx.user.id, "deleted", "notice", input.id, "Deleted a notice.");
      return { success: true };
    }),
  }),
  residentPortal: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "resident") throw new TRPCError({ code: "FORBIDDEN", message: "Resident access only." });
      const db = await requireDb();
      const resident = await currentResidentForUser(ctx.user.id);
      const [room] = resident.currentRoomId ? await db.select().from(rooms).where(eq(rooms.id, resident.currentRoomId)).limit(1) : [];
      const [bed] = resident.currentBedId ? await db.select().from(beds).where(eq(beds.id, resident.currentBedId)).limit(1) : [];
      const month = new Date().toISOString().slice(0, 7);
      const records = await db.select().from(payments).where(and(eq(payments.residentId, resident.id), eq(payments.rentalMonth, month)));
      const paid = records.reduce((sum, record) => sum + Number(record.amount), 0);
      return { profile: memberView(resident), roomNumber: room?.roomNumber ?? null, bedNumber: bed?.bedNumber ?? null, rentalMonth: month, paid, remainingBalance: Math.max(0, Number(resident.monthlyRent) - paid), paymentStatus: paid >= Number(resident.monthlyRent) ? "paid" : paid ? "partial" : "pending" };
    }),
  }),
});
