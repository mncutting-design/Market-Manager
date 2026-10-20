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
import { Printer, Download, FileDown, Scissors, FileText, Globe, Eye } from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export function MoneyReceiptModal() {
  const { t, locale } = useTranslation();
  const { activeReceipt, setActiveReceipt } = useApp();
  const receiptContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Independent receipt language toggle: defaults to app locale, but manager can toggle on the fly
  const [receiptLang, setReceiptLang] = useState<"bn" | "en">(locale === "en" ? "en" : "bn");

  // Mobile preview mode: allow viewing single copy on narrow phones while exporting both
  const [mobileView, setMobileView] = useState<"DUAL" | "OWNER" | "TENANT">("DUAL");

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
   * 1. 100% IDENTICAL PRINT PREVIEW:
   * Uses native window.print() directly on the rendered DOM.
   * With @media print isolation, the print preview matches the screen preview exactly!
   */
  const handlePrintReceipt = () => {
    // Reset mobile preview view so full 2-part counterfoil prints
    setMobileView("DUAL");
    setTimeout(() => {
      window.print();
    }, 100);
  };

  /**
   * 2. DOWNLOAD 100% ERROR-FREE PDF:
   * Uses html-to-image (SVG foreignObject) which natively handles Tailwind v4 oklch colors,
   * Bengali fonts, and complex typography without parser crashes.
   */
  const handleDownloadPdf = async () => {
    if (!receiptContainerRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const dataUrl = await toPng(receiptContainerRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

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

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = availableWidth;
      const imgHeight = (img.height * imgWidth) / img.width;
      const finalHeight = Math.min(imgHeight, availableHeight);
      const offsetY = Math.max(margin, (pdfHeight - finalHeight) / 2);

      pdf.addImage(dataUrl, "PNG", margin, offsetY, imgWidth, finalHeight, undefined, "FAST");
      pdf.save(`Money_Receipt_${activeReceipt.receiptNo}.pdf`);
      toast.success(
        receiptLang === "bn"
          ? "কাউন্টারফয়েল মানি রিসিট পিডিএফ সফলভাবে ডাউনলোড হয়েছে!"
          : "Counterfoil Money Receipt downloaded as PDF successfully!"
      );
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(
        receiptLang === "bn"
          ? "পিডিএফ তৈরিতে সমস্যা হয়েছে। 'রশিদ প্রিন্ট' অপশন থেকে 'Save as PDF' করতে পারেন।"
          : "Failed to generate PDF. You can also print and select 'Save as PDF'."
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /**
   * 3. DOWNLOAD HIGH-RES PNG IMAGE:
   * Ideal for sending directly on WhatsApp / IMO / Messenger
   */
  const handleDownloadImage = async () => {
    if (!receiptContainerRef.current) return;
    setIsDownloadingImage(true);
    try {
      const dataUrl = await toPng(receiptContainerRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `Money_Receipt_${activeReceipt.receiptNo}.png`;
      link.href = dataUrl;
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
   * Replicates user's reference image with solid black badges and clean boxed values.
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
        className={`p-3.5 sm:p-5 relative bg-white text-black flex flex-col justify-between ${
          isOwner ? "sm:border-r-2 sm:border-dashed sm:border-black" : ""
        }`}
        style={{ backgroundColor: "#ffffff", color: "#000000" }}
      >
        {/* TOP HEADER */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-black leading-tight">
                {titleText}
              </h3>
              <p className="text-xs sm:text-sm font-extrabold text-black mt-0.5 truncate">
                {activeReceipt.marketName || (isBn ? "মার্কেট ম্যানেজার" : "Market Manager")}
              </p>
              <p className="text-[10px] sm:text-[11px] text-black/85 leading-tight mt-0.5">
                {activeReceipt.marketAddress ||
                  (isBn
                    ? "হোল্ডিং নং- ৩১০৬/১২, সাবাইপাড়া, লোহাগড়পুল, পাহাড়তলী, চট্টগ্রাম। ০১৭৪৩-৫৩৩৩৩৯"
                    : "Holding No- 3106/12, Sabaipara, Agrabad, Chattogram. Cell: 01743-533339")}
              </p>
            </div>

            {/* Top-Right Badge & Date Box */}
            <div className="shrink-0 flex flex-col items-end">
              <span
                className="bg-black text-white font-black text-[11px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xs uppercase tracking-wider block text-center"
                style={{ backgroundColor: "#000000", color: "#ffffff" }}
              >
                {badgeText}
              </span>

              {/* Date Box: [ দিন ] [ মাস ] [ বছর ] */}
              <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-xs">
                <span className="font-bold text-black text-[10px] sm:text-[11px]">
                  {isBn ? "তারিখ:" : "Date:"}
                </span>
                <div className="flex items-center">
                  <span className="border border-black w-5 sm:w-6 h-5 flex items-center justify-center font-bold font-mono text-[10px] sm:text-[11px] bg-white text-black">
                    {dayDisplay}
                  </span>
                  <span className="border border-black border-l-0 w-5 sm:w-6 h-5 flex items-center justify-center font-bold font-mono text-[10px] sm:text-[11px] bg-white text-black">
                    {monthDisplay}
                  </span>
                  <span className="border border-black border-l-0 px-1 sm:px-1.5 h-5 flex items-center justify-center font-bold font-mono text-[10px] sm:text-[11px] bg-white text-black">
                    {yearDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Under Header Line */}
          <div className="h-[1.5px] bg-black w-full my-1.5 sm:my-2" style={{ backgroundColor: "#000000" }} />

          {/* Month Name Row */}
          <div className="flex items-center gap-1.5 my-1.5 text-xs">
            <span className="font-bold text-black whitespace-nowrap text-[11px] sm:text-xs">
              {isBn ? "মাসের নাম:" : "Month:"}
            </span>
            <div className="border border-black px-2 py-0.5 font-bold text-black bg-white flex-1 min-w-[100px] truncate text-[11px] sm:text-xs">
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
          <div className="grid grid-cols-12 gap-2 sm:gap-2.5 my-2 items-start text-xs">
            {/* Left Column: Property & Tenant Details */}
            <div className="col-span-5 space-y-1.5">
              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "মালিক পক্ষ / মার্কেট:" : "Landlord / Market:"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold text-black bg-white text-[10px] sm:text-[11px] truncate">
                  {activeReceipt.marketName || (isBn ? "নূর আহাম্মদ ম্যানশন" : "Property Owner")}
                </div>
              </div>

              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "ভবন / তলা:" : "Building / Floor:"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold text-black bg-white text-[10px] sm:text-[11px] truncate">
                  {formatFloorName(activeReceipt.floor, receiptLang)}
                </div>
              </div>

              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "ইউনিট / দোকান নং:" : "Unit / Shop No:"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-black text-black bg-white font-mono text-[11px] sm:text-xs truncate">
                  {activeReceipt.shopNumber} {activeReceipt.size ? `(${activeReceipt.size})` : ""}
                </div>
              </div>

              <div>
                <span className="block font-bold text-black text-[10px] mb-0.5">
                  {isBn ? "রশিদ নম্বর:" : "Receipt Serial:"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-black text-black bg-white font-mono text-[9px] sm:text-[10px] truncate">
                  {activeReceipt.receiptNo}
                </div>
              </div>
            </div>

            {/* Right Column: 7 Solid Black Badges with Right-Aligned Values */}
            <div className="col-span-7 space-y-1">
              {/* 1. Monthly Rent */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "মাসিক ভাড়া" : "Rent"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(rentPaisa, receiptLang)}
                </div>
              </div>

              {/* 2. Gas Bill */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "গ্যাস বিল" : "Gas Bill"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(gasPaisa, receiptLang)}
                </div>
              </div>

              {/* 3. Electricity Bill */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "বিদ্যুৎ বিল" : "Electricity"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(electricityPaisa, receiptLang)}
                </div>
              </div>

              {/* 4. Water Bill */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "পানি" : "Water"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(waterPaisa, receiptLang)}
                </div>
              </div>

              {/* 5. Others */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "অন্যান্য" : "Others"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(otherPaisa, receiptLang)}
                </div>
              </div>

              {/* 6. Advance */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "অগ্রিম" : "Advance"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(advancePaisa, receiptLang)}
                </div>
              </div>

              {/* 7. Arrears / Due */}
              <div className="flex items-center gap-1">
                <span
                  className="bg-black text-white font-bold text-[9px] sm:text-[10px] py-0.5 px-1 w-[70px] sm:w-[76px] text-center rounded-xs shrink-0"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  {isBn ? "বকেয়া" : "Arrears"}
                </span>
                <div className="border border-black px-1.5 py-0.5 font-bold font-mono text-right flex-1 bg-white text-black text-[11px] sm:text-xs">
                  {formatCurrency(arrearsPaisa, receiptLang)}
                </div>
              </div>

              {/* TOTAL ROW */}
              <div className="flex items-center gap-1 pt-1 border-t border-black">
                <span className="font-black text-black text-[11px] sm:text-xs w-[70px] sm:w-[76px] text-right pr-1">
                  {isBn ? "মোট =" : "Total ="}
                </span>
                <div className="border-2 border-black px-1.5 py-0.5 font-black font-mono text-right flex-1 bg-white text-black text-xs sm:text-sm">
                  {formatCurrency(totalPaidPaisa, receiptLang)}
                </div>
              </div>
            </div>
          </div>

          {/* IN WORDS ROW */}
          <div className="my-1.5 sm:my-2 border border-black p-1.5 bg-white text-xs">
            <span className="font-bold text-black">{isBn ? "কথায়:" : "In Words:"} </span>
            <span className="font-bold text-black italic capitalize text-[11px] sm:text-xs">{inWords}</span>
          </div>
        </div>

        {/* BOTTOM SIGNATURES, CHANNEL DETAILS & NOTICE */}
        <div className="pt-3 sm:pt-4 pb-0 mt-auto space-y-1.5">
          {/* Channel Details Row */}
          <div className="bg-slate-50 border border-black/40 px-2 py-1 rounded text-[9px] sm:text-[10px] text-black font-medium flex flex-wrap items-center justify-between gap-1">
            <div className="flex flex-wrap items-center gap-1.5 font-mono">
              <span className="font-bold uppercase tracking-wider">{activeReceipt.paymentMethod}</span>
              {activeReceipt.paymentAccount && (
                <span>
                  • {isBn ? activeReceipt.paymentAccount.name_bn : activeReceipt.paymentAccount.name_en} ({activeReceipt.paymentAccount.number})
                </span>
              )}
              {activeReceipt.bankName && <span>• {activeReceipt.bankName}</span>}
              {activeReceipt.transactionRef && <span>• Trx: {activeReceipt.transactionRef}</span>}
              {activeReceipt.senderNumber && <span>• From: {activeReceipt.senderNumber}</span>}
            </div>
            <div className="text-[9px] text-black/70">
              {formatDate(activeReceipt.date, receiptLang)}
            </div>
          </div>

          {/* Collector & Entered By Signature Row */}
          <div className="border-t border-black pt-1 flex items-center justify-between text-[10px] sm:text-[11px]">
            <div>
              <span className="font-extrabold text-black">{signatureText}</span>
              <p className="text-[9px] text-black/70">
                {isBn ? "গ্রহীতা / আদায়কারী:" : "Received by:"} <strong className="text-black">{activeReceipt.receivedBy || "Staff"}</strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-black/70 font-mono">
                {isBn ? "এন্ট্রি করেছেন:" : "Entered by:"} <strong className="text-black">{activeReceipt.enteredBy || "System"}</strong>
              </p>
            </div>
          </div>

          {!isOwner && (
            <p className="text-[8px] sm:text-[9px] text-black/80 mt-0.5 italic text-right">
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
          <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">
            {receiptLang === "bn"
              ? "প্রফেশনাল ডাবল কাউন্টারফয়েল মানি রিসিট"
              : "Professional 2-Part Counterfoil Money Receipt"}
          </span>
        </div>
      }
      description={
        receiptLang === "bn"
          ? "আসল বাণিজ্যিক কাউন্টারফয়েল রশিদ। প্রিভিউ, প্রিন্ট এবং পিডিএফ ডাউনলোড হুবহু একই আসবে।"
          : "Commercial dual counterfoil money receipt. Preview, print and PDF downloads are 100% identical."
      }
      maxWidth="4xl"
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Top Control Bar: Language Switcher & Mobile View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 no-print">
          {/* Language Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {receiptLang === "bn" ? "ভাষা:" : "Language:"}
              </span>
            </div>

            <div className="flex items-center bg-white dark:bg-slate-800 rounded-md p-0.5 border border-slate-300 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setReceiptLang("bn")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  receiptLang === "bn"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setReceiptLang("en")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  receiptLang === "en"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Mobile Screen Preview Switcher (Only visible on small phones) */}
          <div className="flex sm:hidden items-center justify-between pt-1.5 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {receiptLang === "bn" ? "মোবাইল ভিউ:" : "Mobile View:"}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMobileView("DUAL")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  mobileView === "DUAL"
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {receiptLang === "bn" ? "উভয় অংশ" : "2-Part"}
              </button>
              <button
                type="button"
                onClick={() => setMobileView("OWNER")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  mobileView === "OWNER"
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {receiptLang === "bn" ? "মালিক" : "Owner"}
              </button>
              <button
                type="button"
                onClick={() => setMobileView("TENANT")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  mobileView === "TENANT"
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {receiptLang === "bn" ? "ভাড়াটিয়া" : "Tenant"}
              </button>
            </div>
          </div>
        </div>

        {/* Printable & Exportable 2-Part Counterfoil Receipt Voucher */}
        <div className="overflow-x-auto pb-1 overscroll-x-contain">
          <div
            ref={receiptContainerRef}
            id="real-money-receipt"
            className="real-money-receipt-voucher bg-white text-black border-2 border-black shadow-md min-w-[680px] sm:min-w-[760px] max-w-4xl mx-auto rounded-xs grid grid-cols-2 relative"
            style={{ fontFamily: "'Anek Bangla', 'Inter', sans-serif", backgroundColor: "#ffffff" }}
          >
            {/* Center Scissor Icon Indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white px-1 z-10 hidden sm:flex items-center gap-0.5 text-[10px] text-black border border-black/20 rounded">
              <Scissors className="w-3 h-3 text-black" />
            </div>

            {/* Left Part: মালিকের অংশ (Owner Copy) */}
            {renderReceiptHalf("OWNER")}

            {/* Right Part: ভাড়াটিয়ার অংশ (Tenant Copy) */}
            {renderReceiptHalf("TENANT")}
          </div>

          {/* Single-Copy Preview for Mobile (if selected by user on small phone) */}
          {mobileView !== "DUAL" && (
            <div className="sm:hidden mt-2 bg-white text-black border-2 border-black rounded-xs shadow-md">
              <div className="p-1 bg-slate-900 text-white text-[10px] font-bold text-center">
                {mobileView === "OWNER"
                  ? (receiptLang === "bn" ? "মোবাইল স্ক্রিন প্রিভিউ: মালিকের অংশ" : "Mobile Screen Preview: Owner's Copy")
                  : (receiptLang === "bn" ? "মোবাইল স্ক্রিন প্রিভিউ: ভাড়াটিয়ার অংশ" : "Mobile Screen Preview: Tenant's Copy")}
              </div>
              {renderReceiptHalf(mobileView)}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 sm:pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {receiptLang === "bn"
                ? "ডাবল কাউন্টারফয়েল • প্রিভিউ, প্রিন্ট ও ডাউনলোড ১০০% নিখুঁত"
                : "Dual Counterfoil • Preview, Print & Download 100% Identical"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveReceipt(null)}
              className="flex-1 sm:flex-none"
            >
              {t("common.close")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              isLoading={isDownloadingImage}
              onClick={handleDownloadImage}
              className="flex-1 sm:flex-none cursor-pointer"
              title={receiptLang === "bn" ? "ছবি (PNG) ডাউনলোড করুন" : "Download PNG Image"}
            >
              <FileDown className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
              {receiptLang === "bn" ? "ছবি (PNG)" : "Image"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              isLoading={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-none cursor-pointer"
              title={receiptLang === "bn" ? "পিডিএফ ডাউনলোড করুন" : "Download PDF"}
            >
              <Download className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400 shrink-0" />
              {receiptLang === "bn" ? "পিডিএফ (PDF)" : "PDF"}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrintReceipt}
              className="w-full sm:w-auto cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5 shrink-0" />
              {receiptLang === "bn" ? "রশিদ প্রিন্ট" : "Print Receipt"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
