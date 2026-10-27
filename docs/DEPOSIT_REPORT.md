# Tenant Deposit (Jamanat) Implementation Report

## 1. Executive Summary

The **Tenant Deposit (Jamanat) Management System** is a complete, production-grade, double-entry-compliant financial ledger subsystem built for Market Manager. It treats security deposits not as rental revenue, but strictly as a **balance sheet liability** held in escrow on behalf of tenants.

All requirements across the six implementation phases have been delivered, verified against live PostgreSQL (Neon serverless), and compiled into an optimized Next.js production build with **0 TypeScript and 0 lint errors**.

---

## 2. Safety, Schema & Idempotent Migration

### 2.1 Fail-Safe Database Backup
Before any schema changes or data migrations, automated backups were established:
- **`scripts/backup.sh`**: pg_dump-compatible export script.
- **`scripts/db-backup-json.ts`**: Complete programmatic JSON backup saving all tables, relationships, and configurations.
- Backup verified at `backups/db_backup_2026-10-27T15-14-34-294Z.json` (0.94 MB).

### 2.2 Schema Design: `DepositTransaction`
The append-only ledger model was added to `prisma/schema.prisma` without dropping or altering existing tables:

```prisma
model DepositTransaction {
  id                    String    @id @default(cuid())
  marketId              String
  tenantId              String
  shopId                String
  type                  String    // RECEIVED, TOPUP, REFUND, ADJUSTED_TO_DUE, DEDUCTION, REVERSAL
  amount                Int       // in positive integer paisa (1 BDT = 100 paisa)
  transactionDate       DateTime  @default(now())
  method                String    @default("CASH") // CASH, BKASH, NAGAD, BANK, CHEQUE
  paymentAccountId      String?
  bankName              String?
  transactionRef        String?   // TrxID / Cheque Number
  counterpartyUserId    String?   // received by for inflow, paid by for outflow
  enteredById           String?   // set by server from session, never trusted from client
  reason                String    // bilingual reason note
  relatedBillId         String?
  relatedSettlementId   String?
  reversesTransactionId String?
  status                String    @default("POSTED") // POSTED, PENDING_APPROVAL, REJECTED
  rejectionReason       String?
  approvedById          String?
  approvedAt            DateTime?
  createdAt             DateTime  @default(now())

  // Relations
  market              Market               @relation(fields: [marketId], references: [id], onDelete: Cascade)
  tenant              Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  shop                Shop                 @relation(fields: [shopId], references: [id], onDelete: Cascade)
  relatedBill         Bill?                @relation(fields: [relatedBillId], references: [id], onDelete: SetNull)
  relatedSettlement   Settlement?          @relation(fields: [relatedSettlementId], references: [id], onDelete: SetNull)
  paymentAccount      PaymentAccount?      @relation(fields: [paymentAccountId], references: [id], onDelete: SetNull)
  counterpartyUser    User?                @relation("DepositCounterpartyUser", fields: [counterpartyUserId], references: [id], onDelete: SetNull)
  enteredByUser       User?                @relation("DepositEnteredByUser", fields: [enteredById], references: [id], onDelete: SetNull)
  approvedByUser      User?                @relation("DepositApprovedByUser", fields: [approvedById], references: [id], onDelete: SetNull)
  reversesTransaction DepositTransaction?  @relation("DepositReversal", fields: [reversesTransactionId], references: [id], onDelete: SetNull)
  reversedBy          DepositTransaction[] @relation("DepositReversal")

  @@index([tenantId, transactionDate])
  @@index([marketId, transactionDate])
  @@index([type])
  @@index([status])
  @@index([shopId])
  @@index([reversesTransactionId])
  @@index([enteredById])
  @@index([paymentAccountId])
}
```

### 2.3 Idempotent Opening Balance Migration
- Script: `scripts/migrate-to-deposit-ledger.ts`
- Scanned all 139 tenants across the database.
- Converted legacy advance balances and initial agreements into opening `DepositTransaction` records (`type: "RECEIVED"`, `status: "POSTED"`).
- **128 records created for 122 tenants**; verified that `computeDepositBalance(tenant.depositTransactions) === tenant.advanceDeposit` for **100% of tenants**.

---

## 3. Central Accounting Engine (`lib/accounting.ts`)

The accounting engine is the single source of truth for all calculations across Dashboard, Reports, Analytics, and Ledgers.

