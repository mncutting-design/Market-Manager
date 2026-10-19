"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatMonth, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Plus,
  Search,
  Wallet,
  Zap,
  Droplets,
  Shield,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ManageBillChargesModal } from "./modals/manage-bill-charges-modal";

export function BillingView() {
  const { t, locale } = useTranslation();
  const {
    selectedMarketId,
    selectedMonth,
    selectedYear,
    refreshKey,
    triggerRefresh,
    openGenerateBills,
    openQuickCollect,
  } = useApp();

  const [bills, setBills] = useState<any[]>([]);
  const [chargeTypes, setChargeTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Add Variable Charge Modal
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [activeBill, setActiveBill] = useState<any | null>(null);
  const [chargeTypeId, setChargeTypeId] = useState<string>("");
  const [chargeDescription, setChargeDescription] = useState("");
  const [chargeAmountBDT, setChargeAmountBDT] = useState<number>(0);
  const [isSavingCharge, setIsSavingCharge] = useState(false);

  // Fetch charge types
  useEffect(() => {
    const fetchCharges = async () => {
      try {
        const res = await fetch("/api/charges");
        if (res.ok) {
          const data = await res.json();
          setChargeTypes(data.charges || []);
          if (data.charges?.length > 0) {
            setChargeTypeId(data.charges[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCharges();
  }, []);

  // Fetch bills
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams();
        if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
        queryParams.set("month", String(selectedMonth));
        queryParams.set("year", String(selectedYear));
        if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
        if (search) queryParams.set("search", search);

        const res = await fetch(`/api/billing?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setBills(data.bills || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBills();
  }, [selectedMarketId, selectedMonth, selectedYear, statusFilter, search, refreshKey]);

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) return;
    if (chargeAmountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSavingCharge(true);
      const res = await fetch("/api/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: activeBill.id,
          chargeTypeId: chargeTypeId || undefined,
          description: chargeDescription || undefined,
          amount: Math.round(chargeAmountBDT * 100),
        }),
      });

      if (!res.ok) {
        toast.error("Failed to add charge");
        return;
      }

      toast.success(t("billing.chargesAdded"));
      triggerRefresh();
      setIsAddChargeOpen(false);
      setChargeAmountBDT(0);
      setChargeDescription("");
    } catch (e) {
      toast.error("Failed to add charge");
    } finally {
      setIsSavingCharge(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{t("billing.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatMonth(selectedMonth, locale, selectedYear)} — {t("billing.subtitle")}
          </p>
        </div>

        <Button onClick={openGenerateBills} className="shadow-xs">
          <Receipt className="w-4 h-4 mr-1.5" />
          {t("billing.generateBills")}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchShopsPlaceholder")}
            prefixIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg shrink-0">
          {["ALL", "DUE", "PARTIAL", "PAID"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {status === "ALL"
                ? t("common.all")
                : status === "PAID"
                ? t("status.paid")
                : status === "PARTIAL"
                ? t("status.partial")
                : t("status.due")}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Cards on Mobile, Table on Desktop */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : bills.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("billing.alreadyGenerated")}
          </p>
          <Button onClick={openGenerateBills} variant="outline" className="mt-4">
            {t("billing.generateBills")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {bills.map((bill) => (
            <Card
              key={bill.id}
              className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Shop and Tenant details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {bill.shop.shopNumber}
                    </span>
                    <span className="text-xs text-slate-500">({bill.shop.floor})</span>
                    <StatusBadge status={bill.status} />
                  </div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">
                    {bill.tenant.name} • <span className="font-mono text-slate-500">{bill.tenant.phone}</span>
                  </p>
                  <p className="text-xs text-slate-400 truncate">{bill.shop.market.name}</p>

                  {/* Bill Items chips */}
                  {bill.billItems?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        {t("billing.rentAmount")}: {formatCurrency(bill.rentAmount, locale)}
                      </span>
                      {bill.billItems.map((item: any) => (
                        <span
                          key={item.id}
                          className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px]"
                        >
                          {item.description}: {formatCurrency(item.amount, locale)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Previous Due Carry-Forward Alert */}
                  {bill.carryForwardDue > 0 && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs">
                      <span>{t("billing.previousDue")}:</span>
                      <span className="font-bold">{formatCurrency(bill.carryForwardDue, locale)}</span>
                    </div>
                  )}
                </div>

                {/* Amount breakdown and Action Buttons */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-slate-400">{t("billing.totalBill")}</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(bill.totalAmount, locale)}
                    </p>
                    {bill.dueAmount > 0 ? (
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-0.5">
                        {t("billing.dueAmount")}: {formatCurrency(bill.dueAmount, locale)}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {t("status.paid")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add/Manage Variable Extra Charges button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 px-2.5"
                      onClick={() => {
                        setActiveBill(bill);
                        setIsAddChargeOpen(true);
                      }}
                      title={locale === "bn" ? "অতিরিক্ত খরচ পরিচালনা করুন" : "Manage Additional Costs"}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                      {locale === "bn" ? "অতিরিক্ত খরচ" : "Extra Costs"}
                    </Button>

                    {/* Collect payment button */}
                    {bill.dueAmount > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs h-9 px-3"
                        onClick={() =>
                          openQuickCollect({
                            marketId: bill.shop.marketId,
                            shopId: bill.shopId,
                            billId: bill.id,
                            dueAmount: bill.dueAmount,
                          })
                        }
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1.5" />
                        {t("dashboard.quickCollect")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manage Additional Charges Modal (Totally Manual, Add/Delete with instant calculation) */}
      {activeBill && (
        <ManageBillChargesModal
          isOpen={isAddChargeOpen}
          onClose={() => {
            setIsAddChargeOpen(false);
            setActiveBill(null);
          }}
          bill={activeBill}
          onUpdated={() => triggerRefresh()}
        />
      )}
    </div>
  );
}
