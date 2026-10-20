"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toBanglaDigits, formatDate } from "@/lib/format";
import {
  Database,
  Download,
  Upload,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  FileJson,
  Layers,
  Store,
  Users,
  Receipt,
  Wallet,
  Wrench,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface BackupSummary {
  appName?: string;
  version?: string;
  exportedAt?: string;
  counts?: {
    markets?: number;
    shops?: number;
    tenants?: number;
    bills?: number;
    payments?: number;
    expenses?: number;
    advanceTransactions?: number;
    settlements?: number;
    [key: string]: number | undefined;
  };
  data?: any;
}

export function BackupView() {
  const { t, locale } = useTranslation();
  const { triggerRefresh, currentUser } = useApp();
  const isAdmin = currentUser?.role === "ADMIN";

  // System Current Stats
  const [stats, setStats] = useState<{
    markets: number;
    shops: number;
    tenants: number;
    bills: number;
    payments: number;
    expenses: number;
  }>({
    markets: 0,
    shops: 0,
    tenants: 0,
    bills: 0,
    payments: 0,
    expenses: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  // Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupSummary | null>(null);
  const [restoreMode, setRestoreMode] = useState<"clean" | "merge">("clean");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  // Fetch current database item counts
  const fetchCurrentStats = async () => {
    try {
      setIsLoadingStats(true);
      const [resMarkets, resShops, resExpenses] = await Promise.all([
        fetch("/api/markets").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/shops").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/expenses").then((r) => (r.ok ? r.json() : [])),
      ]);

      const marketsCount = Array.isArray(resMarkets) ? resMarkets.length : 0;
      const shopsList = Array.isArray(resShops) ? resShops : [];
      const occupiedShops = shopsList.filter((s: any) => s.status === "OCCUPIED").length;
      const expensesCount = Array.isArray(resExpenses) ? resExpenses.length : 0;

      setStats({
        markets: marketsCount,
        shops: shopsList.length,
        tenants: occupiedShops,
        bills: 0,
        payments: 0,
        expenses: expensesCount,
      });
    } catch {
      // Ignore count fetch errors
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchCurrentStats();
  }, []);

  // Handle Download Backup JSON
  const handleDownloadBackup = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/backup");
      if (!res.ok) {
        throw new Error("Failed to export backup");
      }

      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `market-manager-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(
        locale === "bn"
          ? "সিস্টেম ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!"
          : "System backup downloaded successfully!"
      );
    } catch {
      toast.error(
        locale === "bn"
          ? "ব্যাকআপ ফাইল তৈরি করতে ব্যর্থ হয়েছে।"
          : "Failed to download backup."
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error(
        locale === "bn"
          ? "অনুগ্রহ করে একটি বৈধ .json ব্যাকআপ ফাইল নির্বাচন করুন।"
          : "Please select a valid .json backup file."
      );
      return;
    }

    setSelectedFile(file);

    // Read and parse JSON client-side
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || (!json.data && !json.counts)) {
          toast.error(
            locale === "bn"
              ? "অবৈধ ব্যাকআপ ফাইল। ফাইলে উপযুক্ত ডেটাবেজ রেকর্ড নেই।"
              : "Invalid backup file. No database records found."
          );
          setSelectedFile(null);
          setParsedBackup(null);
          return;
        }

        setParsedBackup(json);
        toast.success(
          locale === "bn"
            ? "ব্যাকআপ ফাইলটি সফলভাবে যাচাই করা হয়েছে।"
            : "Backup file verified successfully."
        );
      } catch {
        toast.error(
          locale === "bn"
            ? "ফাইলটি পার্স করতে ব্যর্থ হয়েছে। এটি একটি সঠিক JSON ফাইল নয়।"
            : "Failed to parse file. Invalid JSON structure."
        );
        setSelectedFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // Open Restore Confirmation Dialog
  const handleInitiateRestore = () => {
    if (!parsedBackup) {
      toast.error(
        locale === "bn"
          ? "অনুগ্রহ করে প্রথমে একটি ব্যাকআপ ফাইল নির্বাচন করুন।"
          : "Please select a backup file first."
      );
      return;
    }
    setConfirmInput("");
    setIsConfirmDialogOpen(true);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (confirmInput.trim().toUpperCase() !== "RESTORE") {
      toast.error(
        locale === "bn"
          ? "নিশ্চিত করতে হুবহু 'RESTORE' লিখুন।"
          : "Please type 'RESTORE' exactly to confirm."
      );
      return;
    }

    try {
      setIsRestoring(true);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: parsedBackup,
          mode: restoreMode,
          confirmText: "RESTORE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("backup.restoreError"));
        return;
      }

      setRestoreResult(data.restoredCounts);
      setIsConfirmDialogOpen(false);
      setSelectedFile(null);
      setParsedBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success(t("backup.restoreSuccess"));
      triggerRefresh("ALL");
      fetchCurrentStats();
    } catch {
      toast.error(t("backup.restoreError"));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{t("backup.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("backup.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCurrentStats();
              triggerRefresh("ALL");
              toast.success(
                locale === "bn" ? "ডেটা রিফ্রেশ করা হয়েছে" : "Data refreshed"
              );
            }}
            className="text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {locale === "bn" ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Database Current Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">{t("nav.markets")}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "bn" ? toBanglaDigits(stats.markets) : stats.markets}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">{t("nav.shops")}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "bn" ? toBanglaDigits(stats.shops) : stats.shops}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">
              {locale === "bn" ? "ভাড়াটিয়া" : "Tenants"}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "bn" ? toBanglaDigits(stats.tenants) : stats.tenants}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">{t("nav.billing")}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "bn" ? "সক্রিয়" : "Active"}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">{t("nav.collections")}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "bn" ? "লাইভ" : "Live"}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">{t("nav.expenses")}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "bn" ? toBanglaDigits(stats.expenses) : stats.expenses}
            </p>
          </div>
        </div>
      </div>

      {/* Restored Summary Toast Card (if just restored) */}
      {restoreResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {locale === "bn" ? "ডেটা সফলভাবে রিস্টোর হয়েছে!" : "Data restored successfully!"}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {locale === "bn"
                  ? `রিস্টোরকৃত রেকর্ডসমূহ: ${Object.entries(restoreResult)
                      .map(([k, v]) => `${k} (${toBanglaDigits(Number(v) || 0)})`)
                      .join(", ")}`
                  : `Restored records: ${Object.entries(restoreResult)
                      .map(([k, v]) => `${k} (${v})`)
                      .join(", ")}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setRestoreResult(null)}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {locale === "bn" ? "বন্ধ করুন" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Main 2-Column Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. EXPORT / BACKUP CARD */}
        <Card className="flex flex-col justify-between border-teal-200 dark:border-teal-800/80 bg-gradient-to-b from-teal-50/20 via-transparent to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5 text-teal-800 dark:text-teal-300">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80">
                <Download className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">
                  {t("backup.exportTitle")}
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("backup.exportDesc")}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-white dark:bg-[#141d2c] border border-slate-200 dark:border-[#2d3b52] space-y-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-teal-600" />
                <span>{locale === "bn" ? "ব্যাকআপে অন্তর্ভুক্ত থাকবে:" : "Included in Backup:"}</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "সকল মার্কেট ও ফ্লোর" : "Markets & Floors"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "সকল দোকান ও স্পেস" : "Shops & Spaces"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "ভাড়াটিয়া ও চুক্তি বিবরণ" : "Tenants & Agreements"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "জামানত খতিয়ান লেনদেন" : "Advance Ledgers"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "মাসিক বিল ও আইটেম" : "Monthly Bills & Items"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "আদায় ও পেমেন্ট হিস্ট্রি" : "Collections & Payments"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "খরচ ও ক্যাটাগরি" : "Expenses & Categories"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  {locale === "bn" ? "পেমেন্ট অ্যাকাউন্টস" : "Payment Accounts"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {locale === "bn"
                  ? "ব্যাকআপ ফাইলটি ডাউনলোড করার পর নিরাপদে সংরক্ষণ করুন। এটি দিয়ে যেকোনো সময় আপনার সম্পূর্ণ সিস্টেম পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব।"
                  : "Keep your backup file safe. It can be used anytime to restore your entire operational data."}
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={handleDownloadBackup}
                isLoading={isExporting}
                className="w-full sm:w-auto font-bold h-11 px-6 shadow-md shadow-teal-500/20"
              >
                <Download className="w-4 h-4 mr-2" />
                {t("backup.downloadBackup")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. RESTORE / IMPORT CARD */}
        <Card className="flex flex-col justify-between border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/20 via-transparent to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">
                  {t("backup.restoreTitle")}
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("backup.restoreDesc")}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />

            {/* Drag & Drop / Click Picker */}
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-300 dark:border-[#2d3b52] hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl bg-slate-50 dark:bg-[#141d2c] flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-indigo-50/30 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-105 transition-transform shadow-xs">
                  <FileJson className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t("backup.dragDrop")}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {locale === "bn" ? "সমর্থিত ফরম্যাট: .json ব্যাকআপ ফাইল" : "Supported format: .json backup files"}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileJson className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t("backup.fileSize")} {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedBackup(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    {locale === "bn" ? "ফাইল পরিবর্তন" : "Change File"}
                  </Button>
                </div>

                {/* Parsed summary preview */}
                {parsedBackup && (
                  <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-800/80 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>{t("backup.version")}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {parsedBackup.version || "1.0.0"}
                      </span>
                    </div>
                    {parsedBackup.exportedAt && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span>{t("backup.exportedOn")}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatDate(parsedBackup.exportedAt, locale)}
                        </span>
                      </div>
                    )}
                    {parsedBackup.counts && (
                      <div className="pt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(parsedBackup.counts).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-[#182234] border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                          >
                            {k}: {locale === "bn" ? toBanglaDigits(Number(v) || 0) : v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Restore Mode Radio Options */}
            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                {t("backup.restoreMode")}
              </label>

              <div
                onClick={() => setRestoreMode("clean")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  restoreMode === "clean"
                    ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-xs"
                    : "bg-white dark:bg-[#141d2c] border-slate-200 dark:border-[#2d3b52] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === "clean"}
                    onChange={() => setRestoreMode("clean")}
                    className="accent-teal-600"
                  />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {t("backup.cleanMode")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                  {t("backup.cleanModeDesc")}
                </p>
              </div>

              <div
                onClick={() => setRestoreMode("merge")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  restoreMode === "merge"
                    ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-xs"
                    : "bg-white dark:bg-[#141d2c] border-slate-200 dark:border-[#2d3b52] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === "merge"}
                    onChange={() => setRestoreMode("merge")}
                    className="accent-teal-600"
                  />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {t("backup.mergeMode")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                  {t("backup.mergeModeDesc")}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="accent"
                onClick={handleInitiateRestore}
                disabled={!selectedFile || !parsedBackup}
                className="w-full sm:w-auto font-bold h-11 px-6 shadow-md"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t("backup.startRestore")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Note Card */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141d2c]">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("backup.securityNoteTitle")}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {t("backup.securityNoteDesc")}
            </p>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmDialogOpen}
        onClose={() => !isRestoring && setIsConfirmDialogOpen(false)}
        title={t("backup.confirmTitle")}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p>{t("backup.confirmWarning")}</p>
          </div>

          <div className="text-xs space-y-1">
            <p className="text-slate-600 dark:text-slate-300">
              {t("backup.confirmPrompt")}:
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={t("backup.confirmPlaceholder")}
              className="font-mono font-bold tracking-widest text-center uppercase"
              autoFocus
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isRestoring}
              onClick={() => setIsConfirmDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={isRestoring}
              disabled={confirmInput.trim().toUpperCase() !== "RESTORE"}
              onClick={handleExecuteRestore}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {isRestoring ? t("backup.restoring") : t("backup.startRestore")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
