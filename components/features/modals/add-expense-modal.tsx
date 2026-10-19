"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "sonner";
import { Wrench, CheckCircle2 } from "lucide-react";

export function AddExpenseModal() {
  const { t, locale } = useTranslation();
  const { isAddExpenseOpen, setIsAddExpenseOpen, markets, selectedMarketId, triggerRefresh } = useApp();

  const [marketId, setMarketId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAddExpenseOpen) {
      if (selectedMarketId && selectedMarketId !== "ALL") {
        setMarketId(selectedMarketId);
      } else if (markets.length > 0) {
        setMarketId(markets[0].id);
      }

      // Fetch categories
      const fetchCategories = async () => {
        try {
          const res = await fetch("/api/categories");
          if (res.ok) {
            const data = await res.json();
            setCategories(data.categories || []);
            if (data.categories?.length > 0) {
              setCategoryId(data.categories[0].id);
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchCategories();
    }
  }, [isAddExpenseOpen, selectedMarketId, markets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId || !categoryId) {
      toast.error("Market and Category are required");
      return;
    }
    if (amountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          categoryId,
          amount: Math.round(amountBDT * 100), // into paisa
          date,
          description,
          attachmentUrl,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add expense");
        return;
      }

      toast.success(t("expenses.expenseAdded"));
      triggerRefresh();
      setIsAddExpenseOpen(false);
      setAmountBDT(0);
      setDescription("");
    } catch (e) {
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isAddExpenseOpen}
      onClose={() => setIsAddExpenseOpen(false)}
      title={t("expenses.addExpense")}
      description={t("expenses.subtitle")}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Market Selection */}
        <SearchableSelect
          label={t("expenses.market")}
          value={marketId}
          onChange={(val) => setMarketId(val)}
          options={markets.map((m) => ({
            value: m.id,
            label: m.name,
            sublabel: m.address || undefined,
          }))}
          placeholder="Select market..."
          searchPlaceholder={locale === "bn" ? "মার্কেট খুঁজুন..." : "Search market..."}
        />

        {/* Expense Category */}
        <SearchableSelect
          label={t("expenses.category")}
          value={categoryId}
          onChange={(val) => setCategoryId(val)}
          options={categories.map((c) => ({
            value: c.id,
            label: locale === "bn" ? c.name_bn || c.name_en : c.name_en || c.name_bn,
          }))}
          placeholder="Select category..."
          searchPlaceholder={locale === "bn" ? "ক্যাটাগরি খুঁজুন..." : "Search category..."}
        />

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            {t("expenses.amount")} (৳ BDT)
          </label>
          <NumberInput
            value={amountBDT}
            onChange={(val) => setAmountBDT(val)}
            prefix="৳"
            placeholder="0"
            className="text-lg font-bold"
          />
        </div>

        {/* Date and Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("expenses.date")}
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("expenses.paymentMethod")}
            </label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">{t("collections.cash")}</option>
              <option value="BKASH">{t("collections.bkash")}</option>
              <option value="NAGAD">{t("collections.nagad")}</option>
              <option value="BANK">{t("collections.bank")}</option>
              <option value="CHEQUE">{t("collections.cheque")}</option>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("expenses.description")}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. জেনারেটর মেরামত / Guard salary"
          />
        </div>

        {/* Voucher / Receipt reference */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("expenses.receiptAttachment")}
          </label>
          <Input
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="Voucher no #4092 or receipt notes"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddExpenseOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {t("expenses.addExpense")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
