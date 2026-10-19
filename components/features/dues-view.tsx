"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatMonth, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Phone,
  MessageSquare,
  Mail,
  Wallet,
  Download,
  Search,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { AdjustAdvanceModal } from "./modals/adjust-advance-modal";
import { useRealtimeData } from "@/lib/realtime-sync";

export function DuesView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, refreshKey, openQuickCollect } = useApp();

  const [search, setSearch] = useState("");
  const [selectedAdjustTenant, setSelectedAdjustTenant] = useState<any | null>(null);

  const queryParams = new URLSearchParams();
  if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
  if (search) queryParams.set("search", search);
  const duesUrl = `/api/dues?${queryParams.toString()}`;

  const { data: duesData, isLoading, isSyncing, refetch: fetchDues } = useRealtimeData<any>(
    duesUrl,
    { tag: "dues", refreshInterval: 12000 }
  );

  const handleExportCSV = () => {
    if (!duesData?.dues) return;
    const headers = ["Shop Number", "Market", "Tenant Name", "Phone", "Total Due (BDT)", "Aging Status"];
    const rows = duesData.dues.map((d: any) => [
      d.shopNumber,
      `"${d.marketName}"`,
      `"${d.tenantName}"`,
      d.phone,
      Math.round(d.totalDue / 100),
      d.maxAgingCategory,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dues-list-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || !duesData) {
    return <TableSkeleton rows={6} />;
  }

  const { dues, totalOutstanding, overdueShopsCount, agingBreakdown } = duesData;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <span>{t("dues.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("dues.subtitle")}
          </p>
        </div>

        <Button variant="outline" onClick={handleExportCSV} disabled={dues.length === 0}>
          <Download className="w-4 h-4 mr-1.5" />
          {t("dues.exportDueList")}
        </Button>
      </div>

      {/* KPI Cards: Total Outstanding & Aging Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
            {t("dues.totalOutstanding")}
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
            {formatCurrency(totalOutstanding, locale)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {locale === "bn" ? toBanglaDigits(overdueShopsCount) : overdueShopsCount}{" "}
            {t("reports.shopCount")}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {t("dues.currentMonth")}
          </p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
            {formatCurrency(agingBreakdown.current, locale)}
          </p>
          <p className="text-[11px] text-slate-400">0 - 30 days</p>
        </Card>

        <Card className="p-4 border-amber-200/80 dark:border-amber-900/60">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            {t("dues.oneMonthOverdue")}
          </p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">
            {formatCurrency(agingBreakdown.oneMonth, locale)}
          </p>
          <p className="text-[11px] text-slate-400">31 - 60 days</p>
        </Card>

        <Card className="p-4 border-red-300 dark:border-red-800">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wider">
            {t("dues.threePlusMonthsOverdue")}
          </p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">
            {formatCurrency(agingBreakdown.threePlusMonths, locale)}
          </p>
          <p className="text-[11px] text-slate-400">90+ days</p>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.searchShopsPlaceholder")}
          prefixIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Overdue Shops List */}
      {dues.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("dues.noDues")}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {dues.map((d: any) => {
            // Clean phone for whatsapp link
            const cleanPhone = d.phone.replace(/[^0-9]/g, "");
            const waNumber = cleanPhone.startsWith("0") ? `88${cleanPhone}` : cleanPhone;
            const reminderMessage = encodeURIComponent(
              t("dues.reminderText", {
                tenant: d.tenantName,
                shop: d.shopNumber,
                market: d.marketName,
                amount: formatCurrency(d.totalDue, locale),
              })
            );

            return (
              <Card
                key={`${d.shopId}-${d.tenantId}`}
                onClick={() =>
                  openQuickCollect({
                    marketId: d.marketId,
                    shopId: d.shopId,
                    billId: d.bills[0]?.id,
                    dueAmount: d.totalDue,
                  })
                }
                className="p-5 hover:border-teal-500/60 dark:hover:border-teal-500/60 hover:shadow-md transition-all shadow-xs cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Shop, Tenant and Aging Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {d.shopNumber}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {d.tenantName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.maxAgingCategory === "THREE_PLUS_MONTHS"
                            ? "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200"
                            : d.maxAgingCategory === "TWO_MONTHS"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {d.maxAgingCategory === "THREE_PLUS_MONTHS"
                          ? t("dues.threePlusMonthsOverdue")
                          : d.maxAgingCategory === "TWO_MONTHS"
                          ? t("dues.twoMonthsOverdue")
                          : d.maxAgingCategory === "ONE_MONTH"
                          ? t("dues.oneMonthOverdue")
                          : t("dues.currentMonth")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      {d.marketName} • {d.floor}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {d.phone}
                      </span>
                      <span>•</span>
                      <span>
                        {locale === "bn" ? toBanglaDigits(d.bills.length) : d.bills.length} unpaid invoices
                      </span>
                    </div>
                  </div>

                  {/* Due amount and Communication Links */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left lg:text-right">
                      <p className="text-xs text-slate-400">{t("dues.totalOutstanding")}</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(d.totalDue, locale)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Call */}
                      <a
                        href={`tel:${d.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                        title={t("tenants.call")}
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </a>

                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/${waNumber}?text=${reminderMessage}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                        title={t("tenants.whatsapp")}
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      </a>

                      {/* SMS */}
                      <a
                        href={`sms:${d.phone}?body=${reminderMessage}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                        title={t("tenants.sms")}
                      >
                        <Mail className="w-4 h-4 text-teal-600" />
                      </a>

                      {/* Adjust from Advance */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdjustTenant({
                            tenantId: d.tenantId,
                            tenantName: d.tenantName,
                            shopNumber: d.shopNumber,
                            marketName: d.marketName,
                            totalDue: d.totalDue,
                          });
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        {t("advance.adjustedToDue")}
                      </Button>

                      {/* Collect Payment */}
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-10 px-3 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickCollect({
                            marketId: d.marketId,
                            shopId: d.shopId,
                            billId: d.bills[0]?.id,
                            dueAmount: d.totalDue,
                          });
                        }}
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1" />
                        {t("dashboard.quickCollect")}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Adjust from Advance Modal */}
      {selectedAdjustTenant && (
        <AdjustAdvanceModal
          isOpen={!!selectedAdjustTenant}
          onClose={() => setSelectedAdjustTenant(null)}
          tenantId={selectedAdjustTenant.tenantId}
          tenantName={selectedAdjustTenant.tenantName}
          shopNumber={selectedAdjustTenant.shopNumber}
          marketName={selectedAdjustTenant.marketName}
          initialDueAmount={selectedAdjustTenant.totalDue}
          onSuccess={() => {
            fetchDues();
          }}
        />
      )}
    </div>
  );
}
