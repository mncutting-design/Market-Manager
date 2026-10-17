"use client";

import React, { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, toBanglaDigits, formatMonth } from "@/lib/format";
import { Printer, Download, Share2, Building2, CheckCircle2 } from "lucide-react";

export function MoneyReceiptModal() {
  const { t, locale } = useTranslation();
  const { activeReceipt, setActiveReceipt } = useApp();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!activeReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      isOpen={!!activeReceipt}
      onClose={() => setActiveReceipt(null)}
      title={t("receipt.title")}
      description={activeReceipt.receiptNo}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Printable Receipt Card */}
        <div
          ref={receiptRef}
          className="p-6 md:p-8 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {t("common.appName")}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeReceipt.marketName}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold rounded-lg uppercase tracking-wider mb-1">
                {t("receipt.printCopy")}
              </span>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {activeReceipt.receiptNo}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 dark:border-slate-800 text-xs md:text-sm">
            <div>
              <p className="text-slate-500 dark:text-slate-400">{t("receipt.tenantName")}:</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {activeReceipt.tenantName}
              </p>
              {activeReceipt.tenantPhone && (
                <p className="text-slate-500 font-mono text-xs">{activeReceipt.tenantPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-400">{t("receipt.date")}:</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatDate(activeReceipt.date, locale)}
              </p>
            </div>

            <div>
              <p className="text-slate-500 dark:text-slate-400">{t("receipt.shopNumber")}:</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {activeReceipt.shopNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-400">{t("receipt.billPeriod")}:</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatMonth(activeReceipt.billPeriodMonth, locale, activeReceipt.billPeriodYear)}
              </p>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="py-4 border-b border-slate-200 dark:border-slate-800 text-xs md:text-sm space-y-2">
            <div className="flex justify-between py-1">
              <span className="text-slate-600 dark:text-slate-400">{t("receipt.totalPayable")}:</span>
              <span className="font-semibold">{formatCurrency(activeReceipt.totalBillAmount, locale)}</span>
            </div>

            <div className="flex justify-between py-1.5 px-3 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold text-sm md:text-base">
              <span>{t("receipt.amountPaid")} ({activeReceipt.paymentMethod}):</span>
              <span>{formatCurrency(activeReceipt.paidNow, locale)}</span>
            </div>

            <div className="flex justify-between py-1 pt-2">
              <span className="text-slate-600 dark:text-slate-400">{t("receipt.currentDue")}:</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {formatCurrency(activeReceipt.remainingDue, locale)}
              </span>
            </div>
          </div>

          {/* Payment Method / Reference */}
          <div className="py-3 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <div>
              <span>{t("receipt.paymentMethod")}: </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {activeReceipt.paymentMethod}
              </span>
              {activeReceipt.reference && (
                <span className="ml-2">({activeReceipt.reference})</span>
              )}
            </div>
            <div>
              <span>{t("receipt.receivedBy")}: </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {activeReceipt.receivedBy}
              </span>
            </div>
          </div>

          {/* Signature and Greeting */}
          <div className="pt-8 flex items-end justify-between text-xs">
            <div className="text-teal-700 dark:text-teal-400 font-medium">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              {t("receipt.thankYou")}
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 dark:border-slate-600 mb-1" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("receipt.authorizedSignature")}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 no-print">
          <Button variant="outline" onClick={() => setActiveReceipt(null)}>
            {t("common.close")}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            {t("common.print")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
