"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, CheckCircle2, ShieldAlert, Wallet } from "lucide-react";
import { toast } from "sonner";

interface AdjustAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  shopNumber: string;
  marketName?: string;
  initialDueAmount?: number; // in paisa
  advanceBalance?: number;
  totalDue?: number;
  onSuccess?: () => void;
}

export function AdjustAdvanceModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  shopNumber,
  marketName = "",
  initialDueAmount = 0,
  advanceBalance: advanceBalanceProp,
  totalDue: totalDueProp,
  onSuccess,
}: AdjustAdvanceModalProps) {
  const { t, locale } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState<number>(advanceBalanceProp || 0);
  const [requiredAdvance, setRequiredAdvance] = useState<number>(0);
  const [totalDue, setTotalDue] = useState<number>(totalDueProp ?? initialDueAmount ?? 0);
  const [adjustAmountBDT, setAdjustAmountBDT] = useState<number>(0);
  const [note, setNote] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Fetch advance details for this tenant
  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const fetchAdvance = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/tenants/${tenantId}/advance`);
        if (res.ok) {
          const data = await res.json();
          setAdvanceBalance(data.advanceBalance || 0);
          setRequiredAdvance(data.requiredAdvance || 0);

          // Default adjustment amount: min(due, available advance) in BDT
          const maxAdjustPaisa = Math.min(totalDue, data.advanceBalance || 0);
          setAdjustAmountBDT(Math.round(maxAdjustPaisa / 100));
        }
      } catch (e) {
        console.error("Failed to load advance:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvance();
  }, [isOpen, tenantId, totalDue]);

  const adjustAmountPaisa = Math.round(adjustAmountBDT * 100);
  const remainingDuePaisa = Math.max(0, totalDue - adjustAmountPaisa);
  const remainingAdvancePaisa = Math.max(0, advanceBalance - adjustAmountPaisa);
  const willHaveShortfall = remainingAdvancePaisa < requiredAdvance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adjustAmountPaisa <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    if (adjustAmountPaisa > advanceBalance) {
      toast.error(
        `${t("adjustAdvance.amountToAdjust")} cannot exceed available advance (${formatCurrency(advanceBalance, locale)})`
      );
      return;
    }

    if (adjustAmountPaisa > totalDue) {
      toast.error(
        `${t("adjustAdvance.amountToAdjust")} cannot exceed total due (${formatCurrency(totalDue, locale)})`
      );
      return;
    }

    if (!isConfirmed) {
      toast.error("Please check the confirmation box");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/tenants/${tenantId}/adjust-advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: adjustAmountPaisa,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to adjust advance");
        return;
      }

      toast.success(t("adjustAdvance.adjustSuccess"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      toast.error("Failed to adjust advance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("adjustAdvance.title")}
      description={`${shopNumber} — ${tenantName} (${marketName})`}
      maxWidth="lg"
    >
      {isLoading ? (
        <div className="py-8 text-center text-slate-500">{t("common.loading")}</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current State Cards */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("adjustAdvance.totalDue")}
              </p>
              <p className="text-base font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                {formatCurrency(totalDue, locale)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("adjustAdvance.availableAdvance")}
              </p>
              <p className="text-base font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">
                {formatCurrency(advanceBalance, locale)}
              </p>
            </div>
          </div>

          {advanceBalance === 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>This tenant currently has no available security advance balance to adjust.</span>
            </div>
          ) : (
            <>
              {/* Amount to Adjust input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white">
                    {t("adjustAdvance.amountToAdjust")} (৳ BDT)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const maxPaisa = Math.min(totalDue, advanceBalance);
                      setAdjustAmountBDT(Math.round(maxPaisa / 100));
                    }}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                  >
                    Max ({formatCurrency(Math.min(totalDue, advanceBalance), locale)})
                  </button>
                </div>
                <NumberInput
                  value={adjustAmountBDT}
                  onChange={(val) => setAdjustAmountBDT(val)}
                  prefix="৳"
                  className="text-lg font-bold"
                  autoFocus
                />
              </div>

              {/* Live Preview Calculation */}
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#121926] border border-slate-200 dark:border-[#2d3b52] space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>{t("adjustAdvance.remainingDue")}:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(remainingDuePaisa, locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>{t("adjustAdvance.remainingAdvance")}:</span>
                  <span className="font-bold font-mono text-teal-600 dark:text-teal-400">
                    {formatCurrency(remainingAdvancePaisa, locale)}
                  </span>
                </div>
              </div>

              {/* Shortfall Warning Banner */}
              {willHaveShortfall && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t("adjustAdvance.shortfallWarning")}</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Required advance: {formatCurrency(requiredAdvance, locale)} • Remaining:{" "}
                      {formatCurrency(remainingAdvancePaisa, locale)} (Shortfall:{" "}
                      {formatCurrency(requiredAdvance - remainingAdvancePaisa, locale)})
                    </p>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {t("common.notes")} ({t("common.optional")})
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. ২ মাসের বকেয়া জামানত থেকে সমন্বয়"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-[#2d3b52] bg-slate-50 dark:bg-[#182234] cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-700 dark:text-white font-medium leading-relaxed">
                  {t("adjustAdvance.confirmCheckbox")}
                </span>
              </label>

              {/* Modal Actions */}
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!isConfirmed || adjustAmountPaisa <= 0 || isSubmitting}
                  isLoading={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {t("adjustAdvance.adjustButton")}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </Dialog>
  );
}
