"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Shield, RefreshCw, FileText, CheckCircle2, User, Clock } from "lucide-react";

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

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "ADJUST_ADVANCE":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
      case "CONFIRM_SETTLEMENT":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
      case "CREATE_POLICY_VERSION":
        return "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300";
      case "RECORD_ADVANCE_DEPOSIT":
      case "RECORD_ADVANCE_TOPUP":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
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
            <div className="w-44">
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="ALL">{t("audit.allActions")}</option>
                <option value="ADJUST_ADVANCE">Adjust from Advance</option>
                <option value="CONFIRM_SETTLEMENT">Settlement</option>
                <option value="CREATE_POLICY_VERSION">Policy Revision</option>
                <option value="RECORD_ADVANCE_DEPOSIT">Deposit</option>
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
          <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {log.entityType} ({log.entityId.slice(0, 10)}...)
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{log.performedBy}</span>
                    </span>
                  </div>

                  {log.details && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                      {log.details.amount && (
                        <span>Amount: {formatCurrency(log.details.amount, locale)} • </span>
                      )}
                      {log.details.reason && <span>Reason: {log.details.reason} • </span>}
                      {log.details.unrecoveredReceivable && (
                        <span className="text-red-500 font-bold">
                          Unrecovered: {formatCurrency(log.details.unrecoveredReceivable, locale)} •{" "}
                        </span>
                      )}
                      {log.details.refundAmount && (
                        <span className="text-emerald-500 font-bold">
                          Refund: {formatCurrency(log.details.refundAmount, locale)} •{" "}
                        </span>
                      )}
                      {log.details.version && <span>Version: v{log.details.version}</span>}
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px] text-slate-400 shrink-0">
                  <span className="flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(log.createdAt, locale)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
