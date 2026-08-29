import { describe, expect, it } from "vitest";
import { bedAssignmentConflict, calculatePaymentStatus, canTransitionComplaint, isAppendOnlyPaymentOperation, residentOwnsProfile } from "./domainRules";

describe("Levelose payment integrity", () => {
  it("keeps a remaining balance and derives pending, partial, or paid from immutable receipts", () => {
    expect(calculatePaymentStatus(12000, 0)).toEqual({ remainingBalance: 12000, status: "pending" });
    expect(calculatePaymentStatus(12000, 5000)).toEqual({ remainingBalance: 7000, status: "partial" });
    expect(calculatePaymentStatus(12000, 12000)).toEqual({ remainingBalance: 0, status: "paid" });
  });
});

describe("Levelose bed assignment protection", () => {
  it("blocks a different resident from an occupied bed but permits the resident already assigned", () => {
    expect(bedAssignmentConflict(12, 12)).toBe(false);
    expect(bedAssignmentConflict(12, 18)).toBe(true);
    expect(bedAssignmentConflict(undefined, 18)).toBe(false);
  });
});

describe("Levelose complaint workflow", () => {
  it("requires Pending → In Progress → Resolved and rejects skipped or reversed stages", () => {
    expect(canTransitionComplaint("pending", "in_progress")).toBe(true);
    expect(canTransitionComplaint("in_progress", "resolved")).toBe(true);
    expect(canTransitionComplaint("pending", "resolved")).toBe(false);
    expect(canTransitionComplaint("resolved", "in_progress")).toBe(false);
  });
});

describe("Levelose payment history", () => {
  it("treats payment receipts as append-only records", () => {
    expect(isAppendOnlyPaymentOperation("create")).toBe(true);
    expect(isAppendOnlyPaymentOperation("update")).toBe(false);
    expect(isAppendOnlyPaymentOperation("delete")).toBe(false);
  });
});

describe("Levelose resident data isolation", () => {
  it("permits a resident account to access only its linked profile", () => {
    expect(residentOwnsProfile(14, 14)).toBe(true);
    expect(residentOwnsProfile(14, 15)).toBe(false);
    expect(residentOwnsProfile(14, null)).toBe(false);
  });
});
