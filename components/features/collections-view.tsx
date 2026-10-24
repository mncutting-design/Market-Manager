"use client";

import React, { useState, useEffect } from "react";
import { useRealtimeData } from "@/lib/realtime-sync";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Phone,
  User,
  Smartphone,
  Landmark,
  FilterX,
  AlertCircle,
  CreditCard,
} from "lucide-react";

export function CollectionsView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, setSelectedMarketId, refreshKey, openQuickCollect, showReceipt, markets } = useApp();

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [collectorFilter, setCollectorFilter] = useState("ALL");
  const [staffList, setStaffList] = useState<any[]>([]);

  // Fetch active staff for filter
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/users?activeStaff=true");
        if (res.ok) {
          const data = await res.json();
          setStaffList(data.users || []);
        }
      } catch (e) {
        console.warn("Could not load staff users:", e);
      }
    };
    fetchStaff();
  }, [refreshKey]);

  const queryParams = new URLSearchParams();
  if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
  if (methodFilter !== "ALL") queryParams.set("method", methodFilter);
  if (collectorFilter !== "ALL") queryParams.set("collectorId", collectorFilter);
  if (search) queryParams.set("search", search);
  const collectionsUrl = `/api/collections?${queryParams.toString()}`;

  const { data: collectionsData, isLoading, isSyncing, refetch: refetchPayments } = useRealtimeData<{ payments: any[] }>(
    collectionsUrl,
    { tag: "collections", refreshInterval: 12000 }
  );
  const payments = collectionsData?.payments || [];

  const hasActiveFilters =
    (selectedMarketId && selectedMarketId !== "ALL") ||
    methodFilter !== "ALL" ||
    collectorFilter !== "ALL" ||
    search.trim() !== "";

  const clearAllFilters = () => {
    setSelectedMarketId("ALL");
    setMethodFilter("ALL");
    setCollectorFilter("ALL");
    setSearch("");
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>{t("collections.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-bold mt-0.5">
            {t("collections.subtitle")}
          </p>
        </div>

        <Button onClick={() => openQuickCollect()} className="font-black text-xs sm:text-sm shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]">
          <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
          {t("collections.quickCollect")}
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.searchShopsPlaceholder")}
              prefixIcon={<Search className="w-4 h-4" />}
              className="h-9 text-xs"
            />
          </div>

          {/* Payment Method / Channel */}
          <div>
            <Select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="ALL">{locale === "bn" ? "সব মাধ্যম (All Channels)" : "All Channels"}</option>
              <option value="CASH">ক্যাশ (CASH)</option>
              <option value="BKASH">বিকাশ (bKash)</option>
              <option value="NAGAD">নগদ (Nagad)</option>
              <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
              <option value="CHEQUE">চেক (Cheque)</option>
            </Select>
          </div>

          {/* Collector / Received By Filter */}
          <div>
            <Select
              value={collectorFilter}
              onChange={(e) => setCollectorFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="ALL">{locale === "bn" ? "সব কালেকশন স্টাফ" : "All Collectors"}</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role === "ADMIN" ? "Admin" : s.role === "MANAGER" ? "Manager" : "Collector"})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Filter Notice Banner when Active Filter matches zero records */}
        {hasActiveFilters && payments.length === 0 && !isLoading && (
          <div className="p-3 rounded-xl bg-[#FFF8D6] dark:bg-[#2C2405] border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-between text-xs text-black dark:text-white font-bold">
            <div className="flex items-center gap-1.5 font-black">
              <AlertCircle className="w-4 h-4 text-black dark:text-white shrink-0 stroke-[2.5]" />
              <span>
                {locale === "bn"
                  ? "রেকর্ড সংরক্ষিত রয়েছে, কিন্তু বর্তমান ফিল্টারের কারণে তালিকায় প্রদর্শিত হচ্ছে না।"
                  : "Saved, but hidden by current filter."}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs font-black border-2 border-black bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[1.5px_1.5px_0px_#000000]"
            >
              <FilterX className="w-3 h-3 mr-1 stroke-[2.5]" />
              {locale === "bn" ? "ফিল্টার মুছুন" : "Clear filters"}
            </Button>
          </div>
        )}
      </div>

      {/* Collections List */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : payments.length === 0 ? (
        <Card className="p-10 text-center bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
          <Wallet className="w-10 h-10 text-black dark:text-white mx-auto mb-2 stroke-[2]" />
          <p className="text-sm font-black text-black dark:text-white">
            {t("collections.noPaymentsFound")}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearAllFilters} variant="outline" className="mt-3 text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000000]">
              <FilterX className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
              {locale === "bn" ? "ফিল্টার রিসেট করুন" : "Clear all filters"}
            </Button>
          ) : (
            <Button onClick={() => openQuickCollect()} className="mt-3 text-xs font-black shadow-[2px_2px_0px_#000000]">
              {t("collections.quickCollect")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {payments.map((p) => {
            const receiptData = {
              receiptNo: `REC-${p.bill.year}${String(p.bill.month).padStart(2, "0")}-${p.id.slice(-6).toUpperCase()}`,
              date: p.paidOn,
              marketName: p.bill.shop.market.name,
              marketAddress: p.bill.shop.market.address,
              shopNumber: p.bill.shop.shopNumber,
              floor: p.bill.shop.floor,
              size: p.bill.shop.size || "180 sqft",
              tenantName: p.bill.tenant.name,
              tenantPhone: p.bill.tenant.phone,
              billPeriodMonth: p.bill.month,
              billPeriodYear: p.bill.year,
              rentAmount: p.bill.rentAmount,
              totalBillAmount: p.bill.totalAmount,
              carryForwardDue: p.bill.carryForwardDue || 0,
              paidNow: p.amount,
              remainingDue: p.bill.dueAmount,
              paymentMethod: p.method,
              reference: p.reference,
              receivedBy: p.receivedByUser?.name || p.receivedBy,
              enteredBy: p.enteredByUser?.name || "Staff",
              note: p.note,
              transactionRef: p.transactionRef,
              senderNumber: p.senderNumber,
              bankName: p.bankName,
              paymentAccount: p.paymentAccount,
              billItems: p.bill.billItems || [],
            };

            const collectorName = p.receivedByUser?.name || p.receivedBy || "Staff";
            const enteredByName = p.enteredByUser?.name || "Staff";

            return (
              <Card
                key={p.id}
                className="p-4 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_#000000] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black text-black dark:text-white">
                      {p.bill.shop.shopNumber}
                    </span>
                    <span className="text-xs text-black/40 dark:text-white/40 font-black">•</span>
                    <span className="text-xs font-black text-black dark:text-white">
                      {p.bill.tenant.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#FED734] text-black border border-black shadow-[1px_1px_0px_#000000]">
                      {p.method}
                    </span>
                    {p.paymentAccount && (
                      <span className="text-[10px] font-black text-black bg-[#FFD6E8] px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_#000000]">
                        {p.paymentAccount.name_bn || p.paymentAccount.name_en} ({p.paymentAccount.number})
                      </span>
                    )}
                    {p.bankName && (
                      <span className="text-[10px] font-black text-black bg-[#D8F2FF] px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_#000000]">
                        {p.bankName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 font-bold flex flex-wrap items-center gap-2">
                    <span>{p.bill.shop.market.name}</span>
                    <span>•</span>
                    <span>{formatDate(p.paidOn, locale)}</span>
                    {p.transactionRef && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-black dark:text-white font-bold">Trx: {p.transactionRef}</span>
                      </>
                    )}
                    {p.senderNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-black dark:text-white font-bold">From: {p.senderNumber}</span>
                      </>
                    )}
                  </p>

                  {/* Staff Audit: Received by & Entered by */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 font-bold pt-0.5">
                    <span>
                      {locale === "bn" ? "আদায়কারী:" : "Received by:"}{" "}
                      <strong className="text-black dark:text-white font-black">{collectorName}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {locale === "bn" ? "এন্ট্রি করেছেন:" : "Entered by:"}{" "}
                      <strong className="text-black dark:text-white font-black">{enteredByName}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t-2 md:border-t-0 border-black/10 dark:border-white/10">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">{t("collections.paymentAmount")}</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(p.amount, locale)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => showReceipt(receiptData)}
                    className="h-8 text-xs font-black shrink-0 border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                    {locale === "bn" ? "রিসিট প্রিন্ট" : "Receipt"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
