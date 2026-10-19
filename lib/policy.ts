import { prisma } from "@/lib/prisma";

export interface PolicyData {
  requiredAdvanceMonths: number; // e.g. 2 or 3
  requiredAdvanceFixed?: number | null; // in paisa
  rentDueDay: number; // e.g. 10
  gracePeriodDays: number; // e.g. 5
  lateFeeType: "NONE" | "FIXED" | "PERCENTAGE" | "DAILY";
  lateFeeAmount: number; // in paisa (if fixed/daily) or basis points/percentage
  lateFeeCap?: number | null; // in paisa
  noticePeriodDays: number; // e.g. 30
  noticePenaltyAmount: number; // in paisa
  advanceRefundDeadlineDays: number; // e.g. 15
  requireAdvanceTopup: boolean; // true
  annualRentIncreasePercent: number; // e.g. 10
  contractExpiryWarningDays: number; // e.g. 60
  overdueEscalation: {
    months: number;
    action: "REMINDER" | "WARNING_ADJUSTMENT" | "ELIGIBLE_SETTLEMENT";
    label_en: string;
    label_bn: string;
  }[];
  allowedDeductions: {
    type: string;
    label_en: string;
    label_bn: string;
    defaultAmount: number; // in paisa
  }[];
  rulesTextEn: string;
  rulesTextBn: string;
}

export const DEFAULT_POLICY: PolicyData = {
  requiredAdvanceMonths: 3,
  requiredAdvanceFixed: null,
  rentDueDay: 10,
  gracePeriodDays: 5,
  lateFeeType: "FIXED",
  lateFeeAmount: 50000, // 500 BDT in paisa
  lateFeeCap: 200000, // 2000 BDT cap
  noticePeriodDays: 30,
  noticePenaltyAmount: 0,
  advanceRefundDeadlineDays: 15,
  requireAdvanceTopup: true,
  annualRentIncreasePercent: 10,
  contractExpiryWarningDays: 60,
  overdueEscalation: [
    {
      months: 1,
      action: "REMINDER",
      label_en: "1 Month Overdue: Friendly SMS/Call Reminder",
      label_bn: "১ মাসের বকেয়া: বন্ধুসুলভ স্মরণপত্র ও যোগাযোগ",
    },
    {
      months: 2,
      action: "WARNING_ADJUSTMENT",
      label_en: "2 Months Overdue: Written Warning & Suggest Advance Adjustment",
      label_bn: "২ মাসের বকেয়া: লিখিত সতর্কবার্তা ও জামানত থেকে সমন্বয়ের প্রস্তাব",
    },
    {
      months: 3,
      action: "ELIGIBLE_SETTLEMENT",
      label_en: "3+ Months Overdue: Flagged Eligible for Settlement & Vacating",
      label_bn: "৩+ মাসের বকেয়া: দোকান খালি ও চূড়ান্ত নিষ্পত্তি (settlement) তালিকাভুক্ত",
    },
  ],
  allowedDeductions: [
    {
      type: "DAMAGE",
      label_en: "Shop/Property Damage Repair",
      label_bn: "দোকানের ক্ষতিসাধন ও মেরামত বাবদ",
      defaultAmount: 0,
    },
    {
      type: "CLEANING",
      label_en: "Premises Cleaning & Painting",
      label_bn: "পরিচ্ছন্নতা ও চুনকাম খরচ",
      defaultAmount: 300000, // 3,000 BDT
    },
    {
      type: "UTILITY",
      label_en: "Pending Electricity / Utility Bills",
      label_bn: "অনাদায়ী বিদ্যুৎ ও ইউটিলিটি বিল",
      defaultAmount: 0,
    },
    {
      type: "PENALTY",
      label_en: "Unserved Notice Period Penalty",
      label_bn: "নোটিশ ব্যতিরেকে প্রস্থান জরিমানা",
      defaultAmount: 0,
    },
    {
      type: "OTHER",
      label_en: "Other Miscellaneous Deductions",
      label_bn: "অন্যান্য খরচ",
      defaultAmount: 0,
    },
  ],
  rulesTextEn: `TENANT & LEASE POLICY AGREEMENT
1. Rent must be paid on or before the 10th of every calendar month.
2. A grace period of 5 days is allowed. After the 15th, a late fee applies.
3. Advance deposit is held securely as a security liability and never treated as market income until adjusted or settled.
4. Tenant must provide a minimum 30-day written notice prior to vacating.
5. In case of 3+ months unpaid dues, management reserves the right to settle open dues against advance deposit and repossess the shop.`,
  rulesTextBn: `ভাড়াটিয়া ও লিজ নীতিমালা চুক্তি
১. প্রতি মাসের ১০ তারিখের মধ্যে চলতি মাসের নির্ধারিত দোকান ভাড়া পরিশোধ করতে হবে।
২. ১০ তারিখের পর ৫ দিন গ্রেস পিরিয়ড প্রযোজ্য। ১৫ তারিখের পর বিলম্ব ফি ধার্য হবে।
৩. অগ্রিম জামানতের অর্থ সম্পূর্ণ নিরাপদ জামানত দায় হিসেবে সংরক্ষিত থাকবে এবং বকেয়া সমন্বয় বা চূড়ান্ত নিষ্পত্তি ব্যতীত কখনোই মার্কেট আয় গণ্য হবে না।
৪. দোকান খালি করার ক্ষেত্রে ন্যূনতম ৩০ দিন পূর্বে লিখিত নোটিশ প্রদান বাধ্যতামূলক।
৫. ৩ মাসের অধিক বকেয়া পতিত হলে কর্তৃপক্ষ জামানত সমন্বয়পূর্বক দোকান খালি করার ও চুক্তি বাতিল করার অধিকার সংরক্ষণ করে।`,
};

