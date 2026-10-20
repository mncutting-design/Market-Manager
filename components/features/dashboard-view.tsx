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

  const { kpis, dueShops, expensesByCategory, monthlyTrends, marketRankings, mostProfitableMarket } = data;

  const collectionPercent = Math.round(kpis.collectionRate || 0);

  // Recharts custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg text-xs space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {formatMonth(Number(label), locale, selectedYear)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="font-medium">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-md">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            {t("dashboard.title")}
          </h2>
          <p className="text-xs md:text-sm text-teal-200/90 mt-1">
            {formatMonth(selectedMonth, locale, selectedYear)} — {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="accent"
            onClick={() => openQuickCollect()}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold border-none"
          >
            <Wallet className="w-4 h-4 mr-1.5" />
            {t("dashboard.quickCollect")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openGenerateBills()}
            className="text-white border-white/20 hover:bg-white/10"
          >
            <Receipt className="w-4 h-4 mr-1.5" />
            {t("dashboard.generateBills")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openAddExpense()}
            className="text-white border-white/20 hover:bg-white/10"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            {t("dashboard.addExpense")}
          </Button>
        </div>
      </div>

      {/* Demo Seed Banner if database is empty */}
      {markets.length === 0 && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === "bn"
                  ? "ডাটাবেসে কোনো মার্কেট পাওয়া যায়নি।"
                  : "No markets found in your database yet."}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {locale === "bn"
                  ? "৩টি ডেমো মার্কেট, ৬০টি দোকান, ভাড়াটিয়া ও বিলিং ডেটা এক ক্লিকে লোড করতে নিচের বাটনে চাপ দিন:"
                  : "Click to populate 3 rental markets, 60 shops, tenants, and bills in 1 click:"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
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
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {locale === "bn" ? "ডেমো ডেটা লোড করুন" : "Load Demo Data"}
          </Button>
        </div>
      )}

      {/* 7 Key Performance Indicators (KPI Cards) - 100% Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
        {/* 1. Expected Rent */}
        <Card
          onClick={() => setActiveTab("billing")}
          className="hover:border-teal-500/60 dark:hover:border-teal-500/60 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
              {t("dashboard.expectedRent")}
            </CardDescription>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-slate-900 dark:text-white truncate" title={formatCurrency(kpis.expectedRent, locale)}>
              {formatCurrency(kpis.expectedRent, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 text-[10px] sm:text-xs text-slate-700 dark:text-white flex items-center justify-between font-medium">
            <span className="truncate">
              {locale === "bn" ? toBanglaDigits(kpis.totalBillsCount) : kpis.totalBillsCount}{" "}
              {t("reports.shopCount")}
            </span>
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-teal-400 shrink-0" />
          </CardContent>
        </Card>

        {/* 2. Collected Rent */}
        <Card
          onClick={() => setActiveTab("billing")}
          className="border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">
              {t("dashboard.collectedRent")}
            </CardDescription>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate" title={formatCurrency(kpis.collectedRent, locale)}>
              {formatCurrency(kpis.collectedRent, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between font-medium">
            <span className="truncate">
              {locale === "bn" ? toBanglaDigits(kpis.paidShopsCount) : kpis.paidShopsCount} {t("status.paid")}
            </span>
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          </CardContent>
        </Card>

        {/* 3. Total Due */}
        <Card
          onClick={() => setActiveTab("dues")}
          className="border-red-200/80 dark:border-red-800/60 bg-red-50/30 dark:bg-red-950/20 hover:border-red-400 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 truncate">
              {t("dashboard.totalDue")}
            </CardDescription>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-red-600 dark:text-red-400 truncate" title={formatCurrency(kpis.totalDue, locale)}>
              {formatCurrency(kpis.totalDue, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 text-[10px] sm:text-xs text-red-600 dark:text-red-300 flex items-center justify-between font-medium">
            <span className="truncate">
              {locale === "bn"
                ? toBanglaDigits(kpis.dueShopsCount + kpis.partialShopsCount)
                : kpis.dueShopsCount + kpis.partialShopsCount}{" "}
              {t("status.due")}
            </span>
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
          </CardContent>
        </Card>

        {/* 4. Total Expense */}
        <Card
          onClick={() => setActiveTab("expenses")}
          className="hover:border-amber-400/80 dark:hover:border-amber-400/80 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
              {t("dashboard.totalExpense")}
            </CardDescription>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-amber-600 dark:text-amber-400 truncate" title={formatCurrency(kpis.totalExpense, locale)}>
              {formatCurrency(kpis.totalExpense, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 text-[10px] sm:text-xs text-slate-700 dark:text-white flex items-center justify-between font-medium">
            <span className="truncate">{t("nav.expenses")}</span>
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          </CardContent>
        </Card>

        {/* 5. Net Profit */}
        <Card
          onClick={() => setActiveTab("reports")}
          className="border-teal-200/80 dark:border-teal-700/80 bg-teal-50/40 dark:bg-teal-950/30 hover:border-teal-400 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 truncate">
              {t("dashboard.netProfit")}
            </CardDescription>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-teal-700 dark:text-teal-300 truncate" title={formatCurrency(kpis.netProfit, locale)}>
              {formatCurrency(kpis.netProfit, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 text-[10px] sm:text-xs text-teal-700 dark:text-teal-200 flex items-center justify-between font-medium">
            <span className="truncate">{t("reports.netIncome")}</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" />
          </CardContent>
        </Card>

        {/* 6. Collection Rate */}
        <Card
          onClick={() => setActiveTab("dues")}
          className="hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
              {t("dashboard.collectionRate")}
            </CardDescription>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatPercent(kpis.collectionRate, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectionPercent)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 7. Total Advance Held (Liability) - Full width on 2-col mobile */}
        <Card
          onClick={() => setActiveTab("shops")}
          className="col-span-2 sm:col-span-1 lg:col-span-1 hover:border-teal-400 border-teal-200/80 dark:border-teal-800/60 bg-teal-50/20 dark:bg-teal-950/20 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] group"
        >
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 truncate">
                {t("advance.advanceHeld")}
              </CardDescription>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                Liability
              </span>
            </div>
            <CardTitle className="text-sm sm:text-base md:text-xl font-extrabold text-teal-600 dark:text-teal-300 truncate" title={formatCurrency(kpis.totalAdvanceHeld || 0, locale)}>
              {formatCurrency(kpis.totalAdvanceHeld || 0, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between font-medium">
            <span className="truncate">{t("advance.title")}</span>
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Collection Progress Bar & Summary */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("dashboard.monthlyOverview")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-white font-medium mt-0.5">
              {t("dashboard.paidVsDueSummary", {
                paid: locale === "bn" ? toBanglaDigits(kpis.paidShopsCount) : kpis.paidShopsCount,
                total: locale === "bn" ? toBanglaDigits(kpis.totalBillsCount) : kpis.totalBillsCount,
                percent: locale === "bn" ? toBanglaDigits(collectionPercent) : collectionPercent,
              })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("dues")} className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
            {t("dashboard.viewAllDues", {
              count: locale === "bn" ? toBanglaDigits(kpis.dueShopsCount) : kpis.dueShopsCount,
            })}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        {/* Progress bar with paid / partial / due sections */}
        <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all"
            style={{ width: `${(kpis.paidShopsCount / Math.max(1, kpis.totalBillsCount)) * 100}%` }}
            title={`${kpis.paidShopsCount} Paid`}
          />
          <div
            className="bg-amber-400 h-full transition-all"
            style={{ width: `${(kpis.partialShopsCount / Math.max(1, kpis.totalBillsCount)) * 100}%` }}
            title={`${kpis.partialShopsCount} Partial`}
          />
          <div
            className="bg-red-500 h-full transition-all"
            style={{ width: `${(kpis.dueShopsCount / Math.max(1, kpis.totalBillsCount)) * 100}%` }}
            title={`${kpis.dueShopsCount} Due`}
          />
        </div>

        <div className="flex items-center gap-4 text-xs mt-2.5 text-slate-700 dark:text-white font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {t("status.paid")}: {locale === "bn" ? toBanglaDigits(kpis.paidShopsCount) : kpis.paidShopsCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            {t("status.partial")}: {locale === "bn" ? toBanglaDigits(kpis.partialShopsCount) : kpis.partialShopsCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            {t("status.due")}: {locale === "bn" ? toBanglaDigits(kpis.dueShopsCount) : kpis.dueShopsCount}
          </span>
        </div>
      </Card>

      {/* Main Grid: Pending Dues & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Due Shops List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* At-Risk Tenants Alert Card */}
          {data.atRiskTenants && data.atRiskTenants.length > 0 && (
            <Card className="p-4 border-amber-300 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{t("alerts.atRiskTitle")}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                        {locale === "bn" ? toBanglaDigits(data.atRiskTenants.length) : data.atRiskTenants.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
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
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900/80 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                          {item.tenantName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.shopNumber} ({item.marketName})
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.riskLevel === "CRITICAL"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {item.riskLevel === "CRITICAL" ? t("alerts.criticalBadge") : t("alerts.warningBadge")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] py-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-500">{t("dashboard.totalDue")}: </span>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(item.totalDue, locale)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">{t("advance.title")}: </span>
                        <span className="font-bold text-teal-600 dark:text-teal-400">
                          {formatCurrency(item.advanceBalance, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 flex items-center justify-between gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2"
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
                        className="h-7 text-[10px] px-2"
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
            </Card>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>{t("dashboard.dueShopsList")}</span>
            </h3>
            <span className="text-xs text-slate-700 dark:text-white font-medium">
              {locale === "bn" ? toBanglaDigits(dueShops.length) : dueShops.length} {t("reports.shopCount")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dueShops.slice(0, 6).map((shop: any) => (
              <div
                key={shop.billId}
                onClick={() =>
                  openQuickCollect({
                    marketId: selectedMarketId !== "ALL" ? selectedMarketId : shop.marketId,
                    shopId: shop.shopId,
                    billId: shop.billId,
                    dueAmount: shop.dueAmount,
                  })
                }
                className="p-4 rounded-xl border border-slate-200 dark:border-[#2d3b52] bg-white dark:bg-[#182234] shadow-xs hover:border-teal-500/60 dark:hover:border-teal-500/60 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {shop.shopNumber}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-white/90 truncate max-w-[170px] font-medium">{shop.marketName}</p>
                    </div>
                    <StatusBadge status={shop.status} />
                  </div>

                  <div className="mt-2 text-xs text-slate-700 dark:text-white space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white">{shop.tenantName}</p>
                    <p className="font-mono text-slate-600 dark:text-white/90 font-medium">{shop.phone}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#2d3b52] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-600 dark:text-white font-medium">{t("common.amount")}: </span>
                    <span className="font-extrabold text-red-600 dark:text-red-400 text-sm">
                      {formatCurrency(shop.dueAmount, locale)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Call tenant */}
                    <a
                      href={`tel:${shop.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-white hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t("tenants.call")}
                      aria-label="Call tenant"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    {/* Quick collect button */}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickCollect({
                          marketId: selectedMarketId !== "ALL" ? selectedMarketId : undefined,
                          shopId: shop.shopId,
                          billId: shop.billId,
                          dueAmount: shop.dueAmount,
                        });
                      }}
                      className="h-8 px-2.5 text-xs font-bold"
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
            <Card className="border-teal-300 dark:border-teal-600 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{t("dashboard.mostProfitableMarket")}</span>
                </div>
                <CardTitle className="text-base font-extrabold mt-1 text-slate-900 dark:text-white">
                  {mostProfitableMarket.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-xs text-slate-700 dark:text-white font-medium leading-relaxed">
                  {t("dashboard.mostProfitableDesc", {
                    name: mostProfitableMarket.name,
                    amount: formatCurrency(mostProfitableMarket.rawNetProfit, locale),
                  })}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-white">{t("dashboard.collectionRate")}:</span>
                  <span className="text-teal-700 dark:text-teal-300 font-extrabold">
                    {formatPercent(mostProfitableMarket.collectionRate, locale)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Expense Categories */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {t("dashboard.topExpenseCategories")}
            </h4>

            {expensesByCategory.length === 0 ? (
              <p className="text-xs text-slate-400">{t("expenses.noExpensesFound")}</p>
            ) : (
              <div className="space-y-2.5">
                {expensesByCategory.slice(0, 5).map((cat: any) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {locale === "bn" ? cat.name_bn || cat.name_en : cat.name_en || cat.name_bn}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(cat.amount, locale)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round(cat.percentage))}%`,
                          backgroundColor: cat.color || "#0d9488",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 12-Month Charts Section (Recharts) */}
      {mounted && monthlyTrends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Bar Chart */}
          <Card className="p-5">
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {t("dashboard.incomeVsExpense")}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              {selectedYear} — {t("dashboard.yearlyFinancials")}
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => (locale === "bn" ? toBanglaDigits(m) : m)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      locale === "bn" ? toBanglaDigits(Math.round(v / 1000)) + "k" : `${Math.round(v / 1000)}k`
                    }
                    tick={{ fontSize: 11 }}
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
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="collected" fill="#0d9488" radius={[4, 4, 0, 0]} name="collected" />
                  <Bar dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} name="expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Net Profit Trend Line Chart */}
          <Card className="p-5">
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {t("dashboard.profitTrend")}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              {selectedYear} — {t("dashboard.profitTrend")}
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => (locale === "bn" ? toBanglaDigits(m) : m)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      locale === "bn" ? toBanglaDigits(Math.round(v / 1000)) + "k" : `${Math.round(v / 1000)}k`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={() => t("dashboard.netProfit")}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
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
