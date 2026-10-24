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
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-400">
                {t("adjustAdvance.totalDue")}
              </p>
              <p className="text-base font-black text-[#FF4B55] mt-0.5">
                {formatCurrency(totalDue, locale)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-400">
                {t("adjustAdvance.availableAdvance")}
              </p>
              <p className="text-base font-black text-[#00BCD4] mt-0.5">
                {formatCurrency(advanceBalance, locale)}
              </p>
            </div>
          </div>

          {advanceBalance === 0 ? (
            <div className="p-3.5 rounded-xl bg-[#FED734]/20 border-2 border-black shadow-[2px_2px_0px_#000000] text-black dark:text-white text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>This tenant currently has no available security advance balance to adjust.</span>
            </div>
          ) : (
            <>
              {/* Amount to Adjust input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    {t("adjustAdvance.amountToAdjust")} (৳ BDT)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const maxPaisa = Math.min(totalDue, advanceBalance);
                      setAdjustAmountBDT(Math.round(maxPaisa / 100));
                    }}
                    className="text-xs bg-[#FED734] text-black px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_#000000] font-black cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    Max ({formatCurrency(Math.min(totalDue, advanceBalance), locale)})
                  </button>
                </div>
                <NumberInput
                  value={adjustAmountBDT}
                  onChange={(val) => setAdjustAmountBDT(val)}
                  prefix="৳"
                  className="text-lg font-black"
                  autoFocus
                />
              </div>

              {/* Live Preview Calculation */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000] space-y-2 text-xs">
                <div className="flex justify-between items-center text-black dark:text-white font-bold">
                  <span>{t("adjustAdvance.remainingDue")}:</span>
                  <span className="font-black font-mono text-[#FF4B55]">
                    {formatCurrency(remainingDuePaisa, locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-black dark:text-white font-bold">
                  <span>{t("adjustAdvance.remainingAdvance")}:</span>
                  <span className="font-black font-mono text-[#00BCD4]">
                    {formatCurrency(remainingAdvancePaisa, locale)}
                  </span>
                </div>
              </div>

              {/* Shortfall Warning Banner */}
              {willHaveShortfall && (
                <div className="p-3.5 rounded-xl bg-[#FFEBEF] dark:bg-[#2C1417] border-2 border-[#FF4B55] shadow-[2px_2px_0px_#FF4B55] text-black dark:text-white text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-[#FF4B55] shrink-0 mt-0.5 stroke-[2.5]" />
                  <div>
                    <p className="font-black text-[#FF4B55]">{t("adjustAdvance.shortfallWarning")}</p>
                    <p className="text-[11px] text-gray-800 dark:text-gray-300 font-bold mt-0.5">
                      Required advance: {formatCurrency(requiredAdvance, locale)} • Remaining:{" "}
                      {formatCurrency(remainingAdvancePaisa, locale)} (Shortfall:{" "}
                      {formatCurrency(requiredAdvance - remainingAdvancePaisa, locale)})
                    </p>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-gray-200 mb-1">
                  {t("common.notes")} ({t("common.optional")})
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. ২ মাসের বকেয়া জামানত থেকে সমন্বয়"
                  className="font-bold"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000] bg-white dark:bg-[#1E1F24] cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-black cursor-pointer"
                />
                <span className="text-black dark:text-white font-bold leading-relaxed">
                  {t("adjustAdvance.confirmCheckbox")}
                </span>
              </label>

              {/* Modal Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t-2 border-black">
                <Button type="button" variant="outline" className="font-black" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="neo"
                  disabled={!isConfirmed || adjustAmountPaisa <= 0 || isSubmitting}
                  isLoading={isSubmitting}
                  className="font-black cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
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
