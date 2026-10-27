# Tenant Deposit (Jamanat) Implementation Progress

## Phase 1: Safety, Schema, Migration & Ledger Core
- [x] Add `scripts/backup.sh` (pg_dump) and `scripts/db-backup-json.ts` for automated fail-safe backup.
- [x] Add `DepositTransaction` model to `prisma/schema.prisma` with indexes: `(tenantId, transactionDate)`, `(marketId, transactionDate)`, `(type)`, `(status)`.
- [x] Mark legacy `Tenant.advanceDeposit` as deprecated in comments/docs.
- [x] Run additive migration (`prisma db push` / migration) safely without data loss.
- [x] Write and run idempotent opening balance conversion script `scripts/migrate-to-deposit-ledger.ts` (converts existing balances to `RECEIVED` with reason "Opening balance", prints rows created per tenant, verifies computed ledger equals old amount for all tenants).
- [x] Implement balance computation functions in `lib/deposit-ledger.ts` (computes from POSTED entries only, handles REVERSAL with opposite sign, never stored).
- [x] Write unit tests for ledger balance and reversal math (`tests/deposit-ledger.test.ts`).
- [x] Run type-check, lint, tests, build for Phase 1.

## Phase 2: Accounting Logic (`lib/accounting.ts`)
- [x] Create `lib/accounting.ts` as the single source of truth for all accounting calculations.
- [x] Implement `Asia/Dhaka` time zone month/year grouping and boundary checks.
- [x] Implement event effects:
  - `RECEIVED` / `TOPUP`: Collection +amount, Net Cash +amount, Deposit Held +amount, Operating Profit unchanged.
  - `REFUND`: Outflow +amount (- figure), Net Cash -amount, Deposit Held -amount, Operating Profit unchanged.
  - `ADJUSTED_TO_DUE`: Collection +amount ("Rent from deposit"), Outflow +amount ("Deposit used"), Net Cash unchanged, Operating Profit +amount, Deposit Held -amount.
  - `DEDUCTION`: Collection +amount ("Other income from deposit"), Outflow +amount ("Deposit used"), Net Cash unchanged, Operating Profit +amount, Deposit Held -amount.
  - `REVERSAL`: exact opposite effect in the month of reversal.
- [x] Implement `includeDepositMovements` toggle (default ON, affects Collection & Outflow lines, Operating Profit & Deposit Held never change).
- [x] Implement financial definitions: Total Collection, Total Outflow, Net Cash Flow, Operating Profit, Deposit Held.
- [x] Write comprehensive unit tests in `tests/accounting.test.ts`:
  - Every event type
  - Reversals
  - Partial adjustments
  - Refund larger than balance (rejection check)
  - Zero balance
  - Midnight boundary in Asia/Dhaka
  - Include-deposit toggle ON/OFF
  - Invariants: Net Cash = Total Collection - Total Outflow; Operating Profit excludes deposit received/refunded.
- [x] Run type-check, lint, tests, build for Phase 2.

## Phase 3: Forms, Workflows, Approvals, Receipts & Audit Log
- [x] API endpoints:
  - `POST /api/deposits/receive` (Receive deposit / Top-up with channel, account, counterparty, enteredBy).
  - `POST /api/deposits/refund` (Direct for ADMIN, PENDING_APPROVAL for MANAGER/COLLECTOR).
  - `POST /api/deposits/adjust-to-due` (Adjust deposit against dues, oldest bill first or custom selection, atomic transaction).
  - `POST /api/deposits/reverse` (Reverse transaction, ensure row not reversed twice, opposite sign).
  - `POST /api/deposits/decide` (Approve/Reject pending refund request with mandatory reason for rejection).
- [x] Concurrency protection with database transactions and row locking.
- [x] Receipts:
  - Printable bilingual deposit receipt modal/component (`DepositReceiptModal`).
  - Bilingual PDF refund receipt with tenant and owner signature lines (`DepositRefundReceiptModal`).
- [x] Server permissions enforcement and audit logging for every action.
- [x] Concurrency and persistence tests (`tests/deposit-concurrency.test.ts`, `tests/deposit-persistence.test.ts`).
- [x] Run type-check, lint, tests, build for Phase 3.

## Phase 4: Reports, Summary Page, Dashboard & Exports
- [x] Update Monthly Collection Statement layout with the standard accounting structure:
  - Collection: Rent, Electricity/charges, Rent from deposit, Other income from deposit, Deposit received, Total Collection.
  - Outflow: Operating expenses by category, Deposit used, Deposit refunded (- figure), Total Outflow.
  - Summary: Net Cash Flow, Operating Profit, Deposit Held at period end.
- [x] Update all existing reports (yearly, per market, all markets combined, charts) to use `lib/accounting.ts`.
- [x] Market profit rankings and profit charts updated to use Operating Profit (primary) and Net Cash Flow (secondary).
- [x] Create dedicated "Deposit" report view and tab in Reports:
  - Per-tenant ledger
  - Per-market summary
  - Channel and payment account / bank breakdown
- [x] Create "Deposit Summary" page / view with filters (market, tenant status, date range), KPIs, and export.
- [x] Add Dashboard card "Deposit held" with movement for the selected period and pending approvals notification.
- [x] Update PDF and Excel export logic for the new format (Anek Bangla in PDF, numeric cells in Excel).
- [x] Run type-check, lint, tests, build for Phase 4.

## Phase 5: Tenant Profile Deposit Tab, Settlement, i18n & UI Polish
- [x] Update Tenant Profile modal > Deposit tab:
  - Required deposit from policy
  - Current balance
  - Shortfall
  - Full ledger table with channel, account/bank, +/- amount, received/paid by, entered by, reference, reason, running balance.
  - Actions: Receive deposit, Top-up, Refund, Adjust to due, Reverse entry.
- [x] Settlement integration: clear dues with ADJUSTED_TO_DUE, penalties with DEDUCTION, remainder with REFUND, unrecovered dues tracking.
- [x] i18n parity: check `messages/en.json` and `messages/bn.json` completeness using `verify-translations.ts` (100% matched across 522 keys).
- [x] Responsive UI verification (360px and 1280px), skeleton loaders, empty states, confirmation dialogs, sonner toasts.
- [x] Run type-check, lint, tests, build for Phase 5.

## Phase 6: Final Verification, Testing, Build & Documentation
- [x] Seed script for testing (`scripts/seed-deposit-demo.ts`) covering all event types, bank/bKash refund, reversals, and pending approvals.
- [x] Run full test suite (`npx tsx tests/accounting.test.ts`, `tests/deposit-ledger.test.ts`, `tests/deposit-concurrency.test.ts`, `tests/deposit-persistence.test.ts`).
- [x] Run production build (`next build`) - 100% successful with 0 errors across all routes.
- [x] Write comprehensive final report to `docs/DEPOSIT_REPORT.md`.
