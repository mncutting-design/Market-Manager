"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, toBanglaDigits } from "@/lib/format";
import { ArrowRight, AlertTriangle, CheckCircle2, MinusCircle, PlusCircle, TrendingUp, TrendingDown, Target } from "lucide-react";

export interface DiffFieldDef {
  key: string;
  labelEn: string;
  labelBn: string;
  type?: "text" | "currency" | "number" | "boolean" | "date";
}

interface DiffViewerProps {
  currentData: Record<string, any>;
  proposedData: Record<string, any>;
  fieldDefinitions?: DiffFieldDef[];
  title?: string;
  hideUnchanged?: boolean;
}

const DEFAULT_FIELD_LABELS: Record<string, { en: string; bn: string; type?: "currency" | "number" | "text" }> = {
  name: { en: "Market Name", bn: "মার্কেটের নাম", type: "text" },
  address: { en: "Market Address", bn: "মার্কেট ঠিকানা", type: "text" },
  notes: { en: "Notes & Remarks", bn: "মন্তব্য ও বিবরণ", type: "text" },
  totalFloors: { en: "Total Floors", bn: "মোট ফ্লোর সংখ্যা", type: "number" },
  shopNumber: { en: "Shop Number", bn: "দোকান নম্বর", type: "text" },
  floor: { en: "Floor Level", bn: "তলা / ফ্লোর", type: "text" },
  size: { en: "Shop Size", bn: "দোকানের সাইজ", type: "text" },
  defaultRent: { en: "Default Rent", bn: "নির্ধারিত ভাড়া", type: "currency" },
  rentAmount: { en: "Rent Amount", bn: "ভাড়ার পরিমাণ", type: "currency" },
  newRent: { en: "Revised Rent", bn: "সংশোধিত ভাড়া", type: "currency" },
  effectiveFrom: { en: "Effective From", bn: "কার্যকর হওয়ার তারিখ", type: "text" },
  advanceDeposit: { en: "Advance Deposit", bn: "অগ্রিম জামানত", type: "currency" },
  phone: { en: "Phone Number", bn: "ফোন নম্বর", type: "text" },
  nid: { en: "NID Number", bn: "এনআইডি নম্বর", type: "text" },
  amount: { en: "Amount", bn: "টাকার পরিমাণ", type: "currency" },
  topupAmount: { en: "Top-up Amount", bn: "টপ-আপের পরিমাণ", type: "currency" },
  currentAdvance: { en: "Current Advance Balance", bn: "বর্তমান জামানত ব্যালেন্স", type: "currency" },
  permanentAddress: { en: "Permanent Address", bn: "স্থায়ী ঠিকানা", type: "text" },
  referenceName: { en: "Reference Person Name", bn: "রেফারেন্স ব্যক্তির নাম", type: "text" },
  referencePhone: { en: "Reference Person Phone", bn: "রেফারেন্স ব্যক্তির ফোন", type: "text" },
  referenceRelation: { en: "Reference Relation", bn: "রেফারেন্সের সাথে সম্পর্ক", type: "text" },
  method: { en: "Payment Channel", bn: "পেমেন্ট চ্যানেল", type: "text" },
  note: { en: "Note / Remarks", bn: "নোট / কারণ", type: "text" },
  category: { en: "Expense Category", bn: "খরচের খাত", type: "text" },
  description: { en: "Description", bn: "বিবরণ", type: "text" },
  isActive: { en: "Account Status", bn: "লগইন কার্যকারিতা", type: "text" },
};

const IGNORED_INTERNAL_KEYS = new Set([
  "id",
  "updatedAt",
  "createdAt",
  "marketId",
  "shopId",
  "tenantId",
  "billId",
  "status",
  "submitForApproval",
  "isRentRevision",
  "marketName",
  "billItems",
]);

/**
 * Normalizes values for comparison to avoid false-positive diffs
 */
