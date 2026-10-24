"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Input } from "@/components/ui/input";
import {
  Coins,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface EditJamanotModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  shopNumber: string;
  marketName?: string;
  currentAdvanceDeposit: number; // in paisa
  currentAdvanceBalance?: number; // in paisa
  onSuccess?: () => void;
}

export function EditJamanotModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  shopNumber,
  marketName = "",
  currentAdvanceDeposit,
  currentAdvanceBalance,
  onSuccess,
}: EditJamanotModalProps) {
  const { t, locale } = useTranslation();
  const { isAdmin, triggerRefresh } = useApp();

  const [newAdvanceDepositBDT, setNewAdvanceDepositBDT] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewAdvanceDepositBDT(Math.round((currentAdvanceDeposit || 0) / 100));
      setReason("");
    }
  }, [isOpen, currentAdvanceDeposit]);

  if (!isOpen) return null;

  const currentBDT = Math.round((currentAdvanceDeposit || 0) / 100);
  const deltaBDT = newAdvanceDepositBDT - currentBDT;
  const isChanged = deltaBDT !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newAdvanceDepositBDT < 0) {
      toast.error(locale === "bn" ? "জামানতের পরিমাণ ঋণাত্মক হতে পারে না" : "Advance deposit cannot be negative");
      return;
    }

    if (!isChanged) {
      toast.info(locale === "bn" ? "জামানতের পরিমাপে কোনো পরিবর্তন হয়নি" : "No change in security deposit amount");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advanceDeposit: Math.round(newAdvanceDepositBDT * 100),
          note: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update security deposit");
        return;
      }

      if (data.requiresApproval) {
        toast.success(
          locale === "bn"
            ? "জামানত পরিবর্তনের আবেদনটি প্রধান অ্যাডমিন অনুমোদনের জন্য সফলভাবে জমা হয়েছে!"
            : "Jamanot edit request submitted for Admin Approval!"
        );
      } else {
        toast.success(
          locale === "bn"
            ? "জামানতের পরিমাণ সফলভাবে হালনাগাদ ও সমন্বয় করা হয়েছে!"
            : "Security deposit updated successfully!"
        );
      }

      if (onSuccess) onSuccess();
      triggerRefresh("shops");
      onClose();
    } catch (err) {
      console.error("Failed to edit jamanot:", err);
      toast.error(locale === "bn" ? "জামানত পরিবর্তন করতে ব্যর্থ হয়েছে" : "Failed to update security deposit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={locale === "bn" ? "নিরাপত্তা জামানত সংশোধন / পরিবর্তন" : "Edit Security Deposit (Jamanot)"}
      description={`${shopNumber} — ${tenantName} ${marketName ? `(${marketName})` : ""}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Current State Summary Card */}
        <div className="p-3.5 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] shadow-[3px_3px_0px_#000000] grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-0.5">
              {locale === "bn" ? "বর্তমান জামানত (রেকর্ড)" : "Current Jamanot"}
            </span>
            <p className="text-base font-black text-black dark:text-white font-mono">
              {formatCurrency(currentAdvanceDeposit, locale)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-0.5">
              {locale === "bn" ? "বর্তমান লেজার ব্যালেন্স" : "Ledger Balance"}
            </span>
            <p className="text-base font-black text-[#00BA88] font-mono">
              {formatCurrency(currentAdvanceBalance ?? currentAdvanceDeposit, locale)}
            </p>
          </div>
        </div>

        {/* New Jamanot Input Field */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-black dark:text-[#FED734]" />
              {locale === "bn" ? "নতুন জামানতের পরিমাণ (৳ BDT) *" : "New Jamanot Amount (৳ BDT) *"}
            </span>
            {isChanged && (
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-black border-2 border-black shadow-[1px_1px_0px_#000000] flex items-center gap-1 ${
                  deltaBDT > 0
                    ? "bg-[#00BA88] text-white"
                    : "bg-[#FF4B55] text-white"
                }`}
              >
                {deltaBDT > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                    <span>+৳{deltaBDT.toLocaleString()} (বৃদ্ধি)</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                    <span>-৳{Math.abs(deltaBDT).toLocaleString()} (হ্রাস)</span>
                  </>
                )}
              </span>
            )}
          </label>
          <NumberInput
            value={newAdvanceDepositBDT}
            onChange={(val) => setNewAdvanceDepositBDT(val)}
            prefix="৳"
            className="font-black text-base"
          />
        </div>

        {/* Reason / Reference Note */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
            {locale === "bn" ? "পরিবর্তনের কারণ বা নোট" : "Reason / Reference Note"}
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              locale === "bn"
                ? "e.g. চুক্তি নবায়ন অনুযায়ী অতিরিক্ত জামানত গ্রহণ / সমঝোতা সংশোধন"
                : "e.g. Lease renewal additional deposit / agreement revision"
            }
          />
        </div>

        {/* Role-Specific Approval Notice Banner */}
        <div
          className={`p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000] text-xs space-y-1 ${
            isAdmin
              ? "bg-[#FEF3C7] dark:bg-[#3D2F14] text-black dark:text-[#FBBF24]"
              : "bg-[#E0F2FE] dark:bg-[#0C4A6E] text-black dark:text-[#38BDF8]"
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            {isAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 text-black dark:text-[#FBBF24] shrink-0 stroke-[2.5]" />
                <span>{locale === "bn" ? "অ্যাডমিন নিশ্চিতকরণ মোড" : "Admin Direct Confirmation"}</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-black dark:text-[#38BDF8] shrink-0 stroke-[2.5]" />
                <span>{locale === "bn" ? "অ্যাডমিন অনুমোদন আবশ্যক" : "Requires Admin Approval"}</span>
              </>
            )}
          </div>
          <p className="text-[11px] leading-relaxed font-bold pl-6 text-black/80 dark:text-white/80">
            {isAdmin
              ? locale === "bn"
                ? "আপনি প্রধান অ্যাডমিন হিসেবে এই জামানত পরিবর্তন করছেন। নিশ্চিত করলে এটি সরাসরি ডাটাবেজ এবং লেজার ট্রানজেকশনে সমন্বয় হবে।"
                : "As an Admin, this change will directly synchronize the tenant record and advance transaction ledger."
              : locale === "bn"
              ? "জামানতের পরিমাণ একটি সংবেদনশীল আর্থিক বিষয়। আবেদনটি দাখিল করার পর প্রধান অ্যাডমিনের ড্যাশবোর্ডে অনুমোদনের অপেক্ষায় থাকবে।"
              : "Security deposit is a critical financial record. Submitting this will require confirmation and approval by the Admin."}
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-black">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="neo"
            disabled={isSubmitting || !isChanged}
            className="border-2 border-black bg-[#FED734] hover:bg-[#FED734]/90 text-black font-black shadow-[2px_2px_0px_#000000]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>{t("common.loading")}</span>
              </span>
            ) : isAdmin ? (
              locale === "bn" ? "পরিবর্তন নিশ্চিত ও কার্যকর করুন" : "Confirm & Update"
            ) : (
              locale === "bn" ? "অনুমোদনের জন্য আবেদন পাঠান" : "Submit for Approval"
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
