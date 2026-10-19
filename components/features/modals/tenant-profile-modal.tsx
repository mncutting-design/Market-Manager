"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Store,
  Building2,
  Calendar,
  Wallet,
  ShieldAlert,
  PlusCircle,
  RotateCcw,
  DoorOpen,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { AdjustAdvanceModal } from "./adjust-advance-modal";
import { SettlementWizardModal } from "./settlement-wizard-modal";
import { SettlementStatementModal } from "./settlement-statement-modal";

interface TenantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onRefreshNeeded?: () => void;
}

export function TenantProfileModal({
  isOpen,
  onClose,
  tenantId,
  onRefreshNeeded,
}: TenantProfileModalProps) {
  const { t, locale } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Sub-modals
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [statementData, setStatementData] = useState<any | null>(null);

  // Topup Form State
  const [topupAmountBDT, setTopupAmountBDT] = useState<number>(0);
  const [topupType, setTopupType] = useState<"TOPUP" | "DEPOSIT_RECEIVED">("TOPUP");
  const [topupReason, setTopupReason] = useState("");
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);

  const fetchTenantData = async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/advance`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load tenant advance profile:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchTenantData();
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleRecordTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = Math.round(topupAmountBDT * 100);
    if (paisa <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSubmittingTopup(true);
      const res = await fetch(`/api/tenants/${tenantId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: topupType,
          amount: paisa,
          reason: topupReason.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.error || "Failed to record deposit");
        return;
      }

      toast.success(t("advance.depositSuccess"));
      setIsTopupOpen(false);
      setTopupAmountBDT(0);
      setTopupReason("");
      fetchTenantData();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (e) {
      toast.error("Failed to record deposit");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const tenant = data?.tenant;
  const advanceBalance = data?.advanceBalance || 0;
  const requiredAdvance = data?.requiredAdvance || 0;
  const shortfall = data?.shortfall || 0;
  const transactions = data?.transactions || [];

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={tenant?.name || t("advance.title")}
        description={tenant ? `${tenant.shopNumber} — ${tenant.marketName}` : ""}
        maxWidth="lg"
      >
        {isLoading || !data ? (
          <div className="py-12 text-center text-slate-500">{t("common.loading")}</div>
        ) : (
          <div className="space-y-6">
            {/* Header info badge & Phone */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  {tenant.phone}
                </span>
                <span>•</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {t("tenants.rentAmount")}: <strong>{formatCurrency(tenant.rentAmount, locale)}</strong>
                </span>
              </div>
              <StatusBadge status={tenant.status} />
            </div>

            {/* 3 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Advance Balance */}
              <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                    {t("advance.advanceBalance")}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                    Liability
                  </span>
                </div>
                <p className="text-xl font-extrabold text-teal-600 dark:text-teal-300 font-mono mt-1">
                  {formatCurrency(advanceBalance, locale)}
                </p>
              </div>

              {/* 2. Required Advance */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2d3b52] bg-slate-50 dark:bg-[#182234]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("advance.requiredAdvance")}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {data.policy?.requiredAdvanceMonths} months
                  </span>
                </div>
                <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-1">
                  {formatCurrency(requiredAdvance, locale)}
                </p>
              </div>

              {/* 3. Shortfall */}
              <div
                className={`p-4 rounded-xl border ${
                  shortfall > 0
                    ? "border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                    : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {t("advance.shortfall")}
                  </span>
                  {shortfall > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      Deficit
                    </span>
                  )}
                </div>
                <p className="text-xl font-extrabold font-mono mt-1">
                  {shortfall > 0 ? formatCurrency(shortfall, locale) : "৳ 0"}
                </p>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            {tenant.status !== "SETTLED" && tenant.status !== "ARCHIVED" && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-100 dark:border-[#2d3b52] pb-4">
                <Button
                  size="sm"
                  onClick={() => setIsAdjustOpen(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  {t("adjustAdvance.title")}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTopupAmountBDT(Math.round(shortfall / 100) || 10000);
                    setIsTopupOpen(true);
                  }}
                  className="text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                  {t("advance.addDepositOrTopup")}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsSettleOpen(true)}
                  className="text-xs ml-auto"
                >
                  <DoorOpen className="w-3.5 h-3.5 mr-1.5" />
                  {t("settlement.settleAndVacate")}
                </Button>
              </div>
            )}

            {/* Advance Ledger Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-600" />
                  <span>{t("advance.timeline")}</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {locale === "bn" ? toBanglaDigits(transactions.length) : transactions.length} entries
                </span>
              </div>

              {transactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">{t("advance.noTransactions")}</p>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-[#2d3b52] overflow-hidden text-xs max-h-64 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-[#182234] border-b border-slate-200 dark:border-[#2d3b52] font-bold text-slate-700 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Reason / Note</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-right">{t("advance.runningBalance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transactions.map((tx: any) => {
                        const isCredit = tx.type === "DEPOSIT_RECEIVED" || tx.type === "TOPUP";
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                            <td className="p-2.5 text-slate-500 whitespace-nowrap">
                              {formatDate(tx.createdAt, locale)}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tx.type === "DEPOSIT_RECEIVED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : tx.type === "TOPUP"
                                    ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                    : tx.type === "ADJUSTED_TO_DUE"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : tx.type === "DEDUCTION"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                }`}
                              >
                                {tx.type === "DEPOSIT_RECEIVED"
                                  ? t("advance.depositReceived")
                                  : tx.type === "TOPUP"
                                  ? t("advance.topup")
                                  : tx.type === "ADJUSTED_TO_DUE"
                                  ? t("advance.adjustedToDue")
                                  : tx.type === "DEDUCTION"
                                  ? t("advance.deduction")
                                  : t("advance.refund")}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                              {tx.reason}
                            </td>
                            <td
                              className={`p-2.5 text-right font-mono font-bold whitespace-nowrap ${
                                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {isCredit ? "+" : "-"} {formatCurrency(tx.amount, locale)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatCurrency(tx.runningBalance, locale)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Record Deposit / Top-up Sub-dialog */}
      <Dialog
        isOpen={isTopupOpen}
        onClose={() => setIsTopupOpen(false)}
        title={t("advance.addDepositOrTopup")}
        description={`${tenant?.shopNumber} — ${tenant?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleRecordTopup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t("advance.transactionType")}
            </label>
            <Select
              value={topupType}
              onChange={(e) => setTopupType(e.target.value as any)}
            >
              <option value="TOPUP">{t("advance.topup")}</option>
              <option value="DEPOSIT_RECEIVED">{t("advance.depositReceived")}</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t("common.amount")} (৳ BDT)
            </label>
            <NumberInput
              value={topupAmountBDT}
              onChange={(val) => setTopupAmountBDT(val)}
              prefix="৳"
              className="text-lg font-bold"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t("common.notes")} ({t("common.optional")})
            </label>
            <Input
              value={topupReason}
              onChange={(e) => setTopupReason(e.target.value)}
              placeholder="e.g. অতিরিক্ত জামানত জমা"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsTopupOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSubmittingTopup} className="bg-teal-600 hover:bg-teal-500 text-white font-bold">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Adjust Advance Modal */}
      {tenant && (
        <AdjustAdvanceModal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          tenantId={tenant.id}
          tenantName={tenant.name}
          shopNumber={tenant.shopNumber}
          marketName={tenant.marketName}
          initialDueAmount={0}
          onSuccess={() => {
            fetchTenantData();
            if (onRefreshNeeded) onRefreshNeeded();
          }}
        />
      )}

      {/* Settlement Wizard Modal */}
      {tenant && (
        <SettlementWizardModal
          isOpen={isSettleOpen}
          onClose={() => setIsSettleOpen(false)}
          tenantId={tenant.id}
          onSettlementComplete={(settlement) => {
            fetchTenantData();
            if (onRefreshNeeded) onRefreshNeeded();
            setStatementData(settlement);
          }}
        />
      )}

      {/* Statement Modal */}
      <SettlementStatementModal
        isOpen={!!statementData}
        onClose={() => setStatementData(null)}
        settlementData={statementData}
      />
    </>
  );
}
