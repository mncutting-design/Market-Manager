"use client";

import React, { useState, useEffect } from "react";
import { useRealtimeData } from "@/lib/realtime-sync";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Wallet, Search, Plus, Printer, CheckCircle2, Phone } from "lucide-react";

export function CollectionsView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, refreshKey, openQuickCollect, showReceipt } = useApp();

  const [search, setSearch] = useState("");

  const queryParams = new URLSearchParams();
  if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
  if (search) queryParams.set("search", search);
  const collectionsUrl = `/api/collections?${queryParams.toString()}`;

  const { data: collectionsData, isLoading, isSyncing, refetch: refetchPayments } = useRealtimeData<{ payments: any[] }>(
    collectionsUrl,
    { tag: "collections", refreshInterval: 12000 }
  );
  const payments = collectionsData?.payments || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{t("collections.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("collections.subtitle")}
          </p>
        </div>

        <Button onClick={() => openQuickCollect()} className="shadow-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          {t("collections.quickCollect")}
        </Button>
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

      {/* Collections List */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : payments.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("collections.noPaymentsFound")}
          </p>
          <Button onClick={() => openQuickCollect()} className="mt-4">
            {t("collections.quickCollect")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const receiptData = {
              receiptNo: `REC-${p.bill.year}${String(p.bill.month).padStart(2, "0")}-${p.id.slice(-6).toUpperCase()}`,
              date: p.paidOn,
              marketName: p.bill.shop.market.name,
              shopNumber: p.bill.shop.shopNumber,
              tenantName: p.bill.tenant.name,
              tenantPhone: p.bill.tenant.phone,
              billPeriodMonth: p.bill.month,
              billPeriodYear: p.bill.year,
              totalBillAmount: p.bill.totalAmount,
              paidNow: p.amount,
              remainingDue: p.bill.dueAmount,
              paymentMethod: p.method,
              reference: p.reference,
              receivedBy: p.receivedBy,
            };

            return (
              <Card
                key={p.id}
                className="p-4 md:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {p.bill.shop.shopNumber}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {p.bill.tenant.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {p.method}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {p.bill.shop.market.name} • {formatDate(p.paidOn, locale)}
                  </p>
                  {p.reference && (
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Ref: {p.reference}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-400">{t("collections.paymentAmount")}</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount, locale)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 text-xs"
                    onClick={() => showReceipt(receiptData)}
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    {t("collections.receipt")}
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
