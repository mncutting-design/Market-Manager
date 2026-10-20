"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { formatMonth, getMonthList, toBanglaDigits } from "@/lib/format";
import { toast } from "sonner";
import { Receipt, CheckCircle2 } from "lucide-react";

export function GenerateBillsModal() {
  const { t, locale } = useTranslation();
  const {
    isGenerateBillsOpen,
    setIsGenerateBillsOpen,
    markets,
    selectedMarketId,
    selectedMonth,
    selectedYear,
    triggerRefresh,
  } = useApp();

  const [marketId, setMarketId] = useState<string>(selectedMarketId || "ALL");
  const [month, setMonth] = useState<number>(selectedMonth || 10);
  const [year, setYear] = useState<number>(selectedYear || 2026);
  const [dueDay, setDueDay] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const months = getMonthList(locale);
  const years = [2025, 2026, 2027];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          month,
          year,
          dueDay,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate bills");
        return;
      }

      const period = formatMonth(month, locale, year);
      if (data.createdCount > 0) {
        toast.success(
          t("billing.billsGenerated", {
            count: locale === "bn" ? toBanglaDigits(data.createdCount) : data.createdCount,
            period,
          })
        );
      } else {
        toast.info(t("billing.alreadyGenerated"));
      }

      triggerRefresh();
      setIsGenerateBillsOpen(false);
    } catch (e) {
      toast.error("Failed to generate bills");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedMarketName =
    marketId === "ALL"
      ? t("common.allMarkets")
      : markets.find((m) => m.id === marketId)?.name || "";

  return (
    <Dialog
      isOpen={isGenerateBillsOpen}
      onClose={() => setIsGenerateBillsOpen(false)}
      title={t("billing.generateModalTitle")}
      description={t("billing.generateDesc", {
        market: selectedMarketName,
        period: formatMonth(month, locale, year),
      })}
      maxWidth="md"
    >
      <form onSubmit={handleGenerate} className="space-y-4">
        {/* Select Market */}
        <SearchableSelect
          label={t("collections.selectMarket")}
          value={marketId}
          onChange={(val) => setMarketId(val)}
          options={[
            { value: "ALL", label: t("common.allMarkets") },
            ...markets.map((m) => ({
              value: m.id,
              label: m.name,
              sublabel: `${m.totalShops || 0} ${locale === "bn" ? "দোকান" : "Shops"}`,
            })),
          ]}
          placeholder="Select market..."
          searchPlaceholder={locale === "bn" ? "মার্কেট খুঁজুন..." : "Search market..."}
        />

        {/* Month & Year Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("dashboard.selectMonth")}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          <Select
            label={t("dashboard.selectYear")}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {locale === "bn" ? toBanglaDigits(y) : y}
              </option>
            ))}
          </Select>
        </div>

        {/* Payment Due Day */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            {t("settings.billDueDay")}
          </label>
          <Input
            type="number"
            min={1}
            max={28}
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
          />
          <p className="text-xs text-slate-500 mt-1">{t("settings.billDueDayDesc")}</p>
        </div>

        {/* Info card - Strictly manual additional charges */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <p className="font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              {locale === "bn"
                ? "শুধুমাত্র নির্ধারিত ভাড়া বিল তৈরি হবে (ম্যানুয়াল চার্জ ব্যবস্থা)"
                : "Base Rent Only (Manual Charges System)"}
            </span>
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {locale === "bn"
              ? "কোনো অতিরিক্ত চার্জ স্বয়ংক্রিয়ভাবে যোগ হবে না। প্রতিটি দোকানের কেবল চুক্তি অনুযায়ী নির্ধারিত মূল ভাড়া বিল তৈরি হবে। অতিরিক্ত যে কোনো খরচ (যেমন: বিদ্যুৎ, পানি, সার্ভিস, জেনারেটর ইত্যাদি) আপনি প্রয়োজন অনুযায়ী 'অতিরিক্ত খরচ' বাটনে চাপ দিয়ে সম্পূর্ণ ম্যানুয়ালি যোগ করতে পারবেন।"
              : "No charges will be added automatically. Bills will only include the agreed base rent. Any extra costs (e.g. electricity, water, service, generator) can be added manually as needed via the 'Extra Costs' button on each bill."}
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsGenerateBillsOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isGenerating}>
            <Receipt className="w-4 h-4 mr-1.5" />
            {t("billing.generateAction")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