/**
 * Resolves the effective policy version for a tenant or market.
 * Resolution hierarchy: Tenant -> Market -> Global.
 */
export async function getEffectivePolicy(options?: {
  tenantId?: string;
  marketId?: string;
}): Promise<{ policyId: string; versionId: string; versionNumber: number; data: PolicyData }> {
  // 1. Check Tenant Policy
  if (options?.tenantId) {
    const tenantPolicy = await prisma.tenantPolicy.findUnique({
      where: { tenantId: options.tenantId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });
    if (tenantPolicy && tenantPolicy.versions.length > 0) {
      return parsePolicyVersion(tenantPolicy.id, tenantPolicy.versions[0]);
    }
  }

  // 2. Check Market Policy
  if (options?.marketId) {
    const marketPolicy = await prisma.tenantPolicy.findUnique({
      where: { marketId: options.marketId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });
    if (marketPolicy && marketPolicy.versions.length > 0) {
      return parsePolicyVersion(marketPolicy.id, marketPolicy.versions[0]);
    }
  }

  // 3. Check Global Policy
  const globalPolicy = await prisma.tenantPolicy.findFirst({
    where: { scope: "GLOBAL" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (globalPolicy && globalPolicy.versions.length > 0) {
    return parsePolicyVersion(globalPolicy.id, globalPolicy.versions[0]);
  }

  // If no global policy exists in DB yet, create it automatically!
  return await initializeGlobalPolicy();
}

/**
 * Initializes default global policy if database has none.
 */
export async function initializeGlobalPolicy() {
  const policy = await prisma.tenantPolicy.create({
    data: {
      scope: "GLOBAL",
    },
  });

  const version = await prisma.policyVersion.create({
    data: {
      policyId: policy.id,
      versionNumber: 1,
      requiredAdvanceMonths: DEFAULT_POLICY.requiredAdvanceMonths,
      requiredAdvanceFixed: DEFAULT_POLICY.requiredAdvanceFixed,
      rentDueDay: DEFAULT_POLICY.rentDueDay,
      gracePeriodDays: DEFAULT_POLICY.gracePeriodDays,
      lateFeeType: DEFAULT_POLICY.lateFeeType,
      lateFeeAmount: DEFAULT_POLICY.lateFeeAmount,
      lateFeeCap: DEFAULT_POLICY.lateFeeCap,
      noticePeriodDays: DEFAULT_POLICY.noticePeriodDays,
      noticePenaltyAmount: DEFAULT_POLICY.noticePenaltyAmount,
      advanceRefundDeadlineDays: DEFAULT_POLICY.advanceRefundDeadlineDays,
      requireAdvanceTopup: DEFAULT_POLICY.requireAdvanceTopup,
      annualRentIncreasePercent: DEFAULT_POLICY.annualRentIncreasePercent,
      contractExpiryWarningDays: DEFAULT_POLICY.contractExpiryWarningDays,
      overdueEscalationJson: JSON.stringify(DEFAULT_POLICY.overdueEscalation),
      allowedDeductionsJson: JSON.stringify(DEFAULT_POLICY.allowedDeductions),
      rulesTextEn: DEFAULT_POLICY.rulesTextEn,
      rulesTextBn: DEFAULT_POLICY.rulesTextBn,
    },
  });

  return parsePolicyVersion(policy.id, version);
}

function parsePolicyVersion(policyId: string, version: any) {
  let overdueEscalation = DEFAULT_POLICY.overdueEscalation;
  let allowedDeductions = DEFAULT_POLICY.allowedDeductions;

  try {
    if (version.overdueEscalationJson) {
      overdueEscalation = JSON.parse(version.overdueEscalationJson);
    }
  } catch (e) {}

  try {
    if (version.allowedDeductionsJson) {
      allowedDeductions = JSON.parse(version.allowedDeductionsJson);
    }
  } catch (e) {}

  return {
    policyId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    data: {
      requiredAdvanceMonths: version.requiredAdvanceMonths,
      requiredAdvanceFixed: version.requiredAdvanceFixed,
      rentDueDay: version.rentDueDay,
      gracePeriodDays: version.gracePeriodDays,
      lateFeeType: version.lateFeeType as any,
      lateFeeAmount: version.lateFeeAmount,
      lateFeeCap: version.lateFeeCap,
      noticePeriodDays: version.noticePeriodDays,
      noticePenaltyAmount: version.noticePenaltyAmount,
      advanceRefundDeadlineDays: version.advanceRefundDeadlineDays,
      requireAdvanceTopup: version.requireAdvanceTopup,
      annualRentIncreasePercent: version.annualRentIncreasePercent,
      contractExpiryWarningDays: version.contractExpiryWarningDays,
      overdueEscalation,
      allowedDeductions,
      rulesTextEn: version.rulesTextEn || DEFAULT_POLICY.rulesTextEn,
      rulesTextBn: version.rulesTextBn || DEFAULT_POLICY.rulesTextBn,
    },
  };
}

/**
 * Calculates the required advance amount (in paisa) based on rent, policy, or custom renter agreement.
 * If the shopkeeper has a specific agreed advance, that individual amount takes priority.
 */
export function calculateRequiredAdvance(
  monthlyRent: number,
  policy: PolicyData,
  agreedAdvanceCustom?: number | null
): number {
  if (agreedAdvanceCustom !== undefined && agreedAdvanceCustom !== null && agreedAdvanceCustom > 0) {
    return agreedAdvanceCustom;
  }
  if (policy.requiredAdvanceFixed && policy.requiredAdvanceFixed > 0) {
    return policy.requiredAdvanceFixed;
  }
  // If policy requires advance months and no custom agreement is specified
  if (policy.requiredAdvanceMonths && policy.requiredAdvanceMonths > 0) {
    return Math.round(monthlyRent * policy.requiredAdvanceMonths);
  }
  return 0;
}

/**
 * Calculates shortfall between required advance and current advance balance.
 */
export function calculateAdvanceShortfall(
  currentAdvance: number,
  requiredAdvance: number
): number {
  return Math.max(0, requiredAdvance - currentAdvance);
}

/**
 * Calculates late fee for a bill if overdue past grace period.
 */
export function calculateLateFee(
  bill: { dueDate: Date | string; dueAmount: number },
  policy: PolicyData,
  asOfDate: Date = new Date()
): number {
  if (policy.lateFeeType === "NONE" || policy.lateFeeAmount <= 0) return 0;
  if (bill.dueAmount <= 0) return 0;

  const dueDate = new Date(bill.dueDate);
  const graceDate = new Date(dueDate);
  graceDate.setDate(graceDate.getDate() + (policy.gracePeriodDays || 5));

  if (asOfDate <= graceDate) {
    return 0; // Within grace period
  }

  let fee = 0;
  if (policy.lateFeeType === "FIXED") {
    fee = policy.lateFeeAmount;
  } else if (policy.lateFeeType === "DAILY") {
    const diffTime = Math.abs(asOfDate.getTime() - graceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    fee = diffDays * policy.lateFeeAmount;
  } else if (policy.lateFeeType === "PERCENTAGE") {
    // basis points or percentage (e.g. 5 = 5%)
    fee = Math.round((bill.dueAmount * policy.lateFeeAmount) / 100);
  }

  if (policy.lateFeeCap && policy.lateFeeCap > 0) {
    fee = Math.min(fee, policy.lateFeeCap);
  }

  return fee;
}

/**
 * Evaluates tenant financial risk status.
 * Returns risk level:
 * - "CRITICAL": 3+ months overdue OR total dues > 100% of advance -> Flagged "Eligible for settlement"
 * - "WARNING": 2 months overdue OR total dues >= 80% of advance -> Written warning / Suggest advance adjustment
 * - "NORMAL": Less than 2 months and dues < 80% of advance
 */
export function evaluateTenantRisk(
  advanceBalance: number,
  unpaidBills: { month: number; year: number; dueAmount: number }[]
): {
  riskLevel: "NORMAL" | "WARNING" | "CRITICAL";
  totalDue: number;
  advanceBalance: number;
  overdueMonthsCount: number;
  dueToAdvanceRatio: number;
  eligibleForSettlement: boolean;
} {
  const totalDue = unpaidBills.reduce((acc, b) => acc + (b.dueAmount || 0), 0);
  const overdueMonthsCount = unpaidBills.length;
  const ratio = advanceBalance > 0 ? totalDue / advanceBalance : (totalDue > 0 ? 999 : 0);

  let riskLevel: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
  let eligibleForSettlement = false;

  if (overdueMonthsCount >= 3 || ratio >= 1.0) {
    riskLevel = "CRITICAL";
    eligibleForSettlement = true;
  } else if (overdueMonthsCount >= 2 || ratio >= 0.8) {
    riskLevel = "WARNING";
  }

  return {
    riskLevel,
    totalDue,
    advanceBalance,
    overdueMonthsCount,
    dueToAdvanceRatio: Math.min(9.99, ratio),
    eligibleForSettlement,
  };
}