function isDifferentValue(a: any, b: any): boolean {
  if ((a === undefined || a === null || a === "") && (b === undefined || b === null || b === "")) {
    return false;
  }
  if (typeof a === "number" && typeof b === "number") {
    return Math.round(a) !== Math.round(b);
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.trim() !== b.trim();
  }
  return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * Generate human-readable Purpose Summary for Admin
 */
export function getChangePurposeSummary({
  entityType,
  entityTitle,
  actionType,
  requestedBy,
  currentData = {},
  proposedData = {},
  locale,
}: {
  entityType?: string;
  entityTitle?: string;
  actionType?: string;
  requestedBy?: string;
  currentData?: Record<string, any>;
  proposedData?: Record<string, any>;
  locale: "bn" | "en";
}): {
  title: string;
  bullets: string[];
  actionBadge: string;
} {
  const isBn = locale === "bn";
  const bullets: string[] = [];

  if (entityType === "ADVANCE_TOPUP" || actionType === "TOPUP") {
    const topupAmt = proposedData.topupAmount || proposedData.amount || 0;
    const curAdv = currentData.currentAdvance || currentData.advanceBalance || 0;
    const method = proposedData.method || "CASH";
    const note = proposedData.note;

    if (isBn) {
      bullets.push(`টপ-আপ জামানতের পরিমাণ: ${formatCurrency(topupAmt, "bn")}`);
      bullets.push(`বর্তমান ব্যালেন্স: ${formatCurrency(curAdv, "bn")} ➔ অনুমোদনের পর হবে: ${formatCurrency(curAdv + topupAmt, "bn")}`);
      bullets.push(`পেমেন্ট চ্যানেল: ${method}`);
      if (note) bullets.push(`কারণ / নোট: ${note}`);
    } else {
      bullets.push(`Top-up Deposit Amount: ${formatCurrency(topupAmt, "en")}`);
      bullets.push(`Current Advance: ${formatCurrency(curAdv, "en")} ➔ After approval: ${formatCurrency(curAdv + topupAmt, "en")}`);
      bullets.push(`Payment Channel: ${method}`);
      if (note) bullets.push(`Reason / Note: ${note}`);
    }

    return {
      title: isBn
        ? `🎯 উদ্দেশ্য: ${entityTitle || "ভাড়াটিয়া"} - জামানত টপ-আপ অনুমোদন`
        : `🎯 Purpose: ${entityTitle || "Tenant"} - Advance Top-Up Approval`,
      bullets,
      actionBadge: isBn ? "টপ-আপ আবেদন" : "Top-Up Request",
    };
  }

  if (actionType === "DELETE") {
    return {
      title: isBn
        ? `⚠️ মুছে ফেলার চরম আবেদন: ${entityTitle || entityType}`
        : `⚠️ Permanent Deletion Request: ${entityTitle || entityType}`,
      bullets: [
        isBn
          ? `ব্যবহারকারী '${requestedBy || "স্টাফ"}' এই রেকর্ডটি চিরতরে মুছে ফেলতে আবেদন করেছেন।`
          : `Requested by '${requestedBy || "Staff"}' to permanently delete this record.`,
      ],
      actionBadge: isBn ? "মুছে ফেলার আবেদন" : "Delete Request",
    };
  }

  // Check changed fields
  const allKeys = Array.from(
    new Set([...Object.keys(currentData || {}), ...Object.keys(proposedData || {})])
  ).filter((k) => !IGNORED_INTERNAL_KEYS.has(k));

  for (const key of allKeys) {
    const curVal = currentData ? currentData[key] : undefined;
    const propVal = proposedData ? proposedData[key] : undefined;
    if (!isDifferentValue(curVal, propVal)) continue;

    const def = DEFAULT_FIELD_LABELS[key];
    const fieldName = isBn ? def?.bn || key : def?.en || key;

    if (key.toLowerCase().includes("rent") || key === "amount") {
      const curNum = typeof curVal === "number" ? curVal : 0;
      const propNum = typeof propVal === "number" ? propVal : 0;
      const diff = propNum - curNum;
      const sign = diff >= 0 ? "+" : "";

      if (isBn) {
        bullets.push(
          `${fieldName}: ${formatCurrency(curNum, "bn")} থেকে ${diff > 0 ? "বৃদ্ধি করে" : "কমিয়ে"} ${formatCurrency(propNum, "bn")} (${sign}${formatCurrency(diff, "bn")}) নির্ধারণ।`
        );
      } else {
        bullets.push(
          `${fieldName}: Changed from ${formatCurrency(curNum, "en")} to ${formatCurrency(propNum, "en")} (${sign}${formatCurrency(diff, "en")}).`
        );
      }
    } else if (key === "totalFloors") {
      if (isBn) {
        bullets.push(`ফ্লোর সংখ্যা: ${toBanglaDigits(curVal || 5)} তলা থেকে পরিবর্তন করে ${toBanglaDigits(propVal)} তলা।`);
      } else {
        bullets.push(`Floors: Changed from ${curVal || 5} to ${propVal} floors.`);
      }
    } else {
      if (isBn) {
        bullets.push(
          `${fieldName}: '${curVal || "নেই"}' থেকে পরিবর্তন করে '${propVal}' নির্ধারণ।`
        );
      } else {
        bullets.push(
          `${fieldName}: Changed from '${curVal || "None"}' to '${propVal}'.`
        );
      }
    }
  }

  const title = isBn
    ? `🎯 উদ্দেশ্য: ${entityTitle ? `${entityTitle} এর` : ""} ${bullets.length > 0 ? bullets[0] : "তথ্য সম্পাদনা"}`
    : `🎯 Purpose: ${entityTitle ? `${entityTitle} - ` : ""}${bullets.length > 0 ? bullets[0] : "Record update"}`;

  return {
    title,
    bullets,
    actionBadge: isBn ? "সম্পাদনা আবেদন" : "Edit Request",
  };
}

export function DiffViewer({
  currentData = {},
  proposedData = {},
  fieldDefinitions,
  title,
  hideUnchanged = true, // By default STRICTLY ONLY show modified fields!
}: DiffViewerProps) {
  const { locale } = useTranslation();

  // Aggregate only relevant user-facing keys
  const allKeys = Array.from(
    new Set([...Object.keys(currentData || {}), ...Object.keys(proposedData || {})])
  ).filter((k) => !IGNORED_INTERNAL_KEYS.has(k));

  const diffItems = allKeys.map((key) => {
    const curVal = currentData ? currentData[key] : undefined;
    const propVal = proposedData ? proposedData[key] : undefined;

    const def = fieldDefinitions?.find((f) => f.key === key) || DEFAULT_FIELD_LABELS[key];
    const label =
      locale === "bn"
        ? (def as any)?.bn || (def as any)?.labelBn || key
        : (def as any)?.en || (def as any)?.labelEn || key;
    const type = def?.type || (typeof propVal === "number" && (key.toLowerCase().includes("rent") || key === "amount") ? "currency" : "text");

    const isDifferent = isDifferentValue(curVal, propVal);

    // Delta calculation for numbers/currency
    let delta = 0;
    if (isDifferent && typeof curVal === "number" && typeof propVal === "number") {
      delta = propVal - curVal;
    }

    return {
      key,
      label,
      type,
      currentValue: curVal,
      proposedValue: propVal,
      isDifferent,
      delta,
    };
  });

  // What just change preview JUST SHOWING IT NOT OTHERS THING
  const displayedItems = hideUnchanged ? diffItems.filter((item) => item.isDifferent) : diffItems;

  const formatValue = (val: any, type?: string) => {
    if (val === undefined || val === null || val === "") {
      return (
        <span className="text-slate-400 dark:text-slate-500 italic font-normal text-xs">
          {locale === "bn" ? "খালি / নেই" : "None"}
        </span>
      );
    }
    if (type === "currency" && typeof val === "number") {
      return <span className="font-extrabold">{formatCurrency(val, locale)}</span>;
    }
    if (type === "number" && typeof val === "number") {
      return <span>{locale === "bn" ? toBanglaDigits(val) : val}</span>;
    }
    if (typeof val === "boolean") {
      return val ? (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{locale === "bn" ? "সক্রিয় (Active)" : "Active"}</span>
      ) : (
        <span className="text-rose-600 dark:text-rose-400 font-bold">{locale === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</span>
      );
    }
    return String(val);
  };

  if (displayedItems.length === 0) {
    return (
      <div className="p-3 sm:p-4 rounded-xl bg-[#FBF9F5] border-2 border-black shadow-[2px_2px_0px_#000000] text-center text-xs font-bold text-black">
        <CheckCircle2 className="w-4 h-4 text-[#00BA88] mx-auto mb-1 inline-block mr-1 stroke-[2.5]" />
        <span>{locale === "bn" ? "কোনো পরিবর্তন চিহ্নিত হয়নি।" : "No differences detected."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 w-full max-w-full overflow-hidden">
      {title && (
        <div className="flex items-center justify-between pb-2 border-b-2 border-black gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-black truncate">
            {title}
          </span>
          <span className="text-[10px] sm:text-[11px] font-black text-black bg-[#FED734] px-2.5 py-0.5 rounded-md border-2 border-black shadow-[1.5px_1.5px_0px_#000000] shrink-0">
            {locale === "bn"
              ? `${toBanglaDigits(displayedItems.length)}টি ফিল্ড পরিবর্তন`
              : `${displayedItems.length} fields modified`}
          </span>
        </div>
      )}

      {/* Side by side / Stacked comparison cards - 100% Mobile Responsive */}
      <div className="space-y-2.5">
        {displayedItems.map((item) => (
          <div
            key={item.key}
            className="p-3 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_#000000] w-full overflow-hidden"
          >
            {/* Field header with change pill */}
            <div className="text-xs font-black text-black mb-2 flex items-center justify-between gap-2">
              <span className="truncate">{item.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.delta !== 0 && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border-2 border-black shadow-[1px_1px_0px_#000000] ${
                      item.delta > 0
                        ? "bg-[#00BA88] text-white"
                        : "bg-[#FF4B55] text-white"
                    }`}
                  >
                    {item.delta > 0 ? (
                      <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                    )}
                    <span>
                      {item.delta > 0 ? "+" : ""}
                      {formatCurrency(item.delta, locale)}
                    </span>
                  </span>
                )}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FED734] text-black border-2 border-black shadow-[1px_1px_0px_#000000]">
                  {locale === "bn" ? "পরিবর্তিত" : "Modified"}
                </span>
              </div>
            </div>

            {/* WHAT HAVE vs WHAT WILL HAVE - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {/* 🔴 WHAT HAVE (Current) */}
              <div className="p-2.5 rounded-lg bg-[#FFEBEF] border-2 border-[#FFA2B2] shadow-[2px_2px_0px_#FF4B55] min-w-0">
                <div className="flex items-center justify-between text-[11px] font-black text-[#FF4B55] mb-0.5">
                  <span className="truncate">{locale === "bn" ? "🔴 বর্তমান (What have)" : "🔴 Current Value"}</span>
                  <MinusCircle className="w-3.5 h-3.5 text-[#FF4B55] shrink-0 ml-1 stroke-[2.5]" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-black break-words line-through decoration-[#FF4B55] decoration-2">
                  {formatValue(item.currentValue, item.type)}
                </div>
              </div>

              {/* 🟢 WHAT WILL HAVE (Proposed) */}
              <div className="p-2.5 rounded-lg bg-[#E6F8F2] border-2 border-[#00BA88] shadow-[2px_2px_0px_#00BA88] min-w-0">
                <div className="flex items-center justify-between text-[11px] font-black text-[#00BA88] mb-0.5">
                  <span className="truncate">{locale === "bn" ? "🟢 প্রস্তাবিত (What will have)" : "🟢 Proposed Value"}</span>
                  <PlusCircle className="w-3.5 h-3.5 text-[#00BA88] shrink-0 ml-1 stroke-[2.5]" />
                </div>
                <div className="text-xs sm:text-sm font-black text-black break-words">
                  {formatValue(item.proposedValue, item.type)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
