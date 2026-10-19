"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatMonth } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Plus, Trash2, Receipt, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ManageBillChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onUpdated?: () => void;
}

export function ManageBillChargesModal({
  isOpen,
  onClose,
  bill,
  onUpdated,
}: ManageBillChargesModalProps) {
  const { t, locale } = useTranslation();

  const [description, setDescription] = useState("");
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  if (!isOpen || !bill) return null;

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSubmitting(true);
      const paisa = Math.round(amountBDT * 100);
      const res = await fetch("/api/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          description: description.trim() || (locale === "bn" ? "অতিরিক্ত খরচ" : "Additional Cost"),
          amount: paisa,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add charge");
        return;
      }

      toast.success(locale === "bn" ? "অতিরিক্ত খরচ সফলভাবে যোগ হয়েছে!" : "Additional cost added!");
      setDescription("");
      setAmountBDT(0);
      onUpdated?.();
    } catch (e) {
      toast.error("Failed to add charge");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCharge = async (itemId: string) => {
    try {
      setDeletingItemId(itemId);
      const res = await fetch(`/api/billing?billId=${bill.id}&itemId=${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete charge");
        return;
      }

      toast.info(locale === "bn" ? "চার্জ বাতিল করা হয়েছে" : "Charge removed");
      onUpdated?.();
    } catch (e) {
      toast.error("Failed to delete charge");
    } finally {
      setDeletingItemId(null);
    }
  };

  const billItems = bill.billItems || [];
  const additionalTotal = billItems.reduce((acc: number, item: any) => acc + (item.amount || 0), 0);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>{locale === "bn" ? "ম্যানুয়াল অতিরিক্ত খরচ পরিচালনা" : "Manage Manual Additional Costs"}</span>
        </div>
      }
      description={`${bill.shop?.shopNumber} — ${bill.tenant?.name || ""} (${formatMonth(bill.month, locale, bill.year)})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Rent & Total Breakdown Header */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div>
            <span className="text-[11px] text-slate-500">{locale === "bn" ? "মূল ভাড়া" : "Base Rent"}</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(bill.rentAmount, locale)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500">{locale === "bn" ? "অতিরিক্ত খরচ" : "Additional Costs"}</span>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(additionalTotal, locale)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500">{locale === "bn" ? "মোট প্রদেয়" : "Total Payable"}</span>
            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(bill.totalAmount, locale)}
            </p>
          </div>
        </div>

        {/* Existing Additional Items List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            {locale === "bn" ? "বর্তমান অতিরিক্ত খরচসমূহ:" : "Current Additional Costs:"}
          </h4>

          {billItems.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              {locale === "bn"
                ? "কোনো অতিরিক্ত খরচ যোগ করা হয়নি (শুধুমাত্র মূল ভাড়া প্রযোজ্য)।"
                : "No additional costs added (only base rent applies)."}
            </div>
          ) : (
            <div className="space-y-2">
              {billItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.description}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {locale === "bn" ? "ম্যানুয়াল এন্ট্রি" : "Manual entry"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount, locale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCharge(item.id)}
                      disabled={deletingItemId === item.id}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={locale === "bn" ? "মুছে ফেলুন" : "Delete"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Cost Form */}
        <form onSubmit={handleAddCharge} className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/20 space-y-3">
          <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "নতুন অতিরিক্ত খরচ যোগ করুন (ম্যানুয়াল)" : "Add New Additional Cost (Manual)"}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {locale === "bn" ? "খরচের বিবরণ (যেমন: বিদ্যুৎ / সার্ভিস)" : "Description (e.g. Electricity / Service)"}
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={locale === "bn" ? "যেমন: বিদ্যুৎ বিল" : "e.g. Electricity"}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {locale === "bn" ? "টাকার পরিমাণ (৳)" : "Amount (৳)"}
              </label>
              <NumberInput
                value={amountBDT}
                onChange={(val) => setAmountBDT(val)}
                prefix="৳"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {locale === "bn" ? "খরচ যোগ করুন" : "Add Cost"}
            </Button>
          </div>
        </form>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
