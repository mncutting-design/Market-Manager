"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export interface CollectorItem {
  id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
  _count?: {
    payments: number;
  };
}

export interface CollectorSelectProps {
  value: string; // collectorId OR "SELF" / userId
  onChange: (collectorId: string, collectorName: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CollectorSelect({
  value,
  onChange,
  className = "",
  disabled = false,
}: CollectorSelectProps) {
  const { locale } = useTranslation();
  const { currentUser } = useApp();

  const [collectors, setCollectors] = useState<CollectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Form states for Add / Edit
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [targetCollector, setTargetCollector] = useState<CollectorItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch collectors
  const fetchCollectors = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/collectors");
      if (res.ok) {
        const data = await res.json();
        const list: CollectorItem[] = data.collectors || [];
        setCollectors(list);

        // If no value selected or value not found, and we have collectors, select the first
        if (!value && list.length > 0) {
          onChange(list[0].id, list[0].name);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch collectors:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const isBn = locale === "bn";

  // Selected item
  const selectedCollector = collectors.find((c) => c.id === value);
  const isSelfSelected = value === "SELF" || value === currentUser?.id;

  // Handle select change
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const val = e.target.value;
    if (val === "SELF") {
      onChange("SELF", currentUser?.name || "Self");
    } else {
      const found = collectors.find((c) => c.id === val);
      if (found) {
        onChange(found.id, found.name);
      } else {
        onChange(val, val);
      }
    }
  };

  // Open Add Modal
  const openAddModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormName("");
    setFormPhone("");
    setFormNotes("");
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item?: CollectorItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const target = item || selectedCollector;
    if (!target) return;
    setTargetCollector(target);
    setFormName(target.name || "");
    setFormPhone(target.phone || "");
    setFormNotes(target.notes || "");
    setIsEditOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (item?: CollectorItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const target = item || selectedCollector;
    if (!target) return;
    setTargetCollector(target);
    setIsDeleteOpen(true);
  };

  // Submit Add Collector (NO <form> TAG - 100% immune to form bubbling / reload)
  const handleAddSubmit = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!formName.trim()) {
      toast.error(isBn ? "আদায়কারীর নাম প্রদান করুন" : "Enter collector name");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          notes: formNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add collector");
        return;
      }

      toast.success(
        isBn
          ? `আদায়কারী "${data.collector.name}" সফলভাবে যোগ করা হয়েছে`
          : `Collector "${data.collector.name}" added successfully`
      );

      setIsAddOpen(false);
      await fetchCollectors();
      // Auto select newly created collector
      onChange(data.collector.id, data.collector.name);
    } catch (err) {
      toast.error("Failed to add collector");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Collector (NO <form> TAG)
  const handleEditSubmit = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!targetCollector || !formName.trim()) {
      toast.error(isBn ? "আদায়কারীর নাম প্রদান করুন" : "Enter collector name");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/collectors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetCollector.id,
          name: formName.trim(),
          phone: formPhone.trim(),
          notes: formNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update collector");
        return;
      }

      toast.success(
        isBn
          ? `আদায়কারীর তথ্য আপডেট হয়েছে`
          : `Collector details updated`
      );

      setIsEditOpen(false);
      await fetchCollectors();
      // If currently selected was edited, update name
      if (value === targetCollector.id) {
        onChange(targetCollector.id, data.collector.name);
      }
    } catch (err) {
      toast.error("Failed to update collector");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Collector
  const handleDeleteSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!targetCollector) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/collectors?id=${targetCollector.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete collector");
        return;
      }

      toast.success(
        data.message || (isBn ? "আদায়কারী মুছে ফেলা হয়েছে" : "Collector removed")
      );

      setIsDeleteOpen(false);
      const remaining = collectors.filter((c) => c.id !== targetCollector.id);
      setCollectors(remaining);

