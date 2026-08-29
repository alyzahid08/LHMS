import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function residentContext(): TrpcContext {
  const now = new Date();
  return {
    user: { id: 24, openId: "local:resident.24", username: "resident.24", passwordHash: null, name: "Resident Twenty Four", email: null, loginMethod: "local", role: "resident", isActive: true, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Levelose administrator authorization", () => {
  it("reports the connected hosted database and current administrator setup state", async () => {
    const caller = appRouter.createCaller({ ...residentContext(), user: null });
    const status = await caller.levelose.auth.setupStatus();
    expect(status.databaseConfigured).toBe(true);
    expect(status.adminExists).toBe(false);
  });

  it("rejects a resident attempting to list all residents before any database query", async () => {
    const caller = appRouter.createCaller(residentContext());
    await expect(caller.levelose.residents.list({ page: 1, pageSize: 10 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("rejects a resident attempting to view finance-wide dashboard data", async () => {
    const caller = appRouter.createCaller(residentContext());
    await expect(caller.levelose.dashboard.summary()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("exposes only append-only payment operations at the application boundary", () => {
    const paymentProcedures = Object.keys(appRouter._def.procedures)
      .filter(key => key.startsWith("levelose.payments."))
      .sort();
    expect(paymentProcedures).toEqual([
      "levelose.payments.balances",
      "levelose.payments.list",
      "levelose.payments.receipt",
      "levelose.payments.record",
    ]);
  });
});
