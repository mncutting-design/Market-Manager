# Implementation Decisions: Tenant Deposit (Jamanat) System

## 1. Multi-Tenancy & Organization ID
- **Observation:** The codebase does not have an `organizationId` or `Organization` model. The application is an on-premise / single-organization multi-market property management system.
- **Decision:** As per prompt instruction ("If the app is multi-tenant..."), because there is no existing organization model or multi-tenant tenancy in the DB, `DepositTransaction` does not require a foreign key to an absent organization table. It is directly partitioned and scoped by `marketId`, `shopId`, and `tenantId`.

## 2. Table Strategy: `DepositTransaction` alongside `AdvanceTransaction`
- **Observation:** The database currently contains `AdvanceTransaction` with 47 existing `DEPOSIT_RECEIVED` rows, referenced in legacy routes and reports.
- **Decision:** We create the dedicated `DepositTransaction` table in `prisma/schema.prisma` with all requested fields, indexes, relations, and strict append-only constraints. We idempotently migrate all existing tenant balances and advance transactions into `DepositTransaction` as opening balance / transaction records. The legacy `Tenant.advanceDeposit` and `AdvanceTransaction` are preserved and marked `@deprecated`, ensuring zero data loss and backwards compatibility.

## 3. Append-Only Ledger & Reversals
- **Types:** `RECEIVED`, `TOPUP`, `REFUND`, `ADJUSTED_TO_DUE`, `DEDUCTION`, `REVERSAL`.
- **Statuses:** `POSTED`, `PENDING_APPROVAL`, `REJECTED`.
- Only `POSTED` entries contribute to tenant deposit balances and accounting figures. `PENDING_APPROVAL` entries are displayed in UI and pending approval cards.
- A `REVERSAL` transaction points to `reversesTransactionId`. Once reversed, a transaction cannot be reversed again (enforced via database uniqueness or transaction validation).

## 4. Concurrency & Balance Protection
- All mutations (Refund, Adjust to Due, Deduction, Reversal) run inside an interactive Prisma database transaction (`prisma.$transaction`) with advisory/row locking on the tenant, ensuring two simultaneous transactions cannot overdraw available deposit funds.

## 5. Accounting Engine (`lib/accounting.ts`)
- All totals across Dashboard, Monthly Statement, Yearly Report, Market Report, Combined Report, Tenant Ledger, and Exports are calculated solely through `lib/accounting.ts`.
- Time zone: `Asia/Dhaka` (UTC+6) is used for all period grouping and month boundaries.
- Operating profit strictly excludes deposit received and refunded (which are liability trust funds).
- Non-cash adjustments (`ADJUSTED_TO_DUE`, `DEDUCTION`) appear in both Collection and Outflow, maintaining mathematical parity and avoiding double-counting in net cash.
- "Include deposit movements in Total Collection and Total Outflow" toggle defaults to `ON` (stored in settings/localStorage/global config).

## 6. Permissions & Approvals Workflow
- **ADMIN:** Direct execution of Receive, Top-up, Adjust to Due, Refund, and Reversal. Approves or rejects pending refund requests.
- **MANAGER:** Can record Receive, Top-up, Adjust to Due; Submits Refund as `PENDING_APPROVAL`.
- **COLLECTOR:** Can record Receive, Top-up (assigned to self); Submits Refund as `PENDING_APPROVAL`. Cannot approve or delete.
- Rejection requires a mandatory reason.
