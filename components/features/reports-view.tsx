"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits, formatMonth, formatPercent } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileDown,
  Loader2,
  Calendar,
  Layers,
  Users,
  Building2,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { formatFloorName } from "@/lib/floors";

export function ReportsView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, selectedMonth, selectedYear, markets } = useApp();

  const [reportType, setReportType] = useState<string>("monthly_collection");
  const [marketFilter, setMarketFilter] = useState<string>(selectedMarketId || "ALL");
  const [reportMonth, setReportMonth] = useState<number>(selectedMonth || 10);
  const [reportYear, setReportYear] = useState<number>(selectedYear || 2026);
  const [tenantId, setTenantId] = useState<string>("");

  const [data, setData] = useState<any>(null);
  const [availableTenants, setAvailableTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleAllCategories = () => {
    if (!data?.rows) return;
    if (expandedCategories.size === data.rows.length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(
        new Set(data.rows.map((r: any, idx: number) => r.categoryId || String(idx)))
      );
    }
  };

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          type: reportType,
          marketId: marketFilter,
          month: String(reportMonth),
          year: String(reportYear),
        });
        if (tenantId) params.set("tenantId", tenantId);

        const res = await fetch(`/api/reports?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.availableTenants) {
            setAvailableTenants(json.availableTenants);
            if (!tenantId && json.availableTenants.length > 0) {
              setTenantId(json.availableTenants[0].id);
            }
          }
        }
      } catch (e) {
        console.error("Report fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [reportType, marketFilter, reportMonth, reportYear, tenantId]);

  // Export to Excel (XLSX) with native numeric cells!
  const handleExportExcel = () => {
    if (!data) return;

    let sheetData: any[] = [];
    let fileName = `report-${reportType}-${reportYear}`;

    if (reportType === "monthly_collection" && data.rows) {
      fileName = `monthly-collection-${reportMonth}-${reportYear}`;
      sheetData = data.rows.map((r: any) => ({
        [t("markets.marketName")]: r.marketName,
        [t("shops.shopNumber")]: r.shopNumber,
        [t("shops.floor")]: r.floor,
        [t("tenants.tenantName")]: r.tenantName,
        [t("tenants.phone")]: r.phone,
        [locale === "bn" ? "মূল ভাড়া (টাকা)" : "Base Rent (BDT)"]: Math.round((r.rentAmount || 0) / 100),
        [locale === "bn" ? "ইউটিলিটি ও অন্যান্য (টাকা)" : "Utilities & Other (BDT)"]: Math.round((r.utilityAmount || 0) / 100),
        [locale === "bn" ? "চলতি মাসের বিল (টাকা)" : "Current Month Bill (BDT)"]: Math.round((r.currentMonthBill || (r.rentAmount + (r.utilityAmount || 0)) || 0) / 100),
        [locale === "bn" ? "পূর্বের বকেয়া (টাকা)" : "Previous Arrears (BDT)"]: Math.round((r.carryForwardDue || 0) / 100),
        [locale === "bn" ? "সর্বমোট দাবি (টাকা)" : "Total Demand (BDT)"]: Math.round((r.totalDemand || r.totalAmount || 0) / 100),
        [locale === "bn" ? "আদায়কৃত (টাকা)" : "Paid Amount (BDT)"]: Math.round((r.paidAmount || 0) / 100),
        [locale === "bn" ? "সর্বমোট বকেয়া (টাকা)" : "Total Due (BDT)"]: Math.round((r.dueAmount || 0) / 100),
        [t("common.status")]: r.status,
      }));
    } else if (reportType === "month_wise_summary" && data.rows) {
      fileName = `month-wise-report-${reportYear}`;
      sheetData = data.rows.map((r: any) => ({
        [locale === "bn" ? "মাস" : "Month"]: formatMonth(r.month, locale),
        [t("billing.totalBill")]: Math.round(r.totalBilled / 100),
        [t("billing.paidAmount")]: Math.round(r.totalCollected / 100),
        [t("billing.dueAmount")]: Math.round(r.totalDue / 100),
        [t("reports.totalExpenses")]: Math.round(r.totalExpense / 100),
        [t("reports.netIncome")]: Math.round(r.netProfit / 100),
        [t("reports.collectionEfficiency")]: Math.round(r.collectionRate),
        [locale === "bn" ? "পরিশোধিত দোকান" : "Paid Shops"]: r.paidCount,
        [locale === "bn" ? "বকেয়া দোকান" : "Due Shops"]: r.dueCount,
      }));
      if (data.summary) {
        sheetData.push({
          [locale === "bn" ? "মাস" : "Month"]: locale === "bn" ? "বার্ষিক মোট (Yearly Total)" : "Yearly Total",
          [t("billing.totalBill")]: Math.round(data.summary.yearlyBilled / 100),
          [t("billing.paidAmount")]: Math.round(data.summary.yearlyCollected / 100),
          [t("billing.dueAmount")]: Math.round(data.summary.yearlyDue / 100),
          [t("reports.totalExpenses")]: Math.round(data.summary.yearlyExpense / 100),
          [t("reports.netIncome")]: Math.round(data.summary.yearlyNetProfit / 100),
          [t("reports.collectionEfficiency")]: Math.round(data.summary.yearlyCollectionRate),
          [locale === "bn" ? "পরিশোধিত দোকান" : "Paid Shops"]: "",
          [locale === "bn" ? "বকেয়া দোকান" : "Due Shops"]: "",
        });
      }
    } else if (reportType === "market_pnl" && data.rows) {
      fileName = `market-profit-loss-${reportMonth > 0 ? reportMonth + "-" : ""}${reportYear}`;
      sheetData = data.rows.map((r: any) => ({
        [t("markets.marketName")]: r.marketName,
        [t("markets.totalShops")]: r.totalShops,
        [t("reports.totalRevenue")]: Math.round(r.totalCollected / 100),
        [t("reports.totalExpenses")]: Math.round(r.totalExpenses / 100),
        [t("reports.netIncome")]: Math.round(r.netProfit / 100),
        [t("reports.collectionEfficiency")]: Math.round(r.collectionRate),
      }));
    } else if (reportType === "expense_by_category" && data.rows) {
      fileName = `expense-by-category-${reportMonth > 0 ? reportMonth + "-" : ""}${reportYear}`;
      sheetData = data.rows.map((r: any) => ({
        [t("expenses.category")]: locale === "bn" ? r.name_bn || r.name_en : r.name_en || r.name_bn,
        [t("expenses.amount")]: Math.round(r.totalAmount / 100),
        "Percentage (%)": Math.round(r.percentage),
      }));
    } else if (reportType === "settlements" && data.rows) {
      fileName = `settlements-report-${reportMonth > 0 ? reportMonth + "-" : ""}${reportYear}`;
      sheetData = data.rows.map((s: any) => ({
        [t("common.date")]: formatDate(s.settledAt, locale),
        [t("markets.marketName")]: s.marketName,
        [t("shops.shopNumber")]: s.shopNumber,
        [t("tenants.tenantName")]: s.tenantName,
        [t("tenants.phone")]: s.phone,
        [t("advance.advanceHeld")]: Math.round(s.advanceBalance / 100),
        [t("dashboard.totalDue")]: Math.round(s.totalDue / 100),
        "Deductions": Math.round(s.totalDeductions / 100),
        "Unrecovered Receivable": Math.round(s.unrecoveredAmount / 100),
        "Refund Amount": Math.round(s.refundAmount / 100),
        "Confirmed By": s.confirmedBy,
      }));
    } else if (reportType === "unrecovered_receivables" && data.rows) {
      fileName = `unrecovered-receivables-${reportMonth > 0 ? reportMonth + "-" : ""}${reportYear}`;
      sheetData = data.rows.map((u: any) => ({
        [t("markets.marketName")]: u.marketName,
        [t("shops.shopNumber")]: u.shopNumber,
        [t("tenants.tenantName")]: u.tenantName,
        [t("tenants.phone")]: u.phone,
        [t("dashboard.totalDue")]: Math.round(u.totalDue / 100),
        [t("advance.advanceHeld")]: Math.round(u.advanceBalance / 100),
        "Unrecovered Loss (BDT)": Math.round(u.unrecoveredAmount / 100),
        [t("common.date")]: formatDate(u.settledAt, locale),
      }));
    } else if (reportType === "collector_summary" && data.rows) {
      fileName = `collector-performance-${reportMonth}-${reportYear}`;
      sheetData = data.rows.map((c: any) => ({
        "Collector Name": c.collectorName,
        "Role": c.role,
        "Total Collections (Count)": c.count,
        "Cash (BDT)": Math.round(c.cashAmount / 100),
        "bKash (BDT)": Math.round(c.bkashAmount / 100),
        "Nagad (BDT)": Math.round(c.nagadAmount / 100),
        "Bank (BDT)": Math.round(c.bankAmount / 100),
        "Total Collected (BDT)": Math.round(c.totalAmount / 100),
        "Share (%)": Math.round(c.percentage),
      }));
    } else if (reportType === "channel_summary" && data.rows) {
      fileName = `channel-accounts-${reportMonth}-${reportYear}`;
      sheetData = data.rows.map((ch: any) => ({
        "Channel / Account": ch.channelName,
        "Method": ch.method,
        "Collections (Count)": ch.count,
        "Total Received (BDT)": Math.round(ch.totalAmount / 100),
        "Share (%)": Math.round(ch.percentage),
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "monthly_collection":
        return locale === "bn" ? "মাসিক ভাড়া ও ইউটিলিটি আদায় বিবরণী" : "Monthly Rent & Utility Collection Report";
      case "month_wise_summary":
        return locale === "bn" ? "মাসভিত্তিক সমন্বিত আর্থিক বিবরণী (১২ মাস)" : "Month-wise Financial Statement (12 Months)";
      case "market_pnl":
        return locale === "bn" ? "মার্কেটভিত্তিক লাভ-ক্ষতি বিবরণী" : "Market Profit & Loss Statement";
      case "expense_by_category":
        return locale === "bn" ? "খাতওয়ারী ব্যয়ের বিস্তারিত প্রতিবেদন" : "Category-wise Expense Report";
      case "collector_summary":
        return locale === "bn" ? "কালেক্টর ও স্টাফ আদায় পারফরম্যান্স রিপোর্ট" : "Collector & Staff Performance Report";
      case "channel_summary":
        return locale === "bn" ? "পেমেন্ট চ্যানেল ও একাউন্ট বিবরণী" : "Payment Channel & Account Summary";
      case "tenant_ledger":
        return locale === "bn"
          ? `ভাড়াটিয়ার লেজার ও হিসাব বিবরণী — ${data?.tenant?.name || ""}`
          : `Tenant Ledger & Statement — ${data?.tenant?.name || ""}`;
      case "settlements":
        return locale === "bn" ? "দোকান নিষ্পত্তি ও জামানত সমন্বয় রিপোর্ট" : "Shop Settlement & Exit Statement";
      case "unrecovered_receivables":
        return locale === "bn" ? "অনাদায়ী পাওনা ও আর্থিক ক্ষতি রিপোর্ট" : "Unrecovered Receivables Report";
      default:
        return t("reports.title");
    }
  };

  const getMarketLabel = () => {
    if (reportType === "tenant_ledger") {
      return data?.tenant?.marketName || (locale === "bn" ? "সকল মার্কেট" : "All Markets");
    }
    if (marketFilter === "ALL") {
      return locale === "bn" ? "সকল মার্কেট" : "All Markets";
    }
    const found = markets.find((m) => m.id === marketFilter);
    return found ? found.name : marketFilter;
  };

  const getPeriodLabel = () => {
    if (reportMonth > 0) {
      return formatMonth(reportMonth, locale, reportYear);
    }
    return locale === "bn" ? `সম্পূর্ণ বছর — ${toBanglaDigits(reportYear)}` : `Full Year — ${reportYear}`;
  };

  const handleDownloadPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsDownloadingPdf(true);

    const wasDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const originalStyles: { el: HTMLElement; overflow: string; maxWidth: string }[] = [];

    try {
      // 1. Temporarily switch off dark mode so exported PDF is crisp white paper background
      if (wasDark) {
        document.documentElement.classList.remove("dark");
      }

      // 2. Unconstrain table scroll containers so full-width tables are captured completely
      const scrollContainers = reportContainerRef.current.querySelectorAll<HTMLElement>(".overflow-x-auto");
      scrollContainers.forEach((el) => {
        originalStyles.push({ el, overflow: el.style.overflow, maxWidth: el.style.maxWidth });
        el.style.overflow = "visible";
        el.style.maxWidth = "none";
      });

      // Brief tick to allow DOM layout reflow
      await new Promise((resolve) => setTimeout(resolve, 80));

      const isLandscape = reportType !== "tenant_ledger";
      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;
      const margin = 6;
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pdfHeight - margin * 2;

      // 3. High-resolution canvas snapshot via html-to-image
      const dataUrl = await toPng(reportContainerRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const totalImgHeightMm = (img.naturalHeight * printableWidth) / img.naturalWidth;

      if (totalImgHeightMm <= printableHeight) {
        // Fits entirely on a single page
        pdf.addImage(dataUrl, "PNG", margin, margin, printableWidth, totalImgHeightMm, undefined, "FAST");
      } else {
        // Multi-page slicing using canvas tiles
        const pxPerMm = img.naturalWidth / printableWidth;
        const sPageHeightPx = Math.floor(printableHeight * pxPerMm);

        let currentY = 0;
        let pageIndex = 0;

        while (currentY < img.naturalHeight) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          const sliceHeightPx = Math.min(sPageHeightPx, img.naturalHeight - currentY);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = sliceHeightPx;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              img,
              0,
              currentY,
              img.naturalWidth,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );

            const sliceDataUrl = canvas.toDataURL("image/png");
            const sliceHeightMm = (sliceHeightPx * printableWidth) / img.naturalWidth;

            pdf.addImage(sliceDataUrl, "PNG", margin, margin, printableWidth, sliceHeightMm, undefined, "FAST");
          }

          currentY += sliceHeightPx;
          pageIndex++;
        }
      }

      // Generate localized, clean file name
      const typeSlug = reportType.replace(/_/g, "-");
      const marketSlug = (getMarketLabel() || "report").replace(/[\s/\\?%*:|"<>]+/g, "-");
      const periodSlug = (reportMonth > 0 ? `${reportMonth}-${reportYear}` : `${reportYear}`).replace(/[\s/\\?%*:|"<>]+/g, "-");
      const fileName = `Report_${typeSlug}_${marketSlug}_${periodSlug}.pdf`;

      pdf.save(fileName);

      toast.success(
        locale === "bn"
          ? "রিপোর্টটি সফলভাবে পিডিএফ ফর্মেটে ডাউনলোড হয়েছে!"
          : "Report PDF downloaded successfully!"
      );
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(
        locale === "bn"
          ? "পিডিএফ তৈরিতে সমস্যা হয়েছে। 'প্রিন্ট' অপশন থেকে 'Save as PDF' করতে পারেন।"
          : "Failed to download PDF. Please use the Print option and select 'Save as PDF'."
      );
    } finally {
      // Restore original scroll overflow styles
      originalStyles.forEach(({ el, overflow, maxWidth }) => {
        el.style.overflow = overflow;
        el.style.maxWidth = maxWidth;
      });

      // Restore dark mode if it was active
      if (wasDark) {
        document.documentElement.classList.add("dark");
      }

      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>{t("reports.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-bold mt-1">
            {t("reports.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export */}
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isLoading || !data}
            className="font-black border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Download className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("reports.exportExcel")}
          </Button>

          {/* Direct PDF Download (requested by user) */}
          <Button
            onClick={handleDownloadPdf}
            disabled={isLoading || !data || isDownloadingPdf}
            className="font-black border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] bg-[#FED734] text-black hover:bg-[#FED734]/90"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin stroke-[2.5]" />
            ) : (
              <FileDown className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            )}
            {locale === "bn" ? "পিডিএফ ডাউনলোড" : "Download PDF"}
          </Button>

          {/* Print / Save as PDF */}
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isLoading || !data}
            className="font-black border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Printer className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {locale === "bn" ? "প্রিন্ট" : "Print"}
          </Button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex p-1.5 bg-[#FBF9F5] dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] rounded-xl overflow-x-auto no-scrollbar no-print gap-1">
        {[
          { id: "monthly_collection", labelKey: "reports.monthlyCollection" },
          { id: "month_wise_summary", labelKey: "reports.monthWiseSummary" },
          { id: "market_pnl", labelKey: "reports.marketProfitLoss" },
          { id: "expense_by_category", labelKey: "reports.expenseByCategory" },
          { id: "collector_summary", customLabel: locale === "bn" ? "কালেক্টর ও স্টাফ আদায়" : "Collector Performance" },
          { id: "channel_summary", customLabel: locale === "bn" ? "পেমেন্ট চ্যানেল ও একাউন্ট" : "Payment Channels" },
          { id: "tenant_ledger", labelKey: "reports.tenantLedger" },
          { id: "settlements", labelKey: "reports.settlements" },
          { id: "unrecovered_receivables", labelKey: "reports.unrecoveredReceivables" },
        ].map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-3.5 py-2 text-xs md:text-sm font-black rounded-lg shrink-0 transition-all cursor-pointer border-2 ${
              reportType === tab.id
                ? "bg-[#FED734] text-black border-black shadow-[2px_2px_0px_#000000]"
                : "border-transparent text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {tab.customLabel || t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Filter Bar (Consistent 3-Column Across ALL Report Types: [Market / Tenant] [Month] [Year]) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000] no-print">
        {reportType !== "tenant_ledger" ? (
          <SearchableSelect
            label={t("collections.selectMarket")}
            value={marketFilter}
            onChange={(val) => setMarketFilter(val || "ALL")}
            options={[
              { value: "ALL", label: t("common.allMarkets") },
              ...markets.map((m) => ({
                value: m.id,
                label: m.name,
                sublabel: `${m.totalShops || 0} ${locale === "bn" ? "দোকান" : "Shops"}`,
              })),
            ]}
            placeholder="Select market..."
            searchPlaceholder={locale === "bn" ? "মার্কেট খুঁজুন..." : "Search market..."}
          />
        ) : (
          <SearchableSelect
            label={t("tenants.tenantName")}
            value={tenantId}
            onChange={(val) => setTenantId(val)}
            options={availableTenants.map((ten) => ({
              value: ten.id,
              label: `${ten.name} (${ten.shopNumber})`,
              sublabel: `${ten.marketName} • ${ten.phone}`,
            }))}
            placeholder="Select tenant..."
            searchPlaceholder={locale === "bn" ? "ভাড়াটিয়া বা দোকান খুঁজুন..." : "Search tenant..."}
          />
        )}

        {/* Month Dropdown Filtering - Displayed on EVERY page of reports */}
        <Select
          label={t("dashboard.selectMonth")}
          value={reportMonth}
          onChange={(e) => setReportMonth(Number(e.target.value))}
        >
          <option value={0}>
            {locale === "bn" ? "সকল মাস (পুরো বছর)" : "All Months (Whole Year)"}
          </option>
          {Array.from({ length: 12 }, (_, i) => ({
            val: i + 1,
            name: formatMonth(i + 1, locale),
          })).map((m) => (
            <option key={m.val} value={m.val}>
              {m.name}
            </option>
          ))}
        </Select>

        {/* Year Dropdown */}
        <Select
          label={t("dashboard.selectYear")}
          value={reportYear}
          onChange={(e) => setReportYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026, 2027, 2028].map((y) => (
            <option key={y} value={y}>
              {locale === "bn" ? toBanglaDigits(y) : y}
            </option>
          ))}
        </Select>
      </div>

      {/* Report Data Display */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : !data ? (
        <Card className="p-12 text-center text-slate-500">{t("common.noData")}</Card>
      ) : (
        <div ref={reportContainerRef} className="space-y-4 print-report-container bg-transparent">
          {/* Branded Official Report Header (visible on preview, in PDF, and in Print) */}
          <div className="bg-[#FED734] border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000000] text-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black text-[#FED734] flex items-center justify-center font-black text-xl border-2 border-black shadow-[2px_2px_0px_#000000] shrink-0">
                  R
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black">
                      {t("common.appName")}
                    </h1>
                    <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 rounded border border-black">
                      {locale === "bn" ? "অফিসিয়াল রিপোর্ট" : "Official Report"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-black text-black/90 mt-0.5">
                    {getReportTitle()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="text-black/75">{locale === "bn" ? "মার্কেট:" : "Market:"}</span>
                  <span className="font-black bg-white text-black px-2.5 py-0.5 rounded-md border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
                    {getMarketLabel()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-black/75">{locale === "bn" ? "সময়কাল:" : "Period:"}</span>
                  <span className="font-black bg-white text-black px-2.5 py-0.5 rounded-md border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
                    {getPeriodLabel()}
                  </span>
                </div>
                <div className="text-[10px] text-black/75 font-mono">
                  {locale === "bn" ? "জেনারেটেড: " : "Generated: "}
                  {new Date().toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* 1. Monthly Collection Report Table */}
          {/* 1. Monthly Collection Report Table */}
          {reportType === "monthly_collection" && data.rows && (() => {
            const totalRent = (data.rows || []).reduce((sum: number, r: any) => sum + (r.rentAmount || 0), 0);
            const totalUtility = (data.rows || []).reduce((sum: number, r: any) => sum + (r.utilityAmount || 0), 0);
            const totalCurrentBill = (data.rows || []).reduce(
              (sum: number, r: any) => sum + (r.currentMonthBill || (r.rentAmount + (r.utilityAmount || 0))),
              0
            );
            const totalCarryForwardDue = (data.rows || []).reduce(
              (sum: number, r: any) => sum + (r.carryForwardDue || 0),
              0
            );
            const totalDemand = (data.rows || []).reduce(
              (sum: number, r: any) => sum + (r.totalDemand || r.totalAmount || 0),
              0
            );
            const totalPaid = (data.rows || []).reduce((sum: number, r: any) => sum + (r.paidAmount || 0), 0);
            const totalDue = (data.rows || []).reduce((sum: number, r: any) => sum + (r.dueAmount || 0), 0);

            return (
              <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                        <th className="p-3 whitespace-nowrap">{t("shops.shopNumber")}</th>
                        <th className="p-3 whitespace-nowrap">{t("tenants.tenantName")}</th>
                        <th className="p-3 whitespace-nowrap">{t("markets.marketName")}</th>
                        <th className="p-3 text-right whitespace-nowrap">{locale === "bn" ? "মূল ভাড়া" : "Base Rent"}</th>
                        <th className="p-3 text-right whitespace-nowrap">{locale === "bn" ? "বিদ্যুৎ/ইউটিলিটি" : "Utilities & Other"}</th>
                        <th className="p-3 text-right whitespace-nowrap">{locale === "bn" ? "চলতি বিল" : "Current Bill"}</th>
                        <th className="p-3 text-right whitespace-nowrap">{locale === "bn" ? "পূর্বের বকেয়া" : "Previous Arrears"}</th>
                        <th className="p-3 text-right whitespace-nowrap">{locale === "bn" ? "সর্বমোট দাবি" : "Total Demand"}</th>
                        <th className="p-3 text-right whitespace-nowrap">{t("billing.paidAmount")}</th>
                        <th className="p-3 text-right whitespace-nowrap">{locale === "bn" ? "সর্বমোট বকেয়া" : "Total Due"}</th>
                        <th className="p-3 text-center whitespace-nowrap">{t("common.status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                      {data.rows.map((row: any, idx: number) => {
                        const curBill = row.currentMonthBill || (row.rentAmount + (row.utilityAmount || 0));
                        const demand = row.totalDemand || (curBill + (row.carryForwardDue || 0));

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15 transition-colors"
                          >
                            <td className="p-3 font-black text-black dark:text-white whitespace-nowrap">
                              {row.shopNumber}
                            </td>
                            <td className="p-3 font-bold text-black dark:text-white">
                              <p>{row.tenantName}</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{row.phone}</p>
                            </td>
                            <td className="p-3 text-gray-600 dark:text-gray-400 font-bold whitespace-nowrap">{row.marketName}</td>

                            {/* 1. Base Rent Column */}
                            <td className="p-3 text-right font-bold text-black dark:text-white font-mono whitespace-nowrap">
                              {formatCurrency(row.rentAmount, locale)}
                            </td>

                            {/* 2. Utility & Other Charges Column */}
                            <td className="p-3 text-right font-bold text-amber-700 dark:text-amber-400 font-mono whitespace-nowrap">
                              {row.utilityAmount > 0 ? (
                                <div>
                                  <span>{formatCurrency(row.utilityAmount, locale)}</span>
                                  {row.billItems && row.billItems.length > 0 && (
                                    <p
                                      className="text-[10px] text-gray-500 dark:text-gray-400 font-normal truncate max-w-[130px] ml-auto"
                                      title={row.billItems.map((i: any) => `${i.description}: ${formatCurrency(i.amount, locale)}`).join(", ")}
                                    >
                                      {row.billItems.map((i: any) => i.description).join("+")}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">—</span>
                              )}
                            </td>

                            {/* 3. Current Month Bill Column */}
                            <td className="p-3 text-right font-black text-black dark:text-white font-mono whitespace-nowrap">
                              {formatCurrency(curBill, locale)}
                            </td>

                            {/* 4. Previous Arrears (Carry Forward) Column */}
                            <td className="p-3 text-right font-black font-mono whitespace-nowrap">
                              {row.carryForwardDue > 0 ? (
                                <div
                                  className="inline-flex flex-col items-end"
                                  title={
                                    row.priorUnpaidList && row.priorUnpaidList.length > 0
                                      ? row.priorUnpaidList
                                          .map((p: any) => `${formatMonth(p.month, locale, p.year)}: ${formatCurrency(p.dueAmount, locale)}`)
                                          .join(", ")
                                      : undefined
                                  }
                                >
                                  <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-xs">
                                    +{formatCurrency(row.carryForwardDue, locale)}
                                  </span>
                                  {row.priorUnpaidList && row.priorUnpaidList.length > 1 && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400/80 font-normal mt-0.5">
                                      ({toBanglaDigits(row.priorUnpaidList.length)} {locale === "bn" ? "মাসের বকেয়া" : "months"})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 font-bold">—</span>
                              )}
                            </td>

                            {/* 5. Total Demand Column (Current Bill + Previous Arrears) */}
                            <td className="p-3 text-right font-black text-black dark:text-white font-mono whitespace-nowrap bg-black/[0.02] dark:bg-white/[0.02]">
                              {formatCurrency(demand, locale)}
                            </td>

                            {/* 6. Paid Amount Column */}
                            <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                              {row.paidAmount > 0 ? formatCurrency(row.paidAmount, locale) : <span className="text-gray-400 font-bold">—</span>}
                            </td>

                            {/* 7. Total Due Column (Current Due + Previous Arrears) */}
                            <td className="p-3 text-right font-black text-red-600 dark:text-red-400 font-mono whitespace-nowrap">
                              {row.dueAmount > 0 ? (
                                <div>
                                  <span>{formatCurrency(row.dueAmount, locale)}</span>
                                  {row.carryForwardDue > 0 && row.effectiveDue > 0 && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                                      {locale === "bn" ? "চলতি:" : "Cur:"} {formatCurrency(row.effectiveDue, locale)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                  {locale === "bn" ? "পরিশোধিত" : "PAID"}
                                </span>
                              )}
                            </td>

                            {/* 8. Status Column */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Summary Footer Row */}
                    <tfoot className="border-t-2 border-black bg-[#FBF9F5] dark:bg-[#18191E] font-black text-black dark:text-white">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-black">
                          {locale === "bn" ? "সর্বমোট (Total):" : "Total:"}
                        </td>
                        <td className="p-3 text-right font-mono font-black whitespace-nowrap">
                          {formatCurrency(totalRent, locale)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {totalUtility > 0 ? formatCurrency(totalUtility, locale) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-black whitespace-nowrap">
                          {formatCurrency(totalCurrentBill, locale)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {totalCarryForwardDue > 0 ? `+${formatCurrency(totalCarryForwardDue, locale)}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-black whitespace-nowrap bg-black/[0.04] dark:bg-white/[0.04]">
                          {formatCurrency(totalDemand, locale)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(totalPaid, locale)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-red-600 dark:text-red-400 whitespace-nowrap">
                          {totalDue > 0 ? formatCurrency(totalDue, locale) : "—"}
                        </td>
                        <td className="p-3 text-center font-mono whitespace-nowrap">
                          {toBanglaDigits((data.rows || []).length)} {locale === "bn" ? "টি দোকান" : "shops"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            );
          })()}

          {/* 1b. Month-Wise Financial Statement */}
          {reportType === "month_wise_summary" && data.rows && (
            <div className="space-y-4">
              {/* Yearly KPI Summary Cards */}
              {data.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Card className="p-3.5 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000]">
                    <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {locale === "bn" ? "বার্ষিক মোট দাবি" : "Yearly Total Billed"}
                    </p>
                    <p className="text-base md:text-xl font-black text-black dark:text-white mt-1 font-mono">
                      {formatCurrency(data.summary.yearlyBilled, locale)}
                    </p>
                  </Card>

                  <Card className="p-3.5 rounded-xl border-2 border-black bg-[#E8F8F0] dark:bg-[#132A1E] shadow-[3px_3px_0px_#000000]">
                    <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      {locale === "bn" ? "বার্ষিক আদায়" : "Yearly Collected"}
                    </p>
                    <p className="text-base md:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                      {formatCurrency(data.summary.yearlyCollected, locale)}
                    </p>
                  </Card>

                  <Card className="p-3.5 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000]">
                    <p className="text-[11px] font-black text-[#FF4B55] dark:text-[#FF6B75] uppercase tracking-wider">
                      {locale === "bn" ? "বার্ষিক বকেয়া" : "Yearly Total Due"}
                    </p>
                    <p className="text-base md:text-xl font-black text-[#FF4B55] dark:text-[#FF6B75] mt-1 font-mono">
                      {formatCurrency(data.summary.yearlyDue, locale)}
                    </p>
                  </Card>

                  <Card className="p-3.5 rounded-xl border-2 border-black bg-[#FFF8D6] dark:bg-[#2C2405] shadow-[3px_3px_0px_#000000]">
                    <p className="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      {locale === "bn" ? "বার্ষিক পরিচালন ব্যয়" : "Yearly Expenses"}
                    </p>
                    <p className="text-base md:text-xl font-black text-amber-800 dark:text-amber-300 mt-1 font-mono">
                      {formatCurrency(data.summary.yearlyExpense, locale)}
                    </p>
                  </Card>

                  <Card className="p-3.5 rounded-xl border-2 border-black bg-[#FED734]/25 shadow-[3px_3px_0px_#000000] col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-black text-black dark:text-white uppercase tracking-wider">
                      {locale === "bn" ? "বার্ষিক নিট লাভ" : "Yearly Net Profit"}
                    </p>
                    <p className="text-base md:text-xl font-black text-black dark:text-white mt-1 font-mono">
                      {formatCurrency(data.summary.yearlyNetProfit, locale)}
                    </p>
                  </Card>
                </div>
              )}

              {/* Monthly Statement Table */}
              <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                        <th className="p-3.5">{locale === "bn" ? "মাস" : "Month"}</th>
                        <th className="p-3.5 text-right">{t("billing.totalBill")}</th>
                        <th className="p-3.5 text-right">{t("billing.paidAmount")}</th>
                        <th className="p-3.5 text-right">{t("billing.dueAmount")}</th>
                        <th className="p-3.5 text-right">{t("reports.totalExpenses")}</th>
                        <th className="p-3.5 text-right">{t("reports.netIncome")}</th>
                        <th className="p-3.5 text-right">{t("reports.collectionEfficiency")}</th>
                        <th className="p-3.5 text-center">{locale === "bn" ? "পরিশোধ / বকেয়া" : "Paid / Due"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                      {data.rows.map((row: any) => {
                        const isSelectedMonth = reportMonth > 0 && row.month === reportMonth;
                        return (
                          <tr
                            key={row.month}
                            className={`transition-colors ${
                              isSelectedMonth
                                ? "bg-[#FED734]/25 font-bold"
                                : "hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15"
                            }`}
                          >
                            <td className="p-3.5 font-black text-black dark:text-white flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-md border-2 border-black font-black text-[11px] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000000] ${
                                  isSelectedMonth
                                    ? "bg-[#FED734] text-black"
                                    : "bg-white dark:bg-[#262830] text-black dark:text-white"
                                }`}
                              >
                                {locale === "bn" ? toBanglaDigits(row.month) : row.month}
                              </span>
                              <span>{formatMonth(row.month, locale, reportYear)}</span>
                              {isSelectedMonth && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-black bg-[#FED734] text-black font-black ml-1 shadow-[1px_1px_0px_#000000]">
                                  {locale === "bn" ? "নির্বাচিত" : "Selected"}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-bold text-black dark:text-white">
                              {formatCurrency(row.totalBilled, locale)}
                            </td>
                            <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.totalCollected, locale)}
                            </td>
                            <td className="p-3.5 text-right font-black text-red-600 dark:text-red-400">
                              {row.totalDue > 0 ? formatCurrency(row.totalDue, locale) : "—"}
                            </td>
                            <td className="p-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(row.totalExpense, locale)}
                            </td>
                            <td className={`p-3.5 text-right font-black ${row.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                              {formatCurrency(row.netProfit, locale)}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-black text-xs text-black dark:text-white">
                                  {formatPercent(row.collectionRate, locale)}
                                </span>
                                <div className="w-12 bg-white dark:bg-[#262830] border border-black h-2 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-[#FED734]"
                                    style={{ width: `${Math.min(100, Math.round(row.collectionRate))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-center text-xs font-black">
                              <span className="inline-flex items-center gap-1 font-black text-emerald-600">
                                {locale === "bn" ? toBanglaDigits(row.paidCount) : row.paidCount}
                              </span>
                              <span className="text-black/40 dark:text-white/40 mx-1 font-black">/</span>
                              <span className="inline-flex items-center gap-1 font-black text-red-500">
                                {locale === "bn" ? toBanglaDigits(row.dueCount + row.partialCount) : row.dueCount + row.partialCount}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {data.summary && (
                      <tfoot>
                        <tr className="bg-[#FBF9F5] dark:bg-[#262830] font-black border-t-2 border-black">
                          <td className="p-3.5 text-black dark:text-white">
                            {locale === "bn" ? "বার্ষিক মোট (Yearly Total)" : "Yearly Total"}
                          </td>
                          <td className="p-3.5 text-right text-black dark:text-white">
                            {formatCurrency(data.summary.yearlyBilled, locale)}
                          </td>
                          <td className="p-3.5 text-right text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(data.summary.yearlyCollected, locale)}
                          </td>
                          <td className="p-3.5 text-right text-red-600 dark:text-red-400">
                            {formatCurrency(data.summary.yearlyDue, locale)}
                          </td>
                          <td className="p-3.5 text-right text-amber-700 dark:text-amber-400">
                            {formatCurrency(data.summary.yearlyExpense, locale)}
                          </td>
                          <td className={`p-3.5 text-right ${data.summary.yearlyNetProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"}`}>
                            {formatCurrency(data.summary.yearlyNetProfit, locale)}
                          </td>
                          <td className="p-3.5 text-right text-black dark:text-white">
                            {formatPercent(data.summary.yearlyCollectionRate, locale)}
                          </td>
                          <td className="p-3.5 text-center text-gray-500">
                            —
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 2. Market Profit & Loss Statement */}
          {reportType === "market_pnl" && data.rows && (
            <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
              <div className="p-3.5 bg-[#FBF9F5] dark:bg-[#262830] border-b-2 border-black flex items-center justify-between">
                <span className="text-xs font-black text-black dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-black dark:text-white stroke-[2.5]" />
                  <span>
                    {reportMonth > 0
                      ? `${formatMonth(reportMonth, locale, reportYear)} — ${t("reports.marketProfitLoss")}`
                      : `${reportYear} — ${t("reports.marketProfitLoss")} (${locale === "bn" ? "পুরো বছর" : "Full Year"})`}
                  </span>
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-md border border-black bg-[#FED734] text-black shadow-[1px_1px_0px_#000000]">
                  {reportMonth > 0 ? formatMonth(reportMonth, locale) : (locale === "bn" ? "১২ মাস" : "12 Months")}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                      <th className="p-3.5">{t("markets.marketName")}</th>
                      <th className="p-3.5 text-center">{t("markets.totalShops")}</th>
                      <th className="p-3.5 text-right">{t("reports.totalRevenue")}</th>
                      <th className="p-3.5 text-right">{t("reports.totalExpenses")}</th>
                      <th className="p-3.5 text-right">{t("reports.netIncome")}</th>
                      <th className="p-3.5 text-right">{t("reports.collectionEfficiency")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                    {data.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15">
                        <td className="p-3.5 font-black text-black dark:text-white">
                          {row.marketName}
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          {locale === "bn" ? toBanglaDigits(row.totalShops) : row.totalShops}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.totalCollected, locale)}
                        </td>
                        <td className="p-3.5 text-right font-black text-amber-600 dark:text-amber-400">
                          {formatCurrency(row.totalExpenses, locale)}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(row.netProfit, locale)}
                        </td>
                        <td className="p-3.5 text-right font-black text-black dark:text-white">
                          {formatPercent(row.collectionRate, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 3. Expense Breakdown by Category (Interactive Open / Close Accordion) */}
          {reportType === "expense_by_category" && data.rows && (
            <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
              <div className="p-3.5 bg-[#FBF9F5] dark:bg-[#262830] border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-black dark:text-white">
                    {reportMonth > 0
                      ? `${formatMonth(reportMonth, locale, reportYear)} — ${t("reports.expenseByCategory")}`
                      : `${reportYear} — ${t("reports.expenseByCategory")} (${locale === "bn" ? "পুরো বছর" : "Full Year"})`}
                  </span>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 font-bold mt-0.5">
                    {locale === "bn"
                      ? "যে কোনো খরচের খাতে ক্লিক করে বিস্তারিত ওপেন / ক্লোজ করুন"
                      : "Click any category row to open/close detailed expense transactions"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAllCategories}
                    className="px-2.5 py-1 text-xs font-black rounded-lg border-2 border-black bg-white dark:bg-[#1E1F24] hover:bg-[#FED734] text-black dark:text-white hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                  >
                    {expandedCategories.size === data.rows.length
                      ? locale === "bn"
                        ? "সবগুলো বন্ধ করুন (Collapse All)"
                        : "Collapse All"
                      : locale === "bn"
                      ? "সবগুলো খুলুন (Expand All)"
                      : "Expand All"}
                  </button>

                  <span className="text-xs font-black text-black dark:text-white font-mono bg-[#FED734] px-2.5 py-1 rounded-lg border border-black shadow-[1px_1px_0px_#000000]">
                    {locale === "bn" ? "মোট খরচ: " : "Total: "}
                    {formatCurrency(data.totalAllExpenses || 0, locale)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                      <th className="p-3.5">{t("expenses.category")}</th>
                      <th className="p-3.5 text-center">Transactions</th>
                      <th className="p-3.5 text-right">{t("expenses.amount")}</th>
                      <th className="p-3.5 text-right">Share (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                    {data.rows.map((row: any, idx: number) => {
                      const catKey = row.categoryId || String(idx);
                      const isExpanded = expandedCategories.has(catKey);

                      return (
                        <React.Fragment key={catKey}>
                          <tr
                            onClick={() => toggleCategory(catKey)}
                            className="hover:bg-[#FED734]/15 dark:hover:bg-[#FED734]/20 cursor-pointer transition-colors select-none"
                          >
                            <td className="p-3.5 font-black text-black dark:text-white flex items-center gap-2.5">
                              <button
                                type="button"
                                className="w-6 h-6 flex items-center justify-center rounded-md border-2 border-black bg-white dark:bg-[#262830] text-black dark:text-white shadow-[1px_1px_0px_#000000] shrink-0"
                                title={isExpanded ? "ক্লোজ করুন" : "ওপেন করুন"}
                                aria-label="Toggle Category Accordion"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>

                              <span
                                className="w-3 h-3 rounded-full border border-black shrink-0"
                                style={{ backgroundColor: row.color || "#0d9488" }}
                              />

                              <div className="flex flex-col">
                                <span className="font-black text-sm">
                                  {locale === "bn" ? row.name_bn || row.name_en : row.name_en || row.name_bn}
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                  {isExpanded
                                    ? locale === "bn"
                                      ? "বিস্তারিত বন্ধ করতে ক্লিক করুন (ক্লোজ)"
                                      : "Click to close details"
                                    : locale === "bn"
                                    ? "খরচের বিস্তারিত দেখতে ক্লিক করুন (ওপেন)"
                                    : "Click to open details"}
                                </span>
                              </div>
                            </td>

                            <td className="p-3.5 text-center font-bold">
                              <span className="px-2 py-0.5 rounded-full bg-[#FBF9F5] dark:bg-[#262830] border border-black text-xs font-black">
                                {locale === "bn" ? toBanglaDigits(row.count) : row.count} টি
                              </span>
                            </td>

                            <td className="p-3.5 text-right font-black text-black dark:text-white font-mono text-sm">
                              {formatCurrency(row.totalAmount, locale)}
                            </td>

                            <td className="p-3.5 text-right font-black text-black dark:text-white">
                              {formatPercent(row.percentage, locale)}
                            </td>
                          </tr>

                          {/* Expanded Detailed Items Accordion Row */}
                          {isExpanded && (
                            <tr className="bg-[#FBF9F5] dark:bg-[#15161A] border-b-2 border-black">
                              <td colSpan={4} className="p-3 sm:p-4">
                                <div className="space-y-2 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] p-3.5 shadow-[2.5px_2.5px_0px_#000000] animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10 text-xs">
                                    <span className="font-black text-black dark:text-white flex items-center gap-1.5">
                                      <FolderOpen className="w-4 h-4 text-[#FED734] stroke-[2.5]" />
                                      <span>
                                        {locale === "bn" ? row.name_bn || row.name_en : row.name_en || row.name_bn} খাতের খরচের বিস্তারিত (
                                        {locale === "bn" ? toBanglaDigits(row.items?.length || 0) : row.items?.length || 0}টি এন্ট্রি)
                                      </span>
                                    </span>
                                    <span className="font-black font-mono text-black dark:text-white">
                                      মোট: {formatCurrency(row.totalAmount, locale)}
                                    </span>
                                  </div>

                                  {!row.items || row.items.length === 0 ? (
                                    <p className="text-xs text-gray-500 py-3 text-center font-bold">
                                      {locale === "bn" ? "কোনো বিস্তারিত রেকর্ড পাওয়া যায়নি" : "No item records found"}
                                    </p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                          <tr className="border-b border-black/20 text-gray-600 dark:text-gray-300 font-black">
                                            <th className="py-2 px-2.5">তারিখ</th>
                                            <th className="py-2 px-2.5">মার্কেট</th>
                                            <th className="py-2 px-2.5">খরচের বিবরণ</th>
                                            <th className="py-2 px-2.5">পেমেন্ট মাধ্যম</th>
                                            <th className="py-2 px-2.5">ভাউচার নং</th>
                                            <th className="py-2 px-2.5 text-right">পরিমাণ</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/10 dark:divide-white/10">
                                          {row.items.map((item: any, itemIdx: number) => (
                                            <tr key={item.id || itemIdx} className="hover:bg-[#FED734]/10">
                                              <td className="py-2 px-2.5 font-bold whitespace-nowrap">
                                                {formatDate(item.date, locale)}
                                              </td>
                                              <td className="py-2 px-2.5 font-bold">
                                                {item.marketName}
                                              </td>
                                              <td className="py-2 px-2.5 font-black text-black dark:text-white">
                                                {item.description || "—"}
                                              </td>
                                              <td className="py-2 px-2.5 font-bold">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FED734] text-black border border-black font-black">
                                                  {item.paymentMethod || "CASH"}
                                                </span>
                                              </td>
                                              <td className="py-2 px-2.5 font-mono text-gray-600 dark:text-gray-400">
                                                {item.attachmentUrl || "—"}
                                              </td>
                                              <td className="py-2 px-2.5 text-right font-black font-mono text-black dark:text-white text-sm">
                                                {formatCurrency(item.amount, locale)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 5. Collector & Staff Summary Report */}
          {reportType === "collector_summary" && data.rows && (
            <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
              <div className="p-4 bg-[#FBF9F5] dark:bg-[#262830] border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-black text-black dark:text-white">
                  {locale === "bn" ? "কালেকশন স্টাফদের মোট আদায়:" : "Total Staff Collections:"}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(data.totalCollected || 0, locale)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                      <th className="p-3.5">কালেকশন স্টাফ (Collector)</th>
                      <th className="p-3.5">রোল (Role)</th>
                      <th className="p-3.5 text-center">মোট রিসিট</th>
                      <th className="p-3.5 text-right">ক্যাশ (Cash)</th>
                      <th className="p-3.5 text-right">ডিজিটাল ও ব্যাংক</th>
                      <th className="p-3.5 text-right">মোট আদায়</th>
                      <th className="p-3.5 text-right">অংশ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                    {data.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15">
                        <td className="p-3.5 font-black text-black dark:text-white">
                          {row.collectorName}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black border border-black bg-[#FBF9F5] dark:bg-[#262830] text-black dark:text-white shadow-[1px_1px_0px_#000000]">
                            {row.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          {locale === "bn" ? toBanglaDigits(row.count) : row.count}
                        </td>
                        <td className="p-3.5 text-right font-bold text-black dark:text-white">
                          {formatCurrency(row.cashAmount, locale)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-black dark:text-white">
                          {formatCurrency(row.bkashAmount + row.nagadAmount + row.bankAmount, locale)}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(row.totalAmount, locale)}
                        </td>
                        <td className="p-3.5 text-right font-black text-black dark:text-white">
                          {formatPercent(row.percentage, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 6. Payment Channel & Account Breakdown */}
          {reportType === "channel_summary" && data.rows && (
            <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
              <div className="p-4 bg-[#FBF9F5] dark:bg-[#262830] border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-black text-black dark:text-white">
                  {locale === "bn" ? "পেমেন্ট চ্যানেলে মোট জমা:" : "Total Channel Receipts:"}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(data.totalCollected || 0, locale)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                      <th className="p-3.5">পেমেন্ট চ্যানেল / একাউন্ট</th>
                      <th className="p-3.5">মাধ্যম (Method)</th>
                      <th className="p-3.5 text-center">মোট লেনদেন সংখ্যা</th>
                      <th className="p-3.5 text-right">মোট জমা (BDT)</th>
                      <th className="p-3.5 text-right">অংশ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                    {data.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15">
                        <td className="p-3.5 font-black text-black dark:text-white">
                          {row.channelName}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black border border-black bg-[#FED734] text-black shadow-[1px_1px_0px_#000000]">
                            {row.method}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          {locale === "bn" ? toBanglaDigits(row.count) : row.count}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(row.totalAmount, locale)}
                        </td>
                        <td className="p-3.5 text-right font-black text-black dark:text-white">
                          {formatPercent(row.percentage, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 4. Tenant Ledger */}
          {reportType === "tenant_ledger" && data.tenant && (
            <div className="space-y-4">
              {/* Tenant Header card */}
              <Card className="p-5 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-black dark:text-white">
                      {data.tenant.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-0.5">
                      {data.tenant.shopNumber} • {data.tenant.marketName} • Phone: {data.tenant.phone}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{t("collections.totalDue")}</p>
                    <p className="text-2xl font-black text-[#FF4B55] dark:text-[#FF6B75] font-mono">
                      {formatCurrency(data.currentOutstandingDue, locale)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Transactions Table */}
              <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                        <th className="p-3.5">{t("common.date")}</th>
                        <th className="p-3.5">{t("common.details")}</th>
                        <th className="p-3.5 text-right">Debit (ভাড়া দাবি)</th>
                        <th className="p-3.5 text-right">Credit (জমা)</th>
                        <th className="p-3.5 text-right">Balance (অবশিষ্ট বকেয়া)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                      {data.transactions?.map((tr: any) => (
                        <tr key={tr.id} className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15">
                          <td className="p-3.5 font-mono text-gray-600 dark:text-gray-400 font-bold">
                            {formatDate(tr.date, locale)}
                          </td>
                          <td className="p-3.5 font-bold text-black dark:text-white">{tr.description}</td>
                          <td className="p-3.5 text-right font-bold text-black dark:text-white">
                            {tr.debit > 0 ? formatCurrency(tr.debit, locale) : "—"}
                          </td>
                          <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {tr.credit > 0 ? formatCurrency(tr.credit, locale) : "—"}
                          </td>
                          <td className="p-3.5 text-right font-black text-black dark:text-white font-mono">
                            {formatCurrency(tr.balance, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 5. Settlements Report */}
          {reportType === "settlements" && data.rows && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000]">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-black uppercase tracking-wider">{t("settlement.totalRefunds")}</p>
                  <p className="text-2xl font-black text-black dark:text-white mt-1 font-mono">
                    {formatCurrency(data.totalRefunded || 0, locale)}
                  </p>
                </Card>
                <Card className="p-4 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000]">
                  <p className="text-xs text-[#FF4B55] dark:text-[#FF6B75] font-black uppercase tracking-wider">{t("settlement.unrecoveredReceivables")}</p>
                  <p className="text-2xl font-black text-[#FF4B55] dark:text-[#FF6B75] mt-1 font-mono">
                    {formatCurrency(data.totalUnrecovered || 0, locale)}
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                        <th className="p-3.5">{t("common.date")}</th>
                        <th className="p-3.5">{t("shops.shopNumber")}</th>
                        <th className="p-3.5">{t("tenants.tenantName")}</th>
                        <th className="p-3.5 text-right">{t("advance.advanceHeld")}</th>
                        <th className="p-3.5 text-right">{t("dashboard.totalDue")}</th>
                        <th className="p-3.5 text-right">{t("settlement.deductions")}</th>
                        <th className="p-3.5 text-right">{t("settlement.finalOutcome")}</th>
                        <th className="p-3.5 text-right">Confirmed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                      {data.rows.map((row: any) => (
                        <tr key={row.id} className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15">
                          <td className="p-3.5 font-mono text-gray-500 font-bold">{formatDate(row.settledAt, locale)}</td>
                          <td className="p-3.5 font-black text-black dark:text-white">
                            {row.shopNumber} ({row.marketName})
                          </td>
                          <td className="p-3.5 font-bold text-black dark:text-white">
                            <p>{row.tenantName}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{row.phone}</p>
                          </td>
                          <td className="p-3.5 text-right font-black text-black dark:text-white">
                            {formatCurrency(row.advanceBalance, locale)}
                          </td>
                          <td className="p-3.5 text-right font-black text-red-600 dark:text-red-400">
                            {formatCurrency(row.totalDue, locale)}
                          </td>
                          <td className="p-3.5 text-right text-gray-600 dark:text-gray-400 font-bold">
                            {row.totalDeductions > 0 ? formatCurrency(row.totalDeductions, locale) : "—"}
                          </td>
                          <td className="p-3.5 text-right font-black">
                            {row.refundAmount > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Refund: {formatCurrency(row.refundAmount, locale)}
                              </span>
                            ) : row.unrecoveredAmount > 0 ? (
                              <span className="text-[#FF4B55] dark:text-[#FF6B75] font-bold">
                                Unrecovered: {formatCurrency(row.unrecoveredAmount, locale)}
                              </span>
                            ) : (
                              <span className="text-gray-500 font-bold">Exact Match</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right text-gray-600 dark:text-gray-400 font-bold text-xs">{row.confirmedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 6. Unrecovered Receivables Report */}
          {reportType === "unrecovered_receivables" && data.rows && (
            <div className="space-y-4">
              <Card className="p-5 rounded-xl border-2 border-black bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#000000] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#FF4B55] dark:text-[#FF6B75] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                    <span>{t("settlement.unrecoveredReceivables")}</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-0.5">
                    Total unpaid rent loss after advance adjustment and vacating
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">Total Unrecovered</p>
                  <p className="text-2xl font-black text-[#FF4B55] dark:text-[#FF6B75] font-mono">
                    {formatCurrency(data.totalUnrecovered || 0, locale)}
                  </p>
                </div>
              </Card>

              <Card className="overflow-hidden rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FED734] text-black font-black">
                        <th className="p-3.5">{t("shops.shopNumber")}</th>
                        <th className="p-3.5">{t("tenants.tenantName")}</th>
                        <th className="p-3.5">{t("markets.marketName")}</th>
                        <th className="p-3.5 text-right">{t("dashboard.totalDue")}</th>
                        <th className="p-3.5 text-right">{t("advance.advanceHeld")}</th>
                        <th className="p-3.5 text-right text-red-600 dark:text-red-400">Unrecovered Loss (BDT)</th>
                        <th className="p-3.5 text-right">{t("common.date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                      {data.rows.map((row: any) => (
                        <tr key={row.id} className="hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15">
                          <td className="p-3.5 font-black text-black dark:text-white">{row.shopNumber}</td>
                          <td className="p-3.5 font-bold text-black dark:text-white">
                            <p>{row.tenantName}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{row.phone}</p>
                          </td>
                          <td className="p-3.5 text-gray-600 dark:text-gray-400 font-bold">{row.marketName}</td>
                          <td className="p-3.5 text-right font-bold text-black dark:text-white">
                            {formatCurrency(row.totalDue, locale)}
                          </td>
                          <td className="p-3.5 text-right font-black text-black dark:text-white">
                            {formatCurrency(row.advanceBalance, locale)}
                          </td>
                          <td className="p-3.5 text-right font-black text-[#FF4B55] dark:text-[#FF6B75] font-mono">
                            {formatCurrency(row.unrecoveredAmount, locale)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-gray-500 font-bold">{formatDate(row.settledAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Official Report Footer Note */}
          <div className="p-3 rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#1E1F24] text-black dark:text-white flex flex-col sm:flex-row items-center justify-between text-xs font-bold gap-2 shadow-[2px_2px_0px_#000000]">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>
                {locale === "bn"
                  ? "RENT PRO মার্কেট ম্যানেজমেন্ট সিস্টেম দ্বারা প্রস্তুতকৃত সঠিক ও যাচাইকৃত রিপোর্ট।"
                  : "Verified and authenticated by RENT PRO Market Management System."}
              </span>
            </span>
            <span className="text-gray-500 font-mono text-[11px]">
              {locale === "bn" ? "অফিসিয়াল কপি" : "Official Copy"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
