"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import {
  formatCurrency,
  formatDate,
  toBanglaDigits,
  parseShopSerial,
  compareShopSerials,
  STANDARD_SHOP_BLOCKS,
} from "@/lib/format";
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
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
  AlertTriangle,
  User,
  UserCheck,
  ArrowUpDown,
  Sparkles,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { TenantProfileModal } from "./modals/tenant-profile-modal";
import { SettlementWizardModal } from "./modals/settlement-wizard-modal";
import { generateFloorOptions, formatFloorName } from "@/lib/floors";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { useRealtimeData } from "@/lib/realtime-sync";

export function ShopsView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, setSelectedMarketId, markets, refreshMarkets, refreshKey, triggerRefresh, isAdmin, refreshApprovals, currentUser, openQuickCollect } = useApp();
  const isOperator = currentUser?.role === "OPERATOR";

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const queryParams = new URLSearchParams();
  if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
  if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);
  const shopsUrl = `/api/shops?${queryParams.toString()}`;

  const { data: shopsData, isLoading, isSyncing, refetch: refetchShops } = useRealtimeData<{ shops: any[] }>(
    shopsUrl,
    { tag: "shops", refreshInterval: 15000 }
  );
  const shops = shopsData?.shops || [];

  // Sorting and Block Serial Filter States
  const [sortBy, setSortBy] = useState<string>("SHOP_ASC");
  const [selectedBlock, setSelectedBlock] = useState<string>("ALL");

  // Extract detected line/blocks from shops
  const availableBlocks = React.useMemo(() => {
    const blockCounts = new Map<string, number>();
    for (const s of shops) {
      const parsed = parseShopSerial(s.shopNumber);
      if (parsed.blockKey) {
        blockCounts.set(parsed.blockKey, (blockCounts.get(parsed.blockKey) || 0) + 1);
      }
    }
    const blocks = STANDARD_SHOP_BLOCKS.map((sb) => {
      const count = (blockCounts.get(sb.key) || 0) + (blockCounts.get(sb.englishKey) || 0);
      return {
        key: sb.key,
        englishKey: sb.englishKey,
        label: locale === "bn" ? sb.labelBn : sb.labelEn,
        count,
      };
    });
    return blocks;
  }, [shops, locale]);

  // Filter by line / block if selected
  const filteredByBlock = React.useMemo(() => {
    if (selectedBlock === "ALL") return shops;
    return shops.filter((s) => {
      const parsed = parseShopSerial(s.shopNumber);
      const targetStd = STANDARD_SHOP_BLOCKS.find((b) => b.key === selectedBlock);
      return (
        parsed.blockKey === selectedBlock ||
        (targetStd && parsed.blockKey === targetStd.englishKey)
      );
    });
  }, [shops, selectedBlock]);

  // Sort shops by user selection or default serialized order
  const sortedShops = React.useMemo(() => {
    const list = [...filteredByBlock];
    switch (sortBy) {
      case "SHOP_ASC":
        return list.sort((a, b) => compareShopSerials(a.shopNumber, b.shopNumber));
      case "SHOP_DESC":
        return list.sort((a, b) => compareShopSerials(b.shopNumber, a.shopNumber));
      case "TENANT_ASC":
        return list.sort((a, b) => {
          const nameA = a.tenant?.name || "zzz";
          const nameB = b.tenant?.name || "zzz";
          return nameA.localeCompare(nameB, locale === "bn" ? "bn" : "en");
        });
      case "TENANT_DESC":
        return list.sort((a, b) => {
          const nameA = a.tenant?.name || "";
          const nameB = b.tenant?.name || "";
          return nameB.localeCompare(nameA, locale === "bn" ? "bn" : "en");
        });
      case "RENT_DESC":
        return list.sort((a, b) => (b.currentRent || b.defaultRent) - (a.currentRent || a.defaultRent));
      case "RENT_ASC":
        return list.sort((a, b) => (a.currentRent || a.defaultRent) - (b.currentRent || b.defaultRent));
      case "ADVANCE_DESC":
        return list.sort((a, b) => (b.tenant?.advanceDeposit || 0) - (a.tenant?.advanceDeposit || 0));
      case "FLOOR_ASC":
        return list.sort((a, b) => (a.floor || "").localeCompare(b.floor || ""));
      case "STATUS":
        return list.sort((a, b) => a.status.localeCompare(b.status));
      default:
        return list.sort((a, b) => compareShopSerials(a.shopNumber, b.shopNumber));
    }
  }, [filteredByBlock, sortBy, locale]);

  // Auto-generate next serial shop number for a block
  const handleAutoGenerateSerial = (blockLetter: string = "এ") => {
    const targetMId = addShopMarketId || (selectedMarketId !== "ALL" ? selectedMarketId : markets[0]?.id);
    const marketShops = shops.filter((s) => s.marketId === targetMId);
    let maxNum = 0;
    const targetStd = STANDARD_SHOP_BLOCKS.find((b) => b.key === blockLetter);
    for (const s of marketShops) {
      const parsed = parseShopSerial(s.shopNumber);
      if (parsed.blockKey === blockLetter || (targetStd && parsed.blockKey === targetStd.englishKey)) {
        if (parsed.num > maxNum) maxNum = parsed.num;
      }
    }
    const nextNum = maxNum + 1;
    const formattedNumBn = nextNum < 10 ? `০${toBanglaDigits(nextNum)}` : toBanglaDigits(nextNum);
    const formattedNumEn = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    const generated = locale === "bn"
      ? `${blockLetter}-${formattedNumBn}`
      : `${targetStd?.englishKey || blockLetter}-${formattedNumEn}`;
    setShopNumber(generated);
  };

  // Modals
  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [deletingShop, setDeletingShop] = useState<any | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);
  const [isAssignTenantOpen, setIsAssignTenantOpen] = useState(false);
  const [isUpdateRentOpen, setIsUpdateRentOpen] = useState(false);
  const [isVacateConfirmOpen, setIsVacateConfirmOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [activeProfileTenantId, setActiveProfileTenantId] = useState<string | null>(null);
  const [activeSettlementTenantId, setActiveSettlementTenantId] = useState<string | null>(null);

  // Edit Shop Form State
  const [editShopNumber, setEditShopNumber] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editDefaultRentBDT, setEditDefaultRentBDT] = useState<number>(0);
  const [showShopDiffPreview, setShowShopDiffPreview] = useState(false);
  const [isSavingShopEdit, setIsSavingShopEdit] = useState(false);

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
  const [permanentAddress, setPermanentAddress] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [referencePhone, setReferencePhone] = useState("");
  const [referenceRelation, setReferenceRelation] = useState("");
  const [advanceDepositBDT, setAdvanceDepositBDT] = useState<number>(0);
  const [agreedRentBDT, setAgreedRentBDT] = useState<number>(20000);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

  const resetAssignTenantForm = () => {
    setTenantName("");
    setTenantPhone("");
    setTenantNid("");
    setPermanentAddress("");
    setReferenceName("");
    setReferencePhone("");
    setReferenceRelation("");
    setAdvanceDepositBDT(0);
    setAgreedRentBDT(0);
  };

  // 3. Update Rent Form
  const [newRentBDT, setNewRentBDT] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [rentNote, setRentNote] = useState("");
  const [isSubmittingRent, setIsSubmittingRent] = useState(false);



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
          name: tenantName.trim(),
          phone: tenantPhone.trim(),
          nid: tenantNid.trim() || undefined,
          permanentAddress: permanentAddress.trim() || undefined,
          referenceName: referenceName.trim() || undefined,
          referencePhone: referencePhone.trim() || undefined,
          referenceRelation: referenceRelation.trim() || undefined,
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
      resetAssignTenantForm();
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

  const openEditShop = (shop: any) => {
    setEditingShop(shop);
    setEditShopNumber(shop.shopNumber);
    setEditFloor(shop.floor);
    setEditSize(shop.size || "");
    setEditDefaultRentBDT(Math.round(shop.defaultRent / 100));
    setShowShopDiffPreview(false);
    setIsEditShopOpen(true);
  };

  const handleSaveShopEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    try {
      setIsSavingShopEdit(true);
      const body = {
        id: editingShop.id,
        shopNumber: editShopNumber,
        floor: editFloor,
        size: editSize,
        defaultRent: Math.round(editDefaultRentBDT * 100),
        submitForApproval: !isAdmin,
      };

      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update shop");
        return;
      }

      if (data.requiresApproval) {
        toast.info(
          locale === "bn"
            ? "দোকানের পরিবর্তনের আবেদনটি অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে।"
            : "Shop changes submitted for Admin approval."
        );
        refreshApprovals();
      } else {
        toast.success(locale === "bn" ? "দোকানের তথ্য সফলভাবে আপডেট হয়েছে!" : "Shop updated successfully!");
        triggerRefresh();
      }
      setIsEditShopOpen(false);
    } catch (e) {
      toast.error("Failed to update shop");
    } finally {
      setIsSavingShopEdit(false);
    }
  };

  const handleDeleteShop = async () => {
    if (!deletingShop) return;
    try {
      setIsDeletingShop(true);
      const res = await fetch(`/api/shops?id=${deletingShop.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete shop");
        return;
      }

      if (data.requiresApproval) {
        toast.info(
          locale === "bn"
            ? "দোকান মোছার আবেদনটি অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে।"
            : "Shop deletion request submitted for Admin approval."
        );
        refreshApprovals();
      } else {
        toast.success(locale === "bn" ? "দোকানটি সফলভাবে মুছে ফেলা হয়েছে।" : "Shop deleted successfully.");
        triggerRefresh();
      }
      setDeletingShop(null);
    } catch (e) {
      toast.error("Failed to delete shop");
    } finally {
      setIsDeletingShop(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>{t("shops.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
            {t("shops.subtitle")}
          </p>
        </div>

        {!isOperator && (
          <Button onClick={() => setIsAddShopOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {t("shops.addShop")}
          </Button>
        )}
      </div>

      {/* Filter and Search Bar with Sorting in Header Area */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search matching Latin & Bangla digits */}
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.searchShopsPlaceholder")}
              prefixIcon={<Search className="w-4 h-4 stroke-[2.5]" />}
            />
          </div>

          {/* Sorting Option in Header Area */}
          <div className="w-full sm:w-64 shrink-0">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 text-xs font-bold"
            >
              <option value="SHOP_ASC">
                {locale === "bn" ? "দোকান নং (এ, বি, সি... ১, ২, ৩)" : "Shop Number (A to Z / 1, 2, 3)"}
              </option>
              <option value="SHOP_DESC">
                {locale === "bn" ? "দোকান নং (এফ, ই, ডি... উল্টো)" : "Shop Number (Z to A / Reverse)"}
              </option>
              <option value="TENANT_ASC">
                {locale === "bn" ? "ভাড়াটিয়া নাম (অ - হ)" : "Tenant Name (A - Z)"}
              </option>
              <option value="TENANT_DESC">
                {locale === "bn" ? "ভাড়াটিয়া নাম (হ - অ)" : "Tenant Name (Z - A)"}
              </option>
              <option value="RENT_DESC">
                {locale === "bn" ? "মাসিক ভাড়া (বেশি থেকে কম)" : "Rent (High to Low)"}
              </option>
              <option value="RENT_ASC">
                {locale === "bn" ? "মাসিক ভাড়া (কম থেকে বেশি)" : "Rent (Low to High)"}
              </option>
              <option value="ADVANCE_DESC">
                {locale === "bn" ? "জামানত জমা (বেশি থেকে কম)" : "Advance Held (High to Low)"}
              </option>
              <option value="FLOOR_ASC">
                {locale === "bn" ? "ফ্লোর অনুসারে (নিচতলা, ২য়...)" : "Floor (Ground, 1st...)"}
              </option>
              <option value="STATUS">
                {locale === "bn" ? "স্ট্যাটাস (বরাদ্দকৃত / ফাঁকা)" : "Status (Occupied / Vacant)"}
              </option>
            </Select>
          </div>

          {/* Status filter tabs - Scrollable on mobile */}
          <div className="flex gap-1.5 bg-white dark:bg-[#1E1F24] p-1 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] shrink-0 overflow-x-auto no-scrollbar">
            {["ALL", "OCCUPIED", "VACANT"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                  statusFilter === status
                    ? "bg-[#FED734] text-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                    : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2D2F39]"
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

        {/* Market-wise Block / Serialised Line Pills (এ, বি, সি, ডি, ই, এফ / A, B, C, D, E, F) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-black text-black dark:text-white uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-black dark:text-white stroke-[2.5]" />
            <span>{locale === "bn" ? "সিরিয়াল / ব্লক:" : "Serial / Block:"}</span>
          </span>
          <button
            onClick={() => setSelectedBlock("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer border-2 border-black ${
              selectedBlock === "ALL"
                ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                : "bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[2px_2px_0px_#000000] hover:bg-[#FED734]/30 dark:hover:bg-[#FED734]/20"
            }`}
          >
            {locale === "bn" ? "সব সিরিয়াল" : "All Blocks"} ({shops.length})
          </button>
          {availableBlocks.map((b) => (
            <button
              key={b.key}
              onClick={() => setSelectedBlock(b.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer border-2 border-black flex items-center gap-1.5 ${
                selectedBlock === b.key
                  ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                  : "bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[2px_2px_0px_#000000] hover:bg-[#FED734]/30 dark:hover:bg-[#FED734]/20"
              }`}
            >
              <span>{b.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md border border-black font-black ${
                selectedBlock === b.key ? "bg-black text-[#FED734]" : "bg-[#FBF9F5] dark:bg-[#262830] text-black dark:text-white"
              }`}>
                {locale === "bn" ? toBanglaDigits(b.count) : b.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content: Cards on Mobile, Responsive Table on Desktop */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : sortedShops.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
          <Store className="w-12 h-12 text-black dark:text-white mx-auto mb-3 stroke-[2]" />
          <p className="text-base font-black text-black dark:text-white">
            {t("shops.noShopsFound")}
          </p>
          {selectedBlock !== "ALL" && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setSelectedBlock("ALL")}>
                {locale === "bn" ? "ব্লক ফিল্টার মুছুন" : "Clear Block Filter"}
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-2">{t("markets.createFirstMarket")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => {
                if (shop.status === "OCCUPIED" && shop.tenant) {
                  setActiveProfileTenantId(shop.tenant.id);
                } else {
                  setSelectedShop(shop);
                  setAgreedRentBDT(Math.round(shop.defaultRent / 100));
                  setAdvanceDepositBDT(0);
                  setIsAssignTenantOpen(true);
                }
              }}
              className="p-4 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0px_#000000] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-black text-black dark:text-white group-hover:text-black dark:group-hover:text-white flex items-center gap-2 truncate">
                        <span className="truncate">{shop.shopNumber}</span>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 shrink-0">
                          ({formatFloorName(shop.floor, locale)})
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold truncate" title={shop.marketName}>{shop.marketName}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={shop.status} />
                      {(isAdmin || currentUser?.role === "MANAGER") && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditShop(shop);
                            }}
                            className="p-1.5 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] text-black dark:text-white hover:text-black dark:hover:text-black shadow-[1.5px_1.5px_0px_#000000] transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                            title={locale === "bn" ? "দোকান সম্পাদনা" : "Edit Shop"}
                          >
                            <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingShop(shop);
                            }}
                            className="p-1.5 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FF4B55] hover:text-white dark:hover:bg-[#FF4B55] dark:hover:text-white shadow-[1.5px_1.5px_0px_#000000] text-black dark:text-white transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                            title={locale === "bn" ? "দোকান মুছুন" : "Delete Shop"}
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tenant Info or Vacant notice */}
                  <div className="my-2.5 p-2.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[1.5px_1.5px_0px_#000000] text-xs">
                    {shop.tenant ? (
                      <div className="space-y-1.5">
                        <div
                          className="flex items-center justify-between gap-2 cursor-pointer group/t"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProfileTenantId(shop.tenant.id);
                          }}
                          title={locale === "bn" ? "ভাড়াটিয়া প্রোফাইল দেখুন" : "View Tenant Profile"}
                        >
                          <span className="text-gray-600 dark:text-gray-400 font-bold shrink-0">{t("shops.currentTenant")}:</span>
                          <span className="font-black text-black dark:text-white group-hover/t:underline flex items-center gap-1 min-w-0 truncate">
                            <User className="w-3.5 h-3.5 text-black dark:text-white shrink-0 stroke-[2.5]" />
                            <span className="truncate">{shop.tenant.name}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-600 dark:text-gray-400 font-bold shrink-0">{t("tenants.phone")}:</span>
                          <a
                            href={`tel:${shop.tenant.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-black dark:text-white font-bold hover:underline flex items-center gap-1 shrink-0"
                          >
                            <Phone className="w-3 h-3 shrink-0 stroke-[2.5]" />
                            <span>{shop.tenant.phone}</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-500 dark:text-gray-400 font-bold">
                        <span>{t("shops.noTenant")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Rates */}
                <div className="flex items-center justify-between text-xs font-bold py-1 mt-auto border-t-2 border-black/10 dark:border-white/10">
                  <span className="text-gray-600 dark:text-gray-400">{t("shops.rentAmount")}:</span>
                  <span className="font-black text-base text-black dark:text-white">
                    {formatCurrency(shop.currentRent, locale)}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-3 pt-2.5 border-t-2 border-black/10">
                {shop.status === "VACANT" ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2 w-full justify-center border-2 border-black shadow-[2px_2px_0px_#000000]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShop(shop);
                        setNewRentBDT(Math.round(shop.currentRent / 100));
                        setIsUpdateRentOpen(true);
                      }}
                      title={t("shops.updateRent")}
                    >
                      <History className="w-3.5 h-3.5 mr-1 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{locale === "bn" ? "ভাড়া পরিবর্তন" : "Update Rent"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-8 px-2 w-full justify-center bg-[#00BA88] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000000] hover:bg-[#00a87a]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShop(shop);
                        setAgreedRentBDT(Math.round(shop.defaultRent / 100));
                        setAdvanceDepositBDT(0);
                        resetAssignTenantForm();
                        setIsAssignTenantOpen(true);
                      }}
                      title={t("shops.assignTenant")}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{locale === "bn" ? "বরাদ্দ দিন" : "Assign"}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {/* Quick Collect Rent Button */}
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-8 px-2 w-full font-black justify-center bg-[#FED734] text-black border-2 border-black shadow-[2px_2px_0px_#000000] hover:bg-[#edd028]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickCollect({
                          marketId: shop.marketId,
                          shopId: shop.id,
                          dueAmount: shop.currentRent,
                        });
                      }}
                      title={t("collections.quickCollect")}
                    >
                      <Wallet className="w-3.5 h-3.5 mr-1 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{locale === "bn" ? "ভাড়া আদায়" : "Collect"}</span>
                    </Button>

                    {/* Tenant Profile & Advance Ledger Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2 w-full border-2 border-black bg-white hover:bg-[#FBF9F5] text-black font-bold justify-center shadow-[2px_2px_0px_#000000]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (shop.tenant) {
                          setActiveProfileTenantId(shop.tenant.id);
                        }
                      }}
                      title={locale === "bn" ? "ভাড়াটিয়া প্রোফাইল ও জামানত" : "Tenant Profile & Advance"}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-black shrink-0 stroke-[2.5]" />
                      <span className="truncate">{locale === "bn" ? "প্রোফাইল/জামানত" : "Profile"}</span>
                    </Button>

                    {/* Update Rent Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2 w-full justify-center border-2 border-black bg-[#FBF9F5] text-black font-bold shadow-[2px_2px_0px_#000000] hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShop(shop);
                        setNewRentBDT(Math.round(shop.currentRent / 100));
                        setIsUpdateRentOpen(true);
                      }}
                      title={t("shops.updateRent")}
                    >
                      <History className="w-3.5 h-3.5 mr-1 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{locale === "bn" ? "ভাড়া পরিবর্তন" : "Update Rent"}</span>
                    </Button>

                    {/* Settle & Vacate Button */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs h-8 px-2 w-full justify-center bg-[#FF4B55] hover:bg-[#e03d46] text-white font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (shop.tenant) {
                          setActiveSettlementTenantId(shop.tenant.id);
                        }
                      }}
                      title={t("settlement.settleAndVacate")}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{locale === "bn" ? "হিসাব নিষ্পত্তি" : "Settle"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Shop Modal */}
      <Dialog
        isOpen={isAddShopOpen}
        onClose={() => setIsAddShopOpen(false)}
        title={t("shops.addShop")}
        maxWidth="lg"
      >
        <form onSubmit={handleAddShop} className="space-y-4">
          {/* Market Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
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
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                {t("shops.shopNumber")}
              </label>
              <Input
                value={shopNumber}
                onChange={(e) => setShopNumber(e.target.value)}
                placeholder="e.g. 101 or G-05"
                required
              />
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black">
                    {locale === "bn" ? "অটো সিরিয়াল (মার্কেট অনুযায়ী):" : "Auto Serial (Block-wise):"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STANDARD_SHOP_BLOCKS.map((sb) => (
                    <button
                      key={sb.key}
                      type="button"
                      onClick={() => handleAutoGenerateSerial(sb.key)}
                      className="px-2.5 py-1 text-xs font-black rounded-lg bg-[#FED734] hover:bg-[#ffe169] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                      title={locale === "bn" ? `${sb.labelBn} সিরিয়াল তৈরি করুন` : `Generate next serial for ${sb.labelEn}`}
                    >
                      +{locale === "bn" ? sb.key : sb.englishKey}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-black">
                  {t("shops.floor")}
                </label>
                <button
                  type="button"
                  onClick={handleIncreaseMarketFloors}
                  className="text-[11px] font-black text-black hover:underline flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-md border-2 border-black shadow-[1.5px_1.5px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title="Increase floor limit in market"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
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
            <div className="p-3.5 rounded-xl bg-[#FBF9F5] border-2 border-black shadow-[3px_3px_0px_#000000]">
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
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
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                {t("shops.size")}
              </label>
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 180 sqft"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                {t("shops.defaultRent")} (৳)
              </label>
              <NumberInput
                value={defaultRentBDT}
                onChange={(val) => setDefaultRentBDT(val)}
                prefix="৳"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t-2 border-black">
            <Button type="button" variant="outline" onClick={() => setIsAddShopOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSubmittingShop}>
              <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
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
          maxWidth="2xl"
        >
          <form onSubmit={handleAssignTenant} className="space-y-4">
            {/* Primary Tenant Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("tenants.tenantName")} <span className="text-[#FF4B55]">*</span>
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
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    {t("tenants.phone")} <span className="text-[#FF4B55]">*</span>
                  </label>
                  <Input
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    placeholder="01712345678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    {t("tenants.nid")}
                  </label>
                  <Input
                    value={tenantNid}
                    onChange={(e) => setTenantNid(e.target.value)}
                    placeholder="1990..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-black" />
                  <span>{t("tenants.permanentAddress")}</span>
                </label>
                <Input
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  placeholder={locale === "bn" ? "গ্রাম/রোড, ডাকঘর, থানা, জেলা (স্থায়ী বা বর্তমান ঠিকানা)" : "Village/Road, Post Office, Thana, District"}
                />
              </div>
            </div>

            {/* Reference Person Details */}
            <div className="pt-3.5 border-t-2 border-black space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                <Users className="w-4 h-4 stroke-[2.5]" />
                <span>{t("tenants.referenceInfo")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    {t("tenants.referenceName")}
                  </label>
                  <Input
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                    placeholder={locale === "bn" ? "রেফারেন্স ব্যক্তির নাম" : "Reference Person Name"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    {t("tenants.referencePhone")}
                  </label>
                  <Input
                    value={referencePhone}
                    onChange={(e) => setReferencePhone(e.target.value)}
                    placeholder="01811-XXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("tenants.referenceRelation")}
                </label>
                <Input
                  value={referenceRelation}
                  onChange={(e) => setReferenceRelation(e.target.value)}
                  placeholder={locale === "bn" ? "e.g. ভাই / পিতা / ব্যবসায়িক অংশীদার" : "e.g. Brother / Father / Partner"}
                />
              </div>
            </div>

            {/* Lease & Financial Terms */}
            <div className="pt-3.5 border-t-2 border-black space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    {t("tenants.rentAmount")} (৳)
                  </label>
                  <NumberInput
                    value={agreedRentBDT}
                    onChange={(val) => setAgreedRentBDT(val)}
                    prefix="৳"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5 flex items-center justify-between">
                    <span>{t("tenants.advanceDeposit")} (৳)</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FED734] border border-black text-black">
                      {locale === "bn" ? "ভাড়াটিয়া ভিত্তিক চুক্তি" : "Renter-specific"}
                    </span>
                  </label>
                  <NumberInput
                    value={advanceDepositBDT}
                    onChange={(val) => setAdvanceDepositBDT(val)}
                    prefix="৳"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t-2 border-black">
              <Button type="button" variant="outline" onClick={() => setIsAssignTenantOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isSubmittingTenant}>
                <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                {t("tenants.assignAction")}
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
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateRent} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                {t("shops.newRent")} (৳ BDT)
              </label>
              <NumberInput
                value={newRentBDT}
                onChange={(val) => setNewRentBDT(val)}
                prefix="৳"
                className="text-lg font-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("shops.effectiveFrom")}
                </label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
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
                <p className="text-xs font-black uppercase tracking-wider text-black mb-2">{t("shops.rentHistory")}:</p>
                <div className="space-y-1.5 text-xs bg-[#FBF9F5] p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000]">
                  {selectedShop.rentHistory.map((h: any) => (
                    <div key={h.id} className="flex justify-between py-1.5 border-b-2 border-black/10 last:border-none font-bold text-black">
                      <span className="text-gray-700">{formatDate(h.effectiveFrom, locale)}</span>
                      <span className="font-black text-black">{formatCurrency(h.rentAmount, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t-2 border-black">
              <Button type="button" variant="outline" onClick={() => setIsUpdateRentOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isSubmittingRent}>
                <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
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

      {/* Edit Shop Modal (With Live What Have vs What Will Have DiffViewer) */}
      {editingShop && (
        <Dialog
          isOpen={isEditShopOpen}
          onClose={() => setIsEditShopOpen(false)}
          title={
            <div className="flex items-center gap-2 font-black text-black">
              <Edit className="w-5 h-5 stroke-[2.5]" />
              <span>{locale === "bn" ? "দোকানের তথ্য সম্পাদনা" : "Edit Shop Information"}</span>
            </div>
          }
          description={`${editingShop.shopNumber} — ${editingShop.marketName}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveShopEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("shops.shopNumber")}
                </label>
                <Input
                  value={editShopNumber}
                  onChange={(e) => setEditShopNumber(e.target.value)}
                  placeholder="e.g. A-101"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("shops.floor")}
                </label>
                <select
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-[#FBF9F5] text-black border-2 border-black rounded-xl focus:bg-white focus:outline-none focus:shadow-[3px_3px_0px_#000000] shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
                >
                  {generateFloorOptions(
                    markets.find((m) => m.id === editingShop.marketId)?.totalFloors || 5,
                    locale,
                    false
                  ).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("shops.size")}
                </label>
                <Input
                  value={editSize}
                  onChange={(e) => setEditSize(e.target.value)}
                  placeholder="e.g. 180 sqft"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  {t("shops.defaultRent")} (৳ BDT)
                </label>
                <NumberInput
                  value={editDefaultRentBDT}
                  onChange={(val) => setEditDefaultRentBDT(val)}
                  prefix="৳"
                />
              </div>
            </div>

            {/* Difference Viewer Toggle */}
            <div className="pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setShowShopDiffPreview(!showShopDiffPreview)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#FBF9F5] hover:bg-[#FED734]/20 border-2 border-black shadow-[2px_2px_0px_#000000] text-xs font-black text-black active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {locale === "bn"
                      ? "পার্থক্য প্রিভিউ দেখুন (What have ➔ What will have)"
                      : "Preview Differences (What Have vs What Will Have)"}
                  </span>
                </span>
                <span className="text-[11px] font-black underline">
                  {showShopDiffPreview
                    ? locale === "bn" ? "লুকান" : "Hide"
                    : locale === "bn" ? "দেখুন" : "Show"}
                </span>
              </button>

              {showShopDiffPreview && (
                <div className="mt-2.5 p-3 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
                  <DiffViewer
                    currentData={{
                      shopNumber: editingShop.shopNumber,
                      floor: editingShop.floor,
                      size: editingShop.size || "",
                      defaultRent: editingShop.defaultRent,
                    }}
                    proposedData={{
                      shopNumber: editShopNumber,
                      floor: editFloor,
                      size: editSize,
                      defaultRent: Math.round(editDefaultRentBDT * 100),
                    }}
                    title={locale === "bn" ? "দোকানের পরিবর্তনের পার্থক্য" : "Shop Changes"}
                    hideUnchanged={true}
                  />
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t-2 border-black">
              <Button type="button" variant="outline" onClick={() => setIsEditShopOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isSavingShopEdit}>
                <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                {!isAdmin
                  ? locale === "bn" ? "অনুমোদনের জন্য পাঠান" : "Submit for Approval"
                  : t("common.save")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Shop Confirmation Modal */}
      {deletingShop && (
        <Dialog
          isOpen={!!deletingShop}
          onClose={() => setDeletingShop(null)}
          title={
            <div className="flex items-center gap-2 text-[#FF4B55] font-black">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              <span>{locale === "bn" ? "দোকান মুছে ফেলার নিশ্চিতকরণ" : "Confirm Delete Shop"}</span>
            </div>
          }
          description={
            locale === "bn"
              ? `আপনি কি নিশ্চিত যে '${deletingShop.shopNumber}' দোকানটি মুছে ফেলতে চান? এটি শুধুমাত্র অ্যাডমিন কর্তৃক সম্পন্ন হবে।`
              : `Are you sure you want to delete shop '${deletingShop.shopNumber}'?`
          }
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FFEBEF] border-2 border-[#FFA2B2] shadow-[2px_2px_0px_#FF4B55] flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-white border-2 border-[#FF4B55] text-[#FF4B55] flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0px_#FF4B55]">
                !
              </div>
              <p className="text-xs text-black font-bold leading-relaxed">
                {locale === "bn"
                  ? "দোকান মুছে ফেললে সম্পর্কিত ইতিহাস সংরক্ষণ রাখা হতে পারে কিন্তু এটি সক্রিয় তালিকা থেকে বাদ পড়বে।"
                  : "Deleting this shop removes it from the active roster. Related history will be retained for audit records."}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingShop(null)}
                disabled={isDeletingShop}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isDeletingShop}
                onClick={handleDeleteShop}
              >
                <Trash2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                {locale === "bn" ? "মুছে ফেলুন" : "Delete"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
