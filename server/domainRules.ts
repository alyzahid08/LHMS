export type ComplaintWorkflowStatus = "pending" | "in_progress" | "resolved";

export function calculatePaymentStatus(monthlyRent: number, amountReceived: number) {
  const remainingBalance = Math.max(0, monthlyRent - amountReceived);
  return {
    remainingBalance,
    status: amountReceived >= monthlyRent ? "paid" as const : amountReceived > 0 ? "partial" as const : "pending" as const,
  };
}

/** Returns a clear validation message if another active resident is already in the requested bed. */
export function bedAssignmentConflict(currentOccupantId: number | undefined, requestedResidentId: number) {
  return Boolean(currentOccupantId && currentOccupantId !== requestedResidentId);
}

/** Complaints may only move forward through the agreed service workflow. */
export function canTransitionComplaint(from: ComplaintWorkflowStatus, to: ComplaintWorkflowStatus) {
  return (from === "pending" && to === "in_progress") || (from === "in_progress" && to === "resolved") || from === to;
}

/** Payments are financial receipts: only creation is permitted in Version 1. */
export function isAppendOnlyPaymentOperation(operation: "create" | "update" | "delete") {
  return operation === "create";
}

/** A resident-facing record must remain bound to the authenticated local account. */
export function residentOwnsProfile(authenticatedUserId: number, linkedUserId: number | null) {
  return linkedUserId === authenticatedUserId;
}