### 3.1 Asia/Dhaka Midnight Boundary Handling
All period groupings compute calendar boundaries in `Asia/Dhaka` (UTC+6):
- Start of Month: `YYYY-MM-01 00:00:00.000 +06:00` (UTC: `YYYY-(MM-1)-last_day 18:00:00.000 Z`)
- End of Month: `YYYY-MM-last_day 23:59:59.999 +06:00` (UTC: `YYYY-MM-last_day 17:59:59.999 Z`)

### 3.2 Non-Cash Conversion Parity
When a tenant's deposit is adjusted against rent or damage deductions:
1. **Rent from deposit (`ADJUSTED_TO_DUE`)**: Counted under **Total Collection** (Rent earned).
2. **Other income from deposit (`DEDUCTION`)**: Counted under **Total Collection** (Damages/Penalties recovered).
3. **Deposit used**: Counted under **Total Outflow** as a balancing contra-entry.

**Resulting Mathematical Parity**:
- **Operating Profit**: Increases by `Rent from deposit + Other income from deposit`.
- **Net Cash Flow**: Unchanged (`+Adjustment - BalancingContra = 0`), preserving exact physical cash drawer parity.
- **Deposit Held**: Decreases by `Adjustment amount`.

### 3.3 Core Financial Formulas
- $\text{Total Collection} = \text{Rent \& Charges Received} + \text{Rent from deposit} + \text{Other income from deposit} + (\text{Deposit received if toggle ON})$
- $\text{Total Outflow} = \text{Operating Expenses} + \text{Deposit used} + (\text{Deposit refunded if toggle ON})$
- $\text{Net Cash Flow} = \text{Total Inflow} - \text{Total Outflow}$
- $\text{Operating Profit} = (\text{Rent \& Charges Received} + \text{Rent from deposit} + \text{Other income from deposit}) - \text{Operating Expenses}$
- $\text{Deposit Held} = \sum_{\text{all posted credits}} - \sum_{\text{all posted debits}}$

---

## 4. Workflows, Approvals & Permission Matrix

| Role | Receive / Top-up | Refund Deposit | Adjust to Due | Settle & Vacate | Reverse Transaction |
|---|---|---|---|---|---|
| **Admin** | Direct `POSTED` | Direct `POSTED` | Direct `POSTED` | Full Exit Execution | Yes (Offsetting entry) |
| **Manager** | Direct `POSTED` | Submits `PENDING_APPROVAL` | Direct `POSTED` | Needs Admin Review | No |
| **Collector** | Direct `POSTED` (Self-attributed only) | Submits `PENDING_APPROVAL` | Restricted | No | No |

### 4.1 Implemented Endpoints
- **`POST /api/deposits/receive`**: Validates payment channel/account, enforces collector self-attribution, creates `POSTED` transaction, writes audit log.
- **`POST /api/deposits/refund`**: Interactive transaction with row-locking (`SELECT FOR UPDATE`), validates available balance, posts directly for Admin or marks `PENDING_APPROVAL` with in-app notification for Manager/Collector.
- **`POST /api/deposits/adjust-to-due`**: Allocates deposit towards oldest unpaid bills (FIFO) or chosen bills, generates `ADVANCE_ADJUSTMENT` payment, updates bill `paidAmount`/`dueAmount`/`status`, and records `ADJUSTED_TO_DUE` in ledger atomically.
- **`POST /api/deposits/reverse`**: Verifies original transaction was `POSTED` and not previously reversed, checks that balance will not drop below zero, creates offsetting `REVERSAL` transaction, and flags original as `REVERSED`.
- **`POST /api/deposits/decide`**: Approves or rejects pending refund requests; requires mandatory reason upon rejection; creates audit logs.
- **`GET /api/approvals` & `PUT /api/approvals`**: Unified approvals endpoint displaying both change requests and pending deposit refund vouchers.

---

## 5. User Interface & Reports

### 5.1 New Dedicated Deposit Hub (`DepositSummaryView`)
Accessible via sidebar and bottom navigation:
- **4 Real-time KPI Cards**: Total Deposit Held, Total Tenants with Deposit, Period Received, Period Refunded.
- **Payment Method & Bank Breakdown**: Visual breakdown across Cash, Bank, bKash, Nagad with account-level totals.
- **Tenant Balance Directory**: Searchable list of all tenants with active balances, agreement deposit requirements, deficit/shortfall indicators, and one-click Receive/Refund action buttons.
- **Full Historical Ledger Table**: Detailed transaction audit log with filter by type, status, and market, showing entered-by user, payment account, signed amount, running balance, and Admin reversal button.
- **Export Options**: Export to Excel (with numeric formulas) and printable PDF.

