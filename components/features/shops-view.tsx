"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Store,
  Plus,
  Search,
  UserPlus,
  UserX,
  History,
  Phone,
  CheckCircle2,
  Calendar,
  Layers,
  Wallet,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { TenantProfileModal } from "./modals/tenant-profile-modal";
import { SettlementWizardModal } from "./modals/settlement-wizard-modal";
import { generateFloorOptions, formatFloorName } from "@/lib/floors";

export function ShopsView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, setSelectedMarketId, markets, refreshMarkets, refreshKey, triggerRefresh } = useApp();

  const [shops, setShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [isAssignTenantOpen, setIsAssignTenantOpen] = useState(false);
  const [isUpdateRentOpen, setIsUpdateRentOpen] = useState(false);
  const [isVacateConfirmOpen, setIsVacateConfirmOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [activeProfileTenantId, setActiveProfileTenantId] = useState<string | null>(null);
  const [activeSettlementTenantId, setActiveSettlementTenantId] = useState<string | null>(null);

  // Form States
  // 1. Add Shop Form
  const [addShopMarketId, setAddShopMarketId] = useState<string>("");
  const [shopNumber, setShopNumber] = useState("");
  const [floor, setFloor] = useState("Ground");
  const [customFloorName, setCustomFloorName] = useState("");
  const [size, setSize] = useState("180 sqft");
  const [defaultRentBDT, setDefaultRentBDT] = useState<number>(20000);
  const [isSubmittingShop, setIsSubmittingShop] = useState(false);

  // Current market for Add Shop
  const currentTargetMarket =
    markets.find((m) => m.id === (addShopMarketId || selectedMarketId)) || markets[0];

  const handleIncreaseMarketFloors = async () => {
    if (!currentTargetMarket) return;
    try {
      const current = currentTargetMarket.totalFloors || 5;
      const nextFloors = current + 1;
      const res = await fetch("/api/markets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentTargetMarket.id, totalFloors: nextFloors }),
      });
      if (res.ok) {
        await refreshMarkets();
        toast.success(
          locale === "bn"
            ? `${currentTargetMarket.name}-এর ফ্লোর সংখ্যা বাড়িয়ে ${toBanglaDigits(nextFloors)} তলা করা হয়েছে!`
            : `${currentTargetMarket.name} floors increased to ${nextFloors}!`
        );
      }
    } catch (e) {
      toast.error("Failed to update market floors");
    }
  };

  // 2. Assign Tenant Form
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantNid, setTenantNid] = useState("");
  const [advanceDepositBDT, setAdvanceDepositBDT] = useState<number>(60000);
  const [agreedRentBDT, setAgreedRentBDT] = useState<number>(20000);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

  // 3. Update Rent Form
  const [newRentBDT, setNewRentBDT] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [rentNote, setRentNote] = useState("");
  const [isSubmittingRent, setIsSubmittingRent] = useState(false);

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams();
        if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
        if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
        if (search) queryParams.set("search", search);

        const res = await fetch(`/api/shops?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setShops(data.shops || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShops();
  }, [selectedMarketId, statusFilter, search, refreshKey]);

  // Handlers
  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopNumber.trim()) {
      toast.error(t("validation.required"));
      return;
    }
    const targetMarketId = addShopMarketId || (selectedMarketId !== "ALL" ? selectedMarketId : markets[0]?.id);
    if (!targetMarketId) {
      toast.error("Please select a market first");
      return;
    }

    const finalFloor = floor === "CUSTOM" ? (customFloorName.trim() || "Ground") : floor;

    try {
      setIsSubmittingShop(true);
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: targetMarketId,
          shopNumber: shopNumber.trim(),
          floor: finalFloor,
          size,
          defaultRent: Math.round(defaultRentBDT * 100),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create shop");
        return;
      }

      toast.success(t("shops.shopCreated"));
      triggerRefresh();
      setIsAddShopOpen(false);
      setShopNumber("");
      setCustomFloorName("");
    } catch (e) {
      toast.error("Failed to create shop");
    } finally {
      setIsSubmittingShop(false);
    }
  };

  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !tenantPhone.trim()) {
      toast.error(t("validation.required"));
      return;
    }

    try {
      setIsSubmittingTenant(true);
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          name: tenantName,
          phone: tenantPhone,
          nid: tenantNid,
          advanceDeposit: Math.round(advanceDepositBDT * 100),
          rentAmount: Math.round(agreedRentBDT * 100),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to assign tenant");
        return;
      }

      toast.success(t("tenants.tenantAssigned"));
      triggerRefresh();
      setIsAssignTenantOpen(false);
      setTenantName("");
      setTenantPhone("");
    } catch (e) {
      toast.error("Failed to assign tenant");
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  const handleUpdateRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRentBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSubmittingRent(true);
      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedShop.id,
          newRent: Math.round(newRentBDT * 100),
          effectiveFrom,
          note: rentNote,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to update rent");
        return;
      }

      toast.success(t("shops.rentUpdated"));
      triggerRefresh();
      setIsUpdateRentOpen(false);
    } catch (e) {
      toast.error("Failed to update rent");
    } finally {
      setIsSubmittingRent(false);
    }
  };

  const handleVacate = async () => {
    if (!selectedShop) return;
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vacate",
          shopId: selectedShop.id,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to vacate tenant");
        return;
      }

      toast.success(t("shops.tenantVacated"));
      triggerRefresh();
      setIsVacateConfirmOpen(false);
    } catch (e) {
      toast.error("Failed to vacate");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Store className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{t("shops.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("shops.subtitle")}
          </p>
        </div>

        <Button onClick={() => setIsAddShopOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          {t("shops.addShop")}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search matching Latin & Bangla digits */}
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchShopsPlaceholder")}
            prefixIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg shrink-0">
          {["ALL", "OCCUPIED", "VACANT"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {status === "ALL"
                ? t("common.all")
                : status === "OCCUPIED"
                ? t("status.occupied")
                : t("status.vacant")}
            </button>
          ))}
        </div>
      </div>

      {/* Content: Cards on Mobile, Responsive Table on Desktop */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : shops.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("shops.noShopsFound")}
          </p>
          <p className="text-xs text-slate-500 mt-1">{t("markets.createFirstMarket")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card
              key={shop.id}
              onClick={() => {
                if (shop.status === "OCCUPIED" && shop.tenant) {
                  setActiveProfileTenantId(shop.tenant.id);
                } else {
                  setSelectedShop(shop);
                  setAgreedRentBDT(Math.round(shop.defaultRent / 100));
                  setAdvanceDepositBDT(Math.round((shop.defaultRent * 3) / 100));
                  setIsAssignTenantOpen(true);
                }
              }}
              className="p-5 flex flex-col justify-between hover:border-teal-500/60 dark:hover:border-teal-500/60 hover:shadow-lg transition-all shadow-xs cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex items-center gap-2">
                      <span>{shop.shopNumber}</span>
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        ({formatFloorName(shop.floor, locale)})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{shop.marketName}</p>
                  </div>
                  <StatusBadge status={shop.status} />
                </div>

                {/* Tenant Info or Vacant notice */}
                <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                  {shop.tenant ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t("shops.currentTenant")}:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {shop.tenant.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t("tenants.phone")}:</span>
                        <a
                          href={`tel:${shop.tenant.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{shop.tenant.phone}</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1 text-slate-400">
                      <span>{t("shops.noTenant")}</span>
                    </div>
                  )}
                </div>

                {/* Financial Rates */}
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500">{t("shops.rentAmount")}:</span>
                  <span className="font-bold text-base text-teal-700 dark:text-teal-400">
                    {formatCurrency(shop.currentRent, locale)}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShop(shop);
                    setNewRentBDT(Math.round(shop.currentRent / 100));
                    setIsUpdateRentOpen(true);
                  }}
                  title={t("shops.updateRent")}
                >
                  <History className="w-3.5 h-3.5 mr-1" />
                  {t("shops.updateRent")}
                </Button>

                {shop.status === "VACANT" ? (
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs h-8 px-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShop(shop);
                      setAgreedRentBDT(Math.round(shop.defaultRent / 100));
                      setAdvanceDepositBDT(Math.round((shop.defaultRent * 3) / 100));
                      setIsAssignTenantOpen(true);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    {t("shops.assignTenant")}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {/* Advance Ledger Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2 border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProfileTenantId(shop.tenant.id);
                      }}
                      title={t("advance.title")}
                    >
                      <Wallet className="w-3.5 h-3.5 mr-1 text-teal-600" />
                      <span>{t("advance.title")}</span>
                    </Button>

                    {/* Settle & Vacate Button */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSettlementTenantId(shop.tenant.id);
                      }}
                      title={t("settlement.settleAndVacate")}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      <span>{t("settlement.settleAndVacate")}</span>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Shop Modal */}
      <Dialog
        isOpen={isAddShopOpen}
        onClose={() => setIsAddShopOpen(false)}
        title={t("shops.addShop")}
        maxWidth="md"
      >
        <form onSubmit={handleAddShop} className="space-y-4">
          {/* Market Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t("markets.title")}
            </label>
            <SearchableSelect
              options={markets.map((m) => ({
                value: m.id,
                label: m.name,
                sublabel: `${locale === "bn" ? toBanglaDigits(m.totalFloors || 5) : (m.totalFloors || 5)} ${locale === "bn" ? "তলা ভবন" : "Floors"}`,
              }))}
              value={addShopMarketId || (selectedMarketId !== "ALL" ? selectedMarketId : markets[0]?.id || "")}
              onChange={(val) => setAddShopMarketId(val)}
              placeholder="Select market..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t("shops.shopNumber")}
              </label>
              <Input
                value={shopNumber}
                onChange={(e) => setShopNumber(e.target.value)}
                placeholder="e.g. 101 or G-05"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("shops.floor")}
                </label>
                <button
                  type="button"
                  onClick={handleIncreaseMarketFloors}
                  className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Increase floor limit in market"
                >
                  <Plus className="w-3 h-3" />
                  <span>{locale === "bn" ? "+ তলা বাড়ান" : "+ Floor"}</span>
                </button>
              </div>
              <SearchableSelect
                options={generateFloorOptions(currentTargetMarket?.totalFloors || 5, locale, true)}
                value={floor}
                onChange={(val) => setFloor(val)}
                placeholder="Select floor..."
                searchPlaceholder={locale === "bn" ? "ফ্লোর খুঁজুন..." : "Search floor..."}
                extraAction={{
                  label: locale === "bn"
                    ? `+ ${currentTargetMarket?.name || "মার্কেট"}-এর ফ্লোর সংখ্যা বাড়ান`
                    : `+ Increase ${currentTargetMarket?.name || "Market"} Floors`,
                  onClick: handleIncreaseMarketFloors,
                }}
              />
            </div>
          </div>

          {floor === "CUSTOM" && (
            <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
              <label className="block text-xs font-bold text-teal-700 dark:text-teal-300 mb-1">
                {t("shops.customFloor")}
              </label>
              <Input
                value={customFloorName}
                onChange={(e) => setCustomFloorName(e.target.value)}
                placeholder={t("shops.customFloorPlaceholder")}
                required
                autoFocus
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t("shops.size")}
              </label>
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 180 sqft"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t("shops.defaultRent")} (৳)
              </label>
              <NumberInput
                value={defaultRentBDT}
                onChange={(val) => setDefaultRentBDT(val)}
                prefix="৳"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddShopOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSubmittingShop}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Assign Tenant Modal */}
      {selectedShop && (
        <Dialog
          isOpen={isAssignTenantOpen}
          onClose={() => setIsAssignTenantOpen(false)}
          title={t("tenants.assignTitle", { shop: selectedShop.shopNumber })}
          maxWidth="md"
        >
          <form onSubmit={handleAssignTenant} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t("tenants.tenantName")}
              </label>
              <Input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="e.g. মোঃ রফিকুল ইসলাম"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t("tenants.phone")}
                </label>
                <Input
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  placeholder="01712345678"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t("tenants.nid")}
                </label>
                <Input
                  value={tenantNid}
                  onChange={(e) => setTenantNid(e.target.value)}
                  placeholder="1990..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t("tenants.rentAmount")} (৳)
                </label>
                <NumberInput
                  value={agreedRentBDT}
                  onChange={(val) => setAgreedRentBDT(val)}
                  prefix="৳"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t("tenants.advanceDeposit")} (৳)
                </label>
                <NumberInput
                  value={advanceDepositBDT}
                  onChange={(val) => setAdvanceDepositBDT(val)}
                  prefix="৳"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAssignTenantOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isSubmittingTenant}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {t("tenants.tenantAssigned")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Update Rent Modal (With Effective Month & History) */}
      {selectedShop && (
        <Dialog
          isOpen={isUpdateRentOpen}
          onClose={() => setIsUpdateRentOpen(false)}
          title={t("shops.updateRent")}
          description={`${selectedShop.shopNumber} — ${selectedShop.marketName}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateRent} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t("shops.newRent")} (৳ BDT)
              </label>
              <NumberInput
                value={newRentBDT}
                onChange={(val) => setNewRentBDT(val)}
                prefix="৳"
                className="text-lg font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t("shops.effectiveFrom")}
                </label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t("common.notes")}
                </label>
                <Input
                  value={rentNote}
                  onChange={(e) => setRentNote(e.target.value)}
                  placeholder="e.g. বার্ষিক ভাড়া বৃদ্ধি"
                />
              </div>
            </div>

            {/* Revision history table */}
            {selectedShop.rentHistory?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-500 mb-2">{t("shops.rentHistory")}:</p>
                <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedShop.rentHistory.map((h: any) => (
                    <div key={h.id} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-none">
                      <span className="text-slate-500">{formatDate(h.effectiveFrom, locale)}</span>
                      <span className="font-semibold">{formatCurrency(h.rentAmount, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsUpdateRentOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isSubmittingRent}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {t("shops.updateRent")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Tenant Profile & Advance Ledger Modal */}
      {activeProfileTenantId && (
        <TenantProfileModal
          isOpen={!!activeProfileTenantId}
          onClose={() => setActiveProfileTenantId(null)}
          tenantId={activeProfileTenantId}
          onRefreshNeeded={() => triggerRefresh()}
        />
      )}

      {/* Settle & Vacate Wizard Modal */}
      {activeSettlementTenantId && (
        <SettlementWizardModal
          isOpen={!!activeSettlementTenantId}
          onClose={() => setActiveSettlementTenantId(null)}
          tenantId={activeSettlementTenantId}
          onSettlementComplete={() => triggerRefresh()}
        />
      )}
    </div>
  );
}
