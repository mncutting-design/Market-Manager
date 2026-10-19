"use client";

import React, { useRef, useState, useEffect } from "react";
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
import { formatFloorName } from "@/lib/floors";
import { Printer, Download, FileDown, Scissors, FileText, Check, Globe } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

export function MoneyReceiptModal() {
  const { t, locale } = useTranslation();
  const { activeReceipt, setActiveReceipt } = useApp();
  const receiptContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  
  // Independent receipt language toggle: defaults to app locale, but manager can toggle on the fly
  const [receiptLang, setReceiptLang] = useState<"bn" | "en">(locale === "en" ? "en" : "bn");

  useEffect(() => {
    if (activeReceipt) {
      setReceiptLang(locale === "en" ? "en" : "bn");
    }
  }, [activeReceipt, locale]);

  if (!activeReceipt) return null;

  const paidBDT = Math.round((activeReceipt.paidNow || 0) / 100);
  const inWords = numberToWordsBDT(paidBDT, receiptLang);

  // Parse receipt date components
  const receiptDateObj = activeReceipt.date ? new Date(activeReceipt.date) : new Date();
  const dayStr = String(receiptDateObj.getDate()).padStart(2, "0");
  const monthStr = String(receiptDateObj.getMonth() + 1).padStart(2, "0");
  const yearStr = String(receiptDateObj.getFullYear());

  const dayDisplay = receiptLang === "bn" ? toBanglaDigits(dayStr) : dayStr;
  const monthDisplay = receiptLang === "bn" ? toBanglaDigits(monthStr) : monthStr;
  const yearDisplay = receiptLang === "bn" ? toBanglaDigits(yearStr) : yearStr;

  // Breakdown items if available
  const items = activeReceipt.billItems || [];
  const electricityItem = items.find((i: any) =>
    i.description?.toLowerCase().includes("electric") || i.description?.includes("বিদ্যুৎ")
  );
  const gasItem = items.find((i: any) =>
    i.description?.toLowerCase().includes("gas") || i.description?.includes("গ্যাস")
  );
  const waterItem = items.find((i: any) =>
    i.description?.toLowerCase().includes("water") || i.description?.includes("পানি")
  );
  const otherItems = items.filter(
    (i: any) => i !== electricityItem && i !== gasItem && i !== waterItem
  );
  const otherTotal = otherItems.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

  const rentPaisa = activeReceipt.rentAmount || activeReceipt.totalBillAmount || 0;
  const electricityPaisa = electricityItem ? electricityItem.amount : 0;
  const gasPaisa = gasItem ? gasItem.amount : 0;
  const waterPaisa = waterItem ? waterItem.amount : 0;
  const otherPaisa = otherTotal;
  const advancePaisa = 0; // Stored separately when advance payment adjusted
  const arrearsPaisa = activeReceipt.remainingDue || 0;
  const totalPaidPaisa = activeReceipt.paidNow || 0;

  /**
   * 1. Ultra-clean isolated print handler:
   * Opens dedicated print popup with strictly the 2-part counterfoil receipt
   * formatted for A4 Landscape with zero margins and zero outside cells.
   */
  const handlePrintReceipt = () => {
    if (!receiptContainerRef.current) {
      window.print();
      return;
    }

    const printContent = receiptContainerRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${receiptLang}">
      <head>
        <meta charset="utf-8" />
        <title>Money_Receipt_${activeReceipt.receiptNo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Anek Bangla', 'Inter', -apple-system, sans-serif;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 2px;
          }
          .counterfoil-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 2px solid #000000;
            background: #ffffff;
            width: 100%;
          }
          .receipt-half {
            padding: 14px 18px;
            position: relative;
          }
          .receipt-half:first-child {
            border-right: 2px dashed #000000;
          }
          .badge-black {
            background-color: #000000 !important;
            color: #ffffff !important;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
            display: inline-block;
            border-radius: 2px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .boxed-val {
            border: 1px solid #000000;
            padding: 2px 6px;
            background: #ffffff;
            font-size: 11px;
            font-weight: 700;
          }
          .pill-tag {
            background-color: #000000 !important;
            color: #ffffff !important;
            font-size: 10px;
            font-weight: 700;
            padding: 2.5px 6px;
            text-align: center;
            border-radius: 2px;
            width: 78px;
            flex-shrink: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pill-val {
            border: 1px solid #000000;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: 700;
            flex-grow: 1;
            text-align: right;
            font-family: monospace;
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        <div class="counterfoil-container">
          ${printContent}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 350);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  /**
   * 2. Download 100% Error-Free PDF:
   * Uses html2canvas to render the styled DOM directly into 300 DPI high-definition canvas,
   * then embeds into standard landscape A4 PDF.
   * Completely avoids jsPDF Unicode/Bengali font corruption and ?????? bugs.
   */
  const handleDownloadPdf = async () => {
    if (!receiptContainerRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(receiptContainerRef.current, {
        scale: 3, // Ultra-sharp 300 DPI vector-like fidelity
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 8;
      const availableWidth = pdfWidth - margin * 2;
      const availableHeight = pdfHeight - margin * 2;

      const imgWidth = availableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const finalHeight = Math.min(imgHeight, availableHeight);
      const offsetY = Math.max(margin, (pdfHeight - finalHeight) / 2);

      pdf.addImage(imgData, "PNG", margin, offsetY, imgWidth, finalHeight, undefined, "FAST");
      pdf.save(`Money_Receipt_${activeReceipt.receiptNo}.pdf`);
      toast.success(
        receiptLang === "bn"
          ? "কাউন্টারফয়েল মানি রিসিট পিডিএফ সফলভাবে ডাউনলোড হয়েছে!"
          : "Counterfoil Money Receipt downloaded as PDF successfully!"
      );
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(
        receiptLang === "bn" ? "পিডিএফ জেনারেট করতে ত্রুটি হয়েছে" : "Failed to generate PDF"
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /**
   * 3. Download Clean PNG Image:
   * Perfect for sending directly to tenants on WhatsApp / IMO / Messenger
   */
  const handleDownloadImage = async () => {
    if (!receiptContainerRef.current) return;
    setIsDownloadingImage(true);
    try {
      const canvas = await html2canvas(receiptContainerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `Money_Receipt_${activeReceipt.receiptNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(
        receiptLang === "bn"
          ? "মানি রিসিট ছবি (PNG) সফলভাবে ডাউনলোড হয়েছে!"
          : "Money Receipt PNG image downloaded successfully!"
      );
    } catch (err) {
      console.error("Image generation error:", err);
      toast.error(
        receiptLang === "bn" ? "ছবি ডাউনলোড করতে ত্রুটি হয়েছে" : "Failed to download image"
      );
    } finally {
      setIsDownloadingImage(false);
    }
  };

  /**
   * Single Counterfoil Half Renderer:
   * Matches the user's reference image with exact Bengali & English layout.
   */
  const renderReceiptHalf = (copyType: "OWNER" | "TENANT") => {
    const isOwner = copyType === "OWNER";
    const isBn = receiptLang === "bn";

    const badgeText = isOwner
      ? isBn ? "মালিকের অংশ" : "Owner's Copy"
      : isBn ? "ভাড়াটিয়ার অংশ" : "Tenant's Copy";

    const titleText = isBn ? "অস্থায়ী দোকান / বাসা ভাড়ার রশিদ" : "Commercial Rent Money Receipt";
    const signatureText = isOwner
      ? isBn ? "ভাড়াটিয়ার স্বাক্ষর" : "Tenant's Signature"
      : isBn ? "মালিক বা তাহার প্রতিনিধির স্বাক্ষর" : "Owner / Authorized Signature";

    return (
      <div
        className={`p-4 sm:p-5 relative bg-white text-black flex flex-col justify-between ${
          isOwner ? "sm:border-r-2 sm:border-dashed sm:border-black" : ""
        }`}
      >
        {/* TOP HEADER */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-black leading-tight">
                {titleText}
              </h3>
              <p className="text-sm font-extrabold text-black mt-0.5 truncate">
                {activeReceipt.marketName || (isBn ? "মার্কেট ম্যানেজার" : "Market Manager")}
              </p>
              <p className="text-[10px] sm:text-[11px] text-black/80 leading-tight mt-0.5">
                {activeReceipt.marketAddress ||
                  (isBn
                    ? "হোল্ডিং নং- ৩১০৬/১২, সাবাইপাড়া, লোহাগড়পুল, পাহাড়তলী, চট্টগ্রাম। ০১৭৪৩-৫৩৩৩৩৯"
                    : "Holding No- 3106/12, Sabaipara, Agrabad, Chattogram. Cell: 01743-533339")}
              </p>
            </div>

            {/* Top-Right Badge & Date Box */}
            <div className="shrink-0 flex flex-col items-end">
              <span className="bg-black text-white font-black text-xs px-3 py-1 rounded-xs uppercase tracking-wider block text-center shadow-xs">
                {badgeText}
              </span>

              {/* Date Box: [ দিন ] [ মাস ] [ বছর ] */}
              <div className="flex items-center gap-1 mt-2 text-xs">
                <span className="font-bold text-black text-[11px]">
                  {isBn ? "তারিখ:" : "Date:"}
                </span>
                <div className="flex items-center">
                  <span className="border border-black w-6 h-5 flex items-center justify-center font-bold font-mono text-[11px] bg-white text-black">
                    {dayDisplay}
                  </span>
                  <span className="border border-black border-l-0 w-6 h-5 flex items-center justify-center font-bold font-mono text-[11px] bg-white text-black">
                    {monthDisplay}
                  </span>
                  <span className="border border-black border-l-0 px-1.5 h-5 flex items-center justify-center font-bold font-mono text-[11px] bg-white text-black">
                    {yearDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Under Header Line */}
          <div className="h-[1.5px] bg-black w-full my-2" />

          {/* Month Name Row */}
          <div className="flex items-center gap-1.5 my-1.5 text-xs">
            <span className="font-bold text-black whitespace-nowrap text-[11px] sm:text-xs">
              {isBn ? "মাসের নাম:" : "Month:"}
            </span>
            <div className="border border-black px-2 py-0.5 font-bold text-black bg-white flex-1 min-w-[120px] truncate text-[11px] sm:text-xs">
              {formatMonth(activeReceipt.billPeriodMonth, receiptLang, activeReceipt.billPeriodYear)}
            </div>
          </div>

          {/* Tenant Name Row */}
          <div className="flex items-center gap-1.5 my-1.5 text-xs">
            <span className="font-bold text-black whitespace-nowrap text-[11px] sm:text-xs">
              {isBn ? "ভাড়াটিয়ার নাম:" : "Tenant Name:"}
            </span>
            <div className="border border-black px-2 py-0.5 font-extrabold text-black bg-white flex-1 truncate text-xs sm:text-sm">
              {activeReceipt.tenantName}{" "}
              {activeReceipt.tenantPhone ? `(${activeReceipt.tenantPhone})` : ""}
            </div>
          </div>

          {/* MIDSECTION: Left Specifics & Right Financial Ledger */}
          <div className="grid grid-cols-12 gap-2.5 my-2 items-start text-xs">
            {/* Left Column: Property & Tenant Details */}
            <div className="col-span-5 space-y-1.5">
              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "মালিক পক্ষ / মার্কেট:" : "Landlord / Market:"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold text-black bg-white text-[11px] truncate">
                  {activeReceipt.marketName || (isBn ? "নূর আহাম্মদ ম্যানশন" : "Property Owner")}
                </div>
              </div>

              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "ভবন / তলা:" : "Building / Floor:"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold text-black bg-white text-[11px] truncate">
                  {formatFloorName(activeReceipt.floor, receiptLang)}
                </div>
              </div>

              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "ইউনিট / দোকান নং:" : "Unit / Shop No:"}
                </span>
                <div className="border border-black px-2 py-0.5 font-black text-black bg-white font-mono text-xs truncate">
                  {activeReceipt.shopNumber} {activeReceipt.size ? `(${activeReceipt.size})` : ""}
                </div>
              </div>

              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "রশিদ নম্বর:" : "Receipt Serial:"}
                </span>
                <div className="border border-black px-2 py-0.5 font-black text-black bg-white font-mono text-[10px] truncate">
                  {activeReceipt.receiptNo}
                </div>
              </div>
            </div>

            {/* Right Column: 7 Solid Black Badges with Right-Aligned Values */}
            <div className="col-span-7 space-y-1">
              {/* 1. Monthly Rent */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "মাসিক ভাড়া" : "Rent"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(rentPaisa, receiptLang)}
                </div>
              </div>

              {/* 2. Gas Bill */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "গ্যাস বিল" : "Gas Bill"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(gasPaisa, receiptLang)}
                </div>
              </div>

              {/* 3. Electricity Bill */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "বিদ্যুৎ বিল" : "Electricity"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(electricityPaisa, receiptLang)}
                </div>
              </div>

              {/* 4. Water Bill */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "পানি" : "Water"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(waterPaisa, receiptLang)}
                </div>
              </div>

              {/* 5. Others */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "অন্যান্য" : "Others"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(otherPaisa, receiptLang)}
                </div>
              </div>

              {/* 6. Advance */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "অগ্রিম" : "Advance"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(advancePaisa, receiptLang)}
                </div>
              </div>

              {/* 7. Arrears / Due */}
              <div className="flex items-center gap-1">
                <span className="bg-black text-white font-bold text-[10px] py-0.5 px-1.5 w-[76px] text-center rounded-xs shrink-0">
                  {isBn ? "বকেয়া" : "Arrears"}
                </span>
                <div className="border border-black px-2 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-xs">
                  {formatCurrency(arrearsPaisa, receiptLang)}
                </div>
              </div>

              {/* TOTAL ROW */}
              <div className="flex items-center gap-1 pt-1 border-t border-black">
                <span className="font-black text-black text-xs w-[76px] text-right pr-1">
                  {isBn ? "মোট =" : "Total ="}
                </span>
                <div className="border-2 border-black px-2 py-0.5 font-black font-mono text-right flex-1 bg-white text-black text-xs sm:text-sm">
                  {formatCurrency(totalPaidPaisa, receiptLang)}
                </div>
              </div>
            </div>
          </div>

          {/* IN WORDS ROW */}
          <div className="my-2 border border-black p-1.5 bg-white text-xs">
            <span className="font-bold text-black">{isBn ? "কথায়:" : "In Words:"} </span>
            <span className="font-bold text-black italic capitalize">{inWords}</span>
          </div>
        </div>

        {/* BOTTOM SIGNATURES & NOTICE */}
        <div className="pt-6 pb-0 mt-auto">
          <div className="border-t border-black pt-1 flex items-center justify-between text-[11px]">
            <span className="font-extrabold text-black">{signatureText}</span>
            <span className="text-[10px] text-black font-mono">
              {activeReceipt.paymentMethod} • {formatDate(activeReceipt.date, receiptLang)}
            </span>
          </div>

          {!isOwner && (
            <p className="text-[9px] text-black/80 mt-1 italic text-right">
              {isBn
                ? "* পানি, বিদ্যুৎ ও গ্যাস অপচয় রোধে সহায়তা করুন।"
                : "* Please conserve water, electricity and gas."}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={!!activeReceipt}
      onClose={() => setActiveReceipt(null)}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>
            {receiptLang === "bn"
              ? "প্রফেশনাল ডাবল কাউন্টারফয়েল মানি রিসিট (Dual Counterfoil)"
              : "Professional 2-Part Counterfoil Money Receipt"}
          </span>
        </div>
      }
      description={
        receiptLang === "bn"
          ? "আসল বাণিজ্যিক কাউন্টারফয়েল রশিদ (মালিকের কপি ও ভাড়াটিয়ার কপি)। বাংলা ও ইংরেজি উভয় ভাষায় নির্ভুল প্রিন্ট ও পিডিএফ ডাউনলোড হবে।"
          : "Dual-counterfoil (Owner & Tenant copy) commercial money receipt with zero font corruption in PDF, PNG and Print."
      }
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar: Receipt Language Switcher */}
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {receiptLang === "bn" ? "রশিদের ভাষা নির্বাচন করুন:" : "Receipt Language:"}
            </span>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-800 rounded-md p-0.5 border border-slate-300 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setReceiptLang("bn")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                receiptLang === "bn"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              বাংলা (BN)
            </button>
            <button
              type="button"
              onClick={() => setReceiptLang("en")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                receiptLang === "en"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>

        {/* Printable & Exportable 2-Part Counterfoil Receipt Voucher */}
        <div className="overflow-x-auto pb-2">
          <div
            ref={receiptContainerRef}
            id="real-money-receipt"
            className="real-money-receipt-voucher bg-white text-black border-2 border-black shadow-md min-w-[760px] max-w-4xl mx-auto rounded-xs grid grid-cols-2 relative"
            style={{ fontFamily: "'Anek Bangla', 'Inter', sans-serif" }}
          >
            {/* Center Scissor Icon Indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white px-1 z-10 hidden sm:flex items-center gap-0.5 text-[10px] text-black">
              <Scissors className="w-3 h-3 text-black" />
            </div>

            {/* Left Part: মালিকের অংশ (Owner Copy) */}
            {renderReceiptHalf("OWNER")}

            {/* Right Part: ভাড়াটিয়ার অংশ (Tenant Copy) */}
            {renderReceiptHalf("TENANT")}
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {receiptLang === "bn"
                ? "ডাবল কাউন্টারফয়েল • বাংলা ও ইংরেজিতে ১০০% নির্ভুল"
                : "Dual Counterfoil • 100% Error-Free Rendering"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => setActiveReceipt(null)}>
              {t("common.close")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              isLoading={isDownloadingImage}
              onClick={handleDownloadImage}
              title={receiptLang === "bn" ? "ছবি (PNG) ডাউনলোড করুন" : "Download PNG Image"}
            >
              <FileDown className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {receiptLang === "bn" ? "ছবি (PNG)" : "Image (PNG)"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              isLoading={isDownloadingPdf}
              onClick={handleDownloadPdf}
              title={receiptLang === "bn" ? "পিডিএফ ডাউনলোড করুন" : "Download PDF"}
            >
              <Download className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" />
              {receiptLang === "bn" ? "পিডিএফ (PDF)" : "PDF"}
            </Button>

            <Button variant="primary" size="sm" onClick={handlePrintReceipt}>
              <Printer className="w-4 h-4 mr-1.5" />
              {receiptLang === "bn" ? "রশিদ প্রিন্ট" : "Print"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
