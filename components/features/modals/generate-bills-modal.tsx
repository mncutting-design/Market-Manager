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
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
            {t("settings.billDueDay")}
          </label>
          <Input
            type="number"
            min={1}
            max={28}
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
          />
          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold mt-1">{t("settings.billDueDayDesc")}</p>
        </div>

        {/* Info card - Strictly manual additional charges & automatic carry-forward */}
        <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black text-xs text-black dark:text-white space-y-1.5 shadow-[2px_2px_0px_#000000]">
          <p className="font-black text-black dark:text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? "মূল ভাড়া ও পূর্বের বকেয়া সমন্বয় ব্যবস্থা"
                : "Base Rent & Prior Arrears Integration"}
            </span>
          </p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 font-bold leading-relaxed">
            {locale === "bn"
              ? "প্রতিটি দোকানের চুক্তি অনুযায়ী নির্ধারিত মূল ভাড়া বিল তৈরি হবে। যদি কোনো দোকানের পূর্ববর্তী মাসের বকেয়া পাওনা থাকে, তবে তা স্বয়ংক্রিয়ভাবে এই নতুন বিলের সাথে যোগ হয়ে সর্বমোট দাবি ও বকেয়া হিসেবে প্রদর্শিত হবে। এছাড়া বিদ্যুৎ, পানি বা অতিরিক্ত খরচ আপনি বিল পেইজ থেকে 'অতিরিক্ত খরচ' বাটনে চাপ দিয়ে সম্পূর্ণ ম্যানুয়ালি যোগ করতে পারবেন।"
              : "Base rent bills will be generated according to lease agreements. Any unpaid dues from previous months will automatically be carried forward and added to the new bill as total payable demand. Variable utilities can be managed via the 'Extra Costs' button."}
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
          <Button type="submit" variant="neo" isLoading={isGenerating}>
            <Receipt className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("billing.generateAction")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
