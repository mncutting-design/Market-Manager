"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { formatCurrency, toBanglaDigits } from "@/lib/format";
import { toast } from "sonner";
import { Wallet, CheckCircle2 } from "lucide-react";

export function QuickCollectModal() {
  const { t, locale } = useTranslation();
  const {
    isQuickCollectOpen,
    setIsQuickCollectOpen,
    quickCollectInitialData,
    markets,
    selectedMonth,
    selectedYear,
    triggerRefresh,
    showReceipt,
  } = useApp();

  const [marketId, setMarketId] = useState<string>("");
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [reference, setReference] = useState<string>("");
  const [receivedBy, setReceivedBy] = useState<string>("ম্যানেজার");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBill, setActiveBill] = useState<any | null>(null);

  // Initialize market
  useEffect(() => {
    if (isQuickCollectOpen) {
      if (quickCollectInitialData?.marketId) {
        setMarketId(quickCollectInitialData.marketId);
      } else if (markets.length > 0) {
        setMarketId(markets[0].id);
      }
    }
  }, [isQuickCollectOpen, quickCollectInitialData, markets]);

  // Load occupied shops for selected market
  useEffect(() => {
    if (!marketId) return;
    const fetchShops = async () => {
      try {
        const res = await fetch(`/api/shops?marketId=${marketId}&status=OCCUPIED`);
        if (res.ok) {
          const data = await res.json();
          setShops(data.shops || []);
          if (quickCollectInitialData?.shopId) {
            setSelectedShopId(quickCollectInitialData.shopId);
          } else if (data.shops?.length > 0) {
            setSelectedShopId(data.shops[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchShops();
  }, [marketId, quickCollectInitialData]);

  // Load bills for selected shop
  useEffect(() => {
    if (!selectedShopId) return;
    const fetchBills = async () => {
      try {
        const res = await fetch(`/api/billing?marketId=${marketId}&status=ALL`);
        if (res.ok) {
          const data = await res.json();
          const shopBills = (data.bills || []).filter((b: any) => b.shopId === selectedShopId);
          setBills(shopBills);

          // Find unpaid bill
          const unpaid = shopBills.find((b: any) => b.dueAmount > 0) || shopBills[0];
          if (unpaid) {
            setSelectedBillId(unpaid.id);
            setActiveBill(unpaid);
            // Amount prefilled with due amount in BDT
            const dueBDT = Math.round(unpaid.dueAmount / 100);
            setAmountBDT(dueBDT);
          } else {
            setSelectedBillId("");
            setActiveBill(null);
            setAmountBDT(0);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchBills();
  }, [selectedShopId, marketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillId) {
      toast.error("Please select a valid invoice with due balance");
      return;
    }
    if (amountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBillId,
          amount: Math.round(amountBDT * 100), // convert to paisa
          method: paymentMethod,
          reference,
          receivedBy,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record payment");
        return;
      }

      toast.success(t("collections.paymentSaved"));
      triggerRefresh();
      setIsQuickCollectOpen(false);

      // Open Money Receipt automatically
      if (data.receipt) {
        showReceipt(data.receipt);
      }
    } catch (e) {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isQuickCollectOpen}
      onClose={() => setIsQuickCollectOpen(false)}
      title={t("collections.collectPayment")}
      description={t("collections.subtitle")}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Market */}
        <Select
          label={t("collections.selectMarket")}
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
        >
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>

        {/* Select Shop & Tenant */}
        <Select
          label={t("collections.selectShop")}
          value={selectedShopId}
          onChange={(e) => setSelectedShopId(e.target.value)}
        >
          {shops.length === 0 ? (
            <option value="">{t("common.noData")}</option>
          ) : (
            shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shopNumber} - {s.tenant?.name || "No tenant"} ({s.floor})
              </option>
            ))
          )}
        </Select>

        {/* Invoice Summary Card */}
        {activeBill ? (
          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs md:text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">{t("billing.billDetails")}:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {locale === "bn" ? toBanglaDigits(activeBill.month) : activeBill.month}/
                {locale === "bn" ? toBanglaDigits(activeBill.year) : activeBill.year}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">{t("billing.totalBill")}:</span>
              <span className="font-semibold">{formatCurrency(activeBill.totalAmount, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">{t("billing.paidAmount")}:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activeBill.paidAmount, locale)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-teal-200/60 dark:border-teal-800 font-bold text-sm">
              <span className="text-red-700 dark:text-red-400">{t("collections.totalDue")}:</span>
              <span className="text-red-700 dark:text-red-400">
                {formatCurrency(activeBill.dueAmount, locale)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
            {t("billing.alreadyGenerated")} / No pending invoice.
          </div>
        )}

        {/* Payment Amount Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            {t("collections.paymentAmount")} (৳ BDT)
          </label>
          <NumberInput
            value={amountBDT}
            onChange={(val) => setAmountBDT(val)}
            prefix="৳"
            placeholder="0"
            className="text-lg font-bold text-teal-700 dark:text-teal-400"
          />
        </div>

        {/* Payment Method */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["CASH", "BKASH", "NAGAD", "BANK"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                paymentMethod === m
                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              {m === "CASH"
                ? t("collections.cash")
                : m === "BKASH"
                ? t("collections.bkash")
                : m === "NAGAD"
                ? t("collections.nagad")
                : t("collections.bank")}
            </button>
          ))}
        </div>

        {/* Reference and Received By */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("collections.reference")}
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TRX-928172 / Cash"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("collections.receivedBy")}
            </label>
            <Input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of receiver"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsQuickCollectOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {t("collections.collectPayment")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
