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
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{t("collections.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("collections.subtitle")}
          </p>
        </div>

        <Button onClick={() => openQuickCollect()} className="shadow-xs font-bold text-xs sm:text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          {t("collections.quickCollect")}
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
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
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
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
              className="h-7 px-2 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <FilterX className="w-3 h-3 mr-1" />
              {locale === "bn" ? "ফিল্টার মুছুন" : "Clear filters"}
            </Button>
          </div>
        )}
      </div>

      {/* Collections List */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : payments.length === 0 ? (
        <Card className="p-10 text-center">
          <Wallet className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("collections.noPaymentsFound")}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearAllFilters} variant="outline" className="mt-3 text-xs">
              <FilterX className="w-3.5 h-3.5 mr-1" />
              {locale === "bn" ? "ফিল্টার রিসেট করুন" : "Clear all filters"}
            </Button>
          ) : (
            <Button onClick={() => openQuickCollect()} className="mt-3 text-xs">
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
                className="p-3 sm:p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {p.bill.shop.shopNumber}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {p.bill.tenant.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {p.method}
                    </span>
                    {p.paymentAccount && (
                      <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded border border-pink-200 dark:border-pink-900">
                        {p.paymentAccount.name_bn || p.paymentAccount.name_en} ({p.paymentAccount.number})
                      </span>
                    )}
                    {p.bankName && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                        {p.bankName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>{p.bill.shop.market.name}</span>
                    <span>•</span>
                    <span>{formatDate(p.paidOn, locale)}</span>
                    {p.transactionRef && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">Trx: {p.transactionRef}</span>
                      </>
                    )}
                    {p.senderNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">From: {p.senderNumber}</span>
                      </>
                    )}
                  </p>

                  {/* Staff Audit: Received by & Entered by */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>
                      {locale === "bn" ? "আদায়কারী:" : "Received by:"}{" "}
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">{collectorName}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {locale === "bn" ? "এন্ট্রি করেছেন:" : "Entered by:"}{" "}
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">{enteredByName}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-slate-400">{t("collections.paymentAmount")}</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(p.amount, locale)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => showReceipt(receiptData)}
                    className="h-8 text-xs font-semibold shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
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
