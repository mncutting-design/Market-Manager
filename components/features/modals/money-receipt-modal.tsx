"use client";

import React, { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  toBanglaDigits,
  numberToWordsBDT,
} from "@/lib/format";
import { Printer, Download, Building2, CheckCircle2, ShieldCheck, X } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

export function MoneyReceiptModal() {
  const { t, locale } = useTranslation();
  const { activeReceipt, setActiveReceipt } = useApp();
  const receiptCardRef = useRef<HTMLDivElement>(null);

  if (!activeReceipt) return null;

  const paidBDT = Math.round((activeReceipt.paidNow || 0) / 100);
  const totalBillBDT = Math.round((activeReceipt.totalBillAmount || 0) / 100);
  const remainingDueBDT = Math.round((activeReceipt.remainingDue || 0) / 100);
  const carryForwardDueBDT = Math.round((activeReceipt.carryForwardDue || 0) / 100);
  const totalPayableBDT = totalBillBDT + carryForwardDueBDT;

  const inWords = numberToWordsBDT(paidBDT, locale);

  /**
   * 1. Ultra-clean isolated print handler:
   * Prints ONLY the real money receipt voucher, completely eliminating
   * modal backdrops, blank margins, or surrounding UI.
   */
  const handlePrintReceipt = () => {
    if (!receiptCardRef.current) {
      window.print();
      return;
    }

    const printContent = receiptCardRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=750");

    if (!printWindow) {
      // Fallback to window.print if popup is blocked
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <title>Money Receipt - ${activeReceipt.receiptNo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          @page {
            size: auto;
            margin: 10mm 15mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Anek Bangla', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-paper {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 4px double #000000;
            padding: 24px 28px;
            background: #ffffff;
            position: relative;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .font-mono { font-family: monospace; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .items-end { align-items: flex-end; }
          .grid { display: grid; }
          .grid-2 { grid-template-columns: 1fr 1fr; gap: 12px; }
          .grid-3 { grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .border-b { border-bottom: 1px solid #000000; }
          .border-b-dotted { border-bottom: 1px dotted #444444; }
          .table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 14px; }
          .table th, .table td { border: 1px solid #000000; padding: 6px 10px; font-size: 13px; text-align: left; }
          .table th { background-color: #f1f5f9; font-weight: 700; }
          .amount-box {
            display: inline-block;
            border: 2px solid #000000;
            padding: 6px 16px;
            font-size: 18px;
            font-weight: 800;
            background: #fafafa;
            border-radius: 4px;
          }
          .rubber-stamp {
            position: absolute;
            right: 40px;
            top: 210px;
            border: 3px solid #059669;
            color: #059669;
            padding: 8px 18px;
            font-weight: 900;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-radius: 8px;
            transform: rotate(-12deg);
            opacity: 0.85;
            text-align: center;
            pointer-events: none;
          }
          .signature-box {
            text-align: center;
            width: 180px;
          }
          .signature-line {
            border-top: 1px solid #000000;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-paper">
          ${printContent}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  /**
   * 2. Download crisp PDF of the real money receipt:
   */
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Outer security double border
      doc.setLineWidth(0.8);
      doc.setDrawColor(30, 41, 59);
      doc.rect(12, 12, 186, 128);
      doc.setLineWidth(0.3);
      doc.rect(13.5, 13.5, 183, 125);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text((activeReceipt.marketName || "MARKET MANAGER").toUpperCase(), 105, 22, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("COMMERCIAL SPACE RENTAL & PROPERTY MANAGEMENT", 105, 27, { align: "center" });

      // Title Ribbon Box
      doc.setFillColor(241, 245, 249);
      doc.rect(70, 31, 70, 8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("MONEY RECEIPT", 105, 36.5, { align: "center" });

      // Receipt No & Date
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Receipt No: ${activeReceipt.receiptNo}`, 16, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${formatDate(activeReceipt.date, "en")}`, 148, 45);

      // Horizontal separator line
      doc.setDrawColor(180, 180, 180);
      doc.line(16, 48, 192, 48);

      // Details Flow
      let y = 55;
      doc.setFont("helvetica", "bold");
      doc.text("Received with thanks from:", 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${activeReceipt.tenantName} ${activeReceipt.tenantPhone ? `(${activeReceipt.tenantPhone})` : ""}`, 65, y);

      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Shop & Location:", 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Shop No: ${activeReceipt.shopNumber} | Market: ${activeReceipt.marketName}`, 65, y);

      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text("The Sum of (In Words):", 16, y);
      doc.setFont("helvetica", "italic");
      doc.text(numberToWordsBDT(paidBDT, "en"), 65, y);

      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text("On Account of:", 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Shop Rent for ${formatMonth(activeReceipt.billPeriodMonth, "en", activeReceipt.billPeriodYear)}`, 65, y);

      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Payment Mode:", 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${activeReceipt.paymentMethod} ${activeReceipt.reference ? `(Ref: ${activeReceipt.reference})` : ""}`, 65, y);

      // Table Breakdown
      y += 9;
      doc.setFillColor(248, 250, 252);
      doc.rect(16, y, 176, 7, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Total Rent Due", 20, y + 5);
      doc.text("Previous Arrears", 60, y + 5);
      doc.text("Total Payable", 100, y + 5);
      doc.text("Amount Paid", 138, y + 5);
      doc.text("Remaining Due", 168, y + 5);

      y += 7;
      doc.rect(16, y, 176, 8);
      doc.setFont("helvetica", "normal");
      doc.text(`BDT ${totalBillBDT.toLocaleString()}`, 20, y + 5.5);
      doc.text(`BDT ${carryForwardDueBDT.toLocaleString()}`, 60, y + 5.5);
      doc.text(`BDT ${totalPayableBDT.toLocaleString()}`, 100, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(`BDT ${paidBDT.toLocaleString()}`, 138, y + 5.5);
      doc.text(`BDT ${remainingDueBDT.toLocaleString()}`, 168, y + 5.5);

      // Amount Stamp Box
      y += 14;
      doc.rect(16, y, 75, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`AMOUNT: BDT ${paidBDT.toLocaleString()} /-`, 19, y + 7.5);

      // Rubber stamp paid badge
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.6);
      doc.rect(105, y - 2, 40, 12);
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(11);
      doc.text("PAID", 125, y + 6, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);

      // Signatures
      y += 24;
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(20, y, 65, y);
      doc.line(145, y, 190, y);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Tenant's Signature", 42.5, y + 4, { align: "center" });
      doc.text("Authorized Collector", 167.5, y + 4, { align: "center" });

      doc.save(`Money_Receipt_${activeReceipt.receiptNo}.pdf`);
      toast.success(locale === "bn" ? "মানি রিসিট পিডিএফ ডাউনলোড সম্পন্ন!" : "Receipt PDF downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <Dialog
      isOpen={!!activeReceipt}
      onClose={() => setActiveReceipt(null)}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>{locale === "bn" ? "টাকা প্রাপ্তির মূল রশিদ (Money Receipt)" : "Official Money Receipt"}</span>
        </div>
      }
      description={
        locale === "bn"
          ? "আসল বাণিজ্যিক রশিদ। প্রিন্ট অথবা ডাউনলোডে শুধুমাত্র মূল রশিদ অংশটি সংরক্ষিত হবে।"
          : "Commercial physical money receipt. Print or Download exports exclusively the voucher area."
      }
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Printable/Exportable Real Money Receipt Voucher */}
        <div
          ref={receiptCardRef}
          id="real-money-receipt"
          className="real-money-receipt-voucher relative p-6 sm:p-8 bg-white text-slate-950 rounded-xl shadow-lg border-4 border-double border-slate-900 overflow-hidden"
          style={{ fontFamily: "'Anek Bangla', 'Inter', sans-serif" }}
        >
          {/* Watermark Angled Rubber Stamp: PAID */}
          <div className="rubber-stamp-paid absolute right-8 top-44 sm:top-36 border-4 border-emerald-600 text-emerald-700 px-5 py-2 font-black text-xl sm:text-2xl tracking-widest uppercase rounded-xl -rotate-12 opacity-85 select-none pointer-events-none shadow-xs">
            <div className="flex items-center gap-1.5 justify-center">
              <CheckCircle2 className="w-6 h-6 stroke-[3]" />
              <span>PAID</span>
            </div>
            <p className="text-[10px] font-bold tracking-normal text-center mt-0.5">
              পরিশোধিত • {formatDate(activeReceipt.date, "bn")}
            </p>
          </div>

          {/* Top Header of the Voucher */}
          <div className="text-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                MM
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 uppercase">
                {activeReceipt.marketName || t("common.appName")}
              </h2>
            </div>
            <p className="text-xs text-slate-700 font-medium tracking-wide">
              দোকান ও বাণিজ্যিক স্পেস ভাড়া আদায় শাখা • বাণিজ্যিক মানি রিসিট ভাউচার
            </p>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
              {locale === "bn" ? "হেল্পলাইন: ০১৭০০-০০০০০০ • ঢাকা, বাংলাদেশ" : "Helpline: 01700-000000 • Dhaka, Bangladesh"}
            </p>
          </div>

          {/* Money Receipt Banner Ribbon */}
          <div className="my-3 flex items-center justify-between gap-3 text-xs">
            <div className="border border-slate-900 px-3 py-1 bg-slate-50 font-bold rounded">
              <span className="text-slate-600 mr-1.5">{locale === "bn" ? "রশিদ নং:" : "Receipt No:"}</span>
              <span className="font-mono text-rose-700 font-extrabold text-sm">{activeReceipt.receiptNo}</span>
            </div>

            <div className="px-5 py-1 bg-slate-900 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded shadow-xs">
              {locale === "bn" ? "টাকা প্রাপ্তির রশিদ (MONEY RECEIPT)" : "MONEY RECEIPT"}
            </div>

            <div className="border border-slate-900 px-3 py-1 bg-slate-50 font-bold rounded">
              <span className="text-slate-600 mr-1.5">{locale === "bn" ? "তারিখ:" : "Date:"}</span>
              <span className="font-mono text-slate-900 font-bold">{formatDate(activeReceipt.date, locale)}</span>
            </div>
          </div>

          {/* Physical Voucher Narrative Rows (Classic Fill-in Style) */}
          <div className="space-y-3.5 my-4 text-xs sm:text-sm leading-relaxed text-slate-900">
            {/* Row 1: Tenant */}
            <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-1">
              <span className="font-bold text-slate-700 whitespace-nowrap">
                {locale === "bn" ? "ভাড়াটিয়ার নাম (Received with thanks from):" : "Received with thanks from:"}
              </span>
              <span className="font-extrabold text-slate-950 text-sm sm:text-base flex-1">
                {activeReceipt.tenantName}
              </span>
              {activeReceipt.tenantPhone && (
                <span className="font-mono text-slate-700 font-semibold whitespace-nowrap">
                  (ফোন: {activeReceipt.tenantPhone})
                </span>
              )}
            </div>

            {/* Row 2: Shop & Market */}
            <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-1">
              <span className="font-bold text-slate-700 whitespace-nowrap">
                {locale === "bn" ? "দোকান ও ফ্লোর (Shop & Floor):" : "Shop & Floor:"}
              </span>
              <span className="font-bold text-slate-950 flex-1">
                দোকান নং- {activeReceipt.shopNumber} {activeReceipt.floor ? `(${activeReceipt.floor})` : ""}, মার্কেট: {activeReceipt.marketName}
              </span>
            </div>

            {/* Row 3: Amount in words */}
            <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-1 bg-amber-50/60 p-1.5 rounded">
              <span className="font-bold text-slate-800 whitespace-nowrap">
                {locale === "bn" ? "কথায় (The Sum of):" : "The Sum of (In Words):"}
              </span>
              <span className="font-bold text-slate-950 italic flex-1 capitalize">
                {inWords}
              </span>
            </div>

            {/* Row 4: On account of */}
            <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-1">
              <span className="font-bold text-slate-700 whitespace-nowrap">
                {locale === "bn" ? "যে বাবদ (On Account of):" : "On Account of:"}
              </span>
              <span className="font-bold text-slate-950 flex-1">
                {formatMonth(activeReceipt.billPeriodMonth, locale, activeReceipt.billPeriodYear)}-এর মাসিক দোকান ভাড়া ও আনুষঙ্গিক পরিশোধ
              </span>
            </div>

            {/* Row 5: Payment Method */}
            <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-1">
              <span className="font-bold text-slate-700 whitespace-nowrap">
                {locale === "bn" ? "পরিশোধের মাধ্যম (Payment Mode):" : "Payment Mode:"}
              </span>
              <span className="font-bold text-slate-950">
                {activeReceipt.paymentMethod}
              </span>
              {activeReceipt.reference && (
                <span className="font-mono text-slate-700 ml-2">
                  (ট্রানজেকশন / চেক নং: {activeReceipt.reference})
                </span>
              )}
            </div>
          </div>

          {/* Structured Accounting Table (No Blank Cells) */}
          <div className="my-4 overflow-hidden border-2 border-slate-900 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-900 font-extrabold text-slate-900">
                  <th className="p-2 border-r border-slate-400">{locale === "bn" ? "মোট বিল" : "Current Rent"}</th>
                  <th className="p-2 border-r border-slate-400">{locale === "bn" ? "পূর্বের বকেয়া" : "Previous Arrears"}</th>
                  <th className="p-2 border-r border-slate-400">{locale === "bn" ? "মোট প্রদেয়" : "Total Payable"}</th>
                  <th className="p-2 border-r border-slate-400 bg-emerald-50 text-emerald-950 font-black">
                    {locale === "bn" ? "আদায়ের পরিমাণ" : "Amount Paid"}
                  </th>
                  <th className="p-2 text-rose-950 bg-rose-50 font-black">{locale === "bn" ? "অবশিষ্ট বকেয়া" : "Remaining Due"}</th>
                </tr>
              </thead>
              <tbody className="font-bold text-slate-950">
                <tr>
                  <td className="p-2.5 border-r border-slate-300 font-mono">{formatCurrency(activeReceipt.totalBillAmount, locale)}</td>
                  <td className="p-2.5 border-r border-slate-300 font-mono">
                    {formatCurrency(activeReceipt.carryForwardDue || 0, locale)}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 font-mono">
                    {formatCurrency(
                      (activeReceipt.totalBillAmount || 0) + (activeReceipt.carryForwardDue || 0),
                      locale
                    )}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 bg-emerald-50/80 font-mono text-emerald-800 text-sm font-black">
                    {formatCurrency(activeReceipt.paidNow, locale)}
                  </td>
                  <td className="p-2.5 font-mono text-rose-700 bg-rose-50/80 text-sm font-black">
                    {formatCurrency(activeReceipt.remainingDue, locale)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Bar: Amount Stamp Box & Collector Notes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="inline-flex items-center gap-2 border-2 border-slate-900 bg-slate-50 px-4 py-2 rounded-lg font-black text-slate-950 text-base sm:text-lg shadow-2xs">
              <span className="text-xs font-bold text-slate-600">{locale === "bn" ? "অংকে টাকা:" : "AMOUNT:"}</span>
              <span className="font-mono text-emerald-700 tracking-tight">
                {formatCurrency(activeReceipt.paidNow, locale)} /-
              </span>
            </div>

            <div className="text-right text-[11px] text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">{locale === "bn" ? "আদায়কারী:" : "Received By:"} </span>
                <span className="font-bold text-slate-950">{activeReceipt.receivedBy || "Admin / Manager"}</span>
              </p>
              {activeReceipt.note && (
                <p className="italic text-slate-500 max-w-xs truncate">{activeReceipt.note}</p>
              )}
            </div>
          </div>

          {/* Official Signatures Footer */}
          <div className="pt-14 pb-2 flex items-end justify-between text-xs">
            <div className="text-center w-40">
              <div className="border-t-2 border-slate-800 pt-1 font-bold text-slate-900">
                {locale === "bn" ? "ভাড়াটিয়ার স্বাক্ষর" : "Tenant's Signature"}
              </div>
            </div>

            <div className="text-center w-48">
              <div className="border-t-2 border-slate-800 pt-1 font-extrabold text-slate-950">
                {locale === "bn" ? "আদায়কারী / অনুমোদিত স্বাক্ষর" : "Authorized Signature"}
              </div>
            </div>
          </div>

          {/* Security Sub-Notice */}
          <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {locale === "bn"
                  ? "* এটি একটি স্বয়ংক্রিয় কম্পিউটার জেনারেটেড মানি রিসিট ভাউচার। কোনো কাটাকাটি ছাড়া গ্রহণযোগ্য।"
                  : "* Computer generated official commercial money receipt voucher. Valid without alteration."}
              </span>
            </span>
            <span className="font-mono">{activeReceipt.receiptNo}</span>
          </div>
        </div>

        {/* Modal Controls (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 no-print border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>
              {locale === "bn"
                ? "প্রিন্ট ও ডাউনলোডে শুধুমাত্র মূল মানি রিসিট অংশটি অন্তর্ভুক্ত হবে।"
                : "Print & Download exports strictly the money receipt voucher area."}
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => setActiveReceipt(null)}>
              {t("common.close")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" />
              {locale === "bn" ? "পিডিএফ ডাউনলোড" : "Download PDF"}
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrintReceipt}>
              <Printer className="w-4 h-4 mr-1.5" />
              {locale === "bn" ? "রশিদ প্রিন্ট করুন" : "Print Receipt"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
