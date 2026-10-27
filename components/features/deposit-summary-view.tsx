"use client";

import React, { useState, useEffect } from "react";
import { useRealtimeData } from "@/lib/realtime-sync";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  toBanglaDigits,
} from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  Coins,
  Search,
  Plus,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Building2,
  Phone,
  User,
  CreditCard,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  SlidersHorizontal,
  History,
  Layers,
  ArrowRight,
  Receipt,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ReceiveDepositModal } from "./modals/receive-deposit-modal";
import { RefundDepositModal } from "./modals/refund-deposit-modal";
import { DepositReceiptModal, DepositReceiptData } from "./modals/deposit-receipt-modal";
import { DepositRefundReceiptModal, DepositRefundReceiptData } from "./modals/deposit-refund-receipt-modal";
import { AdjustAdvanceModal } from "./modals/adjust-advance-modal";
import { TenantProfileModal } from "./modals/tenant-profile-modal";
import * as XLSX from "xlsx";

export function DepositSummaryView() {
  const { t, locale } = useTranslation();
  const {
    selectedMarketId,
    setSelectedMarketId,
    selectedMonth,
    selectedYear,
    markets,
    currentUser,
    isAdmin,
    triggerRefresh,
  } = useApp();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTabSub, setActiveTabSub] = useState<"tenants" | "ledger">("tenants");
  const [reversingTxId, setReversingTxId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);

  // Modals state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedTenantForAction, setSelectedTenantForAction] = useState<any | null>(null);
  const [activeProfileTenantId, setActiveProfileTenantId] = useState<string | null>(null);

  // Receipts
  const [activeDepositReceipt, setActiveDepositReceipt] = useState<DepositReceiptData | null>(null);
  const [activeRefundReceipt, setActiveRefundReceipt] = useState<DepositRefundReceiptData | null>(null);

  const depositsUrl = `/api/deposits?marketId=${selectedMarketId}&month=${selectedMonth}&year=${selectedYear}`;
  const { data, isLoading, refetch } = useRealtimeData<any>(depositsUrl, {
    tag: "deposits",
    refreshInterval: 12000,
  });

  const summary = data?.summary || {
    totalHeld: 0,
    periodReceived: 0,
    periodRefunded: 0,
    periodUsed: 0,
    netMovement: 0,
  };

  const channelBreakdown = data?.channelBreakdown || {};
  const accountBreakdown = data?.accountBreakdown || [];
  const tenantSummaries = data?.tenantSummaries || [];
  const transactions = data?.transactions || [];

  // Filtered Tenants
  const filteredTenants = tenantSummaries.filter((t: any) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.tenantName && t.tenantName.toLowerCase().includes(q)) ||
      (t.shopNumber && t.shopNumber.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q)) ||
      (t.marketName && t.marketName.toLowerCase().includes(q))
    );
  });

  // Filtered Ledger Transactions
  const filteredTransactions = transactions.filter((tx: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (tx.tenant?.name && tx.tenant.name.toLowerCase().includes(q)) ||
      (tx.shop?.shopNumber && tx.shop.shopNumber.toLowerCase().includes(q)) ||
      (tx.reason && tx.reason.toLowerCase().includes(q)) ||
      (tx.type && tx.type.toLowerCase().includes(q)) ||
      (tx.method && tx.method.toLowerCase().includes(q))
    );
  });

  // Handle Reversal Action
  const handleExecuteReversal = async (txId: string) => {
    if (!reversalReason.trim()) {
      toast.error(locale === "bn" ? "রিভার্সালের কারণ লিখুন" : "Please enter reversal reason");
      return;
    }

    try {
      setIsReversing(true);
      const res = await fetch("/api/deposits/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: txId,
          reason: reversalReason.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.error || "Failed to reverse transaction");
        return;
      }

      toast.success(
        locale === "bn"
          ? "লেনদেন সফলভাবে রিভার্স (বাতিল) করা হয়েছে!"
          : "Transaction successfully reversed!"
      );
      setReversingTxId(null);
      setReversalReason("");
      refetch();
      triggerRefresh("dashboard");
      triggerRefresh("deposits");
    } catch (err: any) {
      toast.error("Reversal error: " + err.message);
    } finally {
      setIsReversing(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const tenantRows = filteredTenants.map((t: any) => ({
        "দোকান নং / Shop": t.shopNumber || "",
        "ভাড়াটিয়া / Tenant": t.tenantName || "",
        "মোবাইল / Phone": t.phone || "",
        "মার্কেট / Market": t.marketName || "",
        "স্ট্যাটাস / Status": t.status || "",
        "বর্তমান জামানত (টাকা) / Balance BDT": Math.round((t.currentBalance || 0) / 100),
        "লেনদেন সংখ্যা / Tx Count": t.transactionsCount || 0,
      }));

      const ledgerRows = filteredTransactions.map((tx: any) => ({
        "তারিখ / Date": formatDate(tx.transactionDate, "en"),
        "দোকান / Shop": tx.shop?.shopNumber || "",
        "ভাড়াটিয়া / Tenant": tx.tenant?.name || "",
        "লেনদেনের ধরন / Type": tx.type,
        "মাধ্যম / Channel": tx.method,
        "অ্যাকাউন্ট / Account": tx.paymentAccount?.name_en || tx.bankName || "",
        "পরিমাণ (টাকা) / Amount BDT": Math.round((tx.signedAmount || 0) / 100),
        "রানিং ব্যালেন্স / Running Bal BDT": Math.round((tx.runningBalance || 0) / 100),
        "কারণ / Reason": tx.reason || "",
        "আদায়কারী / Received By": tx.counterpartyUser?.name || "",
        "এন্ট্রি করেছেন / Entered By": tx.enteredByUser?.name || "",
        "স্ট্যাটাস / Status": tx.status,
      }));

      const wb = XLSX.utils.book_new();
      const wsTenants = XLSX.utils.json_to_sheet(tenantRows);
      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);

      XLSX.utils.book_append_sheet(wb, wsTenants, "Tenant Balances");
      XLSX.utils.book_append_sheet(wb, wsLedger, "Deposit Ledger");

      XLSX.writeFile(
        wb,
        `Deposit_Summary_${selectedMonth}_${selectedYear}.xlsx`
      );
      toast.success(
        locale === "bn"
          ? "এক্সেল ফাইল সফলভাবে ডাউনলোড হয়েছে!"
          : "Excel file downloaded successfully!"
      );
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FED734] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000000]">
              <Coins className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-black dark:text-white tracking-tight">
              {locale === "bn"
                ? "ভাড়াটিয়া জামানত সামারি (Jamanat Ledger)"
                : "Tenant Deposit Management & Summary"}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
            {formatMonth(selectedMonth, locale, selectedYear)} —{" "}
            {selectedMarketId === "ALL"
              ? locale === "bn"
                ? "সকল মার্কেটের সম্মিলিত জামানত হিসাব"
                : "Portfolio Deposit Balance Across All Markets"
              : markets.find((m) => m.id === selectedMarketId)?.name || "Market"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="neo"
            onClick={() => {
              setSelectedTenantForAction(null);
              setIsReceiveModalOpen(true);
            }}
            className="font-black shadow-[2px_2px_0px_#000000]"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {locale === "bn" ? "জামানত গ্রহণ" : "Receive Deposit"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedTenantForAction(null);
              setIsRefundModalOpen(true);
            }}
            className="font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
          >
            <RotateCcw className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {locale === "bn" ? "জামানত ফেরত" : "Refund Deposit"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {locale === "bn" ? "এক্সেল এক্সপোর্ট" : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Deposit Held (Liability) */}
        <div className="bg-white dark:bg-[#1E1F24] p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span>{locale === "bn" ? "মোট জামানত স্থিতি" : "Total Deposit Held"}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#FED734] text-black border border-black shadow-[1px_1px_0px_#000000]">
              Liability
            </span>
          </div>
          <div className="my-2.5">
            <div
              className="text-xl sm:text-2xl font-black text-black dark:text-white truncate"
              title={formatCurrency(summary.totalHeld, locale)}
            >
              {formatCurrency(summary.totalHeld, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span>{filteredTenants.length} {locale === "bn" ? "জন ভাড়াটিয়া" : "tenants"}</span>
            <span className="text-[#00BCD4] font-black">{locale === "bn" ? "ট্রাস্ট তহবিল" : "Held in Trust"}</span>
          </div>
        </div>

        {/* Card 2: Received this period */}
        <div className="bg-white dark:bg-[#1E1F24] p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span>{locale === "bn" ? "এ মাসে জমা" : "Received This Period"}</span>
            <ArrowDownRight className="w-4 h-4 text-[#00BA88] stroke-[2.5]" />
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#00BA88] truncate">
              +{formatCurrency(summary.periodReceived, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span>{locale === "bn" ? "নতুন জমা ও টপ-আপ" : "Inflow"}</span>
            <span className="text-[#00BA88] font-black">Cash In</span>
          </div>
        </div>

        {/* Card 3: Refunded this period */}
        <div className="bg-white dark:bg-[#1E1F24] p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span>{locale === "bn" ? "এ মাসে ফেরত" : "Refunded This Period"}</span>
            <ArrowUpRight className="w-4 h-4 text-[#FF4B55] stroke-[2.5]" />
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#FF4B55] truncate">
              -{formatCurrency(summary.periodRefunded, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span>{locale === "bn" ? "ভাড়াটিয়াকে ফেরত" : "Outflow"}</span>
            <span className="text-[#FF4B55] font-black">Cash Out</span>
          </div>
        </div>

        {/* Card 4: Used this period (adjusted to due + deduction) */}
        <div className="bg-white dark:bg-[#1E1F24] p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span>{locale === "bn" ? "এ মাসে সমন্বয়কৃত" : "Used This Period"}</span>
            <RotateCcw className="w-4 h-4 text-[#F59E0B] stroke-[2.5]" />
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#F59E0B] truncate">
              {formatCurrency(summary.periodUsed, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span>{locale === "bn" ? "বকেয়া ভাড়া ও কর্তন" : "Non-cash Adjusted"}</span>
            <span className="text-[#F59E0B] font-black">Non-Cash</span>
          </div>
        </div>
      </div>

      {/* Breakdown Section: Channels & Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Channel Breakdown */}
        <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
          <h4 className="text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 stroke-[2.5]" />
            <span>{locale === "bn" ? "পেমেন্ট মাধ্যমভিত্তিক জামানত প্রবাহ" : "Channel Breakdown (Inflow vs Outflow)"}</span>
          </h4>

          <div className="space-y-3">
            {[
              { key: "CASH", labelBn: "ক্যাশ", labelEn: "Cash" },
              { key: "BKASH", labelBn: "বিকাশ", labelEn: "bKash" },
              { key: "NAGAD", labelBn: "নগদ", labelEn: "Nagad" },
              { key: "BANK", labelBn: "ব্যাংক", labelEn: "Bank" },
              { key: "CHEQUE", labelBn: "চেক", labelEn: "Cheque" },
            ].map((ch) => {
              const item = channelBreakdown[ch.key] || { in: 0, out: 0 };
              const net = item.in - item.out;
              return (
                <div
                  key={ch.key}
                  className="p-3 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] shadow-[2px_2px_0px_#000000] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-md text-xs font-black border border-black bg-white dark:bg-[#1E1F24] shadow-[1px_1px_0px_#000000]">
                      {locale === "bn" ? ch.labelBn : ch.labelEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-right">
                    <div>
                      <span className="text-gray-500 block text-[10px]">
                        {locale === "bn" ? "জমা (In):" : "In:"}
                      </span>
                      <span className="font-mono text-[#00BA88] font-black">
                        +{formatCurrency(item.in, locale)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[10px]">
                        {locale === "bn" ? "ফেরত (Out):" : "Out:"}
                      </span>
                      <span className="font-mono text-[#FF4B55] font-black">
                        -{formatCurrency(item.out, locale)}
                      </span>
                    </div>

                    <div className="border-l-2 border-black/10 pl-3">
                      <span className="text-gray-500 block text-[10px]">
                        {locale === "bn" ? "নেট প্রবাহ:" : "Net:"}
                      </span>
                      <span className="font-mono font-black text-black dark:text-white">
                        {formatCurrency(net, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bank & Payment Accounts Breakdown */}
        <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
          <h4 className="text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2 mb-3">
            <Landmark className="w-4 h-4 stroke-[2.5]" />
            <span>{locale === "bn" ? "অ্যাকাউন্ট ও ব্যাংকভিত্তিক হিসাব" : "Bank & Account Breakdown"}</span>
          </h4>

          {accountBreakdown.length === 0 ? (
            <p className="text-xs text-gray-500 font-bold py-6 text-center">
              {locale === "bn"
                ? "বর্তমান নির্বাচিত সময়ে কোনো ব্যাংক বা মোবাইল ওয়ালেট লেনদেন নেই"
                : "No bank or digital wallet deposit movement in this period"}
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {accountBreakdown.map((acc: any) => (
                <div
                  key={acc.accountId}
                  className="p-3 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] shadow-[2px_2px_0px_#000000] flex items-center justify-between"
                >
                  <div>
                    <p className="font-black text-xs text-black dark:text-white">
                      {acc.accountName}
                    </p>
                    {acc.number && (
                      <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400 font-bold">
                        {acc.number}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-right">
                    <div>
                      <span className="text-[10px] text-gray-500 block">জমা</span>
                      <span className="font-mono text-[#00BA88] font-black">
                        +{formatCurrency(acc.in, locale)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">ফেরত</span>
                      <span className="font-mono text-[#FF4B55] font-black">
                        -{formatCurrency(acc.out, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Tenants List vs Full Ledger */}
      <div className="border-b-2 border-black flex items-center gap-3">
        <button
          onClick={() => setActiveTabSub("tenants")}
          className={`pb-2.5 text-sm font-black flex items-center gap-2 transition-all ${
            activeTabSub === "tenants"
              ? "border-b-4 border-[#FED734] text-black dark:text-white"
              : "text-gray-500 hover:text-black dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4 stroke-[2.5]" />
          <span>{locale === "bn" ? "ভাড়াটিয়াদের জামানত তালিকা" : "Tenant Balances List"}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black text-white">
            {filteredTenants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTabSub("ledger")}
          className={`pb-2.5 text-sm font-black flex items-center gap-2 transition-all ${
            activeTabSub === "ledger"
              ? "border-b-4 border-[#FED734] text-black dark:text-white"
              : "text-gray-500 hover:text-black dark:hover:text-white"
          }`}
        >
          <History className="w-4 h-4 stroke-[2.5]" />
          <span>{locale === "bn" ? "সম্পূর্ণ জামানত লেজার (Timeline)" : "Full Deposit Ledger"}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black text-white">
            {filteredTransactions.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 stroke-[2.5]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === "bn"
                ? "ভাড়াটিয়ার নাম, দোকান নং বা ফোন নম্বর খুঁজুন..."
                : "Search by tenant, shop #, phone..."
            }
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTabSub === "tenants" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
            >
              <option value="ALL">{locale === "bn" ? "সকল স্ট্যাটাস" : "All Status"}</option>
              <option value="ACTIVE">{locale === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
              <option value="NOTICE_GIVEN">{locale === "bn" ? "নোটিশপ্রাপ্ত" : "Notice Given"}</option>
              <option value="SETTLED">{locale === "bn" ? "হিসাব নিষ্পত্তিকৃত" : "Settled"}</option>
            </select>
          )}

          <select
            value={selectedMarketId}
            onChange={(e) => setSelectedMarketId(e.target.value)}
            className="h-9 px-3 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-xs font-bold text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none"
          >
            <option value="ALL">{locale === "bn" ? "সকল মার্কেট" : "All Markets"}</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB SUB 1: TENANTS BALANCES LIST */}
      {activeTabSub === "tenants" && (
        <div className="rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000] overflow-hidden">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 font-bold">
              {locale === "bn" ? "কোনো ভাড়াটিয়া পাওয়া যায়নি।" : "No tenants found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-bold">
                <thead className="bg-[#FED734] border-b-2 border-black text-black font-black uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">দোকান ও মার্কেট</th>
                    <th className="p-3">ভাড়াটিয়া ও ফোন</th>
                    <th className="p-3">স্ট্যাটাস</th>
                    <th className="p-3 text-right">জামানত স্থিতি (Balance)</th>
                    <th className="p-3 text-center">লেনদেন</th>
                    <th className="p-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                  {filteredTenants.map((t: any) => (
                    <tr
                      key={t.tenantId}
                      className="hover:bg-[#FED734]/10 transition-colors"
                    >
                      <td className="p-3">
                        <span className="font-black text-sm text-black dark:text-white block">
                          {t.shopNumber}
                        </span>
                        <span className="text-[11px] text-gray-600 dark:text-gray-400">
                          {t.marketName}
                        </span>
                      </td>

                      <td className="p-3">
                        <p className="font-black text-black dark:text-white">
                          {t.tenantName}
                        </p>
                        <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          {t.phone}
                        </p>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black border border-black shadow-[1px_1px_0px_#000000] ${
                            t.status === "ACTIVE"
                              ? "bg-[#E6F8F2] text-[#00BA88]"
                              : t.status === "NOTICE_GIVEN"
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : "bg-neutral-200 text-neutral-800"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono font-black text-sm text-black dark:text-white">
                        {formatCurrency(t.currentBalance, locale)}
                      </td>

                      <td className="p-3 text-center font-bold text-gray-700 dark:text-gray-300">
                        {locale === "bn"
                          ? toBanglaDigits(t.transactionsCount)
                          : t.transactionsCount}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="neo"
                            onClick={() => {
                              setSelectedTenantForAction(t);
                              setIsReceiveModalOpen(true);
                            }}
                            className="h-7 px-2 text-[10px] font-black"
                            title="Receive Deposit / Top-up"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {locale === "bn" ? "জমা" : "Deposit"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTenantForAction(t);
                              setIsRefundModalOpen(true);
                            }}
                            disabled={t.currentBalance <= 0}
                            className="h-7 px-2 text-[10px] font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000] disabled:opacity-40"
                            title="Refund Deposit"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            {locale === "bn" ? "ফেরত" : "Refund"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTenantForAction(t);
                              setIsAdjustModalOpen(true);
                            }}
                            disabled={t.currentBalance <= 0}
                            className="h-7 px-2 text-[10px] font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000] disabled:opacity-40"
                            title="Adjust against rent due"
                          >
                            {locale === "bn" ? "সমন্বয়" : "Adjust"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveProfileTenantId(t.tenantId)}
                            className="h-7 px-2 text-[10px] font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]"
                            title="View Full Profile & Ledger"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {locale === "bn" ? "প্রোফাইল" : "Profile"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB SUB 2: FULL LEDGER TIMELINE */}
      {activeTabSub === "ledger" && (
        <div className="rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000] overflow-hidden">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 font-bold">
              {locale === "bn"
                ? "কোনো জামানত লেনদেনের রেকর্ড পাওয়া যায়নি।"
                : "No deposit ledger records found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-bold">
                <thead className="bg-[#FED734] border-b-2 border-black text-black font-black uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">দোকান ও ভাড়াটিয়া</th>
                    <th className="p-3">ধরন</th>
                    <th className="p-3">মাধ্যম ও ব্যাংক</th>
                    <th className="p-3 text-right">পরিমাণ (Signed)</th>
                    <th className="p-3 text-right">রানিং স্থিতি</th>
                    <th className="p-3">গৃহীতা / প্রদানকারী</th>
                    <th className="p-3">বিবরণ / রেফারেন্স</th>
                    <th className="p-3 text-center">স্ট্যাটাস</th>
                    {isAdmin && <th className="p-3 text-right">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                  {filteredTransactions.map((tx: any) => {
                    const isCredit =
                      tx.type === "RECEIVED" ||
                      tx.type === "TOPUP" ||
                      (tx.type === "REVERSAL" && tx.signedAmount > 0);
                    const isDebit =
                      tx.type === "REFUND" ||
                      tx.type === "ADJUSTED_TO_DUE" ||
                      tx.type === "DEDUCTION" ||
                      (tx.type === "REVERSAL" && tx.signedAmount < 0);

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-[#FED734]/10 transition-colors"
                      >
                        <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(tx.transactionDate, locale)}
                        </td>

                        <td className="p-3">
                          <span className="font-black text-black dark:text-white block">
                            {tx.shop?.shopNumber}
                          </span>
                          <span className="text-[11px] text-gray-600 dark:text-gray-400">
                            {tx.tenant?.name}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black shadow-[1px_1px_0px_#000000] ${
                              tx.type === "RECEIVED"
                                ? "bg-[#E6F8F2] text-[#00875A]"
                                : tx.type === "TOPUP"
                                ? "bg-[#E0F2FE] text-[#0369A1]"
                                : tx.type === "REFUND"
                                ? "bg-[#FFEBEF] text-[#FF4B55]"
                                : tx.type === "ADJUSTED_TO_DUE"
                                ? "bg-[#FEF3C7] text-[#B45309]"
                                : tx.type === "DEDUCTION"
                                ? "bg-[#FFEDD5] text-[#C2410C]"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-bold text-black dark:text-white block">
                            {tx.method}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[120px] block">
                            {tx.paymentAccount?.name_bn ||
                              tx.paymentAccount?.name_en ||
                              tx.bankName ||
                              "—"}
                          </span>
                        </td>

                        <td
                          className={`p-3 text-right font-mono font-black text-sm whitespace-nowrap ${
                            isCredit ? "text-[#00BA88]" : "text-[#FF4B55]"
                          }`}
                        >
                          {isCredit ? "+" : "-"} {formatCurrency(tx.amount, locale)}
                        </td>

                        <td className="p-3 text-right font-mono font-black text-sm text-black dark:text-white whitespace-nowrap">
                          {formatCurrency(tx.runningBalance, locale)}
                        </td>

                        <td className="p-3 text-[11px]">
                          <span className="font-bold text-black dark:text-white block">
                            {tx.counterpartyUser?.name || "Direct / Admin"}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Entered by: {tx.enteredByUser?.name || "Admin"}
                          </span>
                        </td>

                        <td className="p-3 text-xs max-w-xs truncate text-gray-800 dark:text-gray-200">
                          {tx.reason || "—"}
                          {tx.transactionRef && (
                            <span className="block font-mono text-[10px] text-gray-500">
                              Ref: {tx.transactionRef}
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-black shadow-[1px_1px_0px_#000000] ${
                              tx.status === "POSTED"
                                ? "bg-[#E6F8F2] text-[#00BA88]"
                                : tx.status === "PENDING_APPROVAL"
                                ? "bg-[#FEF3C7] text-[#D97706]"
                                : "bg-[#FFEBEF] text-[#FF4B55]"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        {isAdmin && (
                          <td className="p-3 text-right">
                            {tx.status === "POSTED" &&
                              tx.type !== "REVERSAL" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setReversingTxId(tx.id)}
                                  className="h-7 px-2 text-[10px] font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]"
                                >
                                  {locale === "bn" ? "রিভার্স" : "Reverse"}
                                </Button>
                              )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Reversal Confirmation Dialog */}
      {reversingTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 bg-white dark:bg-[#1E1F24] border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000000] space-y-4">
            <div className="flex items-center gap-3 text-[#FF4B55]">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
              <h3 className="text-base font-black text-black dark:text-white">
                {locale === "bn" ? "লেনদেন রিভার্সাল নিশ্চিতকরণ" : "Confirm Entry Reversal"}
              </h3>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed">
              {locale === "bn"
                ? "সতর্কতা: এই এন্ট্রির বিপরীতমুখী (REVERSAL) লেনদেন যুক্ত করা হবে যা ব্যালেন্স ও আর্থিক বিবৃতিতে বিপরীত প্রভাব ফেলবে। কোনো রো কখনো সরাসরি ডিলিট করা হয় না।"
                : "Notice: An opposite append-only REVERSAL entry will be created. Ledger rows are never deleted."}
            </p>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                {locale === "bn" ? "রিভার্সালের কারণ (বাধ্যতামূলক) *" : "Reason for Reversal *"}
              </label>
              <Input
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. ভুলবশত ডাবল এন্ট্রি / টাইপিং ভুল"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t-2 border-black/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReversingTxId(null);
                  setReversalReason("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                isLoading={isReversing}
                onClick={() => handleExecuteReversal(reversingTxId)}
              >
                {locale === "bn" ? "রিভার্সাল নিশ্চিত করুন" : "Confirm Reversal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated Modals */}
      <ReceiveDepositModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedTenantForAction(null);
        }}
        initialTenantId={selectedTenantForAction?.tenantId}
        initialTenantName={selectedTenantForAction?.tenantName}
        initialShopNumber={selectedTenantForAction?.shopNumber}
        initialMarketName={selectedTenantForAction?.marketName}
        onSuccess={(recData) => {
          refetch();
          setActiveDepositReceipt(recData);
        }}
      />

      <RefundDepositModal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setSelectedTenantForAction(null);
        }}
        initialTenantId={selectedTenantForAction?.tenantId}
        initialTenantName={selectedTenantForAction?.tenantName}
        initialShopNumber={selectedTenantForAction?.shopNumber}
        initialMarketName={selectedTenantForAction?.marketName}
        availableBalance={selectedTenantForAction?.currentBalance || 0}
        onSuccess={(refData) => {
          refetch();
          if (refData) {
            setActiveRefundReceipt(refData);
          }
        }}
      />

      {isAdjustModalOpen && selectedTenantForAction && (
        <AdjustAdvanceModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedTenantForAction(null);
          }}
          tenantId={selectedTenantForAction.tenantId}
          tenantName={selectedTenantForAction.tenantName}
          shopNumber={selectedTenantForAction.shopNumber}
          marketName={selectedTenantForAction.marketName}
          advanceBalance={selectedTenantForAction.currentBalance}
          onSuccess={() => {
            refetch();
            triggerRefresh("dashboard");
            triggerRefresh("deposits");
          }}
        />
      )}

      {activeProfileTenantId && (
        <TenantProfileModal
          isOpen={Boolean(activeProfileTenantId)}
          onClose={() => setActiveProfileTenantId(null)}
          tenantId={activeProfileTenantId}
          onRefreshNeeded={() => refetch()}
        />
      )}

      {/* Printable Receipt Modals */}
      <DepositReceiptModal
        isOpen={Boolean(activeDepositReceipt)}
        receipt={activeDepositReceipt}
        onClose={() => setActiveDepositReceipt(null)}
      />

      <DepositRefundReceiptModal
        isOpen={Boolean(activeRefundReceipt)}
        receipt={activeRefundReceipt}
        onClose={() => setActiveRefundReceipt(null)}
      />
    </div>
  );
}
