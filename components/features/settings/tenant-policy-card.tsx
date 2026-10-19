"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { ShieldCheck, History, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function TenantPolicyCard() {
  const { t, locale } = useTranslation();

  const [activePolicy, setActivePolicy] = useState<any>(null);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [requiredMonths, setRequiredMonths] = useState(3);
  const [maxAdjustmentMonths, setMaxAdjustmentMonths] = useState(2);
  const [gracePeriodDays, setGracePeriodDays] = useState(10);
  const [lateFeeType, setLateFeeType] = useState("PERCENTAGE");
  const [lateFeeValue, setLateFeeValue] = useState(5);
  const [minAdvanceBalanceBDT, setMinAdvanceBalanceBDT] = useState(0);
  const [policyNotes, setPolicyNotes] = useState("");

  const fetchPolicy = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/policies");
      if (res.ok) {
        const data = await res.json();
        setActivePolicy(data.activePolicy);
        setVersionHistory(data.versions || []);

        if (data.activePolicy) {
          setRequiredMonths(data.activePolicy.requiredAdvanceMonths || 3);
          setMaxAdjustmentMonths(data.activePolicy.maxAdvanceAdjustmentMonths || 2);
          setGracePeriodDays(data.activePolicy.gracePeriodDays || 10);
          setLateFeeType(data.activePolicy.lateFeeType || "PERCENTAGE");
          setLateFeeValue(data.activePolicy.lateFeeValue || 5);
          setMinAdvanceBalanceBDT(Math.round((data.activePolicy.minAdvanceBalance || 0) / 100));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredAdvanceMonths: Number(requiredMonths),
          maxAdvanceAdjustmentMonths: Number(maxAdjustmentMonths),
          gracePeriodDays: Number(gracePeriodDays),
          lateFeeType,
          lateFeeValue: Number(lateFeeValue),
          minAdvanceBalance: Math.round(minAdvanceBalanceBDT * 100),
          notes: policyNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save policy version");
        return;
      }

      toast.success(locale === "bn" ? "নতুন পলিসি সংস্করণ সক্রিয় হয়েছে" : "New policy version published");
      setIsEditing(false);
      setPolicyNotes("");
      await fetchPolicy();
    } catch (e) {
      toast.error("Failed to save policy version");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6 border-slate-200 dark:border-slate-800">
      <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{t("policy.title")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("policy.subtitle")}
            </CardDescription>
          </div>

          <Button
            size="sm"
            variant={isEditing ? "outline" : "accent"}
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs shrink-0"
          >
            {isEditing ? t("common.cancel") : t("policy.createNewVersion")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-4 space-y-6">
        {/* Active Policy Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("policy.requiredAdvanceMonths")}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {locale === "bn"
                ? `${toBanglaDigits(activePolicy?.requiredAdvanceMonths || 3)} মাস`
                : `${activePolicy?.requiredAdvanceMonths || 3} Mos`}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("policy.maxAdjustmentMonths")}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {locale === "bn"
                ? `${toBanglaDigits(activePolicy?.maxAdvanceAdjustmentMonths || 2)} মাস`
                : `${activePolicy?.maxAdvanceAdjustmentMonths || 2} Mos`}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("policy.gracePeriodDays")}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {locale === "bn"
                ? `${toBanglaDigits(activePolicy?.gracePeriodDays || 10)} দিন`
                : `${activePolicy?.gracePeriodDays || 10} Days`}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("policy.lateFeeType")}</p>
            <p className="text-lg font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">
              {activePolicy?.lateFeeType === "PERCENTAGE"
                ? `${locale === "bn" ? toBanglaDigits(activePolicy?.lateFeeValue || 5) : activePolicy?.lateFeeValue || 5}%`
                : activePolicy?.lateFeeType === "FIXED"
                ? formatCurrency(activePolicy?.lateFeeValue || 0, locale)
                : t("policy.none")}
            </p>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveNewVersion}
            className="p-4 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/20 dark:bg-teal-950/20 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300">
              <Plus className="w-4 h-4" />
              <span>{t("policy.createNewVersion")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("policy.requiredAdvanceMonths")}
                </label>
                <NumberInput
                  value={requiredMonths}
                  onChange={(val) => setRequiredMonths(Math.max(1, Math.min(12, val)))}
                  placeholder="3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("policy.maxAdjustmentMonths")}
                </label>
                <NumberInput
                  value={maxAdjustmentMonths}
                  onChange={(val) => setMaxAdjustmentMonths(Math.max(1, Math.min(6, val)))}
                  placeholder="2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("policy.gracePeriodDays")}
                </label>
                <NumberInput
                  value={gracePeriodDays}
                  onChange={(val) => setGracePeriodDays(Math.max(0, Math.min(30, val)))}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("policy.lateFeeType")}
                </label>
                <Select value={lateFeeType} onChange={(e) => setLateFeeType(e.target.value)}>
                  <option value="PERCENTAGE">{t("policy.percentage")} (%)</option>
                  <option value="FIXED">{t("policy.fixed")} (৳)</option>
                  <option value="NONE">{t("policy.none")}</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lateFeeType === "PERCENTAGE" ? "Late Fee Rate (%)" : "Late Fee Amount (৳)"}
                </label>
                <NumberInput
                  value={lateFeeValue}
                  onChange={(val) => setLateFeeValue(val)}
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Version Notes / বিবরণ
              </label>
              <Input
                value={policyNotes}
                onChange={(e) => setPolicyNotes(e.target.value)}
                placeholder="e.g. 2026 Commercial Standard Revision"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" size="sm" isLoading={isSaving}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {t("common.save")}
              </Button>
            </div>
          </form>
        )}

        {/* Version History */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>{t("policy.versionHistory")}</span>
          </h4>

          <div className="space-y-2">
            {versionHistory.map((v, i) => (
              <div
                key={v.id}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  i === 0
                    ? "border-teal-300 dark:border-teal-700/80 bg-teal-50/40 dark:bg-teal-950/20 text-slate-900 dark:text-white"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300">
                      v{v.version}
                    </span>
                    {i === 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                        Active
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      {v.requiredAdvanceMonths} mos advance • {v.gracePeriodDays} days grace
                    </span>
                  </div>
                  {v.notes && <p className="text-[11px] text-slate-400 mt-0.5">{v.notes}</p>}
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <p>{formatDate(v.effectiveFrom, locale)}</p>
                  <p className="text-[10px] text-slate-500">by {v.createdBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
