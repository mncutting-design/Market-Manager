"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
import { useApp } from "@/lib/app-context";
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
  History,
  AlertCircle,
  FileCheck2,
  Edit3,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Home,
  Users,
  Camera,
  Layers,
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
  onUpdated?: () => void;
}

export function TenantProfileModal({
  isOpen,
  onClose,
  tenantId,
  onRefreshNeeded,
  onUpdated,
}: TenantProfileModalProps) {
  const { t, locale } = useTranslation();
  const { isAdmin, currentUser, triggerRefresh } = useApp();

  const [activeTab, setActiveTab] = useState<"profile" | "edit" | "advance" | "topups">("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [tenantData, setTenantData] = useState<any>(null);
  const [advanceData, setAdvanceData] = useState<any>(null);
  const [topUpRequests, setTopUpRequests] = useState<any[]>([]);

  // Sub-modals
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [statementData, setStatementData] = useState<any | null>(null);

  // Edit Tenant Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNid, setEditNid] = useState("");
  const [editPermanentAddress, setEditPermanentAddress] = useState("");
  const [editReferenceName, setEditReferenceName] = useState("");
  const [editReferencePhone, setEditReferencePhone] = useState("");
  const [editReferenceRelation, setEditReferenceRelation] = useState("");
  const [editRentAmountBDT, setEditRentAmountBDT] = useState<number>(0);
  const [editEffectiveFrom, setEditEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Topup Form State
  const [topupAmountBDT, setTopupAmountBDT] = useState<number>(0);
  const [topupMethod, setTopupMethod] = useState("CASH");
  const [topupNote, setTopupNote] = useState("");
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);

  // Rejection note state for admin deciding top-up
  const [decidingTopUpId, setDecidingTopUpId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isDecidingTopup, setIsDecidingTopup] = useState(false);

  const fetchAllData = async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [tRes, advRes, topRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}`),
        fetch(`/api/tenants/${tenantId}/advance`),
        fetch(`/api/tenants/${tenantId}/topup-request`),
      ]);

      if (tRes.ok) {
        const json = await tRes.json();
        const tObj = json.tenant;
        setTenantData(tObj);
        // Sync edit form fields
        setEditName(tObj.name || "");
        setEditPhone(tObj.phone || "");
        setEditNid(tObj.nid || "");
        setEditPermanentAddress(tObj.permanentAddress || "");
        setEditReferenceName(tObj.referenceName || "");
        setEditReferencePhone(tObj.referencePhone || "");
        setEditReferenceRelation(tObj.referenceRelation || "");
        setEditRentAmountBDT(Math.round((tObj.rentAmount || 0) / 100));
        setEditStartDate(tObj.startDate ? new Date(tObj.startDate).toISOString().slice(0, 10) : "");
        setEditEndDate(tObj.endDate ? new Date(tObj.endDate).toISOString().slice(0, 10) : "");
      }

      if (advRes.ok) {
        const json = await advRes.json();
        setAdvanceData(json);
      }

      if (topRes.ok) {
        const json = await topRes.json();
        setTopUpRequests(json.requests || []);
      }
    } catch (e) {
      console.error("Failed to load tenant full profile:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchAllData();
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      toast.error(locale === "bn" ? "ভাড়াটিয়ার নাম ও মোবাইল নম্বর আবশ্যক" : "Name and Phone are required");
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          nid: editNid.trim() || null,
          permanentAddress: editPermanentAddress.trim() || null,
          referenceName: editReferenceName.trim() || null,
          referencePhone: editReferencePhone.trim() || null,
          referenceRelation: editReferenceRelation.trim() || null,
          rentAmount: Math.round(editRentAmountBDT * 100),
          effectiveFrom: editEffectiveFrom,
          startDate: editStartDate || undefined,
          endDate: editEndDate || null,
          note: editNote.trim() || undefined,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        toast.error(resJson.error || "Failed to update tenant");
        return;
      }

      if (resJson.requiresApproval) {
        toast.success(
          locale === "bn"
            ? "ভাড়াটিয়া পরিবর্তনের আবেদন অ্যাডমিন অনুমোদনের জন্য জমা হয়েছে"
            : "Edit request submitted for admin approval"
        );
      } else {
        toast.success(
          locale === "bn" ? "ভাড়াটিয়ার তথ্য সফলভাবে হালনাগাদ করা হয়েছে" : "Tenant profile updated successfully"
        );
      }

      await fetchAllData();
      setActiveTab("profile");
      if (onRefreshNeeded) onRefreshNeeded();
      if (onUpdated) onUpdated();
      triggerRefresh("shops");
    } catch (e) {
      toast.error("Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRecordTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = Math.round(topupAmountBDT * 100);
    if (paisa <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    try {
      setIsSubmittingTopup(true);
      const res = await fetch(`/api/tenants/${tenantId}/topup-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paisa,
          method: topupMethod,
          note: topupNote.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.error || "Failed to process top-up");
        return;
      }

      if (resData.direct) {
        toast.success(locale === "bn" ? "জামানত টপ-আপ সফলভাবে জমা হয়েছে" : "Advance top-up recorded directly");
      } else {
        toast.success(
          locale === "bn"
            ? "জামানত টপ-আপ আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে"
            : "Top-up request submitted for approval"
        );
      }

      setIsTopupModalOpen(false);
      setTopupAmountBDT(0);
      setTopupNote("");
      await fetchAllData();
      if (onRefreshNeeded) onRefreshNeeded();
      if (onUpdated) onUpdated();
      triggerRefresh("shops");
    } catch (e) {
      toast.error("Failed to process top-up");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const handleDecideTopUp = async (id: string, action: "APPROVE" | "REJECT", reason?: string) => {
    try {
      setIsDecidingTopup(true);
      const res = await fetch("/api/approvals/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to process approval");
        return;
      }

      toast.success(
        action === "APPROVE"
          ? locale === "bn"
            ? "টপ-আপ সফলভাবে অনুমোদিত এবং জামানত যোগ হয়েছে"
            : "Top-up approved and credited to advance balance"
          : locale === "bn"
          ? "টপ-আপ আবেদনটি বাতিল করা হয়েছে"
          : "Top-up request rejected"
      );

      setDecidingTopUpId(null);
      setRejectReason("");
      await fetchAllData();
      if (onRefreshNeeded) onRefreshNeeded();
      if (onUpdated) onUpdated();
      triggerRefresh("shops");
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setIsDecidingTopup(false);
    }
  };

  const advanceBalance = advanceData?.advanceBalance || 0;
  const requiredAdvance = advanceData?.requiredAdvance || 0;
  const shortfall = advanceData?.shortfall || 0;
  const transactions = advanceData?.transactions || [];

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={tenantData?.name || t("tenants.title")}
        description={
          tenantData?.shop
            ? `${tenantData.shop.shopNumber} — ${tenantData.shop.market.name}`
            : ""
        }
        maxWidth="3xl"
      >
        {isLoading || !tenantData ? (
          <div className="py-20 flex flex-col items-center justify-center min-h-[380px] space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-black border-t-[#FED734] animate-spin" />
            <p className="text-xs font-black uppercase tracking-wider text-black dark:text-white">{t("common.loading")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[3px_3px_0px_#000000] text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-black text-black dark:text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-black dark:text-[#FED734] stroke-[2.5]" />
                  {tenantData.phone}
                </span>
                <span>•</span>
                <span className="text-neutral-600 dark:text-neutral-400 font-bold">
                  {t("tenants.rentAmount")}: <strong className="text-black dark:text-white font-black">{formatCurrency(tenantData.rentAmount, locale)}</strong>
                </span>
                <span>•</span>
                <span className="text-neutral-600 dark:text-neutral-400 font-bold">
                  {t("advance.advanceBalance")}: <strong className="text-[#00BA88] font-mono font-black">{formatCurrency(advanceBalance, locale)}</strong>
                </span>
              </div>
              <StatusBadge status={tenantData.status} />
            </div>

            {/* Navigation Tabs - Neo-Brutalist Pill Tabs */}
            <div className="flex border-b-2 border-black pb-1 gap-1 text-xs font-black overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`px-3.5 py-2 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "profile"
                    ? "bg-[#FED734] text-black border-black shadow-[2px_2px_0px_#000000] -translate-y-0.5"
                    : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <User className="w-4 h-4 stroke-[2.5]" />
                <span>{t("tenants.profileDetails")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3.5 py-2 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "edit"
                    ? "bg-[#FED734] text-black border-black shadow-[2px_2px_0px_#000000] -translate-y-0.5"
                    : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <Edit3 className="w-4 h-4 stroke-[2.5]" />
                <span>{t("tenants.editProfile")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("advance")}
                className={`px-3.5 py-2 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "advance"
                    ? "bg-[#FED734] text-black border-black shadow-[2px_2px_0px_#000000] -translate-y-0.5"
                    : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>{t("tenants.advanceLedger")}</span>
                {shortfall > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#FF4B55] border border-black ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("topups")}
                className={`px-3.5 py-2 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "topups"
                    ? "bg-[#FED734] text-black border-black shadow-[2px_2px_0px_#000000] -translate-y-0.5"
                    : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>{t("tenants.topUpRequests")}</span>
                {topUpRequests.filter((r) => r.status === "PENDING").length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-black bg-[#FED734] border border-black text-[10px] font-black">
                    {topUpRequests.filter((r) => r.status === "PENDING").length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: PROFILE DETAILS */}
            {activeTab === "profile" && (
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Personal Details Card */}
                  <div className="p-4 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000] space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 border-b-2 border-black pb-2">
                      <User className="w-4 h-4 text-black dark:text-[#FED734] stroke-[2.5]" />
                      <span>{t("tenants.title")}</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 font-bold">{t("tenants.tenantName")}</span>
                        <p className="font-black text-black dark:text-white mt-0.5">{tenantData.name}</p>
                      </div>
                      <div>
                        <span className="text-neutral-500 font-bold">{t("tenants.phone")}</span>
                        <p className="font-black text-black dark:text-white font-mono mt-0.5">{tenantData.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-neutral-500 font-bold">{t("tenants.nid")}</span>
                        <p className="font-black text-black dark:text-white font-mono mt-0.5">
                          {tenantData.nid || "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-neutral-500 font-bold">{t("tenants.permanentAddress")}</span>
                        <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 whitespace-pre-wrap">
                          {tenantData.permanentAddress || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reference Person Card */}
                  <div className="p-4 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000] space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 border-b-2 border-black pb-2">
                      <Users className="w-4 h-4 text-black dark:text-[#FED734] stroke-[2.5]" />
                      <span>রেফারেন্স ব্যক্তির তথ্য (Reference Person)</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 font-bold">{t("tenants.referenceName")}</span>
                        <p className="font-black text-black dark:text-white mt-0.5">
                          {tenantData.referenceName || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-neutral-500 font-bold">{t("tenants.referencePhone")}</span>
                        <p className="font-black text-black dark:text-white font-mono mt-0.5">
                          {tenantData.referencePhone || "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-neutral-500 font-bold">{t("tenants.referenceRelation")}</span>
                        <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                          {tenantData.referenceRelation || "—"}
                        </p>
                      </div>
                      <div className="col-span-2 pt-2 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
                        <span className="text-neutral-500 font-bold">{t("tenants.startDate")}:</span>
                        <span className="font-black text-black dark:text-white">{formatDate(tenantData.startDate, locale)}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between text-xs">
                        <span className="text-neutral-500 font-bold">{t("tenants.endDate")}:</span>
                        <span className="font-black text-black dark:text-white">{tenantData.endDate ? formatDate(tenantData.endDate, locale) : "অনির্দিষ্ট (Ongoing)"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rent History Table */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-black dark:text-[#FED734] stroke-[2.5]" />
                    <span>{t("tenants.rentHistory")}</span>
                  </h4>
                  {(!tenantData.rentHistory || tenantData.rentHistory.length === 0) ? (
                    <p className="text-xs text-neutral-500 font-bold py-3 text-center border-2 border-dashed rounded-xl border-black dark:border-neutral-700 bg-white dark:bg-[#1E1F24]">
                      ভাড়া পরিবর্তনের কোনো পূর্ববর্তী ইতিহাস নেই
                    </p>
                  ) : (
                    <div className="rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-[#FED734] border-b-2 border-black font-black text-black">
                          <tr>
                            <th className="p-2.5">কার্যকরের তারিখ</th>
                            <th className="p-2.5 text-right">নির্ধারিত ভাড়া</th>
                            <th className="p-2.5">নোট ও বিবরণ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/10 dark:divide-white/10 bg-white dark:bg-[#1E1F24]">
                          {tenantData.rentHistory.map((rh: any) => (
                            <tr key={rh.id} className="hover:bg-[#FED734]/10 transition-colors">
                              <td className="p-2.5 text-neutral-600 dark:text-neutral-400 font-bold whitespace-nowrap">
                                {formatDate(rh.effectiveFrom, locale)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-[#00BA88] whitespace-nowrap">
                                {formatCurrency(rh.rentAmount, locale)}
                              </td>
                              <td className="p-2.5 text-black dark:text-white font-bold">
                                {rh.note || "ভাড়া পরিবর্তন"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EDIT TENANT */}
            {activeTab === "edit" && (
              <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.tenantName")} *
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. মোঃ রফিকুল ইসলাম"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.phone")} *
                    </label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="01711-XXXXXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.nid")}
                    </label>
                    <Input
                      value={editNid}
                      onChange={(e) => setEditNid(e.target.value)}
                      placeholder="জাতীয় পরিচয়পত্র নম্বর"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.rentAmount")} (৳ BDT) *
                    </label>
                    <NumberInput
                      value={editRentAmountBDT}
                      onChange={(val) => setEditRentAmountBDT(val)}
                      prefix="৳"
                      className="font-black"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.permanentAddress")}
                    </label>
                    <textarea
                      value={editPermanentAddress}
                      onChange={(e) => setEditPermanentAddress(e.target.value)}
                      placeholder="গ্রাম/রোড, ডাকঘর, থানা, জেলা (বাংলা ও ইংরেজি উভয় ভাষায় গ্রহণযোগ্য)"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-black bg-white dark:bg-[#262830] text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:outline-none min-h-[64px]"
                    />
                  </div>

                  {/* Reference Person fields */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.referenceName")}
                    </label>
                    <Input
                      value={editReferenceName}
                      onChange={(e) => setEditReferenceName(e.target.value)}
                      placeholder="রেফারেন্স ব্যক্তির নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.referencePhone")}
                    </label>
                    <Input
                      value={editReferencePhone}
                      onChange={(e) => setEditReferencePhone(e.target.value)}
                      placeholder="01811-XXXXXX"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
                      {t("tenants.referenceRelation")}
                    </label>
                    <Input
                      value={editReferenceRelation}
                      onChange={(e) => setEditReferenceRelation(e.target.value)}
                      placeholder="e.g. ভাই / পিতা / ব্যবসায়িক অংশীদার"
                    />
                  </div>

                  {/* Effective Month if Rent is altered */}
                  {editRentAmountBDT * 100 !== tenantData.rentAmount && (
                    <div className="col-span-1 md:col-span-2 p-3 bg-[#FEF3C7] dark:bg-[#3D2F14] border-2 border-black shadow-[3px_3px_0px_#000000] rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black text-black dark:text-[#FBBF24]">
                        <AlertCircle className="w-4 h-4 text-black dark:text-[#FBBF24]" />
                        <span>ভাড়া পরিবর্তন শনাক্ত হয়েছে — কার্যকরের তারিখ আবশ্যক</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-black dark:text-white mb-0.5">
                            {t("tenants.effectiveFrom")}
                          </label>
                          <Input
                            type="date"
                            value={editEffectiveFrom}
                            onChange={(e) => setEditEffectiveFrom(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-black dark:text-white mb-0.5">
                            ভাড়া পরিবর্তনের কারণ
                          </label>
                          <Input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="e.g. বার্ষিক চুক্তি অনুযায়ী ১০% বৃদ্ধি"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("profile")}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="neo" isLoading={isSavingEdit}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {isAdmin ? "সংরক্ষণ করুন (Save Profile)" : "অনুমোদনের জন্য পাঠান (Submit for Approval)"}
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 3: ADVANCE LEDGER */}
            {activeTab === "advance" && (
              <div className="space-y-5 pt-2">
                {/* 3 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] bg-[#E6F8F2] dark:bg-[#122A20]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-[#00BA88]">
                        {t("advance.advanceBalance")}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black text-[#00BA88] border border-black">
                        Liability
                      </span>
                    </div>
                    <p className="text-2xl font-black text-black dark:text-[#00BA88] font-mono mt-1">
                      {formatCurrency(advanceBalance, locale)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] bg-white dark:bg-[#1E1F24]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                        {t("advance.requiredAdvance")}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black text-white">
                        {advanceData?.policy?.requiredAdvanceMonths || 3} months
                      </span>
                    </div>
                    <p className="text-2xl font-black text-black dark:text-white font-mono mt-1">
                      {formatCurrency(requiredAdvance, locale)}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] ${
                      shortfall > 0
                        ? "bg-[#FFEBEF] dark:bg-[#2A1417] text-black dark:text-[#FF4B55]"
                        : "bg-[#E6F8F2] dark:bg-[#122A20] text-black dark:text-[#00BA88]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                        {t("advance.shortfall")}
                      </span>
                      {shortfall > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black text-[#FF4B55] border border-black">
                          Deficit
                        </span>
                      )}
                    </div>
                    <p className={`text-2xl font-black font-mono mt-1 ${shortfall > 0 ? "text-[#FF4B55]" : "text-[#00BA88]"}`}>
                      {shortfall > 0 ? formatCurrency(shortfall, locale) : "৳ 0"}
                    </p>
                  </div>
                </div>

                {/* Quick Action Toolbar */}
                {tenantData.status !== "SETTLED" && tenantData.status !== "ARCHIVED" && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-b-2 border-black pb-4">
                    <Button
                      size="sm"
                      variant="neo"
                      onClick={() => setIsAdjustOpen(true)}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      {t("adjustAdvance.title")}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTopupAmountBDT(Math.round(shortfall / 100) || 10000);
                        setIsTopupModalOpen(true);
                      }}
                      className="text-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-black dark:text-white" />
                      {isAdmin ? t("tenants.directTopUp") : t("tenants.requestTopUp")}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsSettleOpen(true)}
                      className="text-xs ml-auto border-2 border-black shadow-[2px_2px_0px_#000000]"
                    >
                      <DoorOpen className="w-3.5 h-3.5 mr-1.5" />
                      {t("settlement.settleAndVacate")}
                    </Button>
                  </div>
                )}

                {/* Advance Ledger Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                      <History className="w-4 h-4 text-black dark:text-[#FED734]" />
                      <span>{t("advance.timeline")}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-black/60 dark:text-white/60">
                      {locale === "bn" ? toBanglaDigits(transactions.length) : transactions.length} entries
                    </span>
                  </div>

                  {transactions.length === 0 ? (
                    <p className="text-xs font-bold text-black/60 dark:text-white/60 py-4 text-center">{t("advance.noTransactions")}</p>
                  ) : (
                    <div className="rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] overflow-hidden text-xs max-h-64 overflow-y-auto bg-white dark:bg-[#1E1F24]">
                      <table className="w-full text-left">
                        <thead className="bg-[#FED734] border-b-2 border-black font-black text-black sticky top-0 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5">Reason / Note</th>
                            <th className="p-2.5">Entered by</th>
                            <th className="p-2.5 text-right">Amount</th>
                            <th className="p-2.5 text-right">{t("advance.runningBalance")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/10 dark:divide-white/10 font-bold">
                          {transactions.map((tx: any) => {
                            const isCredit = tx.type === "DEPOSIT_RECEIVED" || tx.type === "TOPUP";
                            return (
                              <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                <td className="p-2.5 text-black/70 dark:text-white/70 whitespace-nowrap">
                                  {formatDate(tx.createdAt, locale)}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000000] ${
                                      tx.type === "DEPOSIT_RECEIVED"
                                        ? "bg-[#E6F8F2] text-[#00875A] dark:bg-[#122A20] dark:text-[#00BA88]"
                                        : tx.type === "TOPUP"
                                        ? "bg-[#E0F2FE] text-[#0369A1] dark:bg-[#082F49] dark:text-[#38BDF8]"
                                        : tx.type === "ADJUSTED_TO_DUE"
                                        ? "bg-[#FEF3C7] text-[#92400E] dark:bg-[#3D2F14] dark:text-[#FBBF24]"
                                        : tx.type === "DEDUCTION"
                                        ? "bg-[#FFEDD5] text-[#9A3412] dark:bg-[#3E1B0E] dark:text-[#FB923C]"
                                        : "bg-[#E0E7FF] text-[#3730A3] dark:bg-[#1E1B4B] dark:text-[#818CF8]"
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
                                <td className="p-2.5 text-black dark:text-white max-w-xs truncate font-bold">
                                  {tx.reason}
                                </td>
                                <td className="p-2.5 text-black/70 dark:text-white/70 text-[11px] whitespace-nowrap">
                                  {tx.createdByName || tx.createdBy || "Admin"}
                                </td>
                                <td
                                  className={`p-2.5 text-right font-mono font-black whitespace-nowrap ${
                                    isCredit ? "text-[#00BA88]" : "text-[#FF4B55]"
                                  }`}
                                >
                                  {isCredit ? "+" : "-"} {formatCurrency(tx.amount, locale)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-black text-black dark:text-white whitespace-nowrap">
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
              </div>
            )}

            {/* TAB 4: TOP-UP REQUESTS */}
            {activeTab === "topups" && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-black dark:text-[#FED734]" />
                    <span>জামানত টপ-আপ আবেদন তালিকা</span>
                  </h4>
                  <Button
                    size="sm"
                    variant="neo"
                    onClick={() => {
                      setTopupAmountBDT(Math.round(shortfall / 100) || 10000);
                      setIsTopupModalOpen(true);
                    }}
                    className="text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                    {isAdmin ? "নতুন টপ-আপ জমা (Direct)" : "টপ-আপের আবেদন করুন"}
                  </Button>
                </div>

                {topUpRequests.length === 0 ? (
                  <p className="text-xs font-bold text-black/60 dark:text-white/60 py-6 text-center border-2 border-dashed border-black/30 dark:border-white/20 rounded-xl">
                    কোনো টপ-আপ আবেদন পাওয়া যায়নি
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topUpRequests.map((req: any) => {
                      const isPending = req.status === "PENDING";
                      return (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000] bg-white dark:bg-[#1E1F24] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-base font-mono text-black dark:text-[#FED734]">
                                {formatCurrency(req.amount, locale)}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black text-white border border-black">
                                {req.method}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0px_#000000] ${
                                req.status === "APPROVED"
                                  ? "bg-[#E6F8F2] text-[#00875A] dark:bg-[#122A20] dark:text-[#00BA88]"
                                  : req.status === "REJECTED"
                                  ? "bg-[#FFEBEF] text-[#CC0000] dark:bg-[#2A1417] dark:text-[#FF4B55]"
                                  : "bg-[#FEF3C7] text-[#92400E] dark:bg-[#3D2F14] dark:text-[#FBBF24]"
                              }`}
                            >
                              {req.status === "APPROVED" ? "অনুমোদিত" : req.status === "REJECTED" ? "প্রত্যাখ্যাত" : "অপেক্ষমাণ (Pending)"}
                            </span>
                          </div>

                          <div className="text-black dark:text-white font-bold">
                            {req.note && <p className="italic text-black/80 dark:text-white/80">"{req.note}"</p>}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-black/60 dark:text-white/60 mt-1">
                              <span>আবেদনকারী: <strong className="text-black dark:text-white">{req.requestedBy}</strong></span>
                              <span>•</span>
                              <span>তারিখ: {formatDate(req.createdAt, locale)}</span>
                              {req.decidedBy && (
                                <>
                                  <span>•</span>
                                  <span>সিদ্ধান্ত গ্রহণকারী: {req.decidedBy}</span>
                                </>
                              )}
                            </div>
                            {req.decisionNote && (
                              <p className="mt-1 text-[#FF4B55] font-black text-[11px]">
                                সিদ্ধান্তের কারণ: {req.decisionNote}
                              </p>
                            )}
                          </div>

                          {/* Admin Action Buttons for Pending Top-Up Request */}
                          {isAdmin && isPending && (
                            <div className="pt-2 border-t-2 border-black/20 dark:border-white/10 flex items-center justify-end gap-2">
                              {decidingTopUpId === req.id ? (
                                <div className="flex items-center gap-2 w-full">
                                  <Input
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="বাতিলের কারণ লিখুন (আবশ্যক)..."
                                    className="h-8 text-xs flex-1"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                                    disabled={!rejectReason.trim() || isDecidingTopup}
                                    onClick={() => handleDecideTopUp(req.id, "REJECT", rejectReason)}
                                  >
                                    বাতিল নিশ্চিত করুন
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                      setDecidingTopUpId(null);
                                      setRejectReason("");
                                    }}
                                  >
                                    ফিরুন
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs border-2 border-black shadow-[2px_2px_0px_#000000]"
                                    onClick={() => setDecidingTopUpId(req.id)}
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                    প্রত্যাখ্যান (Reject)
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="neo"
                                    className="h-8 text-xs bg-[#00BA88] hover:bg-[#00BA88]/90 text-black font-black"
                                    disabled={isDecidingTopup}
                                    onClick={() => handleDecideTopUp(req.id, "APPROVE")}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    অনুমোদন করুন (Approve)
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex justify-end border-t-2 border-black">
              <Button variant="outline" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Record Deposit / Top-up Sub-dialog */}
      <Dialog
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        title={isAdmin ? t("tenants.directTopUp") : t("tenants.requestTopUp")}
        description={`${tenantData?.shop?.shopNumber} — ${tenantData?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleRecordTopup} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              পেমেন্ট চ্যানেল (Payment Channel)
            </label>
            <Select
              value={topupMethod}
              onChange={(e) => setTopupMethod(e.target.value)}
            >
              <option value="CASH">ক্যাশ (CASH)</option>
              <option value="BKASH">বিকাশ (bKash)</option>
              <option value="NAGAD">নগদ (Nagad)</option>
              <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
              <option value="CHEQUE">চেক (Cheque)</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {t("common.amount")} (৳ BDT) *
            </label>
            <NumberInput
              value={topupAmountBDT}
              onChange={(val) => setTopupAmountBDT(val)}
              prefix="৳"
              className="text-lg font-black"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {t("common.notes")} ({t("common.optional")})
            </label>
            <Input
              value={topupNote}
              onChange={(e) => setTopupNote(e.target.value)}
              placeholder="e.g. অতিরিক্ত নিরাপত্তা জামানত"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsTopupModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="neo" isLoading={isSubmittingTopup}>
              {isAdmin ? "জমা সম্পন্ন করুন" : "আবেদন পাঠান"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Adjust Advance Modal */}
      {tenantData && (
        <AdjustAdvanceModal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          tenantId={tenantData.id}
          tenantName={tenantData.name}
          shopNumber={tenantData.shop?.shopNumber}
          marketName={tenantData.shop?.market?.name}
          initialDueAmount={0}
          onSuccess={() => {
            fetchAllData();
            if (onRefreshNeeded) onRefreshNeeded();
            if (onUpdated) onUpdated();
          }}
        />
      )}

      {/* Settlement Wizard Modal */}
      {tenantData && (
        <SettlementWizardModal
          isOpen={isSettleOpen}
          onClose={() => setIsSettleOpen(false)}
          tenantId={tenantData.id}
          onSettlementComplete={(settlement) => {
            fetchAllData();
            if (onRefreshNeeded) onRefreshNeeded();
            if (onUpdated) onUpdated();
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
