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
      <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1 inline-block mr-1" />
        <span>{locale === "bn" ? "কোনো পরিবর্তন চিহ্নিত হয়নি।" : "No differences detected."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 w-full max-w-full overflow-hidden">
      {title && (
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            {title}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 shrink-0">
            {locale === "bn"
              ? `${toBanglaDigits(displayedItems.length)}টি ফিল্ড পরিবর্তন`
              : `${displayedItems.length} fields modified`}
          </span>
        </div>
      )}

      {/* Side by side / Stacked comparison cards - 100% Mobile Responsive */}
      <div className="space-y-2">
        {displayedItems.map((item) => (
          <div
            key={item.key}
            className="p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs w-full overflow-hidden"
          >
            {/* Field header with change pill */}
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between gap-2">
              <span className="truncate">{item.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.delta !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      item.delta > 0
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                    }`}
                  >
                    {item.delta > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {item.delta > 0 ? "+" : ""}
                      {formatCurrency(item.delta, locale)}
                    </span>
                  </span>
                )}
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {locale === "bn" ? "পরিবর্তিত" : "Modified"}
                </span>
              </div>
            </div>

            {/* WHAT HAVE vs WHAT WILL HAVE - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {/* 🔴 WHAT HAVE (Current) */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 min-w-0">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-rose-800 dark:text-rose-300 mb-0.5">
                  <span className="truncate">{locale === "bn" ? "🔴 বর্তমান (What have)" : "🔴 Current Value"}</span>
                  <MinusCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1" />
                </div>
                <div className="text-xs sm:text-sm font-medium text-rose-950 dark:text-rose-200 break-words line-through decoration-rose-400 dark:decoration-rose-500">
                  {formatValue(item.currentValue, item.type)}
                </div>
              </div>

              {/* 🟢 WHAT WILL HAVE (Proposed) */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 min-w-0">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                  <span className="truncate">{locale === "bn" ? "🟢 প্রস্তাবিত (What will have)" : "🟢 Proposed Value"}</span>
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200 break-words">
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
