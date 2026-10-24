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
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>{t("dues.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-bold mt-1">
            {t("dues.subtitle")}
          </p>
        </div>

        <Button variant="outline" onClick={handleExportCSV} disabled={dues.length === 0} className="font-black border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]">
          <Download className="w-4 h-4 mr-1.5 stroke-[2.5]" />
          {t("dues.exportDueList")}
        </Button>
      </div>

      {/* KPI Cards: Total Outstanding & Aging Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000]">
          <p className="text-xs font-black text-[#FF4B55] dark:text-[#FF6B75] uppercase tracking-wider">
            {t("dues.totalOutstanding")}
          </p>
          <p className="text-xl font-black text-[#FF4B55] dark:text-[#FF6B75] mt-1 font-mono">
            {formatCurrency(totalOutstanding, locale)}
          </p>
          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold mt-0.5">
            {locale === "bn" ? toBanglaDigits(overdueShopsCount) : overdueShopsCount}{" "}
            {t("reports.shopCount")}
          </p>
        </Card>

        <Card className="p-4 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000]">
          <p className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {t("dues.currentMonth")}
          </p>
          <p className="text-lg font-black text-black dark:text-white mt-1 font-mono">
            {formatCurrency(agingBreakdown.current, locale)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">0 - 30 days</p>
        </Card>

        <Card className="p-4 rounded-xl border-2 border-black bg-[#FFF8D6] dark:bg-[#2C2405] shadow-[3px_3px_0px_#000000]">
          <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            {t("dues.oneMonthOverdue")}
          </p>
          <p className="text-lg font-black text-amber-800 dark:text-amber-300 mt-1 font-mono">
            {formatCurrency(agingBreakdown.oneMonth, locale)}
          </p>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-bold">31 - 60 days</p>
        </Card>

        <Card className="p-4 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000]">
          <p className="text-xs font-black text-[#FF4B55] dark:text-[#FF6B75] uppercase tracking-wider">
            {t("dues.threePlusMonthsOverdue")}
          </p>
          <p className="text-lg font-black text-[#FF4B55] dark:text-[#FF6B75] mt-1 font-mono">
            {formatCurrency(agingBreakdown.threePlusMonths, locale)}
          </p>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-bold">90+ days</p>
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
        <Card className="p-12 text-center bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
          <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3 stroke-[2.5]" />
          <p className="text-base font-black text-black dark:text-white">
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
                className="p-5 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0px_#000000] transition-all cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Shop, Tenant and Aging Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-black text-black dark:text-white">
                        {d.shopNumber}
                      </span>
                      <span className="text-xs text-black/40 dark:text-white/40 font-black">•</span>
                      <span className="text-sm font-black text-black dark:text-white">
                        {d.tenantName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[1px_1px_0px_#000000] ${
                          d.maxAgingCategory === "THREE_PLUS_MONTHS"
                            ? "bg-[#FF4B55] text-white"
                            : d.maxAgingCategory === "TWO_MONTHS"
                            ? "bg-[#FED734] text-black"
                            : "bg-[#FFF8D6] text-black"
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

                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">
                      {d.marketName} • {d.floor}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 font-bold mt-2">
                      <span className="font-mono text-black dark:text-white font-bold">
                        {d.phone}
                      </span>
                      <span>•</span>
                      <span>
                        {locale === "bn" ? toBanglaDigits(d.bills.length) : d.bills.length} unpaid invoices
                      </span>
                    </div>
                  </div>

                  {/* Due amount and Communication Links */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t-2 lg:border-t-0 border-black/10 dark:border-white/10">
                    <div className="text-left lg:text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{t("dues.totalOutstanding")}</p>
                      <p className="text-xl font-black text-[#FF4B55] dark:text-[#FF6B75] font-mono">
                        {formatCurrency(d.totalDue, locale)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Call */}
                      <a
                        href={`tel:${d.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] text-black dark:text-white hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] min-h-[40px] min-w-[40px] flex items-center justify-center transition-all cursor-pointer"
                        title={t("tenants.call")}
                      >
                        <Phone className="w-4 h-4 stroke-[2.5]" />
                      </a>

                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/${waNumber}?text=${reminderMessage}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] text-black dark:text-white hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] min-h-[40px] min-w-[40px] flex items-center justify-center transition-all cursor-pointer"
                        title={t("tenants.whatsapp")}
                      >
                        <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                      </a>

                      {/* SMS */}
                      <a
                        href={`sms:${d.phone}?body=${reminderMessage}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] text-black dark:text-white hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] min-h-[40px] min-w-[40px] flex items-center justify-center transition-all cursor-pointer"
                        title={t("tenants.sms")}
                      >
                        <Mail className="w-4 h-4 stroke-[2.5]" />
                      </a>

                      {/* Adjust from Advance */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 text-xs font-black border-2 border-black bg-white dark:bg-[#262830] text-black dark:text-white shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
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
                        <RotateCcw className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                        {t("advance.adjustedToDue")}
                      </Button>

                      {/* Collect Payment */}
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-10 px-3 text-xs font-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
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
                        <Wallet className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
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
