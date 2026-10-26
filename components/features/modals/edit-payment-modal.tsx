"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Store,
  User,
  Calendar,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { CollectorSelect } from "@/components/features/collectors/collector-select";

export interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any | null;
  onUpdated?: () => void;
}

export function EditPaymentModal({
  isOpen,
  onClose,
  payment,
  onUpdated,
}: EditPaymentModalProps) {
  const { t, locale } = useTranslation();
  const { currentUser, isAdmin, triggerRefresh } = useApp();

  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [method, setMethod] = useState<string>("CASH");
  const [reference, setReference] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [paidOn, setPaidOn] = useState<string>("");
  const [collectorId, setCollectorId] = useState<string>("SELF");
  const [collectorName, setCollectorName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (payment && isOpen) {
      setAmountBDT(payment.amount ? payment.amount / 100 : 0);
      setMethod(payment.method || "CASH");
      setReference(payment.reference || "");
      setTransactionRef(payment.transactionRef || "");
      setNote(payment.note || "");
      setPaidOn(
        payment.paidOn
          ? new Date(payment.paidOn).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setCollectorId(
        payment.collectorId ||
          (payment.receivedById === currentUser?.id ? "SELF" : payment.collectorId || "")
      );
      setCollectorName(payment.collector?.name || payment.receivedBy || "");
    }
  }, [payment, isOpen, currentUser]);

  if (!payment) return null;

  const originalAmountPaisa = payment.amount || 0;
  const newAmountPaisa = Math.round((Number(amountBDT) || 0) * 100);
  const deltaPaisa = newAmountPaisa - originalAmountPaisa;

  // Bill context
  const billTotalPaisa = payment.bill?.totalAmount || 0;
  const billCurrentPaidPaisa = payment.bill?.paidAmount || 0;
  const projectedBillPaidPaisa = billCurrentPaidPaisa + deltaPaisa;
  const projectedBillDuePaisa = Math.max(0, billTotalPaisa - projectedBillPaidPaisa);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newAmountPaisa <= 0) {
      toast.error(
        locale === "bn"
          ? "টাকার পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে"
          : "Amount must be greater than zero"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payment.id,
          amount: newAmountPaisa,
          method,
          reference: reference.trim() || null,
          transactionRef: transactionRef.trim() || null,
          note: note.trim() || null,
          paidOn,
          collectorId: collectorId === "SELF" ? null : collectorId,
          receivedById: collectorId === "SELF" ? currentUser?.id : null,
          receivedBy: collectorName || (collectorId === "SELF" ? currentUser?.name : null),
          submitForApproval: !isAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update payment");
        return;
      }

      if (data.requiresApproval) {
        toast.info(
          data.message ||
            (locale === "bn"
              ? "ভাড়া আদায় পরিবর্তনের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে!"
              : "Payment change request submitted for admin approval!")
        );
      } else {
        toast.success(
          locale === "bn"
            ? "ভাড়া আদায় রেকর্ড সফলভাবে আপডেট করা হয়েছে!"
            : "Payment record updated successfully!"
        );
      }

      triggerRefresh();
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      toast.error("Failed to update payment");
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
          <Wallet className="w-5 h-5 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
          <span className="text-base sm:text-lg font-black">
            {locale === "bn" ? "ভাড়া আদায় এন্ট্রি সম্পাদন" : "Edit Rent Collection Entry"}
          </span>
        </div>
      }
      description={
        locale === "bn"
          ? "আদায়ের পরিমাণ, পেমেন্ট চ্যানেল ও তথ্য সংশোধন করুন। ম্যানেজার কর্তৃক আবেদন অ্যাডমিনের অনুমোদনের পর চূড়ান্ত কার্যকর হবে।"
          : "Update collection amount and channel. Manager submissions require Admin approval."
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Info Banner */}
        <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#FED734] text-black border border-black font-black text-xs shadow-[1px_1px_0px_#000000]">
                {payment.bill?.shop?.shopNumber || "দোকান"}
              </span>
              <span className="text-xs font-black text-black dark:text-white">
                {payment.bill?.tenant?.name || "ভাড়াটিয়া"}
              </span>
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
              {payment.bill?.shop?.market?.name} • মাস: {payment.bill?.month}/{payment.bill?.year}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/10 dark:border-white/10 text-xs">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">বিলের মোট টাকা</p>
              <p className="font-black text-black dark:text-white font-mono">
                {formatCurrency(billTotalPaisa, locale)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">বর্তমান মোট জমা</p>
              <p className="font-black text-[#00BA88] font-mono">
                {formatCurrency(billCurrentPaidPaisa, locale)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">বর্তমান বকেয়া</p>
              <p className="font-black text-[#FF4B55] font-mono">
                {formatCurrency(payment.bill?.dueAmount || 0, locale)}
              </p>
            </div>
          </div>
        </div>

        {/* Live Delta Calculation Card */}
        <div
          className={`p-3 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-between gap-3 ${
            deltaPaisa !== 0
              ? deltaPaisa > 0
                ? "bg-[#E6F8F2] dark:bg-[#00382B]"
                : "bg-[#FFF8D6] dark:bg-[#332A00]"
              : "bg-white dark:bg-[#1E1F24]"
          }`}
        >
          <div className="flex items-center gap-2">
            {deltaPaisa > 0 ? (
              <TrendingUp className="w-4 h-4 text-[#00BA88] stroke-[3] shrink-0" />
            ) : deltaPaisa < 0 ? (
              <TrendingDown className="w-4 h-4 text-[#F59E0B] stroke-[3] shrink-0" />
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
                    ? `জমা বাড়ছে: +${formatCurrency(deltaPaisa, locale)}`
                    : `Increase: +${formatCurrency(deltaPaisa, locale)}`
                  : locale === "bn"
                  ? `জমা কমছে: -${formatCurrency(Math.abs(deltaPaisa), locale)}`
                  : `Decrease: -${formatCurrency(Math.abs(deltaPaisa), locale)}`}
              </span>
              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {locale === "bn" ? "পরিবর্তনের পর অবশিষ্ট বকেয়া হবে:" : "Projected remaining due:"}{" "}
                <span className="font-black text-black dark:text-white font-mono">
                  {formatCurrency(projectedBillDuePaisa, locale)}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black bg-white dark:bg-black text-black dark:text-white shadow-[1px_1px_0px_#000000]">
              {deltaPaisa === 0 ? "NO DELTA" : deltaPaisa > 0 ? "+ PAID" : "- PAID"}
            </span>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {locale === "bn" ? "আদায়ের পরিমাণ (টাকা)" : "Payment Amount (BDT)"} *
            </label>
            <NumberInput
              value={amountBDT}
              onChange={(val) => setAmountBDT(val)}
              placeholder="e.g. 10000"
              required
              className="text-base font-black font-mono"
            />
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {locale === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Method"} *
              </label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">ক্যাশ (CASH)</option>
                <option value="BKASH">বিকাশ (bKash)</option>
                <option value="NAGAD">নগদ (Nagad)</option>
                <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
                <option value="CHEQUE">চেক (Cheque)</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {locale === "bn" ? "পরিশোধের তারিখ" : "Payment Date"}
              </label>
              <Input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="text-xs font-bold"
              />
            </div>
          </div>

          {/* Collector / Received By with Add/Edit/Delete */}
          <div>
            <CollectorSelect
              value={collectorId}
              onChange={(colId, colName) => {
                setCollectorId(colId);
                setCollectorName(colName);
              }}
            />
          </div>

          {/* Transaction Ref / Cheque No */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {locale === "bn" ? "ট্রানজেকশন আইডি / চেক নম্বর / রেফারেন্স" : "Transaction Ref / TrxID"}
            </label>
            <Input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. TRX98273615 / Cheque #4928"
              className="text-xs font-mono font-bold"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {locale === "bn" ? "পরিবর্তনের কারণ বা বিশেষ মন্তব্য" : "Reason for Edit / Remarks"}
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. ব্যাংক জমা স্লিপ সংশোধিত বা টাইপিং ভুল সংশোধন"
              className="text-xs font-bold"
            />
          </div>
        </div>

        {/* Manager Approval Notice Banner */}
        {!isAdmin && (
          <div className="p-3 rounded-xl bg-[#FFF8D6] dark:bg-[#2C2405] border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-2 text-xs text-black dark:text-white font-bold">
            <ShieldCheck className="w-4 h-4 text-black dark:text-white shrink-0 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? "ম্যানেজার হিসেবে আপনার এই পরিবর্তনের আবেদন অ্যাডমিন অনুমোদন কেন্দ্রে যাবে। অ্যাডমিন অনুমোদন করলে তবেই বিলের ব্যালেন্স আপডেট হবে।"
                : "As a Manager, this change will be sent to the Admin Approvals Center."}
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
                : "Update Payment Directly"
              : locale === "bn"
              ? "অ্যাডমিন অনুমোদনের জন্য পাঠান"
              : "Submit for Admin Approval"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
