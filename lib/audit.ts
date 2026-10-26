import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ADVANCE_DEPOSIT"
  | "ADVANCE_ADJUSTMENT"
  | "ADVANCE_DEDUCTION"
  | "ADVANCE_REFUND"
  | "ADVANCE_TOPUP"
  | "SETTLEMENT_CONFIRMED"
  | "POLICY_CREATED"
  | "POLICY_UPDATED"
  | "BILL_WAIVED"
  | "TENANT_STATUS_CHANGED"
  | "BILLS_GENERATED"
  | "UNDO_BILLS_GENERATED"
  | "BILL_CHARGE_ADDED"
  | "BILL_CHARGE_EDITED"
  | "BILL_CHARGE_DELETED"
  | "PAYMENT_COLLECTED"
  | "PAYMENT_EDITED"
  | "PAYMENT_DELETED"
  | "EXPENSE_CREATED"
  | "EXPENSE_EDITED"
  | "EXPENSE_DELETED"
  | "SHOP_CREATED"
  | "SHOP_UPDATED"
  | "SHOP_RENT_REVISED"
  | "SHOP_DELETED"
  | "MARKET_CREATED"
  | "MARKET_UPDATED"
  | "MARKET_DELETED"
  | "TENANT_CREATED"
  | "TENANT_UPDATED";

export interface LogAuditOptions {
  userId?: string | null;
  userName?: string;
  action: AuditAction | string;
  entityType: string; // Tenant, AdvanceTransaction, Settlement, Policy, Bill
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
  tx?: any; // optional transaction client
}

/**
 * Appends an audit log entry. Can run within a prisma transaction if `tx` is provided.
 */
export async function logAudit(options: LogAuditOptions) {
  const client = options.tx || prisma;

  return await client.auditLog.create({
    data: {
      userId: options.userId || null,
      userName: options.userName || "Admin",
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      detailsJson: options.details ? JSON.stringify(options.details) : "{}",
      ipAddress: options.ipAddress || null,
    },
  });
}
