"use client";

import React, { useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  toBanglaDigits,
  numberToWordsBDT,
} from "@/lib/format";
import { Printer, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export interface DepositReceiptData {
  id: string;
  receiptNumber?: string;
  transactionDate: Date | string;
  tenantName: string;
  tenantPhone: string;
  shopNumber: string;
  marketName: string;
  type: string; // RECEIVED or TOPUP
  amount: number; // in paisa
  method: string;
  accountName?: string;
  transactionRef?: string;
  receivedBy: string;
  enteredBy: string;
  reason?: string;
  runningBalance?: number;
}

interface DepositReceiptModalProps {
  receipt: DepositReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DepositReceiptModal({
  receipt,
  isOpen,
  onClose,
}: DepositReceiptModalProps) {
  const { t, locale } = useTranslation();
  const receiptContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [receiptLang, setReceiptLang] = useState<"bn" | "en">(
    locale === "en" ? "en" : "bn"
  );

  if (!receipt || !isOpen) return null;

  const amountBDT = Math.round((receipt.amount || 0) / 100);
  const inWords = numberToWordsBDT(amountBDT, receiptLang);
  const dateObj = new Date(receipt.transactionDate || new Date());
  const formattedDate = formatDate(dateObj, receiptLang);

  const receiptNo =
    receipt.receiptNumber ||
    `DEP-${dateObj.getFullYear()}-${String(receipt.id || "0000").slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptContainerRef.current) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading(
      receiptLang === "bn"
        ? "পিডিএফ রসিদ তৈরি হচ্ছে..."
        : "Generating PDF receipt..."
    );

    try {
      const dataUrl = await toPng(receiptContainerRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#FFFFFF",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 190;
      const imgHeight =
        (receiptContainerRef.current.offsetHeight * imgWidth) /
        receiptContainerRef.current.offsetWidth;

      pdf.addImage(dataUrl, "PNG", 10, 15, imgWidth, imgHeight);
      pdf.save(`Deposit_Receipt_${receiptNo}.pdf`);

      toast.success(
        receiptLang === "bn"
          ? "পিডিএফ সফলভাবে ডাউনলোড হয়েছে!"
          : "PDF downloaded successfully!",
        { id: toastId }
      );
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(
        receiptLang === "bn"
          ? "পিডিএফ তৈরি করতে ব্যর্থ হয়েছে"
          : "Failed to generate PDF",
        { id: toastId }
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        receiptLang === "bn"
          ? "জামানত জমা মানি রসিদ"
          : "Deposit Collection Receipt"
      }
      description={`${receipt.shopNumber} — ${receipt.tenantName} (${receipt.marketName})`}
      maxWidth="xl"
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-4 border border-black/10">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={receiptLang === "bn" ? "neo" : "outline"}
            onClick={() => setReceiptLang("bn")}
            className="text-xs h-7 px-2.5 font-black"
          >
            বাংলা
          </Button>
          <Button
            size="sm"
            variant={receiptLang === "en" ? "neo" : "outline"}
            onClick={() => setReceiptLang("en")}
            className="text-xs h-7 px-2.5 font-black"
          >
            English
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="text-xs h-8 font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
            {receiptLang === "bn" ? "প্রিন্ট করুন" : "Print"}
          </Button>
          <Button
            size="sm"
            variant="neo"
            onClick={handleDownloadPdf}
            isLoading={isDownloadingPdf}
            className="text-xs h-8 font-black"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
            {receiptLang === "bn" ? "পিডিএফ ডাউনলোড" : "PDF Download"}
          </Button>
        </div>
      </div>

      {/* Printable Receipt Card */}
      <div
        ref={receiptContainerRef}
        className="p-6 sm:p-8 bg-white text-black border-2 border-black rounded-2xl shadow-[4px_4px_0px_#000000] font-sans print:shadow-none print:border-black print:m-0"
      >
        {/* Header */}
        <div className="border-b-2 border-black pb-4 text-center">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
            {receipt.marketName}
          </h2>
          <div className="inline-block mt-1 px-4 py-1 rounded-full border-2 border-black bg-[#FED734] font-black text-xs uppercase tracking-wider text-black">
            {receiptLang === "bn"
              ? "জামানত প্রাপ্তি রসিদ (Deposit Receipt)"
              : "Security Deposit Receipt"}
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-gray-700 mt-3 pt-2 border-t border-black/20">
            <span>
              {receiptLang === "bn" ? "রসিদ নং: " : "Receipt No: "}
              <strong className="font-mono text-black font-black">
                {receiptNo}
              </strong>
            </span>
            <span>
              {receiptLang === "bn" ? "তারিখ: " : "Date: "}
              <strong className="text-black font-black">{formattedDate}</strong>
            </span>
          </div>
        </div>

        {/* Tenant & Shop Info Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b-2 border-black text-xs">
          <div>
            <span className="text-gray-600 font-bold block">
              {receiptLang === "bn" ? "ভাড়াটিয়ার নাম:" : "Tenant Name:"}
            </span>
            <p className="font-black text-sm text-black">{receipt.tenantName}</p>
          </div>
          <div className="text-right">
            <span className="text-gray-600 font-bold block">
              {receiptLang === "bn" ? "দোকান নং / ফ্লোর:" : "Shop No / Floor:"}
            </span>
            <p className="font-black text-sm text-black">
              {receipt.shopNumber}
            </p>
          </div>
          <div>
            <span className="text-gray-600 font-bold block">
              {receiptLang === "bn" ? "মোবাইল নম্বর:" : "Mobile No:"}
            </span>
            <p className="font-mono font-bold text-black">{receipt.tenantPhone}</p>
          </div>
          <div className="text-right">
            <span className="text-gray-600 font-bold block">
              {receiptLang === "bn" ? "লেনদেনের ধরন:" : "Transaction Type:"}
            </span>
            <p className="font-black text-black">
              {receipt.type === "TOPUP"
                ? receiptLang === "bn"
                  ? "টপ-আপ বৃদ্ধি (Top-up)"
                  : "Deposit Top-Up"
                : receiptLang === "bn"
                ? "জামানত গ্রহণ (Deposit Received)"
                : "Initial Deposit"}
            </p>
          </div>
        </div>

        {/* Payment Details Table */}
        <div className="py-4 border-b-2 border-black">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 font-black text-black text-left">
                <th className="p-2">
                  {receiptLang === "bn" ? "বিবরণ (Description)" : "Description"}
                </th>
                <th className="p-2">
                  {receiptLang === "bn" ? "মাধ্যম ও রেফারেন্স" : "Channel & Ref"}
                </th>
                <th className="p-2 text-right">
                  {receiptLang === "bn" ? "পরিমাণ (টাকা)" : "Amount (BDT)"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-bold">
              <tr>
                <td className="p-2.5">
                  <p className="font-black text-black">
                    {receiptLang === "bn"
                      ? "নিরাপত্তা জামানত (Tenant Security Deposit)"
                      : "Tenant Security Deposit"}
                  </p>
                  {receipt.reason && (
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {receipt.reason}
                    </p>
                  )}
                </td>
                <td className="p-2.5">
                  <span className="font-bold text-black">
                    {receipt.method}
                  </span>
                  {receipt.accountName && (
                    <span className="block text-[11px] text-gray-600">
                      {receipt.accountName}
                    </span>
                  )}
                  {receipt.transactionRef && (
                    <span className="block font-mono text-[10px] text-gray-700">
                      Ref: {receipt.transactionRef}
                    </span>
                  )}
                </td>
                <td className="p-2.5 text-right font-mono font-black text-sm text-black">
                  {formatCurrency(receipt.amount, receiptLang)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-black text-sm bg-[#FED734]/20">
                <td colSpan={2} className="p-2.5 text-right text-black">
                  {receiptLang === "bn"
                    ? "মোট আদায়কৃত অর্থ:"
                    : "Total Collected Amount:"}
                </td>
                <td className="p-2.5 text-right font-mono font-black text-base text-[#00875A]">
                  {formatCurrency(receipt.amount, receiptLang)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div className="mt-3 p-2.5 bg-neutral-50 rounded-xl border border-black/10 text-xs">
            <span className="font-bold text-gray-600">
              {receiptLang === "bn" ? "কথায়: " : "In Words: "}
            </span>
            <span className="font-black text-black uppercase">{inWords}</span>
          </div>

          {receipt.runningBalance !== undefined && (
            <div className="mt-2 text-right text-xs font-bold text-gray-700">
              {receiptLang === "bn"
                ? "বর্তমান মোট জামানত স্থিতি: "
                : "Current Deposit Balance: "}
              <strong className="font-mono text-black font-black">
                {formatCurrency(receipt.runningBalance, receiptLang)}
              </strong>
            </div>
          )}
        </div>

        {/* Collector info and Signature Lines */}
        <div className="pt-8">
          <div className="flex justify-between items-end text-xs pt-8">
            <div className="text-center w-48">
              <div className="border-t-2 border-black pt-1 font-black text-black">
                {receiptLang === "bn"
                  ? "ভাড়াটিয়ার স্বাক্ষর"
                  : "Tenant's Signature"}
              </div>
              <p className="text-[10px] text-gray-600">
                {receiptLang === "bn" ? "স্বাক্ষর ও তারিখ" : "Signature & Date"}
              </p>
            </div>

            <div className="text-center w-48">
              <div className="border-t-2 border-black pt-1 font-black text-black">
                {receiptLang === "bn"
                  ? "আদায়কারীর স্বাক্ষর"
                  : "Authorized Signature"}
              </div>
              <p className="text-[10px] text-gray-600 font-bold">
                {receipt.receivedBy || "Admin"}
              </p>
              <p className="text-[9px] text-gray-500">
                Entered by: {receipt.enteredBy}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-dashed border-black/20 text-center text-[10px] text-gray-500 font-bold">
          {receiptLang === "bn"
            ? "এটি একটি কম্পিউটার জেনারেটেড রসিদ। মার্কেট ম্যানেজার সফটওয়্যার দ্বারা প্রস্তুতকৃত।"
            : "This is a computer-generated receipt issued by Market Manager."}
        </div>
      </div>
    </Dialog>
  );
}