      // Reset selection if deleted collector was active
      if (value === targetCollector.id) {
        if (remaining.length > 0) {
          onChange(remaining[0].id, remaining[0].name);
        } else {
          onChange("SELF", currentUser?.name || "Self");
        }
      }
    } catch (err) {
      toast.error("Failed to delete collector");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label and Quick Actions Row */}
      <div className="flex items-center justify-between h-5 mb-1.5">
        <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 whitespace-nowrap">
          <UserCheck className="w-3.5 h-3.5 text-[#00AA6C]" />
          <span>{isBn ? "আদায়কারী *" : "Collector *"}</span>
        </label>

        <div className="flex items-center gap-1">
          {/* Add Collector Button */}
          <button
            type="button"
            onClick={(e) => openAddModal(e)}
            className="h-5 px-2 text-[10px] font-black rounded-md border border-black bg-[#FED734] hover:bg-[#ffe169] text-black shadow-[1px_1px_0px_#000000] flex items-center gap-0.5 whitespace-nowrap cursor-pointer active:translate-x-[0.5px] active:translate-y-[0.5px]"
            title={isBn ? "নতুন আদায়কারী যোগ করুন" : "Add new collector"}
          >
            <Plus className="w-2.5 h-2.5 stroke-[3]" />
            <span>{isBn ? "নতুন" : "New"}</span>
          </button>

          {/* Manage All Collectors */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsManageOpen(true);
            }}
            className="h-5 px-1.5 text-[10px] font-black rounded-md border border-black bg-white dark:bg-[#2B2C33] text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-[#34353E] shadow-[1px_1px_0px_#000000] flex items-center gap-1 whitespace-nowrap cursor-pointer"
            title={isBn ? "আদায়কারী তালিকা পরিচালনা ও এডিট" : "Manage collectors"}
          >
            <Users className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>{isBn ? "তালিকা" : "List"}</span>
          </button>
        </div>
      </div>

      {/* Dropdown Selector Row with Edit/Delete Buttons */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Select
            value={value}
            onChange={handleSelectChange}
            disabled={disabled}
            className="w-full font-bold text-xs h-11 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000000] bg-white dark:bg-[#1E1F24] text-black dark:text-white"
          >
            {/* Self Option */}
            <option value="SELF" className="font-bold">
              👤 {isBn ? "পোস্টিংকারী নিজে" : "Self"} ({currentUser?.name || "Me"})
            </option>

            {/* Custom Collectors */}
            {collectors.length > 0 && (
              <optgroup label={isBn ? "── নির্ধারিত আদায়কারীগণ ──" : "── Field Collectors ──"}>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id} className="font-bold">
                    🏷️ {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </div>

        {/* Quick Edit button for currently selected collector */}
        {selectedCollector && !isSelfSelected && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => openEditModal(selectedCollector, e)}
            className="h-11 w-9 p-0 shrink-0 border-2 border-black bg-[#D8F2FF] hover:bg-[#bfe8ff] text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            title={isBn ? `"${selectedCollector.name}" এডিট করুন` : "Edit collector"}
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
          </Button>
        )}

        {/* Quick Delete button for currently selected collector */}
        {selectedCollector && !isSelfSelected && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => openDeleteModal(selectedCollector, e)}
            className="h-11 w-9 p-0 shrink-0 border-2 border-black bg-[#FFD6E8] hover:bg-[#ffbfdb] text-red-600 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            title={isBn ? `"${selectedCollector.name}" ডিলিট করুন` : "Delete collector"}
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </Button>
        )}
      </div>

      {/* Subtext info row */}
      <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 px-0.5 pt-0.5">
        <span className="truncate">
          {isBn ? "পোস্টিং এন্ট্রি:" : "Posting by:"}{" "}
          <strong className="text-black dark:text-white font-black">{currentUser?.name || "System"}</strong>
        </span>
        {selectedCollector && !isSelfSelected ? (
          <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-400 shrink-0">
            {isBn ? "ফিল্ড আদায়কারী" : "Field Collector"}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500">
            {isBn ? "সরাসরি আদায়" : "Direct Collection"}
          </span>
        )}
      </div>

      {/* 1. ADD COLLECTOR MODAL (Pure div, NO nested form) */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={isBn ? "নতুন আদায়কারী যোগ করুন" : "Add New Collector"}
        description={isBn ? "ভাড়া আদায়কারীর নাম ও মোবাইল নম্বর যোগ করুন" : "Add rent collector name and phone"}
        maxWidth="md"
      >
        <div className="space-y-3.5 pt-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {isBn ? "আদায়কারীর নাম (Collector Name) *" : "Collector Name *"}
            </label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddSubmit(e);
                }
              }}
              placeholder={isBn ? "যেমন: মোঃ কাশেম / রহিম" : "e.g. Kashem / Rahim"}
              className="font-bold text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {isBn ? "মোবাইল নম্বর (Phone Number - ঐচ্ছিক)" : "Phone Number (Optional)"}
            </label>
            <Input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddSubmit(e);
                }
              }}
              placeholder="01XXXXXXXXX"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {isBn ? "নোট / বিবরণ (ঐচ্ছিক)" : "Notes (Optional)"}
            </label>
            <Input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddSubmit(e);
                }
              }}
              placeholder={isBn ? "যেমন: মার্কেট ফিল্ড স্টাফ" : "e.g. Field Staff"}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAddOpen(false);
              }}
              disabled={isSubmitting}
              className="text-xs font-black border-2 border-black"
            >
              {isBn ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleAddSubmit(e)}
              disabled={isSubmitting}
              className="text-xs font-black bg-[#FED734] hover:bg-[#ffe169] text-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {isSubmitting ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isBn ? "যোগ করুন এবং নির্বাচন করুন" : "Save & Select")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 2. EDIT COLLECTOR MODAL (Pure div, NO nested form) */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={isBn ? "আদায়কারীর নাম ও তথ্য এডিট" : "Edit Collector"}
        description={isBn ? "আদায়কারীর নাম পরিবর্তন বা সংশোধন করুন" : "Update collector details"}
        maxWidth="md"
      >
        <div className="space-y-3.5 pt-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {isBn ? "আদায়কারীর নাম (Collector Name) *" : "Collector Name *"}
            </label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditSubmit(e);
                }
              }}
              className="font-bold text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {isBn ? "মোবাইল নম্বর (Phone Number)" : "Phone Number"}
            </label>
            <Input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditSubmit(e);
                }
              }}
              placeholder="01XXXXXXXXX"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1">
              {isBn ? "নোট / বিবরণ" : "Notes"}
            </label>
            <Input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditSubmit(e);
                }
              }}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditOpen(false);
              }}
              disabled={isSubmitting}
              className="text-xs font-black border-2 border-black"
            >
              {isBn ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleEditSubmit(e)}
              disabled={isSubmitting}
              className="text-xs font-black bg-[#FED734] hover:bg-[#ffe169] text-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {isSubmitting ? (isBn ? "আপডেট হচ্ছে..." : "Updating...") : (isBn ? "আপডেট সংরক্ষণ করুন" : "Save Changes")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 3. DELETE COLLECTOR CONFIRMATION */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={isBn ? "আদায়কারী মুছে ফেলা" : "Delete Collector"}
        maxWidth="sm"
      >
        <div className="space-y-3 pt-2">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 dark:text-red-300 font-bold space-y-1">
              <p>
                {isBn
                  ? `আপনি কি নিশ্চিতভাবে "${targetCollector?.name}" কে আদায়কারী তালিকা থেকে মুছে ফেলতে চান?`
                  : `Are you sure you want to remove "${targetCollector?.name}"?`}
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                {isBn
                  ? "* পূর্বের কোনো রিসিটে এই নাম থাকলে তা অক্ষুণ্ণ থাকবে।"
                  : "* Previous collection receipts with this name will remain intact."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDeleteOpen(false);
              }}
              disabled={isSubmitting}
              className="text-xs font-black border-2 border-black"
            >
              {isBn ? "না, রাখুন" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={(e) => handleDeleteSubmit(e)}
              disabled={isSubmitting}
              className="text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {isSubmitting ? (isBn ? "মুছে ফেলা হচ্ছে..." : "Deleting...") : (isBn ? "হ্যাঁ, মুছে ফেলুন" : "Yes, Delete")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 4. MANAGE ALL COLLECTORS MODAL */}
      <Dialog
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        title={isBn ? "আদায়কারী তালিকা পরিচালনা (Manage Collectors)" : "Manage All Collectors"}
        description={isBn ? "আদায়কারীদের তালিকা দেখুন, এডিট বা ডিলিট করুন" : "View, edit, or delete collectors"}
        maxWidth="lg"
      >
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-black dark:text-white">
              {isBn ? `মোট আদায়কারী: ${collectors.length} জন` : `Total Collectors: ${collectors.length}`}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsManageOpen(false);
                openAddModal(e);
              }}
              className="h-7 text-xs font-black bg-[#FED734] hover:bg-[#ffe169] text-black border-2 border-black shadow-[2px_2px_0px_#000000]"
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
              {isBn ? "নতুন আদায়কারী যোগ" : "Add Collector"}
            </Button>
          </div>

          <div className="border-2 border-black rounded-lg overflow-hidden divide-y-2 divide-black/10 dark:divide-white/10 max-h-[350px] overflow-y-auto">
            {collectors.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-neutral-500">
                {isBn ? "কোনো আদায়কারী তালিকাভুক্ত নেই" : "No collectors found"}
              </div>
            ) : (
              collectors.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-white dark:bg-[#1E1F24] flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-[#25262C]"
                >
                  <div className="min-w-0">
                    <p className="font-black text-xs text-black dark:text-white flex items-center gap-1.5">
                      <span>{c.name}</span>
                      {value === c.id && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-500">
                          {isBn ? "নির্বাচিত" : "Selected"}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      {c.phone || (isBn ? "মোবাইল নম্বর নেই" : "No phone")} {c.notes ? `• ${c.notes}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(c.id, c.name);
                        setIsManageOpen(false);
                      }}
                      className="h-7 px-2 text-[10px] font-black border border-black shadow-[1px_1px_0px_#000000]"
                    >
                      {isBn ? "নির্বাচন" : "Select"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => openEditModal(c, e)}
                      className="h-7 w-7 p-0 border border-black bg-[#D8F2FF] text-black shadow-[1px_1px_0px_#000000]"
                      title={isBn ? "এডিট" : "Edit"}
                    >
                      <Pencil className="w-3 h-3 stroke-[2.5]" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => openDeleteModal(c, e)}
                      className="h-7 w-7 p-0 border border-black bg-[#FFD6E8] text-red-600 shadow-[1px_1px_0px_#000000]"
                      title={isBn ? "মুছে ফেলুন" : "Delete"}
                    >
                      <Trash2 className="w-3 h-3 stroke-[2.5]" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsManageOpen(false);
              }}
              className="text-xs font-black border-2 border-black"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
