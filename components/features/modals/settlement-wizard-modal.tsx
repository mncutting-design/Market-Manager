"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Receipt,
  Plus,
  Trash2,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { calculateSettlement } from "@/lib/settlement";

interface SettlementWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSettlementComplete?: (settlementData: any) => void;
  onSettled?: () => void;
}

export function SettlementWizardModal({
  isOpen,
  onClose,
  tenantId,
  onSettlementComplete,
  onSettled,
}: SettlementWizardModalProps) {
  const { t, locale } = useTranslation();

  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data from preview API
  const [previewData, setPreviewData] = useState<any>(null);

  // Form states
  const [deductions, setDeductions] = useState<
    { id: string; label_en: string; label_bn: string; amountBDT: number; note: string }[]
  >([]);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Fetch initial settlement preview
  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setStep(1);
        setIsConfirmed(false);
        const res = await fetch(`/api/tenants/${tenantId}/settle`);
        if (res.ok) {
          const data = await res.json();
          setPreviewData(data);

          // Populate default deductions
          if (data.defaultDeductions) {
            setDeductions(
              data.defaultDeductions.map((d: any) => ({
                id: d.id,
                label_en: d.label_en,
                label_bn: d.label_bn,
                amountBDT: Math.round((d.amount || 0) / 100),
                note: "",
              }))
            );
          }
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to load settlement details");
          onClose();
        }
      } catch (e) {
        console.error("Failed to load settlement preview:", e);
        toast.error("Failed to load settlement preview");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  // Deduction handlers
  const handleAddDeduction = () => {
    setDeductions([
      ...deductions,
      {
        id: `custom-${Date.now()}`,
        label_en: "Other Repair / Fee",
        label_bn: "অন্যান্য মেরামত বা খরচ",
        amountBDT: 0,
        note: "",
      },
    ]);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleDeductionChange = (index: number, field: string, value: any) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], [field]: value };
    setDeductions(updated);
  };

  // Live calculation preview
  const advanceBalancePaisa = previewData?.advanceBalance || 0;
  const unpaidBillsTotalPaisa = previewData?.unpaidBillsTotal || 0;

  const deductionsPaisa = deductions.map((d) => ({
    label_en: d.label_en,
    label_bn: d.label_bn,
    amount: Math.round((d.amountBDT || 0) * 100),
    note: d.note,
  }));

  const calc = calculateSettlement({
    advanceBalance: advanceBalancePaisa,
    unpaidBillsTotal: unpaidBillsTotalPaisa,
    deductions: deductionsPaisa,
  });

  // Final submission
  const handleConfirmSettlement = async () => {
    if (!isConfirmed) {
      toast.error("Please confirm the agreement checkbox");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/tenants/${tenantId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductions: deductionsPaisa,
          settlementDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to finalize settlement");
        return;
      }

      toast.success(t("settlement.settledSuccessfully"));

      if (onSettled) {
        onSettled();
      }

      if (onSettlementComplete) {
        onSettlementComplete({
          ...data.settlement,
          tenantName: previewData.tenant.name,
          phone: previewData.tenant.phone,
          nid: previewData.tenant.nid,
          shopNumber: previewData.shop.shopNumber,
          floor: previewData.shop.floor,
          marketName: previewData.shop.marketName,
          deductions: deductionsPaisa,
          policyVersionNumber: previewData.policyVersionNumber,
        });
      }

      onClose();
    } catch (e) {
      toast.error("Failed to execute settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("settlement.title")}
      description={
        previewData
          ? `${previewData.shop.shopNumber} — ${previewData.tenant.name} (${previewData.shop.marketName})`
          : t("settlement.subtitle")
      }
      maxWidth="3xl"
    >
      {isLoading || !previewData ? (
        <div className="py-12 text-center text-slate-500">{t("common.loading")}</div>
      ) : (
        <div className="space-y-6">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2d3b52] pb-4">
            {[1, 2, 3, 4].map((stepNum) => {
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={stepNum} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isActive
                        ? "bg-teal-600 text-white ring-4 ring-teal-500/20"
                        : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {isDone ? "✓" : stepNum}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline ${
                      isActive
                        ? "text-teal-600 dark:text-teal-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {stepNum === 1
                      ? t("settlement.step1Title")
                      : stepNum === 2
                      ? t("settlement.step2Title")
                      : stepNum === 3
                      ? t("settlement.step3Title")
                      : t("settlement.step4Title")}
                  </span>
                  {stepNum < 4 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-1" />}
                </div>
              );
            })}
          </div>

          {/* STEP 1: REVIEW UNPAID INVOICES */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("settlement.step1Title")}
                  </h3>
                  <p className="text-xs text-slate-500">{t("settlement.step1Desc")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">{t("adjustAdvance.totalDue")}</p>
                  <p className="text-lg font-extrabold text-red-600 dark:text-red-400">
                    {formatCurrency(unpaidBillsTotalPaisa, locale)}
                  </p>
                </div>
              </div>

              {previewData.unpaidBills.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5" />
                  <span>All monthly rent bills are fully paid! No overdue rent charges.</span>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-[#2d3b52] overflow-hidden text-xs max-h-60 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-[#182234] border-b border-slate-200 dark:border-[#2d3b52] font-bold text-slate-700 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-2.5">Billing Period</th>
                        <th className="p-2.5">Aging</th>
                        <th className="p-2.5 text-right">Rent</th>
                        <th className="p-2.5 text-right">Due Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewData.unpaidBills.map((b: any) => (
                        <tr key={b.id}>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            {b.month}/{b.year}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.ageInMonths >= 3
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                  : b.ageInMonths >= 2
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {locale === "bn" ? toBanglaDigits(b.ageInMonths) : b.ageInMonths} mo
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(b.rentAmount, locale)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(b.dueAmount, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Advance Balance held card */}
              <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-teal-900 dark:text-teal-200 block">
                    {t("advance.advanceBalance")} Held
                  </span>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400">
                    Security deposit available for offsetting liabilities
                  </span>
                </div>
                <span className="text-base font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                  {formatCurrency(advanceBalancePaisa, locale)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: DEDUCTIONS & PENALTIES */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("settlement.step2Title")}
                  </h3>
                  <p className="text-xs text-slate-500">{t("settlement.step2Desc")}</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddDeduction} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t("settlement.addDeduction")}
                </Button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {deductions.map((d, index) => (
                  <div
                    key={d.id || index}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                  >
                    <div className="sm:col-span-5">
                      <Input
                        value={locale === "bn" ? d.label_bn : d.label_en}
                        onChange={(e) =>
                          handleDeductionChange(
                            index,
                            locale === "bn" ? "label_bn" : "label_en",
                            e.target.value
                          )
                        }
                        placeholder={t("settlement.deductionLabel")}
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <NumberInput
                        value={d.amountBDT}
                        onChange={(val) => handleDeductionChange(index, "amountBDT", val)}
                        prefix="৳"
                        className="text-xs h-9 font-bold"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        value={d.note}
                        onChange={(e) => handleDeductionChange(index, "note", e.target.value)}
                        placeholder="Note / remark"
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDeduction(index)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove deduction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#121926] border border-slate-200 dark:border-[#2d3b52] flex justify-between items-center text-xs font-bold">
                <span>{locale === "bn" ? "সর্বমোট কর্তন:" : "Total Deductions:"}</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {formatCurrency(calc.totalDeductions, locale)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: CALCULATION PREVIEW */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settlement.step3Title")}
                </h3>
                <p className="text-xs text-slate-500">{t("settlement.step3Desc")}</p>
              </div>

              {/* Accounting Breakdown Matrix */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>1. {locale === "bn" ? "অনাদায়ী বকেয়া ভাড়া:" : "Unpaid Rent Dues:"}</span>
                  <span className="font-mono font-bold">{formatCurrency(calc.totalDue, locale)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>2. {locale === "bn" ? "দোকান মেরামত ও কর্তন:" : "Property Deductions:"}</span>
                  <span className="font-mono font-bold">{formatCurrency(calc.totalDeductions, locale)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>{t("settlement.totalLiabilities")}:</span>
                  <span className="font-mono text-red-600 dark:text-red-400">
                    {formatCurrency(calc.totalLiabilities, locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>3. {t("advance.advanceBalance")}:</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400">
                    {formatCurrency(calc.advanceBalance, locale)}
                  </span>
                </div>
              </div>

              {/* Final Result Card */}
              {calc.isRefund ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider block">
                      🟢 {t("settlement.refundAmount")}
                    </span>
                    <span className="text-xs opacity-80">
                      {locale === "bn"
                        ? "ভাড়াটিয়াকে ফেরতযোগ্য টাকা"
                        : "Refund amount returned to tenant"}
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold font-mono">
                    {formatCurrency(calc.refundAmount, locale)}
                  </span>
                </div>
              ) : calc.isUnrecovered ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider block">
                      🔴 {t("settlement.unrecoveredAmount")}
                    </span>
                    <span className="text-xs opacity-80">
                      {locale === "bn"
                        ? "জামানতের চেয়ে বকেয়া বেশি হওয়ায় অবশিষ্ট অনাদায়ী পাওনা"
                        : "Liabilities exceed advance. Recorded as unrecovered receivable."}
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold font-mono">
                    {formatCurrency(calc.unrecoveredAmount, locale)}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider block">
                      🔵 {t("settlement.exactMatch")}
                    </span>
                    <span className="text-xs opacity-80">
                      {locale === "bn"
                        ? "সম্পূর্ণ সমপরিমাণ মিল, কোনো ফেরত বা বকেয়া অবশিষ্ট নেই"
                        : "Full exact settlement, zero refund balance"}
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold font-mono">৳ 0</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRM & EXECUTE */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settlement.step4Title")}
                </h3>
                <p className="text-xs text-slate-500">{t("settlement.step4Desc")}</p>
              </div>

              {/* Settlement Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t("settlement.settlementDate")}
                  </label>
                  <Input
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {t("common.notes")} ({t("common.optional")})
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. দোকান হস্তান্তর ও চাবি গ্রহণ সম্পন্ন"
                  />
                </div>
              </div>

              {/* Consequences explanation */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {locale === "bn" ? "চূড়ান্ত নিষ্পত্তির ফলাফল:" : "Effects of confirming final settlement:"}
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                  <li>
                    {locale === "bn"
                      ? "দোকানের স্ট্যাটাস 'খালি' (VACANT) করা হবে।"
                      : "Shop status will be set to VACANT."}
                  </li>
                  <li>
                    {locale === "bn"
                      ? "ভাড়াটিয়ার স্ট্যাটাস 'SETTLED' হবে এবং ভবিষ্যৎ বিল তৈরি বন্ধ হবে।"
                      : "Tenant status will be marked SETTLED, stopping future billing."}
                  </li>
                  <li>
                    {locale === "bn"
                      ? "সকল জামানত সমন্বয়, কর্তন ও রিফান্ড লেজারে স্থায়ীভাবে লক হবে।"
                      : "Advance ledger entries and final settlement statement will be permanently recorded."}
                  </li>
                </ul>
              </div>

              {/* Mandatory Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-[#2d3b52] bg-slate-50 dark:bg-[#182234] cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {t("settlement.vacateConfirm")}
                </span>
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-2 flex justify-between items-center border-t border-slate-200 dark:border-[#2d3b52]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else onClose();
              }}
            >
              {step === 1 ? t("common.cancel") : t("common.back")}
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
              >
                <span>{locale === "bn" ? "পরবর্তী ধাপ" : "Next Step"}</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!isConfirmed || isSubmitting}
                isLoading={isSubmitting}
                onClick={handleConfirmSettlement}
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>{t("settlement.settleAndVacate")}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
