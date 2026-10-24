"use client";

import React, { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, CheckCircle2, ShieldCheck, Building2 } from "lucide-react";
import jsPDF from "jspdf";

interface SettlementStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlementData: {
    id: string;
    settledAt: Date | string;
    tenantName: string;
    phone: string;
    nid?: string | null;
    shopNumber: string;
    floor: string;
    marketName: string;
    marketAddress?: string | null;
    totalDue: number; // in paisa
    advanceBalance: number; // in paisa
    totalDeductions: number; // in paisa
    refundAmount: number; // in paisa
    unrecoveredAmount: number; // in paisa
    deductions?: { label_en: string; label_bn: string; amount: number; note?: string }[];
    policyVersionNumber?: number;
    notes?: string | null;
    confirmedBy?: string;
  } | null;
}

export function SettlementStatementModal({
  isOpen,
  onClose,
  settlementData,
}: SettlementStatementModalProps) {
  const { t, locale } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  if (!settlementData) return null;

  const {
    id,
    settledAt,
    tenantName,
    phone,
    nid,
    shopNumber,
    floor,
    marketName,
    marketAddress,
    totalDue,
    advanceBalance,
    totalDeductions,
    refundAmount,
    unrecoveredAmount,
    deductions = [],
    policyVersionNumber = 1,
    notes,
    confirmedBy = "Admin",
  } = settlementData;

  const totalLiabilities = totalDue + totalDeductions;
  const isRefund = refundAmount > 0;
  const isUnrecovered = unrecoveredAmount > 0;
  const isExact = !isRefund && !isUnrecovered;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Simple clean vector PDF layout
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(marketName, 105, 18, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      if (marketAddress) {
        doc.text(marketAddress, 105, 23, { align: "center" });
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(15, 27, 195, 27);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("FINAL TENANT SETTLEMENT STATEMENT", 105, 34, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Settlement ID: ${id}`, 15, 42);
      doc.text(`Date: ${formatDate(settledAt, "en")}`, 150, 42);

      // Box for Tenant & Shop Info
      doc.rect(15, 46, 180, 24);
      doc.text(`Tenant: ${tenantName}`, 18, 52);
      doc.text(`Phone: ${phone}`, 18, 58);
      if (nid) doc.text(`NID: ${nid}`, 18, 64);
      doc.text(`Shop: ${shopNumber} (${floor})`, 110, 52);
      doc.text(`Market: ${marketName}`, 110, 58);
      doc.text(`Policy Version: v${policyVersionNumber}`, 110, 64);

      // Financials Summary Table
      let y = 78;
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL ACCOUNTING SUMMARY", 15, y);
      y += 6;

      doc.line(15, y, 195, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text("1. Unpaid Rent & Utility Dues Cleared:", 18, y);
      doc.text(`BDT ${(totalDue / 100).toLocaleString()}`, 160, y);
      y += 6;

      doc.text("2. Property Deductions & Repairs:", 18, y);
      doc.text(`BDT ${(totalDeductions / 100).toLocaleString()}`, 160, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("TOTAL LIABILITIES (1 + 2):", 18, y);
      doc.text(`BDT ${(totalLiabilities / 100).toLocaleString()}`, 160, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.text("3. Security Advance Deposit Held:", 18, y);
      doc.text(`BDT ${(advanceBalance / 100).toLocaleString()}`, 160, y);
      y += 8;

      doc.setDrawColor(50, 50, 50);
      doc.line(15, y, 195, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      if (isRefund) {
        doc.text("NET REFUND DUE TO TENANT:", 18, y);
        doc.text(`BDT ${(refundAmount / 100).toLocaleString()}`, 160, y);
      } else if (isUnrecovered) {
        doc.text("UNRECOVERED RECEIVABLE (UNPAID):", 18, y);
        doc.text(`BDT ${(unrecoveredAmount / 100).toLocaleString()}`, 160, y);
      } else {
        doc.text("SETTLEMENT STATUS:", 18, y);
        doc.text("FULLY SETTLED (EXACT MATCH - 0 BDT)", 110, y);
      }

      // Signatures
      y = 230;
      doc.line(20, y, 80, y);
      doc.line(130, y, 190, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Market Management Signature", 25, y + 5);
      doc.text("Tenant Acceptance Signature", 135, y + 5);

      doc.save(`settlement-statement-${shopNumber}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("settlement.finalStatement")}
      description={`${shopNumber} — ${tenantName}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Printable Paper View */}
        <div
          ref={printRef}
          className="p-6 md:p-8 bg-white dark:bg-[#1E1F24] rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000000] text-black dark:text-white space-y-6"
        >
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4">
            <div className="inline-flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-black dark:text-[#FED734]" />
              <h3 className="text-xl font-black tracking-tight text-black dark:text-white">{marketName}</h3>
            </div>
            {marketAddress && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">{marketAddress}</p>
            )}
            <div className="inline-block mt-3 px-4 py-1 rounded-full bg-[#FED734] text-xs font-black uppercase tracking-widest text-black border-2 border-black shadow-[2px_2px_0px_#000000]">
              {t("settlement.finalStatement")}
            </div>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[3px_3px_0px_#000000] text-xs">
            <div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] font-black uppercase">{t("tenants.tenantName")}</p>
              <p className="font-black text-black dark:text-white mt-0.5">{tenantName}</p>
            </div>
            <div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] font-black uppercase">{t("shops.shopNumber")}</p>
              <p className="font-black text-black dark:text-white mt-0.5">{shopNumber} ({floor})</p>
            </div>
            <div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] font-black uppercase">{t("settlement.settlementDate")}</p>
              <p className="font-black text-black dark:text-white mt-0.5">{formatDate(settledAt, locale)}</p>
            </div>
            <div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] font-black uppercase">{t("settlement.policyVersionUsed")}</p>
              <p className="font-black text-black dark:text-[#FED734] mt-0.5">Version {locale === "bn" ? toBanglaDigits(policyVersionNumber) : policyVersionNumber}</p>
            </div>
          </div>

          {/* Detailed Calculations Breakdown Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
              {locale === "bn" ? "হিসাব ও দায় বিবরণী" : "Account & Liability Breakdown"}
            </h4>

            <div className="rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FED734] border-b-2 border-black font-black text-black">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">{t("common.details")}</th>
                    <th className="p-3 text-right">{t("common.amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 dark:divide-white/10 bg-white dark:bg-[#1E1F24]">
                  <tr>
                    <td className="p-3 text-neutral-500 font-bold">1</td>
                    <td className="p-3 font-bold text-black dark:text-white">
                      {locale === "bn" ? "অনাদায়ী বকেয়া ভাড়া ও চার্জ" : "Unpaid Rent & Utility Dues"}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-black dark:text-white">
                      {formatCurrency(totalDue, locale)}
                    </td>
                  </tr>

                  {/* Deduction items */}
                  {deductions.map((d, i) => (
                    <tr key={i} className="bg-[#FBF9F5] dark:bg-[#262830]">
                      <td className="p-3 text-neutral-500 font-bold">2.{i + 1}</td>
                      <td className="p-3 text-black dark:text-white">
                        <span className="font-bold">{locale === "bn" ? d.label_bn : d.label_en}</span>
                        {d.note && <span className="text-neutral-500 text-[11px] block">{d.note}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-black dark:text-white">
                        {formatCurrency(d.amount, locale)}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-[#FFEBEF] dark:bg-[#2A1417] font-black border-t-2 border-black">
                    <td className="p-3" colSpan={2}>
                      {t("settlement.totalLiabilities")}
                    </td>
                    <td className="p-3 text-right font-mono text-[#FF4B55]">
                      {formatCurrency(totalLiabilities, locale)}
                    </td>
                  </tr>

                  <tr className="bg-[#E6F8F2] dark:bg-[#122A20] font-black border-t-2 border-black/10 dark:border-white/10">
                    <td className="p-3" colSpan={2}>
                      {t("advance.advanceBalance")} ({locale === "bn" ? "প্রদত্ত জামানত" : "Security Advance"})
                    </td>
                    <td className="p-3 text-right font-mono text-[#00BA88]">
                      {formatCurrency(advanceBalance, locale)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Outcome Banner */}
          <div
            className={`p-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isRefund
                ? "bg-[#E6F8F2] dark:bg-[#122A20] text-black dark:text-white"
                : isUnrecovered
                ? "bg-[#FFEBEF] dark:bg-[#2A1417] text-black dark:text-white"
                : "bg-[#FBF9F5] dark:bg-[#262830] text-black dark:text-white"
            }`}
          >
            <div>
              <p className="text-xs uppercase tracking-wider font-black">
                {isRefund
                  ? t("settlement.refundAmount")
                  : isUnrecovered
                  ? t("settlement.unrecoveredAmount")
                  : t("settlement.exactMatch")}
              </p>
              <p className="text-[11px] font-bold opacity-80 mt-0.5">
                {isRefund
                  ? locale === "bn"
                    ? "মার্কেট কর্তৃপক্ষ কর্তৃক ভাড়াটিয়াকে ফেরতযোগ্য টাকা"
                    : "Refundable by market management to tenant"
                  : isUnrecovered
                  ? locale === "bn"
                    ? "জামানত সমন্বয়ের পরও অবশিষ্ট অনাদায়ী পাওনা (মার্কেট পাওনাদার)"
                    : "Unpaid dues exceeding security advance balance"
                  : locale === "bn"
                    ? "জামানত ও বকেয়া সম্পূর্ণ সমপরিমাণে সমন্বিত হয়েছে"
                    : "Total liabilities exactly matched advance balance"}
              </p>
            </div>
            <p className={`text-2xl font-black font-mono shrink-0 ${isRefund ? "text-[#00BA88]" : isUnrecovered ? "text-[#FF4B55]" : "text-black dark:text-white"}`}>
              {isRefund
                ? formatCurrency(refundAmount, locale)
                : isUnrecovered
                ? formatCurrency(unrecoveredAmount, locale)
                : "৳ 0"}
            </p>
          </div>

          {notes && (
            <div className="p-3 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black text-xs text-black dark:text-white shadow-[2px_2px_0px_#000000]">
              <span className="font-black text-black dark:text-white">{t("common.notes")}: </span>
              <span className="font-bold">{notes}</span>
            </div>
          )}

          {/* Signature Lines */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1.5">
              <div className="border-t-2 border-black dark:border-white mx-auto w-3/4"></div>
              <p className="font-black text-black dark:text-white">{t("settlement.ownerSignature")}</p>
              <p className="text-[10px] text-neutral-500 font-bold">Verified by: {confirmedBy}</p>
            </div>
            <div className="space-y-1.5">
              <div className="border-t-2 border-black dark:border-white mx-auto w-3/4"></div>
              <p className="font-black text-black dark:text-white">{t("settlement.tenantSignature")}</p>
              <p className="text-[10px] text-neutral-500 font-bold">{tenantName}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-2.5 pt-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("settlement.printStatement")}
          </Button>
          <Button variant="neo" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("settlement.downloadPdf")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
