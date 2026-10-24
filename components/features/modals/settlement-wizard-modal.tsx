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
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            {[1, 2, 3, 4].map((stepNum) => {
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={stepNum} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs border-2 border-black transition-all ${
                      isActive
                        ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000] -translate-y-0.5"
                        : isDone
                        ? "bg-[#00BA88] text-white shadow-[2px_2px_0px_#000000]"
                        : "bg-white dark:bg-[#1E1F24] text-neutral-500 shadow-[1px_1px_0px_#000000]"
                    }`}
                  >
                    {isDone ? "✓" : stepNum}
                  </div>
                  <span
                    className={`text-xs font-black hidden sm:inline ${
                      isActive
                        ? "text-black dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400"
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
                  {stepNum < 4 && <ChevronRight className="w-4 h-4 text-black dark:text-white stroke-[2.5] mx-1" />}
                </div>
              );
            })}
          </div>

          {/* STEP 1: REVIEW UNPAID INVOICES */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-black dark:text-white">
                    {t("settlement.step1Title")}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">{t("settlement.step1Desc")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase">{t("adjustAdvance.totalDue")}</p>
                  <p className="text-lg font-black text-[#FF4B55]">
                    {formatCurrency(unpaidBillsTotalPaisa, locale)}
                  </p>
                </div>
              </div>

              {previewData.unpaidBills.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-[#E6F8F2] dark:bg-[#122A20] border-2 border-black shadow-[3px_3px_0px_#000000] text-black dark:text-white font-bold text-xs">
                  <CheckCircle2 className="w-6 h-6 text-[#00BA88] mx-auto mb-1.5 stroke-[2.5]" />
                  <span>All monthly rent bills are fully paid! No overdue rent charges.</span>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] overflow-hidden text-xs max-h-60 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#FED734] border-b-2 border-black font-black text-black sticky top-0">
                      <tr>
                        <th className="p-2.5">Billing Period</th>
                        <th className="p-2.5">Aging</th>
                        <th className="p-2.5 text-right">Rent</th>
                        <th className="p-2.5 text-right">Due Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 dark:divide-white/10 bg-white dark:bg-[#1E1F24]">
                      {previewData.unpaidBills.map((b: any) => (
                        <tr key={b.id}>
                          <td className="p-2.5 font-black text-black dark:text-white">
                            {b.month}/{b.year}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black border border-black shadow-[1px_1px_0px_#000000] ${
                                b.ageInMonths >= 3
                                  ? "bg-[#FF4B55] text-white"
                                  : b.ageInMonths >= 2
                                  ? "bg-[#F59E0B] text-black"
                                  : "bg-[#FED734] text-black"
                              }`}
                            >
                              {locale === "bn" ? toBanglaDigits(b.ageInMonths) : b.ageInMonths} mo
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-black dark:text-white">{formatCurrency(b.rentAmount, locale)}</td>
                          <td className="p-2.5 text-right font-mono font-black text-[#FF4B55]">
                            {formatCurrency(b.dueAmount, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Advance Balance held card */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[3px_3px_0px_#000000] flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-black dark:text-white block">
                    {t("advance.advanceBalance")} Held
                  </span>
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-bold">
                    Security deposit available for offsetting liabilities
                  </span>
                </div>
                <span className="text-base font-black text-[#00BA88] font-mono">
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
                  <h3 className="text-sm font-black text-black dark:text-white">
                    {t("settlement.step2Title")}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">{t("settlement.step2Desc")}</p>
                </div>
                <Button size="sm" variant="neo" onClick={handleAddDeduction} className="text-xs font-black">
                  <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                  {t("settlement.addDeduction")}
                </Button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {deductions.map((d, index) => (
                  <div
                    key={d.id || index}
                    className="p-3 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[2px_2px_0px_#000000] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
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
                        className="text-xs h-9 font-bold"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <NumberInput
                        value={d.amountBDT}
                        onChange={(val) => handleDeductionChange(index, "amountBDT", val)}
                        prefix="৳"
                        className="text-xs h-9 font-black"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        value={d.note}
                        onChange={(e) => handleDeductionChange(index, "note", e.target.value)}
                        placeholder="Note / remark"
                        className="text-xs h-9 font-bold"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDeduction(index)}
                        className="p-1.5 border-2 border-black rounded-md bg-white dark:bg-[#262830] text-[#FF4B55] hover:bg-[#FF4B55] hover:text-white shadow-[1px_1px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        title="Remove deduction"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000] flex justify-between items-center text-xs font-black">
                <span>{locale === "bn" ? "সর্বমোট কর্তন:" : "Total Deductions:"}</span>
                <span className="font-mono text-black dark:text-white">
                  {formatCurrency(calc.totalDeductions, locale)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: CALCULATION PREVIEW */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-black dark:text-white">
                  {t("settlement.step3Title")}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">{t("settlement.step3Desc")}</p>
              </div>

              {/* Accounting Breakdown Matrix */}
              <div className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[3px_3px_0px_#000000] space-y-3 text-xs">
                <div className="flex justify-between items-center text-black dark:text-white">
                  <span className="font-bold">1. {locale === "bn" ? "অনাদায়ী বকেয়া ভাড়া:" : "Unpaid Rent Dues:"}</span>
                  <span className="font-mono font-black">{formatCurrency(calc.totalDue, locale)}</span>
                </div>
                <div className="flex justify-between items-center text-black dark:text-white">
                  <span className="font-bold">2. {locale === "bn" ? "দোকান মেরামত ও কর্তন:" : "Property Deductions:"}</span>
                  <span className="font-mono font-black">{formatCurrency(calc.totalDeductions, locale)}</span>
                </div>
                <div className="flex justify-between items-center font-black text-black dark:text-white border-t-2 border-black pt-2">
                  <span>{t("settlement.totalLiabilities")}:</span>
                  <span className="font-mono text-[#FF4B55]">
                    {formatCurrency(calc.totalLiabilities, locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-black text-black dark:text-white border-t-2 border-black pt-2">
                  <span>3. {t("advance.advanceBalance")}:</span>
                  <span className="font-mono text-[#00BA88]">
                    {formatCurrency(calc.advanceBalance, locale)}
                  </span>
                </div>
              </div>

              {/* Final Result Card */}
              {calc.isRefund ? (
                <div className="p-4 rounded-xl bg-[#E6F8F2] dark:bg-[#122A20] border-2 border-black shadow-[4px_4px_0px_#000000] text-black dark:text-white flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      🟢 {t("settlement.refundAmount")}
                    </span>
                    <span className="text-xs font-bold opacity-80">
                      {locale === "bn"
                        ? "ভাড়াটিয়াকে ফেরতযোগ্য টাকা"
                        : "Refund amount returned to tenant"}
                    </span>
                  </div>
                  <span className="text-2xl font-black font-mono text-[#00BA88]">
                    {formatCurrency(calc.refundAmount, locale)}
                  </span>
                </div>
              ) : calc.isUnrecovered ? (
                <div className="p-4 rounded-xl bg-[#FFEBEF] dark:bg-[#2A1417] border-2 border-black shadow-[4px_4px_0px_#000000] text-black dark:text-white flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      🔴 {t("settlement.unrecoveredAmount")}
                    </span>
                    <span className="text-xs font-bold opacity-80">
                      {locale === "bn"
                        ? "জামানতের চেয়ে বকেয়া বেশি হওয়ায় অবশিষ্ট অনাদায়ী পাওনা"
                        : "Liabilities exceed advance. Recorded as unrecovered receivable."}
                    </span>
                  </div>
                  <span className="text-2xl font-black font-mono text-[#FF4B55]">
                    {formatCurrency(calc.unrecoveredAmount, locale)}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[4px_4px_0px_#000000] text-black dark:text-white flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      🔵 {t("settlement.exactMatch")}
                    </span>
                    <span className="text-xs font-bold opacity-80">
                      {locale === "bn"
                        ? "সম্পূর্ণ সমপরিমাণ মিল, কোনো ফেরত বা বকেয়া অবশিষ্ট নেই"
                        : "Full exact settlement, zero refund balance"}
                    </span>
                  </div>
                  <span className="text-2xl font-black font-mono">৳ 0</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRM & EXECUTE */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-black dark:text-white">
                  {t("settlement.step4Title")}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">{t("settlement.step4Desc")}</p>
              </div>

              {/* Settlement Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                    {t("settlement.settlementDate")}
                  </label>
                  <Input
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
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
              <div className="p-3.5 rounded-xl bg-[#FEF3C7] dark:bg-[#3D2F14] border-2 border-black shadow-[3px_3px_0px_#000000] text-xs text-black dark:text-white space-y-1.5">
                <p className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-black dark:text-[#FED734] stroke-[2.5]" />
                  {locale === "bn" ? "চূড়ান্ত নিষ্পত্তির ফলাফল:" : "Effects of confirming final settlement:"}
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs font-bold pl-1">
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
              <label className="flex items-start gap-2.5 p-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[2px_2px_0px_#000000] cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FED734] rounded border-2 border-black cursor-pointer"
                />
                <span className="text-black dark:text-white font-black leading-relaxed">
                  {t("settlement.vacateConfirm")}
                </span>
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-2 flex justify-between items-center border-t-2 border-black">
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
                variant="neo"
                onClick={() => setStep(step + 1)}
                className="font-black"
              >
                <span>{locale === "bn" ? "পরবর্তী ধাপ" : "Next Step"}</span>
                <ChevronRight className="w-4 h-4 ml-1 stroke-[2.5]" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!isConfirmed || isSubmitting}
                isLoading={isSubmitting}
                onClick={handleConfirmSettlement}
                variant="destructive"
                className="font-black"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                <span>{t("settlement.settleAndVacate")}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
