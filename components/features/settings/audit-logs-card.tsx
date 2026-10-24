"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import {
  Shield,
  RefreshCw,
  User,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function AuditLogsCard() {
  const { t, locale } = useTranslation();
  const { isAdmin, triggerRefresh } = useApp();

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const url = actionFilter !== "ALL" ? `/api/audit-logs?action=${actionFilter}&limit=100` : "/api/audit-logs?limit=100";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  // Human-readable action label in Bangla / English
  const getActionLabel = (action: string): string => {
    if (action.startsWith("UNDO_")) {
      const base = action.replace("UNDO_", "");
      return locale === "bn" ? `পূর্বাবস্থায় ফেরত (${getActionLabel(base)})` : `Undo (${getActionLabel(base)})`;
    }

    switch (action) {
      case "BILL_CHARGE_ADDED":
        return locale === "bn" ? "অতিরিক্ত খরচ যোগ" : "Cost Added";
      case "BILL_CHARGE_EDITED":
        return locale === "bn" ? "অতিরিক্ত খরচ পরিবর্তন" : "Cost Edited";
      case "BILL_CHARGE_DELETED":
        return locale === "bn" ? "অতিরিক্ত খরচ মোছা" : "Cost Deleted";
      case "SHOP_CREATED":
        return locale === "bn" ? "নতুন দোকান তৈরি" : "Shop Created";
      case "SHOP_UPDATED":
        return locale === "bn" ? "দোকানের তথ্য পরিবর্তন" : "Shop Updated";
      case "SHOP_DELETED":
        return locale === "bn" ? "দোকান মুছে ফেলা হয়েছে" : "Shop Deleted";
      case "MARKET_CREATED":
        return locale === "bn" ? "নতুন মার্কেট তৈরি" : "Market Created";
      case "CHANGE_REQUEST_APPROVED_EDIT":
      case "CHANGE_REQUEST_APPROVED":
        return locale === "bn" ? "অনুমোদিত পরিবর্তন" : "Change Approved";
      case "CHANGE_REQUEST_APPROVED_DELETE":
        return locale === "bn" ? "মোছার অনুমোদন" : "Deletion Approved";
      case "CHANGE_REQUEST_REJECTED":
        return locale === "bn" ? "আবেদন প্রত্যাখ্যাত" : "Request Rejected";
      case "ADJUST_ADVANCE":
      case "ADVANCE_ADJUSTMENT":
        return locale === "bn" ? "জামানত থেকে সমন্বয়" : "Advance Adjustment";
      case "RECORD_ADVANCE_DEPOSIT":
      case "ADVANCE_DEPOSIT":
        return locale === "bn" ? "জামানত জমা গ্রহণ" : "Advance Deposit";
      case "RECORD_ADVANCE_TOPUP":
      case "ADVANCE_TOPUP":
        return locale === "bn" ? "জামানত টপ-আপ" : "Advance Top-Up";
      case "CONFIRM_SETTLEMENT":
      case "SETTLEMENT_CONFIRMED":
        return locale === "bn" ? "ভাড়াটিয়া নিষ্পত্তি" : "Tenant Settlement";
      case "CREATE_POLICY_VERSION":
      case "POLICY_CREATED":
      case "POLICY_UPDATED":
        return locale === "bn" ? "নীতিমালা হালনাগাদ" : "Policy Revision";
      case "DATA_RESTORED":
        return locale === "bn" ? "সিস্টেম ডেটা রিস্টোর" : "Database Restored";
      case "DATA_CLEARED":
      case "CLEAR_DATA":
        return locale === "bn" ? "ডেটা মোছা হয়েছে" : "Data Cleared";
      case "BILL_WAIVED":
        return locale === "bn" ? "বিল মওকুফ" : "Bill Waived";
      default:
        return action.replace(/_/g, " ");
    }
  };

  const getActionBadgeClass = (action: string) => {
    if (action.startsWith("UNDO_")) {
      return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-700";
    }
    if (action.includes("DELETE") || action.includes("REJECTED") || action.includes("CLEAR")) {
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800";
    }
    if (action.includes("ADJUST") || action.includes("WAIVED") || action.includes("EDIT")) {
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800";
    }
    if (action.includes("SETTLEMENT") || action.includes("POLICY")) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800";
    }
    if (action.includes("RESTORE") || action.includes("DEPOSIT") || action.includes("TOPUP") || action.includes("ADDED")) {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800";
    }
    return "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300 dark:border-teal-800";
  };

  // Helper to determine if there are meaningful details to render
  const hasReadableDetails = (details: any) => {
    if (!details || typeof details !== "object") return false;
    return Boolean(
      details.shopNumber ||
      details.marketName ||
      details.rentPaisa ||
      details.amount ||
      details.reason ||
      details.note ||
      details.description ||
      details.unrecoveredReceivable ||
      details.refundAmount ||
      details.version ||
      details.mode ||
      details.targetEntity ||
      details.actionType ||
      details.undoneBy
    );
  };

  // Handle undo execution (Strictly for Admin per Requirement 4)
  const handleUndo = async (log: any) => {
    if (!isAdmin) {
      toast.error(locale === "bn" ? "শুধুমাত্র অ্যাডমিন পূর্বাবস্থায় ফেরাতে পারেন" : "Only admins can undo actions");
      return;
    }

    const actionTitle = getActionLabel(log.action);
    const confirmMsg = locale === "bn"
      ? `আপনি কি নিশ্চিত যে "${actionTitle}" কাজটি পূর্বাবস্থায় ফিরিয়ে নিতে চান?`
      : `Are you sure you want to undo "${actionTitle}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setUndoingLogId(log.id);
      const res = await fetch("/api/audit-logs/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: log.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || (locale === "bn" ? "পূর্বাবস্থায় ফেরানো ব্যর্থ হয়েছে" : "Failed to undo action"));
        return;
      }

      toast.success(data.message || (locale === "bn" ? "সফলভাবে পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে!" : "Action undone successfully!"));
      await fetchLogs();
      triggerRefresh();
    } catch (e) {
      toast.error(locale === "bn" ? "পূর্বাবস্থায় ফেরানো ব্যর্থ হয়েছে" : "Failed to undo action");
    } finally {
      setUndoingLogId(null);
    }
  };

  // Requirement 4: By default show ONLY the last 5 entries!
  const visibleLogs = showAll ? logs : logs.slice(0, 5);

  return (
    <Card className="p-6 border-slate-200 dark:border-slate-800">
      <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{t("audit.title")}</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {showAll
                  ? (locale === "bn" ? `সবগুলো (${toBanglaDigits(logs.length)})` : `All (${logs.length})`)
                  : (locale === "bn" ? `সর্বশেষ ৫টি (${toBanglaDigits(Math.min(5, logs.length))}/${toBanglaDigits(logs.length)})` : `Last 5 entries (${Math.min(5, logs.length)}/${logs.length})`)}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {locale === "bn"
                ? "ডিফল্টভাবে সর্বশেষ ৫টি এন্ট্রি প্রদর্শিত হয়। অ্যাডমিন যেকোনো এন্ট্রি পূর্বাবস্থায় ফিরিয়ে (Undo) নিতে পারেন।"
                : "Showing the latest 5 entries by default. Admins can view more and undo changes."}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-48">
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="ALL">{t("audit.allActions")}</option>
                <option value="BILL_CHARGE_ADDED">{locale === "bn" ? "অতিরিক্ত খরচ যোগ" : "Cost Added"}</option>
                <option value="BILL_CHARGE_EDITED">{locale === "bn" ? "খরচ পরিবর্তন" : "Cost Edited"}</option>
                <option value="BILL_CHARGE_DELETED">{locale === "bn" ? "খরচ মুছে ফেলা" : "Cost Deleted"}</option>
                <option value="SHOP_CREATED">{locale === "bn" ? "দোকান তৈরি" : "Shop Created"}</option>
                <option value="ADJUST_ADVANCE">{locale === "bn" ? "জামানত সমন্বয়" : "Advance Adjustment"}</option>
                <option value="CONFIRM_SETTLEMENT">{locale === "bn" ? "চূড়ান্ত নিষ্পত্তি" : "Settlement"}</option>
                <option value="RECORD_ADVANCE_DEPOSIT">{locale === "bn" ? "জামানত জমা" : "Advance Deposit"}</option>
                <option value="DATA_RESTORED">{locale === "bn" ? "ডেটা রিস্টোর" : "Data Restored"}</option>
              </Select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchLogs}
              className="h-9 px-2 text-xs"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {locale === "bn" ? "অডিট ইতিহাস লোড হচ্ছে..." : "Loading audit history..."}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {locale === "bn" ? "কোনো অডিট রেকর্ড পাওয়া যায়নি।" : "No audit logs recorded yet."}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleLogs.map((log) => {
                const details = log.details || {};
                const performer = log.userName || log.performedBy || "Admin";
                const targetEntity = log.entityType || "Item";
                const shopNumber = details.shopNumber;
                const isUndone = Boolean(details.isUndone);
                const isUndoEntry = log.action.startsWith("UNDO_");

                return (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getActionBadgeClass(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>

                        <span className="font-bold text-slate-900 dark:text-white">
                          {shopNumber
                            ? (locale === "bn" ? `দোকান নং ${shopNumber}` : `Shop #${shopNumber}`)
                            : `${targetEntity} (${log.entityId?.slice(0, 8)}...)`}
                        </span>

                        <span className="text-slate-300 dark:text-slate-600">•</span>

                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>{performer}</span>
                        </span>

                        {isUndone && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Check className="w-3 h-3" />
                            <span>{locale === "bn" ? "পূর্বাবস্থায় নেওয়া হয়েছে" : "Undone"}</span>
                          </span>
                        )}
                      </div>

                      {/* Show meaningful detail block ONLY if details exist */}
                      {hasReadableDetails(details) && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#141d2c] p-2.5 rounded-lg border border-slate-200 dark:border-[#2d3b52] flex flex-wrap items-center gap-x-3 gap-y-1">
                          {details.shopNumber && (
                            <span>
                              <strong>{locale === "bn" ? "দোকান:" : "Shop:"}</strong> {details.shopNumber}
                            </span>
                          )}
                          {details.marketName && (
                            <span>
                              <strong>{locale === "bn" ? "মার্কেট:" : "Market:"}</strong> {details.marketName}
                            </span>
                          )}
                          {details.description && (
                            <span>
                              <strong>{locale === "bn" ? "বিবরণ:" : "Item:"}</strong> {details.description}
                            </span>
                          )}
                          {details.amount !== undefined && (
                            <span>
                              <strong>{locale === "bn" ? "পরিমাণ:" : "Amount:"}</strong> {formatCurrency(details.amount, locale)}
                            </span>
                          )}
                          {details.rentPaisa !== undefined && (
                            <span>
                              <strong>{locale === "bn" ? "নির্ধারিত ভাড়া:" : "Rent:"}</strong> {formatCurrency(details.rentPaisa, locale)}
                            </span>
                          )}
                          {details.reason && (
                            <span>
                              <strong>{locale === "bn" ? "কারণ:" : "Reason:"}</strong> {details.reason}
                            </span>
                          )}
                          {details.note && (
                            <span>
                              <strong>{locale === "bn" ? "নোট:" : "Note:"}</strong> {details.note}
                            </span>
                          )}
                          {details.undoneBy && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              <strong>{locale === "bn" ? "রিভার্স করেছেন:" : "Reverted by:"}</strong> {details.undoneBy}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      <div className="text-right text-[11px] text-slate-400 shrink-0">
                        <span className="flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(log.createdAt, locale)}</span>
                        </span>
                      </div>

                      {/* Undo Action Button - Strictly for Admin only per Requirement 4 */}
                      {isAdmin && !isUndoEntry && (
                        <div>
                          {isUndone ? (
                            <span className="text-[11px] text-slate-400 italic">
                              {locale === "bn" ? "বাতিলকৃত" : "Reverted"}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndo(log)}
                              disabled={undoingLogId === log.id}
                              className="h-7 px-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 cursor-pointer shadow-xs"
                              title={locale === "bn" ? "এই কাজটি পূর্বাবস্থায় ফিরিয়ে নিন (শুধুমাত্র অ্যাডমিন)" : "Undo this change (Admin only)"}
                            >
                              <RotateCcw className={`w-3 h-3 ${undoingLogId === log.id ? "animate-spin" : ""}`} />
                              <span>{locale === "bn" ? "পূর্বাবস্থায় ফেরান" : "Undo"}</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View More / Show Less Toggle (Requirement 4) */}
            {logs.length > 5 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs font-bold gap-1.5 h-8 border-dashed border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>{locale === "bn" ? "সংক্ষিপ্ত করুন (প্রথম ৫টি দেখুন)" : "Show Less (Last 5 only)"}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>
                        {locale === "bn"
                          ? `আরও দেখুন (${toBanglaDigits(logs.length - 5)}টি বাকি) এবং যেকোনো পরিবর্তন পূর্বাবস্থায় ফেরান`
                          : `View More (${logs.length - 5} more) and Undo Changes`}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