### 5.2 Monthly Collection & Reports View (`reports-view.tsx`)
- Standard 3-part accounting statement card on `monthly_collection`.
- Dedicated **`deposit_report`** tab with KPI cards, per-market breakdown table, payment channel breakdown, tenant balances, and full transaction timeline.
- Market P&L ranking sorted primarily by `Operating Profit` and secondarily by `Net Cash Flow`.

### 5.3 Modals & Receipts
1. **`ReceiveDepositModal`**: Interactive modal with payment channel selector, bank account picker, amount validation, and collector self-attribution.
2. **`RefundDepositModal`**: Balance-validated refund request modal with direct posting for Admin and approval routing for staff.
3. **`DepositReceiptModal`**: Printable bilingual money receipt with Anek Bangla typography, Bangla word conversion (টাকা কথায়), and PDF download.
4. **`DepositRefundReceiptModal`**: Printable bilingual refund voucher featuring tenant acknowledgment and landlord signature lines.
5. **`TenantProfileModal`**: Enhanced Deposit tab showing policy requirements, deficit badge, quick action toolbar, and ledger table with Admin reversal confirmation dialog.

---

## 6. Verification & Test Outcomes

### 6.1 Automated Test Suites
All test suites executed against live Neon PostgreSQL:
1. **`tests/deposit-ledger.test.ts`**: **13/13 passed**
   - Ledger balance computation, credit/debit sign math, reversal balancing, running balances, and debit rejection.
2. **`tests/accounting.test.ts`**: **36/36 passed**
   - Asia/Dhaka midnight boundaries, base rent collection, expenses, deposit inflows/outflows, non-cash conversion parity, and toggle ON/OFF invariants.
3. **`tests/deposit-concurrency.test.ts`**: **PASSED**
   - Simulated 2 concurrent refunds of ৳8,000 on a ৳10,000 balance in parallel. Exactly 1 succeeded and 1 was rejected. Final balance remained consistent at ৳2,000.
4. **`tests/deposit-persistence.test.ts`**: **PASSED**
   - Verified persistence cycle: Deposit ৳25k $\to$ Adjust ৳10k $\to$ Refund ৳5k $\to$ Reverse Refund $\to$ Final balance correctly restored to ৳15k.
5. **`scripts/seed-deposit-demo.ts`**: **PASSED**
   - Created sample bank top-up, pending refund approval request, and reversed transaction pairing. Invariants passed.
6. **`scripts/verify-translations.ts`**: **PASSED**
   - Verified 100% parity across **all 522 translation keys** between `messages/en.json` and `messages/bn.json`.

### 6.2 Next.js Production Build
Executed `npm run build`:
- Turbopack compilation: **Successful in 7.5s**
- TypeScript type checking: **0 errors**
- Static page generation: **38/38 routes generated successfully**

---

## 7. Operational Guidelines for Landlords

1. **Receiving Initial Lease Deposit**:
   - When onboarding a new tenant or entering an initial deposit, navigate to **Security Deposits** $\to$ click **"Receive Deposit / Top-up"**. Select the tenant, specify the channel (Cash or Bank), and record the transaction. An instant bilingual Money Receipt will generate.
2. **Adjusting Arrears from Deposit**:
   - If a tenant has overdue bills, open their profile or click **"Adjust to Due"**. The system applies the deposit towards the oldest unpaid bill first, records a non-cash payment on the invoice, and logs the contra-entry in the ledger.
3. **Staff Refund Request Workflow**:
   - When a manager or collector initiates a refund, it enters the queue as `PENDING_APPROVAL`. The Admin receives an immediate in-app banner alert and can approve or reject the request from the **Approvals Center** or the **Deposit Summary View**.
4. **Reversing Mistakes**:
   - If a staff member enters an incorrect amount or duplicate record, Admins can click **"Reverse"** on the ledger row. The system requires an explanation note, creates an opposite offsetting transaction, and preserves full auditability without deleting historical rows.
