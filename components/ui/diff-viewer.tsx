"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, toBanglaDigits } from "@/lib/format";
import { ArrowRight, AlertTriangle, CheckCircle2, MinusCircle, PlusCircle } from "lucide-react";

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
  name: { en: "Name", bn: "মার্কেট / নাম", type: "text" },
  address: { en: "Address", bn: "ঠিকানা", type: "text" },
  notes: { en: "Notes", bn: "নোট", type: "text" },
  totalFloors: { en: "Total Floors", bn: "মোট ফ্লোর সংখ্যা", type: "number" },
  shopNumber: { en: "Shop Number", bn: "দোকান নম্বর", type: "text" },
  floor: { en: "Floor", bn: "তলা / ফ্লোর", type: "text" },
  size: { en: "Size", bn: "সাইজ", type: "text" },
  defaultRent: { en: "Rent Amount", bn: "নির্ধারিত ভাড়া", type: "currency" },
  rentAmount: { en: "Rent Amount", bn: "ভাড়ার পরিমাণ", type: "currency" },
  newRent: { en: "Revised Rent", bn: "সংশোধিত ভাড়া", type: "currency" },
  advanceDeposit: { en: "Advance Deposit", bn: "অগ্রিম জামানত", type: "currency" },
  phone: { en: "Phone", bn: "ফোন নম্বর", type: "text" },
  nid: { en: "NID Number", bn: "এনআইডি নম্বর", type: "text" },
  amount: { en: "Amount", bn: "টাকার পরিমাণ", type: "currency" },
  description: { en: "Description", bn: "বিবরণ", type: "text" },
  isActive: { en: "Status", bn: "কার্যকারিতা", type: "text" },
};

export function DiffViewer({
  currentData = {},
  proposedData = {},
  fieldDefinitions,
  title,
  hideUnchanged = true,
}: DiffViewerProps) {
  const { locale } = useTranslation();

  // Aggregate all keys
  const allKeys = Array.from(
    new Set([...Object.keys(currentData || {}), ...Object.keys(proposedData || {})])
  ).filter((k) => k !== "id" && k !== "updatedAt" && k !== "createdAt");

  const diffItems = allKeys.map((key) => {
    const curVal = currentData ? currentData[key] : undefined;
    const propVal = proposedData ? proposedData[key] : undefined;

    const def = fieldDefinitions?.find((f) => f.key === key) || DEFAULT_FIELD_LABELS[key];
    const label =
      locale === "bn"
        ? (def as any)?.bn || (def as any)?.labelBn || key
        : (def as any)?.en || (def as any)?.labelEn || key;
    const type = def?.type || (typeof propVal === "number" && key.toLowerCase().includes("rent") ? "currency" : "text");

    const isDifferent = JSON.stringify(curVal) !== JSON.stringify(propVal);

    return {
      key,
      label,
      type,
      currentValue: curVal,
      proposedValue: propVal,
      isDifferent,
    };
  });

  const displayedItems = hideUnchanged ? diffItems.filter((item) => item.isDifferent) : diffItems;

  const formatValue = (val: any, type?: string) => {
    if (val === undefined || val === null || val === "") {
      return <span className="text-slate-400 italic font-normal text-xs">{locale === "bn" ? "খালি / নেই" : "None"}</span>;
    }
    if (type === "currency" && typeof val === "number") {
      return <span className="font-bold">{formatCurrency(val, locale)}</span>;
    }
    if (type === "number" && typeof val === "number") {
      return <span>{locale === "bn" ? toBanglaDigits(val) : val}</span>;
    }
    if (typeof val === "boolean") {
      return val ? (
        <span className="text-emerald-600 font-semibold">{locale === "bn" ? "সক্রিয় (Active)" : "Active"}</span>
      ) : (
        <span className="text-rose-600 font-semibold">{locale === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</span>
      );
    }
    return String(val);
  };

  if (displayedItems.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        {locale === "bn" ? "কোনো পরিবর্তন চিহ্নিত হয়নি।" : "No differences detected."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {title}
          </span>
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
            {locale === "bn"
              ? `${toBanglaDigits(displayedItems.length)}টি পরিবর্তন`
              : `${displayedItems.length} changes`}
          </span>
        </div>
      )}

      {/* Side by side / Stacked comparison */}
      <div className="space-y-2.5">
        {displayedItems.map((item) => (
          <div
            key={item.key}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>{item.label}</span>
              {item.isDifferent && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {locale === "bn" ? "পরিবর্তিত" : "Modified"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* WHAT HAVE (Current) */}
              <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 dark:text-rose-400 mb-1">
                  <span>{locale === "bn" ? "🔴 বর্তমান তথ্য (What have)" : "🔴 Current Value"}</span>
                  <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-sm font-medium text-rose-950 dark:text-rose-200 break-words line-through decoration-rose-400">
                  {formatValue(item.currentValue, item.type)}
                </div>
              </div>

              {/* WHAT WILL HAVE (Proposed) */}
              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                  <span>{locale === "bn" ? "🟢 প্রস্তাবিত নতুন তথ্য (What will have)" : "🟢 Proposed Value"}</span>
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-sm font-bold text-emerald-950 dark:text-emerald-200 break-words">
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
