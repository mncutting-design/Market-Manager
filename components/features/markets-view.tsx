"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatPercent, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Dialog } from "@/components/ui/dialog";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { Building2, Plus, Edit, Trash2, Store, Users, CheckCircle2, MapPin, Layers, AlertTriangle, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function MarketsView() {
  const { t, locale } = useTranslation();
  const { markets, refreshMarkets, setSelectedMarketId, setActiveTab, isAdmin, refreshApprovals, currentUser } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingMarket, setEditingMarket] = useState<any | null>(null);
  const [deletingMarket, setDeletingMarket] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [totalFloors, setTotalFloors] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiffPreview, setShowDiffPreview] = useState(false);

  const canCreateMarket = isAdmin || currentUser?.role === "MANAGER";

  const openAdd = () => {
    if (!canCreateMarket) {
      toast.error(locale === "bn" ? "শুধুমাত্র অ্যাডমিন ও ম্যানেজার নতুন মার্কেট তৈরি করতে পারবেন।" : "Only administrators and managers can create new markets.");
      return;
    }
    setEditingMarket(null);
    setName("");
    setAddress("");
    setNotes("");
    setTotalFloors(5);
    setShowDiffPreview(false);
    setIsModalOpen(true);
  };

  const openEdit = (m: any) => {
    setEditingMarket(m);
    setName(m.name);
    setAddress(m.address || "");
    setNotes(m.notes || "");
    setTotalFloors(m.totalFloors || 5);
    setShowDiffPreview(false);
    setIsModalOpen(true);
  };

  const handleDeleteMarket = async () => {
    if (!deletingMarket) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/markets?id=${deletingMarket.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete market");
        return;
      }

      if (data.requiresApproval) {
        toast.info(
          locale === "bn"
            ? "মার্কেট মোছার আবেদনটি অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে।"
            : "Market deletion request submitted for Admin approval."
        );
        refreshApprovals();
      } else {
        toast.success(
          locale === "bn" ? "মার্কেট সফলভাবে মোছা হয়েছে!" : "Market deleted successfully!"
        );
        await refreshMarkets();
      }
      setDeletingMarket(null);
    } catch (e) {
      toast.error("Failed to delete market");
    } finally {
      setIsDeleting(false);
    }
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
        totalFloors: Number(totalFloors) > 0 ? Number(totalFloors) : 5,
        submitForApproval: !isAdmin,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save market");
        return;
      }

      if (data.requiresApproval) {
        toast.info(
          locale === "bn"
            ? "পরিবর্তনটি অ্যাডমিন অনুমোদনের জন্য অপেক্ষমান রয়েছে।"
            : "Changes submitted for Admin approval."
        );
        refreshApprovals();
      } else {
        toast.success(editingMarket ? t("markets.marketUpdated") : t("markets.marketCreated"));
        await refreshMarkets();
      }
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

        {canCreateMarket && (
          <Button onClick={openAdd} className="shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            {t("markets.addMarket")}
          </Button>
        )}
      </div>

      {/* Markets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {markets.map((m) => {
          const occupancyRate = m.totalShops > 0 ? (m.occupiedShops / m.totalShops) * 100 : 0;
          const floors = m.totalFloors || 5;

          return (
            <Card
              key={m.id}
              onClick={() => {
                setSelectedMarketId(m.id);
                setActiveTab("shops");
              }}
              className="flex flex-col justify-between hover:shadow-lg hover:border-teal-500/60 dark:hover:border-teal-500/60 transition-all cursor-pointer group"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {m.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {m.address && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[170px]">{m.address}</span>
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Layers className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>
                          {locale === "bn"
                            ? `${toBanglaDigits(floors)} তলা ভবন`
                            : `${floors} Floors`}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(isAdmin || currentUser?.role === "MANAGER") && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(m);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={t("common.edit")}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingMarket(m);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={locale === "bn" ? "মার্কেট মুছুন" : "Delete Market"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
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
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
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
        maxWidth="lg"
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
              {t("markets.totalFloors")}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <NumberInput
                  value={totalFloors}
                  onChange={(val) => setTotalFloors(Math.max(1, Math.min(100, Math.round(val || 1))))}
                  placeholder="5"
                />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                {locale === "bn" ? `${toBanglaDigits(totalFloors)} তলা` : `${totalFloors} Floors`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {locale === "bn"
                ? "এই মার্কেটে কয়টি তলা আছে নির্ধারণ করুন (যেমনঃ ৫, ১০ বা তদূর্ধ্ব)। দোকান যোগ করার সময় স্বয়ংক্রিয়ভাবে ফ্লোর তালিকা তৈরি হবে।"
                : "Set the total number of floors. Floor dropdowns will automatically generate options up to this level."}
            </p>
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

          {/* Difference Viewer Toggle for Edits */}
          {editingMarket && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDiffPreview(!showDiffPreview)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>
                    {locale === "bn"
                      ? "পার্থক্য প্রিভিউ দেখুন (What have ➔ What will have)"
                      : "Preview Differences (What Have vs What Will Have)"}
                  </span>
                </span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 underline">
                  {showDiffPreview
                    ? locale === "bn" ? "লুকান" : "Hide"
                    : locale === "bn" ? "দেখুন" : "Show"}
                </span>
              </button>

              {showDiffPreview && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  <DiffViewer
                    currentData={{
                      name: editingMarket.name,
                      address: editingMarket.address,
                      notes: editingMarket.notes,
                      totalFloors: editingMarket.totalFloors || 5,
                    }}
                    proposedData={{
                      name,
                      address,
                      notes,
                      totalFloors,
                    }}
                    title={locale === "bn" ? "পরিবর্তনের পার্থক্য" : "Differences"}
                    hideUnchanged={true}
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSaving}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {!isAdmin && editingMarket
                ? locale === "bn" ? "অনুমোদনের জন্য পাঠান" : "Submit for Approval"
                : t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Market Confirmation Modal */}
      {deletingMarket && (
        <Dialog
          isOpen={!!deletingMarket}
          onClose={() => setDeletingMarket(null)}
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{locale === "bn" ? "মার্কেট মুছে ফেলার নিশ্চিতকরণ" : "Confirm Delete Market"}</span>
            </div>
          }
          description={
            locale === "bn"
              ? `আপনি কি নিশ্চিত যে '${deletingMarket.name}' মার্কেটটি মুছে ফেলতে চান?`
              : `Are you sure you want to delete '${deletingMarket.name}'?`
          }
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
              {locale === "bn"
                ? `সতর্কতা: এই মার্কেটের অন্তর্গত ${toBanglaDigits(deletingMarket.totalShops || 0)}টি দোকান ও সংশ্লিষ্ট তথ্য নিষ্ক্রিয় করা হবে।`
                : `Warning: ${deletingMarket.totalShops || 0} shops in this market will also be deactivated.`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingMarket(null)}
                disabled={isDeleting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                isLoading={isDeleting}
                onClick={handleDeleteMarket}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {locale === "bn" ? "হ্যাঁ, মুছে ফেলুন" : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
