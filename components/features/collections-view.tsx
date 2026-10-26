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
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EditPaymentModal } from "@/components/features/modals/edit-payment-modal";

export function CollectionsView() {
  const { t, locale } = useTranslation();
  const {
    selectedMarketId,
    setSelectedMarketId,
    refreshKey,
    openQuickCollect,
    showReceipt,
    markets,
    currentUser,
    isAdmin,
    triggerRefresh,
  } = useApp();
  const isOperator = currentUser?.role === "OPERATOR";

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [collectorFilter, setCollectorFilter] = useState("ALL");
  const [collectorList, setCollectorList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);

  // Fetch collectors and staff for filter
  useEffect(() => {
    const fetchCollectorsAndStaff = async () => {
      try {
        const [colRes, staffRes] = await Promise.all([
          fetch("/api/collectors"),
          fetch("/api/users?activeStaff=true"),
        ]);
        if (colRes.ok) {
          const colData = await colRes.json();
          setCollectorList(colData.collectors || []);
        }
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaffList(staffData.staff || staffData.users || []);
        }
      } catch (e) {
        console.warn("Could not load collectors/staff:", e);
      }
    };
    fetchCollectorsAndStaff();
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

  const handleDeletePayment = async (payment: any) => {
    const isDirectAdmin = currentUser?.role === "ADMIN";
    const shopNum = payment.bill?.shop?.shopNumber || "দোকান";
    const tenantName = payment.bill?.tenant?.name || "ভাড়াটিয়া";
    const amtStr = formatCurrency(payment.amount, locale);

    const confirmMsg = isDirectAdmin
      ? `${locale === "bn" ? "আপনি কি নিশ্চিতভাবে এই ভাড়া আদায় এন্ট্রি মুছে ফেলতে চান?" : "Are you sure you want to delete this payment record?"}\n\n${shopNum} - ${tenantName} (${amtStr})\n\n${locale === "bn" ? "সতর্কতা: এটি মুছলে সংশ্লিষ্ট বিলের বকেয়া পুনরায় বৃদ্ধি পাবে।" : "Warning: Deleting will restore the bill due balance."}`
      : `${locale === "bn" ? "ভাড়া আদায় এন্ট্রি মুছে ফেলার আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হবে। আপনি কি আবেদন পাঠাতে চান?" : "Submit deletion request for Admin approval?"}`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/collections?id=${payment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete payment");
        return;
      }
      if (data.requiresApproval) {
        toast.info(
          data.message ||
            (locale === "bn"
              ? "মুছে ফেলার আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে!"
              : "Deletion request submitted for admin approval!")
        );
      } else {
        toast.success(
          locale === "bn"
            ? "ভাড়া আদায় রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!"
            : "Payment record deleted successfully!"
        );
      }
      triggerRefresh();
      refetchPayments();
    } catch (e) {
      toast.error("Failed to delete payment");
    }
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
              <option value="ALL">{locale === "bn" ? "সব আদায়কারী ও স্টাফ" : "All Collectors"}</option>
              {collectorList.length > 0 && (
                <optgroup label={locale === "bn" ? "── আদায়কারী তালিকা ──" : "── Field Collectors ──"}>
                  {collectorList.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏷️ {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {staffList.length > 0 && (
                <optgroup label={locale === "bn" ? "── সিস্টেম স্টাফ ──" : "── System Staff ──"}>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      👤 {s.name} ({s.role === "ADMIN" ? "Admin" : s.role === "MANAGER" ? "Manager" : "Collector"})
                    </option>
                  ))}
                </optgroup>
              )}
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
              receivedBy: p.collector?.name || p.receivedBy || p.receivedByUser?.name || "Staff",
              enteredBy: p.enteredByUser?.name || "Staff",
              note: p.note,
              transactionRef: p.transactionRef,
              senderNumber: p.senderNumber,
              bankName: p.bankName,
              paymentAccount: p.paymentAccount,
              billItems: p.bill.billItems || [],
            };

            const collectorName = p.collector?.name || p.receivedBy || p.receivedByUser?.name || "Staff";
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
                  <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{locale === "bn" ? "আদায়কারী:" : "Collector:"}</span>
                      <strong className="font-black text-black dark:text-white">{collectorName}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{locale === "bn" ? "পোস্টিং করেছেন:" : "Entered by:"}</span>
                      <strong className="font-black text-black dark:text-white">{enteredByName}</strong>
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => showReceipt(receiptData)}
                      className="h-8 px-2 text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
                      title={locale === "bn" ? "রিসিট প্রিন্ট করুন" : "Print Receipt"}
                    >
                      <Printer className="w-3.5 h-3.5 sm:mr-1 stroke-[2.5]" />
                      <span className="hidden sm:inline">{locale === "bn" ? "রিসিট প্রিন্ট" : "Receipt"}</span>
                    </Button>

                    {!isOperator && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPayment(p)}
                          className="h-8 px-2 text-xs font-black border-2 border-black bg-[#FED734] text-black hover:bg-[#edd028] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
                          title={locale === "bn" ? "ভাড়া আদায় এডিট করুন" : "Edit Payment"}
                        >
                          <Pencil className="w-3.5 h-3.5 sm:mr-1 stroke-[2.5]" />
                          <span className="hidden sm:inline">{locale === "bn" ? "এডিট" : "Edit"}</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p)}
                          className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FF4B55] hover:text-white text-black dark:text-white shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                          title={locale === "bn" ? "ভাড়া আদায় মুছে ফেলুন" : "Delete Payment"}
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Payment Modal */}
      <EditPaymentModal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        payment={editingPayment}
        onUpdated={() => refetchPayments()}
      />
    </div>
  );
}
