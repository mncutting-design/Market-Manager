"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatPercent, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Store, Users, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";

export function MarketsView() {
  const { t, locale } = useTranslation();
  const { markets, refreshMarkets, setSelectedMarketId, setActiveTab } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditingMarket(null);
    setName("");
    setAddress("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEdit = (m: any) => {
    setEditingMarket(m);
    setName(m.name);
    setAddress(m.address || "");
    setNotes(m.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("validation.required"));
      return;
    }

    try {
      setIsSaving(true);
      const url = "/api/markets";
      const method = editingMarket ? "PUT" : "POST";
      const body = {
        ...(editingMarket && { id: editingMarket.id }),
        name,
        address,
        notes,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast.error("Failed to save market");
        return;
      }

      toast.success(editingMarket ? t("markets.marketUpdated") : t("markets.marketCreated"));
      await refreshMarkets();
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save market");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{t("markets.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("markets.subtitle")}
          </p>
        </div>

        <Button onClick={openAdd} className="shadow-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          {t("markets.addMarket")}
        </Button>
      </div>

      {/* Markets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((m) => {
          const occupancyRate = m.totalShops > 0 ? (m.occupiedShops / m.totalShops) * 100 : 0;

          return (
            <Card
              key={m.id}
              className="flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {m.name}
                    </CardTitle>
                    {m.address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.address}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={t("common.edit")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Expected Rent Badge */}
                <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
                  <p className="text-xs font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                    {t("markets.monthlyExpected")}
                  </p>
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                    {formatCurrency(m.monthlyExpected, locale)}
                  </p>
                </div>

                {/* Shop Counters */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">{t("markets.totalShops")}</p>
                    <p className="font-bold text-base text-slate-900 dark:text-slate-100">
                      {locale === "bn" ? toBanglaDigits(m.totalShops) : m.totalShops}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{t("markets.occupiedShops")}</p>
                    <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                      {locale === "bn" ? toBanglaDigits(m.occupiedShops) : m.occupiedShops}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">{t("markets.vacantShops")}</p>
                    <p className="font-bold text-base text-slate-600 dark:text-slate-400">
                      {locale === "bn" ? toBanglaDigits(m.vacantShops) : m.vacantShops}
                    </p>
                  </div>
                </div>

                {/* Occupancy Progress */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{t("reports.occupancyRate")}</span>
                    <span className="font-semibold">{formatPercent(occupancyRate, locale)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.round(occupancyRate)}%` }}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedMarketId(m.id);
                    setActiveTab("shops");
                  }}
                >
                  <Store className="w-3.5 h-3.5 mr-1.5" />
                  {t("nav.shops")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedMarketId(m.id);
                    setActiveTab("billing");
                  }}
                >
                  {t("nav.billing")}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Market Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMarket ? t("markets.editMarket") : t("markets.addMarket")}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("markets.marketName")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. গুলশান প্লাজা শপিং কমপ্লেক্স"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("markets.address")}
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. প্লট ১২, গুলশান-১, ঢাকা"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("markets.notes")}
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. ৩ তলা বিশিষ্ট মার্কেট"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSaving}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
