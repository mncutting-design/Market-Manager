"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { formatCurrency } from "@/lib/format";
import { Coins, PlusCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DepositReceiptData } from "./deposit-receipt-modal";

interface ReceiveDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTenantId?: string;
  initialTenantName?: string;
  initialShopNumber?: string;
  initialMarketId?: string;
  initialMarketName?: string;
  onSuccess?: (receiptData: DepositReceiptData) => void;
}

export function ReceiveDepositModal({
  isOpen,
  onClose,
  initialTenantId,
  initialTenantName,
  initialShopNumber,
  initialMarketId,
  initialMarketName,
  onSuccess,
}: ReceiveDepositModalProps) {
  const { t, locale } = useTranslation();
  const { currentUser, triggerRefresh } = useApp();

  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId || "");
  const [type, setType] = useState<"RECEIVED" | "TOPUP">("RECEIVED");
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("CASH");
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [bankName, setBankName] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [receivedById, setReceivedById] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  const isCollector = currentUser?.role === "COLLECTOR";

  // Pre-fill tenant if provided
  useEffect(() => {
    if (initialTenantId) {
      setSelectedTenantId(initialTenantId);
    }
  }, [initialTenantId]);

  // Set default received by
  useEffect(() => {
    if (currentUser?.id) {
      setReceivedById(currentUser.id);
    }
  }, [currentUser, isOpen]);

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

  // Fetch active tenants if not pre-provided
  useEffect(() => {
    if (!isOpen) return;
    const fetchTenants = async () => {
      try {
        setIsLoadingTenants(true);
        const res = await fetch("/api/tenants?status=ACTIVE");
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenants || []);
        }
      } catch (e) {
        console.warn("Could not fetch tenants:", e);
      } finally {
        setIsLoadingTenants(false);
      }
    };
    fetchTenants();
  }, [isOpen]);

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

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaisa = Math.round(amountBDT * 100);

    if (!selectedTenantId) {
      toast.error(
        locale === "bn" ? "ভাড়াটিয়া নির্বাচন করুন" : "Please select a tenant"
      );
      return;
    }

    if (amountPaisa <= 0) {
      toast.error(
        locale === "bn"
          ? "সঠিক জামানত পরিমাণ প্রদান করুন"
          : "Please enter a valid positive deposit amount"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/deposits/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          type,
          amount: amountPaisa,
          transactionDate: date,
          method,
          paymentAccountId: selectedAccountId || undefined,
          bankName: bankName.trim() || undefined,
          transactionRef: transactionRef.trim() || undefined,
          receivedById: isCollector ? currentUser?.id : receivedById || currentUser?.id,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to receive deposit");
        return;
      }

      toast.success(
        locale === "bn"
          ? "জামানত সফলভাবে জমা হয়েছে!"
          : "Deposit recorded successfully!"
      );

      triggerRefresh("dashboard");
      triggerRefresh("deposits");
      triggerRefresh("shops");

      const recData: DepositReceiptData = {
        id: data.transaction?.id || new Date().getTime().toString(),
        transactionDate: date,
        tenantName:
          initialTenantName || selectedTenant?.name || "Tenant",
        tenantPhone: selectedTenant?.phone || "",
        shopNumber:
          initialShopNumber || selectedTenant?.shop?.shopNumber || "",
        marketName:
          initialMarketName || selectedTenant?.shop?.market?.name || "",
        type,
        amount: amountPaisa,
        method,
        accountName:
          paymentAccounts.find((a) => a.id === selectedAccountId)?.name_bn ||
          bankName,
        transactionRef,
        receivedBy:
          staffUsers.find((u) => u.id === receivedById)?.name ||
          currentUser?.name ||
          "Admin",
        enteredBy: currentUser?.name || "Admin",
        reason: reason.trim() || undefined,
        runningBalance: data.currentBalance,
      };

      onClose();
      if (onSuccess) {
        onSuccess(recData);
      }
    } catch (err: any) {
      toast.error("Failed to submit deposit: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        locale === "bn"
          ? "জামানত জমা / টপ-আপ গ্রহণ"
          : "Receive Tenant Deposit / Top-up"
      }
      description={
        initialTenantName
          ? `${initialShopNumber} — ${initialTenantName} (${initialMarketName})`
          : locale === "bn"
          ? "নতুন বা বিদ্যমান ভাড়াটিয়ার জামানত অর্থ জমা করুন"
          : "Record security deposit inflow from tenant"
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
                {isLoadingTenants
                  ? "Loading tenants..."
                  : locale === "bn"
                  ? "-- ভাড়াটিয়া নির্বাচন করুন --"
                  : "-- Select Tenant --"}
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.shop?.shopNumber} — {t.name} ({t.shop?.market?.name})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Deposit Type */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "লেনদেনের ধরন *" : "Deposit Type *"}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
            >
              <option value="RECEIVED">
                {locale === "bn" ? "মূল জামানত (Initial Deposit)" : "Initial Deposit"}
              </option>
              <option value="TOPUP">
                {locale === "bn" ? "টপ-আপ বৃদ্ধি (Top-Up Deposit)" : "Top-Up Deposit"}
              </option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "পরিমাণ (টাকা) *" : "Amount (BDT) *"}
            </label>
            <NumberInput
              value={amountBDT}
              onChange={setAmountBDT}
              placeholder="e.g. 50,000"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {locale === "bn" ? "জমার তারিখ *" : "Transaction Date *"}
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
              {locale === "bn" ? "পেমেন্ট মাধ্যম *" : "Payment Channel *"}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
            >
              <option value="CASH">{locale === "bn" ? "নগদ ক্যাশ (Cash)" : "Cash"}</option>
              <option value="BKASH">bKash (বিকাশ)</option>
              <option value="NAGAD">Nagad (নগদ)</option>
              <option value="BANK">{locale === "bn" ? "ব্যাংক ডিপোজিট (Bank)" : "Bank Deposit"}</option>
              <option value="CHEQUE">{locale === "bn" ? "চেক (Cheque)" : "Cheque"}</option>
            </select>
          </div>
        </div>

        {/* Dynamic Channel Fields: bKash / Nagad */}
        {(method === "BKASH" || method === "NAGAD") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border-2 border-black">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                {locale === "bn" ? "গ্রহণকারী অ্যাকাউন্ট *" : "Receiving Account *"}
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
                placeholder="e.g. CHQ-991201"
                required
              />
            </div>
          </div>
        )}

        {/* Received By Collector selector */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
            {locale === "bn" ? "টাকা গ্রহণকারী (Received By) *" : "Received By *"}
          </label>
          <select
            value={receivedById}
            onChange={(e) => setReceivedById(e.target.value)}
            disabled={isCollector}
            required
            className="w-full h-10 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none disabled:bg-neutral-200 dark:disabled:bg-neutral-800"
          >
            {isCollector ? (
              <option value={currentUser?.id}>{currentUser?.name} (You)</option>
            ) : (
              staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))
            )}
          </select>
          {isCollector && (
            <p className="text-[10px] text-gray-500 font-bold mt-1">
              {locale === "bn"
                ? "কালেক্টর কেবল নিজের নামেই রসিদ সংগ্রহ করতে পারেন।"
                : "Collectors can only attribute deposit receipts to themselves."}
            </p>
          )}
        </div>

        {/* Reason / Remarks */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
            {locale === "bn" ? "মন্তব্য / বিবরণ" : "Note / Remarks"}
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              locale === "bn"
                ? "e.g. নতুন ভাড়ার প্রাথমিক জামানত / টপ-আপ"
                : "e.g. Initial security deposit payment"
            }
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex justify-end gap-2 border-t-2 border-black/10">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="neo" isLoading={isSubmitting}>
            <Coins className="w-4 h-4 mr-1.5" />
            {locale === "bn" ? "জামানত জমা নিশ্চিত করুন" : "Confirm Deposit"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
