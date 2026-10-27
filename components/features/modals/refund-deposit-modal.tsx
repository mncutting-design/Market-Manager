"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { formatCurrency } from "@/lib/format";
import { RotateCcw, AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { DepositRefundReceiptData } from "./deposit-refund-receipt-modal";

interface RefundDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTenantId?: string;
  initialTenantName?: string;
  initialShopNumber?: string;
  initialMarketName?: string;
  availableBalance?: number; // in paisa
  onSuccess?: (refundData?: DepositRefundReceiptData) => void;
}

export function RefundDepositModal({
  isOpen,
  onClose,
  initialTenantId,
  initialTenantName,
  initialShopNumber,
  initialMarketName,
  availableBalance: initialBalance = 0,
  onSuccess,
}: RefundDepositModalProps) {
  const { t, locale } = useTranslation();
  const { currentUser, isAdmin, triggerRefresh } = useApp();

  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId || "");
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalance);
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("CASH");
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [bankName, setBankName] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [paidById, setPaidById] = useState("");
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Set default paid by to logged in user
  useEffect(() => {
    if (currentUser?.id) {
      setPaidById(currentUser.id);
    }
  }, [currentUser, isOpen]);

  // Pre-fill tenant if provided
  useEffect(() => {
    if (initialTenantId) {
      setSelectedTenantId(initialTenantId);
      setCurrentBalance(initialBalance);
      setAmountBDT(Math.round(initialBalance / 100));
    }
  }, [initialTenantId, initialBalance]);

  // Fetch staff users
  useEffect(() => {
    if (!isOpen) return;
    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setStaffUsers(data.users || []);
        }
      } catch (e) {
        console.warn("Could not fetch staff:", e);
      }
    };
    fetchStaff();
  }, [isOpen]);

  // Fetch active tenants if not preselected
  useEffect(() => {
    if (!isOpen || initialTenantId) return;
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/deposits");
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenantSummaries || []);
        }
      } catch (e) {
        console.warn("Could not fetch tenants for refund:", e);
      }
    };
    fetchTenants();
  }, [isOpen, initialTenantId]);

  // If tenant changed, fetch current balance
  useEffect(() => {
    if (!selectedTenantId || initialTenantId) return;
    const fetchBal = async () => {
      try {
        setIsLoadingBalance(true);
        const res = await fetch(`/api/tenants/${selectedTenantId}/advance`);
        if (res.ok) {
          const data = await res.json();
          const bal = data.advanceBalance || 0;
          setCurrentBalance(bal);
          setAmountBDT(Math.round(bal / 100));
        }
      } catch (e) {
        console.warn("Could not fetch balance:", e);
      } finally {
        setIsLoadingBalance(false);
      }
    };
    fetchBal();
  }, [selectedTenantId, initialTenantId]);

  // Fetch payment accounts based on method
  useEffect(() => {
    if (method === "BKASH" || method === "NAGAD" || method === "BANK") {
      const fetchAccounts = async () => {
        try {
          const res = await fetch(
            `/api/payment-accounts?accountType=${method}&active=true`
          );
          if (res.ok) {
            const data = await res.json();
            const accs = data.accounts || [];
            setPaymentAccounts(accs);
            if (accs.length > 0) {
              setSelectedAccountId(accs[0].id);
            } else {
              setSelectedAccountId("");
            }
          }
        } catch (e) {
          console.warn("Could not fetch accounts:", e);
        }
      };
      fetchAccounts();
    } else {
      setSelectedAccountId("");
      setPaymentAccounts([]);
    }
  }, [method, isOpen]);

  const selectedTenant = tenants.find((t) => t.tenantId === selectedTenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaisa = Math.round(amountBDT * 100);

    if (!selectedTenantId) {
      toast.error(locale === "bn" ? "ভাড়াটিয়া নির্বাচন করুন" : "Please select a tenant");
      return;
    }

    if (amountPaisa <= 0) {
      toast.error(locale === "bn" ? "সঠিক ফেরতের পরিমাণ দিন" : "Please enter a valid positive refund amount");
      return;
    }

    if (amountPaisa > currentBalance) {
      toast.error(
        locale === "bn"
          ? `ফেরতের পরিমাণ বর্তমান জামানতের চেয়ে বেশি হতে পারে না (বর্তমান: ${formatCurrency(currentBalance, locale)})`
          : `Refund amount cannot exceed current deposit balance (${formatCurrency(currentBalance, locale)})`
      );
      return;
    }

    if (!reason.trim()) {
      toast.error(locale === "bn" ? "ফেরতের কারণ উল্লেখ করা বাধ্যতামূলক" : "Refund reason is mandatory");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/deposits/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          amount: amountPaisa,
          transactionDate: date,
          method,
          paymentAccountId: selectedAccountId || undefined,
          bankName: bankName.trim() || undefined,
          transactionRef: transactionRef.trim() || undefined,
          paidById: paidById || currentUser?.id,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to process refund");
        return;
      }

      triggerRefresh("dashboard");
      triggerRefresh("deposits");
      triggerRefresh("shops");

      if (data.status === "PENDING_APPROVAL") {
        toast.info(
          locale === "bn"
            ? "জামানত ফেরতের আবেদন সফলভাবে দাখিল হয়েছে। প্রধান অ্যাডমিনের অনুমোদনের পর তা কার্যকর হবে।"
            : "Refund request submitted successfully. It will take effect upon Admin approval."
        );
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.success(
          locale === "bn"
            ? "জামানত ফেরত সফলভাবে সম্পন্ন হয়েছে!"
            : "Deposit refund processed and posted successfully!"
        );

        const refundReceiptData: DepositRefundReceiptData = {
          id: data.transaction?.id || new Date().getTime().toString(),
          transactionDate: date,
          tenantName: initialTenantName || selectedTenant?.tenantName || "Tenant",
          tenantPhone: selectedTenant?.phone || "",
          shopNumber: initialShopNumber || selectedTenant?.shopNumber || "",
          marketName: initialMarketName || selectedTenant?.marketName || "",
          amount: amountPaisa,
          method,
          accountName:
            paymentAccounts.find((a) => a.id === selectedAccountId)?.name_bn ||
            bankName,
          transactionRef,
          paidBy:
            staffUsers.find((u) => u.id === paidById)?.name ||
            currentUser?.name ||
            "Admin",
          enteredBy: currentUser?.name || "Admin",
          approvedBy: currentUser?.name || "Admin",
          reason: reason.trim(),
          remainingBalance: Math.max(0, currentBalance - amountPaisa),
        };

        onClose();
        if (onSuccess) {
          onSuccess(refundReceiptData);
        }
      }
    } catch (err: any) {
      toast.error("Refund failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        locale === "bn" ? "জামানত ফেরত প্রদান (Deposit Refund)" : "Refund Tenant Deposit"
      }
      description={
        initialTenantName
          ? `${initialShopNumber} — ${initialTenantName} (${initialMarketName})`
          : locale === "bn"
          ? "ভাড়াটিয়ার জমা রাখা জামানত অর্থ ফেরত প্রদান করুন"
          : "Process security deposit refund to tenant"
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Notice */}
        {!isAdmin && (
          <div className="p-3 bg-[#FFEBEF] rounded-xl border-2 border-[#FFA2B2] flex items-center gap-2 text-xs font-bold text-[#FF4B55]">
            <ShieldAlert className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? "বিজ্ঞপ্তি: ম্যানেজমেন্ট পলিসি অনুযায়ী আপনার দাখিলকৃত ফেরত আবেদন প্রধান অ্যাডমিনের অনুমোদনের পর চূড়ান্ত হবে।"
                : "Notice: Per security policy, your refund submission requires Admin approval before posting."}
            </span>
          </div>
        )}

        {/* Tenant selector if not preselected */}
        {!initialTenantId && (
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "ভাড়াটিয়া ও দোকান *" : "Select Tenant & Shop *"}
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
            >
              <option value="">
                {locale === "bn" ? "-- ভাড়াটিয়া নির্বাচন করুন --" : "-- Select Tenant --"}
              </option>
              {tenants.map((t) => (
                <option key={t.tenantId} value={t.tenantId}>
                  {t.shopNumber} — {t.tenantName} ({t.marketName}) [জামানত: ৳
                  {Math.round(t.currentBalance / 100).toLocaleString()}]
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Balance Preview Card */}
        <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border-2 border-black flex justify-between items-center text-xs">
          <div>
            <span className="text-gray-600 dark:text-gray-400 font-bold block">
              {locale === "bn" ? "বর্তমানে উপলব্ধ মোট জামানত:" : "Available Deposit Balance:"}
            </span>
            <span className="font-mono font-black text-base text-[#00BA88]">
              {isLoadingBalance ? "..." : formatCurrency(currentBalance, locale)}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAmountBDT(Math.round(currentBalance / 100))}
            className="text-xs h-7 font-black"
          >
            {locale === "bn" ? "সম্পূর্ণ ফেরত" : "Max Full Refund"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Refund Amount */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "ফেরতের পরিমাণ (টাকা) *" : "Refund Amount (BDT) *"}
            </label>
            <NumberInput
              value={amountBDT}
              onChange={setAmountBDT}
              placeholder="e.g. 20,000"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "ফেরতের তারিখ *" : "Refund Date *"}
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Payment Method / Channel */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "পরিশোধের মাধ্যম *" : "Paid-By Channel *"}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
            >
              <option value="CASH">{locale === "bn" ? "নগদ ক্যাশ (Cash)" : "Cash"}</option>
              <option value="BKASH">bKash (বিকাশ)</option>
              <option value="NAGAD">Nagad (নগদ)</option>
              <option value="BANK">{locale === "bn" ? "ব্যাংক ট্রান্সফার (Bank)" : "Bank Transfer"}</option>
              <option value="CHEQUE">{locale === "bn" ? "চেক (Cheque)" : "Cheque"}</option>
            </select>
          </div>

          {/* Paid By staff */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "পরিশোধকারী (Paid By) *" : "Paid By Staff *"}
            </label>
            <select
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
            >
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Channel Fields: bKash / Nagad */}
        {(method === "BKASH" || method === "NAGAD") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border-2 border-black">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                {locale === "bn" ? "প্রেরক অ্যাকাউন্ট *" : "Sender Account *"}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
              >
                <option value="">
                  {paymentAccounts.length === 0
                    ? "No accounts configured"
                    : "-- Select Account --"}
                </option>
                {paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {locale === "bn" ? a.name_bn || a.name_en : a.name_en || a.name_bn} ({a.number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                {locale === "bn" ? "ট্রানজেকশন আইডি (TrxID) *" : "Transaction ID *"}
              </label>
              <Input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. 9J2K8L1M"
                required
              />
            </div>
          </div>
        )}

        {/* Dynamic Channel Fields: Bank / Cheque */}
        {(method === "BANK" || method === "CHEQUE") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border-2 border-black">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                {locale === "bn" ? "ব্যাংকের নাম *" : "Bank Name *"}
              </label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. সোনালী ব্যাংক / DBBL"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                {locale === "bn" ? "চেক / রেফারেন্স নং *" : "Cheque / Ref No *"}
              </label>
              <Input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. CHQ-88219"
                required
              />
            </div>
          </div>
        )}

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
            {locale === "bn" ? "ফেরতের কারণ (বাধ্যতামূলক) *" : "Reason for Refund (Mandatory) *"}
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              locale === "bn"
                ? "e.g. দোকান হস্তান্তর / চুক্তি সমাপ্তি / আংশিক জামানত ফেরত"
                : "e.g. Shop lease termination / Excess deposit refund"
            }
            required
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex justify-end gap-2 border-t-2 border-black/10">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="destructive" isLoading={isSubmitting}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {isAdmin
              ? locale === "bn"
                ? "জামানত ফেরত সম্পন্ন করুন"
                : "Post Deposit Refund"
              : locale === "bn"
              ? "অনুমোদনের আবেদন জমা দিন"
              : "Submit for Approval"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
