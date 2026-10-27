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
import { Printer, Download, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export interface DepositRefundReceiptData {
  id: string;
  voucherNumber?: string;
  transactionDate: Date | string;
  tenantName: string;
  tenantPhone: string;
  shopNumber: string;
  marketName: string;
  amount: number; // in paisa
  method: string;
  accountName?: string;
  transactionRef?: string;
  paidBy: string;
  enteredBy: string;
  approvedBy?: string;
  reason: string;
  remainingBalance?: number;
}

interface DepositRefundReceiptModalProps {
  receipt: DepositRefundReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DepositRefundReceiptModal({
  receipt,
  isOpen,
  onClose,
}: DepositRefundReceiptModalProps) {
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

  const voucherNo =
    receipt.voucherNumber ||
    `REF-${dateObj.getFullYear()}-${String(receipt.id || "0000").slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptContainerRef.current) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading(
      receiptLang === "bn"
        ? "পিডিএফ ভাউচার তৈরি হচ্ছে..."
        : "Generating PDF voucher..."
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
      pdf.save(`Deposit_Refund_${voucherNo}.pdf`);

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
          ? "জামানত ফেরত ভাউচার"
          : "Deposit Refund Voucher"
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

      {/* Printable Refund Card */}
      <div
        ref={receiptContainerRef}
        className="p-6 sm:p-8 bg-white text-black border-2 border-black rounded-2xl shadow-[4px_4px_0px_#000000] font-sans print:shadow-none print:border-black print:m-0"
      >
        {/* Header */}
        <div className="border-b-2 border-black pb-4 text-center">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
            {receipt.marketName}
          </h2>
          <div className="inline-block mt-1 px-4 py-1 rounded-full border-2 border-black bg-[#FF4B55] text-white font-black text-xs uppercase tracking-wider">
            {receiptLang === "bn"
              ? "জামানত ফেরত ভাউচার (Deposit Refund Voucher)"
              : "Tenant Deposit Refund Voucher"}
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-gray-700 mt-3 pt-2 border-t border-black/20">
            <span>
              {receiptLang === "bn" ? "ভাউচার নং: " : "Voucher No: "}
              <strong className="font-mono text-black font-black">
                {voucherNo}
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
              {receiptLang === "bn" ? "প্রাপক ভাড়াটিয়া:" : "Tenant Name:"}
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
              {receiptLang === "bn" ? "পরিশোধের মাধ্যম:" : "Payment Channel:"}
            </span>
            <p className="font-black text-black">
              {receipt.method}
              {receipt.accountName ? ` - ${receipt.accountName}` : ""}
            </p>
            {receipt.transactionRef && (
              <span className="font-mono text-[11px] text-gray-600 block">
                Ref: {receipt.transactionRef}
              </span>
            )}
          </div>
        </div>

        {/* Refund Details */}
        <div className="py-4 border-b-2 border-black space-y-3">
          <div className="bg-neutral-50 p-3 rounded-xl border border-black/10">
            <span className="text-xs font-bold text-gray-600 block mb-1">
              {receiptLang === "bn" ? "ফেরতের কারণ / বিবরণ:" : "Refund Reason / Remarks:"}
            </span>
            <p className="text-xs font-black text-black leading-relaxed">
              {receipt.reason}
            </p>
          </div>

          <div className="flex justify-between items-center p-3 bg-[#FFEBEF] rounded-xl border-2 border-black">
            <span className="font-black text-sm text-black">
              {receiptLang === "bn"
                ? "মোট ফেরত প্রদানকৃত অর্থ:"
                : "Total Refunded Amount:"}
            </span>
            <span className="font-mono font-black text-lg text-[#FF4B55]">
              - {formatCurrency(receipt.amount, receiptLang)}
            </span>
          </div>

          {/* Amount in Words */}
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-black/10 text-xs">
            <span className="font-bold text-gray-600">
              {receiptLang === "bn" ? "কথায়: " : "In Words: "}
            </span>
            <span className="font-black text-black uppercase">{inWords}</span>
          </div>

          {receipt.remainingBalance !== undefined && (
            <div className="text-right text-xs font-bold text-gray-700">
              {receiptLang === "bn"
                ? "ফেরত পরবর্তী অবশিষ্ট জামানত: "
                : "Remaining Deposit Balance: "}
              <strong className="font-mono text-black font-black">
                {formatCurrency(receipt.remainingBalance, receiptLang)}
              </strong>
            </div>
          )}
        </div>

        {/* Mandatory Signature Lines: Tenant and Landlord/Owner */}
        <div className="pt-10">
          <div className="flex justify-between items-end text-xs">
            <div className="text-center w-52">
              <div className="border-t-2 border-black pt-1 font-black text-black">
                {receiptLang === "bn"
                  ? "ভাড়াটিয়ার স্বাক্ষর (অর্থ প্রাপ্তি নিশ্চিতকরণ)"
                  : "Tenant's Signature (Payment Received)"}
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {receiptLang === "bn"
                  ? "আমি উপরিউক্ত অর্থ বুঝে পেয়ে স্বাক্ষর করলাম।"
                  : "I hereby confirm receipt of the refunded amount."}
              </p>
            </div>

            <div className="text-center w-52">
              <div className="border-t-2 border-black pt-1 font-black text-black">
                {receiptLang === "bn"
                  ? "মার্কেট কর্তৃপক্ষ / মালিকের স্বাক্ষর"
                  : "Authorized Landlord / Owner Signature"}
              </div>
              <p className="text-[10px] text-gray-600 font-bold mt-0.5">
                Paid by: {receipt.paidBy || "Admin"}
              </p>
              {receipt.approvedBy && (
                <p className="text-[9px] text-gray-500">
                  Approved by: {receipt.approvedBy}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-3 border-t border-dashed border-black/20 text-center text-[10px] text-gray-500 font-bold">
          {receiptLang === "bn"
            ? "এই ভাউচারটি জামানত ফেরতের বৈধ প্রমাণ হিসেবে সংরক্ষিত থাকবে।"
            : "This voucher serves as legal proof of tenant deposit refund."}
        </div>
      </div>
    </Dialog>
  );
}
