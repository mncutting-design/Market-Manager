"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

export interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any | null;
  categories: any[];
  markets: any[];
  onUpdated?: () => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  categories,
  markets,
  onUpdated,
}: EditExpenseModalProps) {
  const { t, locale } = useTranslation();
  const { currentUser, isAdmin, triggerRefresh } = useApp();

  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>("");
  const [marketId, setMarketId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [date, setDate] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (expense && isOpen) {
      setAmountBDT(expense.amount ? expense.amount / 100 : 0);
      setCategoryId(expense.categoryId || (categories.length > 0 ? categories[0].id : ""));
      setMarketId(expense.marketId || (markets.length > 0 ? markets[0].id : ""));
      setDescription(expense.description || "");
      setPaymentMethod(expense.paymentMethod || "CASH");
      setDate(
        expense.date
          ? new Date(expense.date).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setAttachmentUrl(expense.attachmentUrl || "");
    }
  }, [expense, isOpen, categories, markets]);

  if (!expense) return null;

  const originalAmountPaisa = expense.amount || 0;
  const newAmountPaisa = Math.round((Number(amountBDT) || 0) * 100);
  const deltaPaisa = newAmountPaisa - originalAmountPaisa;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newAmountPaisa <= 0) {
      toast.error(
        locale === "bn"
          ? "খরচের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে"
          : "Amount must be greater than zero"
      );
      return;
    }

    if (!categoryId || !marketId) {
      toast.error("Category and Market are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: expense.id,
          amount: newAmountPaisa,
          categoryId,
          marketId,
          description: description.trim() || null,
          paymentMethod,
          date,
          attachmentUrl: attachmentUrl.trim() || null,
          submitForApproval: !isAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update expense");
        return;
      }

      if (data.requiresApproval) {
        toast.info(
          data.message ||
            (locale === "bn"
              ? "খরচ পরিবর্তনের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে!"
              : "Expense change request submitted for admin approval!")
        );
      } else {
        toast.success(
          locale === "bn"
            ? "খরচ রেকর্ড সফলভাবে আপডেট করা হয়েছে!"
            : "Expense record updated successfully!"
        );
      }

      triggerRefresh();
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      toast.error("Failed to update expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
          <span className="text-base sm:text-lg font-black">
            {locale === "bn" ? "খরচ এন্ট্রি সম্পাদন" : "Edit Expense Entry"}
          </span>
        </div>
      }
      description={
        locale === "bn"
          ? "খরচের পরিমাণ, খাত ও বিবরণ সংশোধন করুন। ম্যানেজার কর্তৃক আবেদন অ্যাডমিনের অনুমোদনের পর চূড়ান্ত কার্যকর হবে।"
          : "Update expense amount, category and remarks. Manager submissions require Admin approval."
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Info Banner */}
        <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-md text-xs font-black border border-black shadow-[1px_1px_0px_#000000]"
              style={{
                backgroundColor: `${expense.category?.color || "#0d9488"}25`,
                color: "#000000",
              }}
            >
              {locale === "bn"
                ? expense.category?.name_bn || expense.category?.name_en
                : expense.category?.name_en || expense.category?.name_bn}
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {expense.market?.name}
            </span>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-bold uppercase">পূর্ববর্তী পরিমাণ</p>
            <p className="text-sm font-black text-black dark:text-white font-mono">
              {formatCurrency(originalAmountPaisa, locale)}
            </p>
          </div>
        </div>

        {/* Live Delta Calculation Card */}
        <div
          className={`p-3 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-between gap-3 ${
            deltaPaisa !== 0
              ? deltaPaisa > 0
                ? "bg-[#FFF8D6] dark:bg-[#332A00]"
                : "bg-[#E6F8F2] dark:bg-[#00382B]"
              : "bg-white dark:bg-[#1E1F24]"
          }`}
        >
          <div className="flex items-center gap-2">
            {deltaPaisa > 0 ? (
              <TrendingUp className="w-4 h-4 text-[#F59E0B] stroke-[3] shrink-0" />
            ) : deltaPaisa < 0 ? (
              <TrendingDown className="w-4 h-4 text-[#00BA88] stroke-[3] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-black dark:text-white stroke-[2.5] shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-black text-black dark:text-white">
                {deltaPaisa === 0
                  ? locale === "bn"
                    ? "টাকার পরিমাণে কোনো পরিবর্তন হয়নি"
                    : "No amount change"
                  : deltaPaisa > 0
                  ? locale === "bn"
                    ? `খরচ বাড়ছে: +${formatCurrency(deltaPaisa, locale)}`
                    : `Expense increase: +${formatCurrency(deltaPaisa, locale)}`
                  : locale === "bn"
                  ? `খরচ কমছে: -${formatCurrency(Math.abs(deltaPaisa), locale)}`
                  : `Expense decrease: -${formatCurrency(Math.abs(deltaPaisa), locale)}`}
              </span>
              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {locale === "bn" ? "নতুন খরচ হবে:" : "New expense will be:"}{" "}
                <span className="font-black text-black dark:text-white font-mono">
                  {formatCurrency(newAmountPaisa, locale)}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black bg-white dark:bg-black text-black dark:text-white shadow-[1px_1px_0px_#000000]">
              {deltaPaisa === 0 ? "NO DELTA" : deltaPaisa > 0 ? "+ EXPENSE" : "- EXPENSE"}
            </span>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          {/* Amount */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {locale === "bn" ? "খরচের পরিমাণ (টাকা)" : "Expense Amount (BDT)"} *
            </label>
            <NumberInput
              value={amountBDT}
              onChange={(val) => setAmountBDT(val)}
              placeholder="e.g. 5000"
              required
              className="text-base font-black font-mono"
            />
          </div>

          {/* Category & Market Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {locale === "bn" ? "খরচের খাত (Category)" : "Expense Category"} *
              </label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "bn" ? c.name_bn || c.name_en : c.name_en || c.name_bn}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {locale === "bn" ? "মার্কেট" : "Market"} *
              </label>
              <Select value={marketId} onChange={(e) => setMarketId(e.target.value)}>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {locale === "bn" ? "পরিশোধের মাধ্যম" : "Payment Method"} *
              </label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">ক্যাশ (CASH)</option>
                <option value="BKASH">বিকাশ (bKash)</option>
                <option value="NAGAD">নগদ (Nagad)</option>
                <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
                <option value="CHEQUE">চেক (Cheque)</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {locale === "bn" ? "খরচের তারিখ" : "Expense Date"}
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs font-bold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {locale === "bn" ? "খরচের বিবরণ বা উদ্দেশ্য" : "Description / Remarks"}
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. জেনারেটর ডিজেল ও সার্ভিসিং"
              className="text-xs font-bold"
            />
          </div>

          {/* Attachment / Voucher Ref */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {locale === "bn" ? "ভাউচার / রসিদ নম্বর" : "Voucher / Receipt Ref"}
            </label>
            <Input
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="e.g. VCH-2026-0042"
              className="text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Manager Approval Notice Banner */}
        {!isAdmin && (
          <div className="p-3 rounded-xl bg-[#FFF8D6] dark:bg-[#2C2405] border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-2 text-xs text-black dark:text-white font-bold">
            <ShieldCheck className="w-4 h-4 text-black dark:text-white shrink-0 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? "ম্যানেজার হিসেবে আপনার এই খরচের পরিবর্তন অ্যাডমিন অনুমোদন কেন্দ্রে যাবে। অ্যাডমিন অনুমোদন করলে তবেই মূল হিসাবে কার্যকর হবে।"
                : "As a Manager, this change will be submitted to the Admin Approvals Center."}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-black/10 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="font-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {isAdmin
              ? locale === "bn"
                ? "সরাসরি আপডেট করুন"
                : "Update Expense Directly"
              : locale === "bn"
              ? "অ্যাডমিন অনুমোদনের জন্য পাঠান"
              : "Submit for Admin Approval"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
