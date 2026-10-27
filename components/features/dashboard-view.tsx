"use client";

import React, { useEffect, useState } from "react";
import { useRealtimeData } from "@/lib/realtime-sync";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatMonth,
  toBanglaDigits,
} from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Receipt,
  Building2,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  PlusCircle,
  CheckCircle,
  Layers,
  RotateCcw,
  DoorOpen,
  ShieldAlert,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { AdjustAdvanceModal } from "./modals/adjust-advance-modal";
import { SettlementWizardModal } from "./modals/settlement-wizard-modal";
import { TenantProfileModal } from "./modals/tenant-profile-modal";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export function DashboardView() {
  const { t, locale } = useTranslation();
  const {
    selectedMarketId,
    selectedMonth,
    selectedYear,
    refreshKey,
    markets,
    refreshMarkets,
    triggerRefresh,
    openQuickCollect,
    openAddExpense,
    openGenerateBills,
    setActiveTab,
    isAdmin,
  } = useApp();

  const [mounted, setMounted] = useState(false);
  const [selectedAdjustTenant, setSelectedAdjustTenant] = useState<any | null>(null);
  const [activeSettlementTenantId, setActiveSettlementTenantId] = useState<string | null>(null);
  const [activeProfileTenantId, setActiveProfileTenantId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dashboardUrl = `/api/dashboard?marketId=${selectedMarketId}&month=${selectedMonth}&year=${selectedYear}`;
  const { data, isLoading, isSyncing, refetch } = useRealtimeData<any>(dashboardUrl, {
    tag: "dashboard",
    refreshInterval: 12000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  const {
    kpis,
    dueShops,
    expensesByCategory,
    monthlyTrends,
    marketRankings,
    mostProfitableMarket,
    collectionsByChannel = {},
    collectionsByCollector = [],
  } = data;

  const collectionPercent = Math.round(kpis.collectionRate || 0);

  // Recharts custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-[#1E1F24] border-2 border-black rounded-xl shadow-[3px_3px_0px_#000000] text-xs space-y-1">
          <p className="font-black text-black dark:text-white">
            {formatMonth(Number(label), locale, selectedYear)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="font-black">
              {entry.name}: {locale === "bn" ? toBanglaDigits(entry.value) : entry.value} ৳
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E1F24] text-black dark:text-white border-2 border-black shadow-[4px_4px_0px_#000000]">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-black dark:text-white tracking-tight">
            {t("dashboard.title")}
          </h2>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
            {formatMonth(selectedMonth, locale, selectedYear)} — {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => openQuickCollect()}
            className="font-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Wallet className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("dashboard.quickCollect")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openGenerateBills()}
            className="font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Receipt className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("dashboard.generateBills")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openAddExpense()}
            className="font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <PlusCircle className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("dashboard.addExpense")}
          </Button>
        </div>
      </div>

      {/* Demo Seed Banner if database is empty */}
      {markets.length === 0 && (
        <div className="p-4 rounded-2xl bg-[#FED734]/20 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-black">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-black shrink-0 stroke-[2.5]" />
            <div>
              <p className="text-sm font-black text-black">
                {locale === "bn"
                  ? "ডাটাবেসে কোনো মার্কেট পাওয়া যায়নি।"
                  : "No markets found in your database yet."}
              </p>
              <p className="text-xs text-gray-700 font-bold">
                {locale === "bn"
                  ? "৩টি ডেমো মার্কেট, ৬০টি দোকান, ভাড়াটিয়া ও বিলিং ডেটা এক ক্লিকে লোড করতে নিচের বাটনে চাপ দিন:"
                  : "Click to populate 3 rental markets, 60 shops, tenants, and bills in 1 click:"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              try {
                toast.loading(locale === "bn" ? "ডেমো ডেটা লোড হচ্ছে..." : "Loading demo data...");
                const res = await fetch("/api/seed", { method: "POST" });
                if (res.ok) {
                  toast.success(locale === "bn" ? "ডেমো ডেটা সফলভাবে লোড হয়েছে!" : "Demo data loaded successfully!");
                  await refreshMarkets();
                  triggerRefresh();
                  window.location.reload();
                } else {
                  toast.error("Failed to seed data");
                }
              } catch (e) {
                toast.error("Failed to seed data");
              }
            }}
            className="font-black text-xs shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
            {locale === "bn" ? "ডেমো ডেটা লোড করুন" : "Load Demo Data"}
          </Button>
        </div>
      )}

      {/* Pending Approvals Urgent Banner */}
      {kpis.pendingApprovalsCount > 0 && isAdmin && (
        <div
          onClick={() => setActiveTab("approvals")}
          className="p-3.5 sm:p-4 rounded-2xl bg-[#FFEBEF] border-2 border-[#FFA2B2] shadow-[3px_3px_0px_#FF4B55] flex items-center justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#FF4B55] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#FF4B55]">
              <ShieldAlert className="w-5 h-5 text-[#FF4B55] stroke-[2.5]" />
            </div>
            <div>
              <p className="text-sm font-black text-[#FF4B55]">
                {locale === "bn"
                  ? `${toBanglaDigits(kpis.pendingApprovalsCount)}টি অনুমোদন অপেক্ষমাণ রয়েছে`
                  : `${kpis.pendingApprovalsCount} Pending Approvals Require Attention`}
              </p>
              <p className="text-xs text-gray-700 font-bold">
                {locale === "bn"
                  ? kpis.pendingDepositRefundsCount > 0
                    ? `জামানত ফেরত (${toBanglaDigits(kpis.pendingDepositRefundsCount)}টি), ভাড়াটিয়া তথ্য পরিবর্তন বা টপ-আপ আবেদন অনুমোদন করতে ক্লিক করুন।`
                    : "ভাড়াটিয়া তথ্য পরিবর্তন অথবা জামানত জমা (টপ-আপ) আবেদন অনুমোদন বা বাতিল করতে ক্লিক করুন।"
                  : kpis.pendingDepositRefundsCount > 0
                    ? `Review ${kpis.pendingDepositRefundsCount} pending deposit refund(s), tenant edits, or top-up requests.`
                    : "Review pending tenant edits and advance deposit top-up requests."}
              </p>
            </div>
          </div>
          <Button size="sm" variant="destructive" className="shrink-0 h-8 text-xs font-black">
            {locale === "bn" ? "অনুমোদন করুন" : "Review Now"}
            <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />
          </Button>
        </div>
      )}

      {/* 7 Key Performance Indicators (KPI Cards) - 100% Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
        {/* 1. Expected Rent */}
        <div
          onClick={() => setActiveTab("billing")}
          className="bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{t("dashboard.expectedRent")}</span>
            <Building2 className="w-4 h-4 stroke-[2.5] text-black dark:text-white shrink-0" />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-black dark:text-white truncate" title={formatCurrency(kpis.expectedRent, locale)}>
              {formatCurrency(kpis.expectedRent, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span className="truncate">
              {locale === "bn" ? toBanglaDigits(kpis.totalBillsCount) : kpis.totalBillsCount} {t("reports.shopCount")}
            </span>
            <span className="font-extrabold text-[#00BCD4]">{locale === "bn" ? "নির্ধারিত" : "Target"}</span>
          </div>
        </div>

        {/* 2. Collected Rent */}
        <div
          onClick={() => setActiveTab("billing")}
          className="bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{t("dashboard.collectedRent")}</span>
            <CheckCircle className="w-4 h-4 stroke-[2.5] text-[#00BA88] shrink-0" />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-black dark:text-white truncate" title={formatCurrency(kpis.collectedRent, locale)}>
              {formatCurrency(kpis.collectedRent, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span className="truncate">
              {locale === "bn" ? toBanglaDigits(kpis.paidShopsCount) : kpis.paidShopsCount} {t("status.paid")}
            </span>
            <span className="font-black text-[#00BA88]">{locale === "bn" ? "আদায়কৃত" : "Paid"}</span>
          </div>
        </div>

        {/* 3. Total Due */}
        <div
          onClick={() => setActiveTab("dues")}
          className="bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{t("dashboard.totalDue")}</span>
            <AlertCircle className="w-4 h-4 stroke-[2.5] text-[#FF4B55] shrink-0" />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-[#FF4B55] truncate" title={formatCurrency(kpis.totalDue, locale)}>
              {formatCurrency(kpis.totalDue, locale)}
            </div>
            {kpis.priorArrears > 0 && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold truncate mt-0.5">
                {locale === "bn"
                  ? `চলতি: ${formatCurrency(kpis.currentMonthDue || 0, locale)} + পূর্বের: ${formatCurrency(kpis.priorArrears, locale)}`
                  : `Cur: ${formatCurrency(kpis.currentMonthDue || 0, locale)} + Prior: ${formatCurrency(kpis.priorArrears, locale)}`}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span className="truncate">
              {locale === "bn"
                ? toBanglaDigits(kpis.dueShopsCount + kpis.partialShopsCount)
                : kpis.dueShopsCount + kpis.partialShopsCount}{" "}
              {t("status.due")}
            </span>
            <span className="font-black text-[#FF4B55]">{locale === "bn" ? "বকেয়া" : "Arrears"}</span>
          </div>
        </div>

        {/* 4. Total Expense */}
        <div
          onClick={() => setActiveTab("expenses")}
          className="bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{t("dashboard.totalExpense")}</span>
            <TrendingDown className="w-4 h-4 stroke-[2.5] text-[#F59E0B] shrink-0" />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-black dark:text-white truncate" title={formatCurrency(kpis.totalExpense, locale)}>
              {formatCurrency(kpis.totalExpense, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span className="truncate">{t("nav.expenses")}</span>
            <span className="font-black text-[#F59E0B]">{locale === "bn" ? "ব্যয়" : "Cost"}</span>
          </div>
        </div>

        {/* 5. Net Profit */}
        <div
          onClick={() => setActiveTab("reports")}
          className="bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{t("dashboard.netProfit")}</span>
            <TrendingUp className="w-4 h-4 stroke-[2.5] text-[#00BA88] shrink-0" />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-[#00BA88] truncate" title={formatCurrency(kpis.netProfit, locale)}>
              {formatCurrency(kpis.netProfit, locale)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span className="truncate">{t("reports.netIncome")}</span>
            <span className="font-black text-[#00BA88]">{locale === "bn" ? "লাভ" : "Profit"}</span>
          </div>
        </div>

        {/* 6. Collection Rate */}
        <div
          onClick={() => setActiveTab("dues")}
          className="bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{t("dashboard.collectionRate")}</span>
            <Layers className="w-4 h-4 stroke-[2.5] text-black dark:text-white shrink-0" />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-black dark:text-white truncate">
              {formatPercent(kpis.collectionRate, locale)}
            </div>
          </div>
          <div className="border-t-2 border-black/10 dark:border-white/10 pt-2">
            <div className="w-full bg-[#F4F1EA] dark:bg-[#262830] border border-black h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-[#FED734] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectionPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 7. Total Deposit Held (Liability) - Full width on 2-col mobile */}
        <div
          onClick={() => setActiveTab("deposits")}
          className="col-span-2 sm:col-span-1 lg:col-span-1 bg-white dark:bg-[#1E1F24] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black uppercase tracking-wider text-black dark:text-gray-200">
            <span className="truncate">{locale === "bn" ? "জামানত স্থিতি" : "Deposit Held"}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#FED734] text-black border border-black shadow-[1px_1px_0px_#000000]">
              Liability
            </span>
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-black dark:text-white truncate" title={formatCurrency(kpis.depositHeld ?? kpis.totalAdvanceHeld ?? 0, locale)}>
              {formatCurrency(kpis.depositHeld ?? kpis.totalAdvanceHeld ?? 0, locale)}
            </div>
            {kpis.depositMovement && (kpis.depositMovement.received > 0 || kpis.depositMovement.refunded > 0 || kpis.depositMovement.used > 0) ? (
              <p className="text-[10px] text-gray-700 dark:text-gray-400 font-bold truncate mt-0.5">
                <span className="text-[#00BA88]">+{formatCurrency(kpis.depositMovement.received, locale)}</span>
                {" / "}
                <span className="text-[#FF4B55]">-{formatCurrency(kpis.depositMovement.refunded + kpis.depositMovement.used, locale)}</span>
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                {locale === "bn" ? "এ মাসে অপরিবর্তিত" : "No change this mo"}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-400 font-bold border-t-2 border-black/10 dark:border-white/10 pt-2">
            <span className="truncate">{locale === "bn" ? "লেজার দেখুন" : "View Ledger"}</span>
            <span className="font-black text-[#00BCD4]">{locale === "bn" ? "জামানত" : "Deposit"}</span>
          </div>
        </div>
      </div>

      {/* Monthly Collection Progress Bar & Summary */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-black text-black dark:text-white">
              {t("dashboard.monthlyOverview")}
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold mt-0.5">
              {t("dashboard.paidVsDueSummary", {
                paid: locale === "bn" ? toBanglaDigits(kpis.paidShopsCount) : kpis.paidShopsCount,
                total: locale === "bn" ? toBanglaDigits(kpis.totalBillsCount) : kpis.totalBillsCount,
                percent: locale === "bn" ? toBanglaDigits(collectionPercent) : collectionPercent,
              })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("dues")} className="font-black">
            {t("dashboard.viewAllDues", {
              count: locale === "bn" ? toBanglaDigits(kpis.dueShopsCount) : kpis.dueShopsCount,
            })}
            <ArrowRight className="w-4 h-4 ml-1.5 stroke-[2.5]" />
          </Button>
        </div>

        {/* Progress bar with paid / partial / due sections */}
        <div className="w-full h-4 bg-gray-900 border-2 border-black rounded-full overflow-hidden p-0.5 shadow-[1.5px_1.5px_0px_#000000] flex">
          <div
            className="bg-[#00BA88] h-full transition-all"
            style={{ width: `${(kpis.paidShopsCount / Math.max(1, kpis.totalBillsCount)) * 100}%` }}
            title={`${kpis.paidShopsCount} Paid`}
          />
          <div
            className="bg-[#F59E0B] h-full transition-all"
            style={{ width: `${(kpis.partialShopsCount / Math.max(1, kpis.totalBillsCount)) * 100}%` }}
            title={`${kpis.partialShopsCount} Partial`}
          />
          <div
            className="bg-[#FF4B55] h-full transition-all"
            style={{ width: `${(kpis.dueShopsCount / Math.max(1, kpis.totalBillsCount)) * 100}%` }}
            title={`${kpis.dueShopsCount} Due`}
          />
        </div>

        <div className="flex items-center gap-4 text-xs mt-3 text-black dark:text-white font-black">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#00BA88] border border-black shadow-[1px_1px_0px_#000000]" />
            {t("status.paid")}: {locale === "bn" ? toBanglaDigits(kpis.paidShopsCount) : kpis.paidShopsCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-black shadow-[1px_1px_0px_#000000]" />
            {t("status.partial")}: {locale === "bn" ? toBanglaDigits(kpis.partialShopsCount) : kpis.partialShopsCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF4B55] border border-black shadow-[1px_1px_0px_#000000]" />
            {t("status.due")}: {locale === "bn" ? toBanglaDigits(kpis.dueShopsCount) : kpis.dueShopsCount}
          </span>
        </div>
      </div>

      {/* Main Grid: Pending Dues & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Due Shops List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* At-Risk Tenants Alert Card */}
          {data.atRiskTenants && data.atRiskTenants.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FFEBEF] dark:bg-[#2C1417] border-2 border-[#FFA2B2] dark:border-[#FF4B55] shadow-[3px_3px_0px_#FF4B55]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-[#FF4B55] text-[#FF4B55] flex items-center justify-center shadow-[1.5px_1.5px_0px_#FF4B55] shrink-0">
                    <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#FF4B55] flex items-center gap-2">
                      <span>{t("alerts.atRiskTitle")}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FF4B55] text-white border border-black shadow-[1px_1px_0px_#000000]">
                        {locale === "bn" ? toBanglaDigits(data.atRiskTenants.length) : data.atRiskTenants.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-800 dark:text-gray-300 font-bold">
                      {t("alerts.atRiskSubtitle")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.atRiskTenants.slice(0, 4).map((item: any) => (
                  <div
                    key={item.tenantId}
                    onClick={() => setActiveProfileTenantId(item.tenantId)}
                    className="p-3.5 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div>
                        <p className="font-black text-xs text-black dark:text-white group-hover:underline">
                          {item.tenantName}
                        </p>
                        <p className="text-[11px] text-gray-700 dark:text-gray-400 font-bold">
                          {item.shopNumber} ({item.marketName})
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-black shadow-[1px_1px_0px_#000000] ${
                          item.riskLevel === "CRITICAL"
                            ? "bg-[#FF4B55] text-white"
                            : "bg-[#FED734] text-black"
                        }`}
                      >
                        {item.riskLevel === "CRITICAL" ? t("alerts.criticalBadge") : t("alerts.warningBadge")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] py-1 border-t-2 border-black/10 dark:border-white/10">
                      <div>
                        <span className="text-gray-700 dark:text-gray-400 font-bold">{t("dashboard.totalDue")}: </span>
                        <span className="font-black text-[#FF4B55]">
                          {formatCurrency(item.totalDue, locale)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-700 dark:text-gray-400 font-bold">{t("advance.title")}: </span>
                        <span className="font-black text-[#00BCD4]">
                          {formatCurrency(item.advanceBalance, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 flex items-center justify-between gap-1.5 border-t-2 border-black/10 dark:border-white/10">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2 font-black"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdjustTenant({
                            tenantId: item.tenantId,
                            tenantName: item.tenantName,
                            shopNumber: item.shopNumber,
                            advanceBalance: item.advanceBalance,
                            totalDue: item.totalDue,
                          });
                        }}
                      >
                        {t("alerts.adjustAction")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[10px] px-2 font-black"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSettlementTenantId(item.tenantId);
                        }}
                      >
                        {t("alerts.settleAction")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-black dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF4B55] stroke-[2.5]" />
              <span>{t("dashboard.dueShopsList")}</span>
            </h3>
            <span className="text-xs text-black dark:text-white font-black">
              {locale === "bn" ? toBanglaDigits(dueShops.length) : dueShops.length} {t("reports.shopCount")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dueShops.slice(0, 6).map((shop: any) => (
              <div
                key={shop.billId}
                onClick={() =>
                  openQuickCollect({
                    marketId: shop.marketId || (selectedMarketId !== "ALL" ? selectedMarketId : undefined),
                    shopId: shop.shopId,
                    billId: shop.billId,
                    dueAmount: shop.dueAmount,
                  })
                }
                className="p-4 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-base text-black dark:text-white group-hover:underline">
                        {shop.shopNumber}
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-400 truncate max-w-[170px] font-bold">{shop.marketName}</p>
                    </div>
                    <StatusBadge status={shop.status} />
                  </div>

                  <div className="mt-2 text-xs text-black dark:text-white space-y-0.5">
                    <p className="font-black text-black dark:text-white">{shop.tenantName}</p>
                    <p className="font-bold text-gray-700 dark:text-gray-400">{shop.phone}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-700 dark:text-gray-400 font-bold">{t("common.amount")}: </span>
                    <span className="font-black text-[#FF4B55] text-sm">
                      {formatCurrency(shop.dueAmount, locale)}
                    </span>
                    {shop.carryForwardDue > 0 && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        {locale === "bn" ? "+পূর্বের বকেয়া: " : "+Prior Due: "}
                        {formatCurrency(shop.carryForwardDue, locale)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Call tenant */}
                    <a
                      href={`tel:${shop.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] text-black dark:text-white hover:text-black shadow-[1.5px_1.5px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      title={t("tenants.call")}
                      aria-label="Call tenant"
                    >
                      <Phone className="w-3.5 h-3.5 stroke-[2.5]" />
                    </a>

                    {/* Quick collect button */}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickCollect({
                          marketId: shop.marketId || (selectedMarketId !== "ALL" ? selectedMarketId : undefined),
                          shopId: shop.shopId,
                          billId: shop.billId,
                          dueAmount: shop.dueAmount,
                        });
                      }}
                      className="h-8 px-2.5 text-xs font-black cursor-pointer"
                    >
                      {t("collections.quickCollect")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Profitable Market Insight & Expense Category List */}
        <div className="space-y-4">
          {/* Most Profitable Market Card */}
          {mostProfitableMarket && (
            <div className="p-5 rounded-2xl border-2 border-black bg-[#FED734]/25 dark:bg-[#FED734]/15 shadow-[4px_4px_0px_#000000]">
              <div className="flex items-center gap-2 text-black dark:text-[#FED734] text-xs font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 stroke-[2.5] text-black dark:text-[#FED734]" />
                <span>{t("dashboard.mostProfitableMarket")}</span>
              </div>
              <h4 className="text-lg font-black text-black dark:text-white mt-1">
                {mostProfitableMarket.name}
              </h4>
              <p className="text-xs text-black dark:text-gray-200 font-bold leading-relaxed mt-2">
                {t("dashboard.mostProfitableDesc", {
                  name: mostProfitableMarket.name,
                  amount: formatCurrency(mostProfitableMarket.rawNetProfit, locale),
                })}
              </p>
              <div className="mt-3 pt-2 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-black">
                <span className="text-black dark:text-gray-300">{t("dashboard.collectionRate")}:</span>
                <span className="text-black dark:text-[#FED734] font-black text-sm">
                  {formatPercent(mostProfitableMarket.collectionRate, locale)}
                </span>
              </div>
            </div>
          )}

          {/* Top Expense Categories */}
          <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
            <h4 className="text-sm font-black uppercase tracking-wider text-black dark:text-white mb-3">
              {t("dashboard.topExpenseCategories")}
            </h4>

            {expensesByCategory.length === 0 ? (
              <p className="text-xs text-gray-700 dark:text-gray-400 font-bold">{t("expenses.noExpensesFound")}</p>
            ) : (
              <div className="space-y-3">
                {expensesByCategory.slice(0, 5).map((cat: any) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-black dark:text-white">
                        {locale === "bn" ? cat.name_bn || cat.name_en : cat.name_en || cat.name_bn}
                      </span>
                      <span className="font-black text-black dark:text-white">
                        {formatCurrency(cat.amount, locale)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F4F1EA] dark:bg-[#262830] border border-black h-2 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-[#F59E0B]"
                        style={{
                          width: `${Math.min(100, Math.round(cat.percentage))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collections by Channel & Collector Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Collections by Channel */}
        <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-black text-black dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 stroke-[2.5]" />
                <span>{locale === "bn" ? "পেমেন্ট মাধ্যমভিত্তিক কালেকশন" : "Collections by Payment Method"}</span>
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-400 font-bold mt-0.5">
                {locale === "bn" ? "বর্তমান মাসের আদায়কৃত অর্থের মাধ্যমভিত্তিক বিবরণ" : "Breakdown of rent received by channel this month"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("collections")}
              className="text-xs h-7 font-black"
            >
              {t("nav.collections")}
              <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "CASH", labelBn: "ক্যাশ", labelEn: "Cash" },
              { key: "BKASH", labelBn: "বিকাশ", labelEn: "bKash" },
              { key: "NAGAD", labelBn: "নগদ", labelEn: "Nagad" },
              { key: "BANK", labelBn: "ব্যাংক", labelEn: "Bank" },
              { key: "CHEQUE", labelBn: "চেক", labelEn: "Cheque" },
            ].map((ch) => {
              const item = collectionsByChannel[ch.key] || { amount: 0, count: 0 };
              const percent = kpis.collectedRent > 0 ? Math.round((item.amount / kpis.collectedRent) * 100) : 0;
              return (
                <div
                  key={ch.key}
                  className="p-3 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] shadow-[2px_2px_0px_#000000] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md border border-black bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[1px_1px_0px_#000000]">
                      {locale === "bn" ? ch.labelBn : ch.labelEn}
                    </span>
                    <span className="text-[10px] text-gray-700 dark:text-gray-400 font-bold">
                      {locale === "bn" ? toBanglaDigits(item.count) : item.count} {locale === "bn" ? "টি" : "rcpts"}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className="text-base font-black text-black dark:text-white truncate">
                      {formatCurrency(item.amount, locale)}
                    </p>
                    <div className="mt-1.5 w-full bg-white dark:bg-[#1E1F24] border border-black h-2 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-[#FED734] rounded-full transition-all"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collector Performance */}
        <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-black text-black dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{locale === "bn" ? "কালেকশন স্টাফ পারফরম্যান্স" : "Collector Performance"}</span>
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-400 font-bold mt-0.5">
                {locale === "bn" ? "কে কত টাকা আদায় করেছেন (Received by)" : "Amount collected by staff members this month"}
              </p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("users")}
                className="text-xs h-7 font-black"
              >
                {locale === "bn" ? "স্টাফ ম্যানেজমেন্ট" : "Staff"}
                <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />
              </Button>
            )}
          </div>

          {collectionsByCollector.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-700 dark:text-gray-400 font-bold">
              {locale === "bn" ? "এই মাসে কোনো কালেকশন রেকর্ড পাওয়া যায়নি।" : "No collections recorded this month yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {collectionsByCollector.slice(0, 5).map((col: any) => {
                const percent = kpis.collectedRent > 0 ? Math.round((col.amount / kpis.collectedRent) * 100) : 0;
                return (
                  <div
                    key={col.id}
                    className="p-3 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] shadow-[2px_2px_0px_#000000] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl border-2 border-black bg-[#FED734] text-black font-black text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000000]">
                        {col.name ? col.name.slice(0, 2).toUpperCase() : "ST"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-black dark:text-white truncate">
                          {col.name}
                        </p>
                        <p className="text-[10px] text-gray-700 dark:text-gray-400 font-bold">
                          {locale === "bn" ? toBanglaDigits(col.count) : col.count} {locale === "bn" ? "টি রসিদ আদায়" : "receipts collected"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-black dark:text-white">
                        {formatCurrency(col.amount, locale)}
                      </p>
                      <span className="text-[10px] text-gray-700 dark:text-gray-400 font-bold">
                        {locale === "bn" ? toBanglaDigits(percent) : percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 12-Month Charts Section (Recharts) */}
      {mounted && monthlyTrends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Bar Chart */}
          <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
            <h4 className="text-base font-black text-black dark:text-white mb-1">
              {t("dashboard.incomeVsExpense")}
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold mb-4">
              {selectedYear} — {t("dashboard.yearlyFinancials")}
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => (locale === "bn" ? toBanglaDigits(m) : m)}
                    tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }}
                    className="text-black dark:text-gray-300"
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      locale === "bn" ? toBanglaDigits(Math.round(v / 1000)) + "k" : `${Math.round(v / 1000)}k`
                    }
                    tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }}
                    className="text-black dark:text-gray-300"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(val) =>
                      val === "collected"
                        ? t("dashboard.collectedRent")
                        : val === "expense"
                        ? t("dashboard.totalExpense")
                        : val
                    }
                    wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <Bar dataKey="collected" fill="#00BA88" radius={[4, 4, 0, 0]} name="collected" stroke="#000000" strokeWidth={1.5} />
                  <Bar dataKey="expense" fill="#FF4B55" radius={[4, 4, 0, 0]} name="expense" stroke="#000000" strokeWidth={1.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net Profit Trend Line Chart */}
          <div className="p-5 rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
            <h4 className="text-base font-black text-black dark:text-white mb-1">
              {t("dashboard.profitTrend")}
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold mb-4">
              {selectedYear} — {t("dashboard.profitTrend")}
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => (locale === "bn" ? toBanglaDigits(m) : m)}
                    tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }}
                    className="text-black dark:text-gray-300"
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      locale === "bn" ? toBanglaDigits(Math.round(v / 1000)) + "k" : `${Math.round(v / 1000)}k`
                    }
                    tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }}
                    className="text-black dark:text-gray-300"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={() => t("dashboard.netProfit")}
                    wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#00BCD4"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: "#000000", strokeWidth: 1.5, fill: "#FED734" }}
                    activeDot={{ r: 6, stroke: "#000000", strokeWidth: 2, fill: "#FED734" }}
                    name="profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedAdjustTenant && (
        <AdjustAdvanceModal
          isOpen={!!selectedAdjustTenant}
          onClose={() => setSelectedAdjustTenant(null)}
          tenantId={selectedAdjustTenant.tenantId}
          tenantName={selectedAdjustTenant.tenantName}
          shopNumber={selectedAdjustTenant.shopNumber}
          advanceBalance={selectedAdjustTenant.advanceBalance}
          totalDue={selectedAdjustTenant.totalDue}
          onSuccess={() => {
            triggerRefresh();
            setSelectedAdjustTenant(null);
          }}
        />
      )}

      {activeSettlementTenantId && (
        <SettlementWizardModal
          isOpen={!!activeSettlementTenantId}
          onClose={() => setActiveSettlementTenantId(null)}
          tenantId={activeSettlementTenantId}
          onSettled={() => {
            triggerRefresh();
            setActiveSettlementTenantId(null);
          }}
        />
      )}

      {activeProfileTenantId && (
        <TenantProfileModal
          isOpen={!!activeProfileTenantId}
          onClose={() => setActiveProfileTenantId(null)}
          tenantId={activeProfileTenantId}
          onUpdated={() => triggerRefresh()}
        />
      )}
    </div>
  );
}
