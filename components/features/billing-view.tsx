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
import { useRealtimeData } from "@/lib/realtime-sync";

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
    currentUser,
  } = useApp();
  const isOperator = currentUser?.role === "OPERATOR";


  const [chargeTypes, setChargeTypes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const queryParams = new URLSearchParams();
  if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
  queryParams.set("month", String(selectedMonth));
  queryParams.set("year", String(selectedYear));
  if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);
  const billingUrl = `/api/billing?${queryParams.toString()}`;

  const { data: billingData, isLoading, isSyncing, refetch: refetchBills } = useRealtimeData<{ bills: any[] }>(
    billingUrl,
    { tag: "billing", refreshInterval: 12000 }
  );
  const bills = billingData?.bills || [];

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
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>{t("billing.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
            {formatMonth(selectedMonth, locale, selectedYear)} — {t("billing.subtitle")}
          </p>
        </div>

        {!isOperator && (
          <Button onClick={openGenerateBills}>
            <Receipt className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("billing.generateBills")}
          </Button>
        )}
      </div>

      {/* Monthly Billing & Arrears Summary KPI Cards */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3.5 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000]">
            <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {locale === "bn" ? "চলতি মাসের বিল" : "Current Month Bill"}
            </p>
            <p className="text-base md:text-xl font-black text-black dark:text-white mt-1 font-mono">
              {formatCurrency(
                bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0),
                locale
              )}
            </p>
          </Card>

          <Card className="p-3.5 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000]">
            <p className="text-[11px] font-black text-[#FF4B55] dark:text-[#FF6B75] uppercase tracking-wider">
              {locale === "bn" ? "পূর্বের অপরিশোধিত বকেয়া" : "Previous Arrears"}
            </p>
            <p className="text-base md:text-xl font-black text-[#FF4B55] dark:text-[#FF6B75] mt-1 font-mono">
              {formatCurrency(
                bills.reduce((acc, b) => acc + (b.carryForwardDue || 0), 0),
                locale
              )}
            </p>
          </Card>

          <Card className="p-3.5 rounded-xl border-2 border-black bg-[#FED734]/30 dark:bg-[#FED734]/20 shadow-[3px_3px_0px_#000000]">
            <p className="text-[11px] font-black text-black dark:text-white uppercase tracking-wider">
              {locale === "bn" ? "সর্বমোট দাবি (বকেয়া সহ)" : "Total Demand"}
            </p>
            <p className="text-base md:text-xl font-black text-black dark:text-white mt-1 font-mono">
              {formatCurrency(
                bills.reduce((acc, b) => acc + (b.totalBillWithArrears || (b.totalAmount + (b.carryForwardDue || 0))), 0),
                locale
              )}
            </p>
          </Card>

          <Card className="p-3.5 rounded-xl border-2 border-black bg-[#E8F8F0] dark:bg-[#132A1E] shadow-[3px_3px_0px_#000000]">
            <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {locale === "bn" ? "চলতি মাসে আদায়" : "Collected"}
            </p>
            <p className="text-base md:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(
                bills.reduce((acc, b) => acc + (b.paidAmount || 0), 0),
                locale
              )}
            </p>
          </Card>

          <Card className="p-3.5 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000] col-span-2 sm:col-span-1">
            <p className="text-[11px] font-black text-[#FF4B55] dark:text-[#FF6B75] uppercase tracking-wider">
              {locale === "bn" ? "সর্বমোট অবশিষ্ট বকেয়া" : "Total Pending Due"}
            </p>
            <p className="text-base md:text-xl font-black text-[#FF4B55] dark:text-[#FF6B75] mt-1 font-mono">
              {formatCurrency(
                bills.reduce((acc, b) => acc + (b.totalPayableWithArrears || (b.dueAmount + (b.carryForwardDue || 0))), 0),
                locale
              )}
            </p>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchShopsPlaceholder")}
            prefixIcon={<Search className="w-4 h-4 stroke-[2.5]" />}
          />
        </div>

        {/* Status filters - Scrollable on mobile */}
        <div className="flex gap-1.5 bg-white dark:bg-[#1E1F24] p-1 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] shrink-0 overflow-x-auto no-scrollbar">
          {["ALL", "DUE", "PARTIAL", "PAID"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                statusFilter === status
                  ? "bg-[#FED734] text-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                  : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-[#FBF9F5] dark:hover:bg-[#262830]"
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
          <Receipt className="w-12 h-12 text-black dark:text-white mx-auto mb-3 stroke-[2]" />
          <p className="text-base font-black text-black dark:text-white">
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
              className="p-5 border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0px_#000000] transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Shop and Tenant details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-black dark:text-white">
                      {bill.shop.shopNumber}
                    </span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">({bill.shop.floor})</span>
                    <StatusBadge status={bill.status} />
                  </div>
                  <p className="text-xs font-bold text-black dark:text-white mt-1">
                    {bill.tenant.name} • <span className="font-mono text-gray-600 dark:text-gray-400">{bill.tenant.phone}</span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-bold truncate">{bill.shop.market.name}</p>

                  {/* Bill Items chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#FBF9F5] dark:bg-[#262830] text-[11px] text-black dark:text-white border-2 border-black font-black shadow-[1px_1px_0px_#000000]">
                      {t("billing.rentAmount")}: {formatCurrency(bill.rentAmount, locale)}
                    </span>
                    {bill.billItems?.map((item: any) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 rounded-md bg-[#FED734] text-black border-2 border-black text-[11px] font-black shadow-[1px_1px_0px_#000000]"
                      >
                        {item.description}: {formatCurrency(item.amount, locale)}
                      </span>
                    ))}
                    {bill.carryForwardDue > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FFEBEF] dark:bg-[#2C1417] text-[#FF4B55] dark:text-[#FF6B75] border-2 border-black text-[11px] font-black shadow-[1px_1px_0px_#000000]">
                        {locale === "bn" ? "পূর্বের অপরিশোধিত বকেয়া" : "Previous Arrears"}: +{formatCurrency(bill.carryForwardDue, locale)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount breakdown and Action Buttons - 100% Mobile Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t-2 lg:border-t-0 border-black/10 dark:border-white/10">
                  <div className="text-left sm:text-right space-y-1">
                    {bill.carryForwardDue > 0 ? (
                      <div className="space-y-0.5">
                        <div className="flex sm:justify-end items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-bold">
                          <span>{locale === "bn" ? "চলতি মাসের বিল:" : "Current Month:"}</span>
                          <span className="font-mono text-black dark:text-white font-bold">{formatCurrency(bill.totalAmount, locale)}</span>
                        </div>
                        <div className="flex sm:justify-end items-center gap-2 text-xs font-black text-[#FF4B55] dark:text-[#FF6B75]">
                          <span>{locale === "bn" ? "পূর্বের বকেয়া:" : "Previous Arrears:"}</span>
                          <span className="font-mono font-black">+ {formatCurrency(bill.carryForwardDue, locale)}</span>
                        </div>
                        <div className="pt-1 border-t-2 border-black/10 dark:border-white/10">
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-black uppercase tracking-wider">
                            {locale === "bn" ? "সর্বমোট প্রদেয় বিল:" : "Total Bill with Arrears:"}
                          </p>
                          <p className="text-base sm:text-lg font-black text-black dark:text-white font-mono">
                            {formatCurrency(bill.totalBillWithArrears || (bill.totalAmount + bill.carryForwardDue), locale)}
                          </p>
                        </div>
                        <div>
                          {(bill.totalPayableWithArrears || (bill.dueAmount + bill.carryForwardDue)) > 0 ? (
                            <p className="text-xs font-black text-[#FF4B55] dark:text-[#FF6B75] font-mono">
                              {locale === "bn" ? "সর্বমোট বকেয়া: " : "Total Due: "}
                              {formatCurrency(bill.totalPayableWithArrears || (bill.dueAmount + bill.carryForwardDue), locale)}
                            </p>
                          ) : (
                            <p className="text-xs font-black text-[#00BA88] mt-0.5">
                              {t("status.paid")}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">{t("billing.totalBill")}</p>
                        <p className="text-base font-black text-black dark:text-white font-mono">
                          {formatCurrency(bill.totalAmount, locale)}
                        </p>
                        {bill.dueAmount > 0 ? (
                          <p className="text-xs font-black text-[#FF4B55] mt-0.5 font-mono">
                            {t("billing.dueAmount")}: {formatCurrency(bill.dueAmount, locale)}
                          </p>
                        ) : (
                          <p className="text-xs font-black text-[#00BA88] mt-0.5">
                            {t("status.paid")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add/Manage Variable Extra Charges button */}
                    {!isOperator && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-9 px-2.5 flex-1 sm:flex-initial"
                        onClick={() => {
                          setActiveBill(bill);
                          setIsAddChargeOpen(true);
                        }}
                        title={locale === "bn" ? "অতিরিক্ত খরচ পরিচালনা করুন" : "Manage Additional Costs"}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                        {locale === "bn" ? "অতিরিক্ত খরচ" : "Extra Costs"}
                      </Button>
                    )}

                    {/* Collect payment button */}
                    {((bill.dueAmount > 0) || (bill.carryForwardDue || 0) > 0) && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs h-9 px-3 flex-1 sm:flex-initial"
                        onClick={() =>
                          openQuickCollect({
                            marketId: bill.shop.marketId,
                            shopId: bill.shopId,
                            billId: bill.id,
                            dueAmount: bill.totalPayableWithArrears || (bill.dueAmount + (bill.carryForwardDue || 0)),
                          })
                        }
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
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
          onUpdated={(updatedBill) => {
            if (updatedBill) {
              setActiveBill(updatedBill);
            }
            refetchBills();
          }}
        />
      )}
    </div>
  );
}
