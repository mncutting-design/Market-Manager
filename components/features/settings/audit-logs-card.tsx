"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import {
  Shield,
  RefreshCw,
  User,
  Clock,
  Store,
  Wallet,
  FileCheck2,
  AlertTriangle,
  Database,
  Building2,
  Trash2,
  Edit,
} from "lucide-react";

export function AuditLogsCard() {
  const { t, locale } = useTranslation();

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const url = actionFilter !== "ALL" ? `/api/audit-logs?action=${actionFilter}` : "/api/audit-logs";
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
  const getActionLabel = (action: string) => {
    switch (action) {
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
    if (action.includes("DELETE") || action.includes("REJECTED") || action.includes("CLEAR")) {
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800";
    }
    if (action.includes("ADJUST") || action.includes("WAIVED")) {
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800";
    }
    if (action.includes("SETTLEMENT") || action.includes("POLICY")) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800";
    }
    if (action.includes("RESTORE") || action.includes("DEPOSIT") || action.includes("TOPUP")) {
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
      details.unrecoveredReceivable ||
      details.refundAmount ||
      details.version ||
      details.mode ||
      details.targetEntity ||
      details.actionType
    );
  };

  return (
    <Card className="p-6 border-slate-200 dark:border-slate-800">
      <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{t("audit.title")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("audit.subtitle")}
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => {
              const details = log.details || {};
              const performer = log.userName || log.performedBy || "Admin";
              const targetEntity = log.entityType || "Item";
              const shopNumber = details.shopNumber;

              return (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                  <div className="space-y-1.5 flex-1">
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
                        {details.rentPaisa !== undefined && (
                          <span>
                            <strong>{locale === "bn" ? "নির্ধারিত ভাড়া:" : "Rent:"}</strong> {formatCurrency(details.rentPaisa, locale)}
                          </span>
                        )}
                        {details.amount !== undefined && (
                          <span>
                            <strong>{locale === "bn" ? "পরিমাণ:" : "Amount:"}</strong> {formatCurrency(details.amount, locale)}
                          </span>
                        )}
                        {details.reason && (
                          <span>
                            <strong>{locale === "bn" ? "বিবরণ:" : "Reason:"}</strong> {details.reason}
                          </span>
                        )}
                        {details.note && (
                          <span>
                            <strong>{locale === "bn" ? "নোট:" : "Note:"}</strong> {details.note}
                          </span>
                        )}
                        {details.unrecoveredReceivable !== undefined && details.unrecoveredReceivable > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {locale === "bn" ? "অনাদায়ি বকেয়া:" : "Unrecovered:"} {formatCurrency(details.unrecoveredReceivable, locale)}
                          </span>
                        )}
                        {details.refundAmount !== undefined && details.refundAmount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {locale === "bn" ? "ফেরত জামানত:" : "Refund:"} {formatCurrency(details.refundAmount, locale)}
                          </span>
                        )}
                        {details.version && (
                          <span>
                            <strong>{locale === "bn" ? "নীতিমালা সংস্করণ:" : "Policy Version:"}</strong> v{details.version}
                          </span>
                        )}
                        {details.mode && (
                          <span>
                            <strong>{locale === "bn" ? "রিস্টোর মোড:" : "Mode:"}</strong> {details.mode === "clean" ? "Wipe & Restore" : "Append & Merge"}
                          </span>
                        )}
                        {details.actionType && (
                          <span>
                            <strong>{locale === "bn" ? "ধরণ:" : "Type:"}</strong> {details.actionType}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <span className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(log.createdAt, locale)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
