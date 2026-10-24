"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatMonth } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Plus, Trash2, Receipt, Pencil, Check, X, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface ManageBillChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onUpdated?: (updatedBill?: any) => void;
}

const PRESET_CHARGES = [
  { bn: "অতিরিক্ত খরচ", en: "Extra Cost", icon: "✨" },
  { bn: "বিদ্যুৎ বিল", en: "Electricity Bill", icon: "⚡" },
  { bn: "পানির বিল", en: "Water Bill", icon: "💧" },
  { bn: "সার্ভিস চার্জ", en: "Service Charge", icon: "🛠️" },
  { bn: "জেনারেটর বিল", en: "Generator Bill", icon: "🔌" },
  { bn: "পরিচ্ছন্নতা ফি", en: "Cleaning Fee", icon: "🧹" },
  { bn: "অন্যান্য খরচ", en: "Other Cost", icon: "📝" },
];

export function ManageBillChargesModal({
  isOpen,
  onClose,
  bill,
  onUpdated,
}: ManageBillChargesModalProps) {
  const { t, locale } = useTranslation();
  const { isAdmin } = useApp();

  const [currentBill, setCurrentBill] = useState(bill);
  const [items, setItems] = useState<any[]>(bill?.billItems || []);
  const [description, setDescription] = useState("");
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmountBDT, setEditAmountBDT] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync if bill prop changes
  useEffect(() => {
    if (bill) {
      setCurrentBill(bill);
      setItems(bill.billItems || []);
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const additionalTotal = items.reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
  const rentAmount = currentBill?.rentAmount || 0;
  const totalAmount = rentAmount + additionalTotal;
  const paidAmount = currentBill?.paidAmount || 0;
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  const startEditing = (item: any) => {
    setEditingItemId(item.id);
    setEditDescription(item.description);
    setEditAmountBDT(Math.round(item.amount / 100));
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditDescription("");
    setEditAmountBDT(0);
  };

  // ⚡ INSTANT REALTIME EDIT (No approval needed per Requirement 3)
  const handleUpdateCharge = async (itemId: string) => {
    if (editAmountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    const paisa = Math.round(editAmountBDT * 100);
    const itemDesc = editDescription.trim() || (locale === "bn" ? "অতিরিক্ত খরচ" : "Additional Cost");

    const previousItems = [...items];
    const updatedItems = items.map((it) => (it.id === itemId ? { ...it, description: itemDesc, amount: paisa } : it));
    const newAdditionalTotal = updatedItems.reduce((acc, i) => acc + (i.amount || 0), 0);
    const newTotal = rentAmount + newAdditionalTotal;
    const newDue = Math.max(0, newTotal - paidAmount);

    setItems(updatedItems);
    setCurrentBill((prev: any) => ({
      ...prev,
      billItems: updatedItems,
      totalAmount: newTotal,
      dueAmount: newDue,
    }));
    setEditingItemId(null);

    try {
      setIsUpdating(true);
      const res = await fetch("/api/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          itemId,
          description: itemDesc,
          amount: paisa,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setItems(previousItems);
        setCurrentBill(bill);
        toast.error(data.error || (locale === "bn" ? "চার্জ পরিবর্তন ব্যর্থ হয়েছে" : "Failed to update charge"));
        return;
      }

      toast.success(locale === "bn" ? "চার্জ সফলভাবে পরিবর্তন করা হয়েছে!" : "Charge updated successfully!");
      if (data.bill) {
        setCurrentBill(data.bill);
        setItems(data.bill.billItems || []);
        onUpdated?.(data.bill);
      } else {
        onUpdated?.();
      }
    } catch (e) {
      setItems(previousItems);
      setCurrentBill(bill);
      toast.error(locale === "bn" ? "চার্জ পরিবর্তন ব্যর্থ হয়েছে" : "Failed to update charge");
    } finally {
      setIsUpdating(false);
    }
  };

  // DELETE CHARGE: Admin executes directly, Non-Admin creates ChangeRequest
  const handleDeleteCharge = async (itemId: string) => {
    const itemToDelete = items.find((i) => i.id === itemId);
    if (!itemToDelete) return;

    if (!isAdmin) {
      // Notify non-admin user
      toast.info(locale === "bn" ? "চার্জ মুছে ফেলার আবেদন পাঠানো হচ্ছে..." : "Submitting deletion request...");
    } else {
      // Optimistic delete for admin
      const updatedItems = items.filter((i) => i.id !== itemId);
      const newAdditionalTotal = updatedItems.reduce((acc, i) => acc + (i.amount || 0), 0);
      const newTotal = rentAmount + newAdditionalTotal;
      const newDue = Math.max(0, newTotal - paidAmount);

      setItems(updatedItems);
      setCurrentBill((prev: any) => ({
        ...prev,
        billItems: updatedItems,
        totalAmount: newTotal,
        dueAmount: newDue,
      }));
    }

    try {
      const res = await fetch(`/api/billing?billId=${bill.id}&itemId=${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        if (isAdmin) {
          setItems(items);
          setCurrentBill(bill);
        }
        toast.error(data.error || (locale === "bn" ? "চার্জ মোছা ব্যর্থ হয়েছে" : "Failed to delete charge"));
        return;
      }

      if (data.requiresApproval) {
        toast.info(data.message || (locale === "bn" ? "বিল চার্জ অপসারণের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে" : "Deletion request submitted for approval"));
        return;
      }

      toast.success(locale === "bn" ? "চার্জ সফলভাবে মুছে ফেলা হয়েছে" : "Charge removed");
      if (data.bill) {
        setCurrentBill(data.bill);
        setItems(data.bill.billItems || []);
        onUpdated?.(data.bill);
      } else {
        onUpdated?.();
      }
    } catch (e) {
      if (isAdmin) {
        setItems(items);
        setCurrentBill(bill);
      }
      toast.error(locale === "bn" ? "চার্জ মোছা ব্যর্থ হয়েছে" : "Failed to delete charge");
    }
  };

  // ⚡ INSTANT REALTIME ADD (No approval needed per Requirement 3)
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    const paisa = Math.round(amountBDT * 100);
    const itemDesc = description.trim() || (locale === "bn" ? "অতিরিক্ত খরচ" : "Additional Cost");
    const tempId = `temp-${Date.now()}`;

    // Instantly add to UI and recalculate amounts
    const tempItem = {
      id: tempId,
      description: itemDesc,
      amount: paisa,
    };

    const updatedItems = [...items, tempItem];
    const newAdditionalTotal = updatedItems.reduce((acc, i) => acc + (i.amount || 0), 0);
    const newTotal = rentAmount + newAdditionalTotal;
    const newDue = Math.max(0, newTotal - paidAmount);

    setItems(updatedItems);
    setCurrentBill((prev: any) => ({
      ...prev,
      billItems: updatedItems,
      totalAmount: newTotal,
      dueAmount: newDue,
    }));

    setDescription("");
    setAmountBDT(0);
    toast.success(locale === "bn" ? "অতিরিক্ত খরচ সফলভাবে যোগ হয়েছে!" : "Additional cost added!");

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          description: itemDesc,
          amount: paisa,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        setCurrentBill(bill);
        toast.error(data.error || "Failed to add charge");
        return;
      }

      if (data.bill) {
        setCurrentBill(data.bill);
        setItems(data.bill.billItems || []);
        onUpdated?.(data.bill);
      } else {
        onUpdated?.();
      }
    } catch (e) {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setCurrentBill(bill);
      toast.error("Failed to add charge");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>{locale === "bn" ? "ম্যানুয়াল অতিরিক্ত খরচ ও ইউটিলিটি বিল" : "Manage Additional Costs & Utility Bills"}</span>
        </div>
      }
      description={`${bill.shop?.shopNumber} — ${bill.tenant?.name || ""} (${formatMonth(bill.month, locale, bill.year)})`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Rent & Total Breakdown Header */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div>
            <span className="text-[11px] text-slate-500">{locale === "bn" ? "মূল ভাড়া" : "Base Rent"}</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(rentAmount, locale)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500">{locale === "bn" ? "অতিরিক্ত খরচ / বিল" : "Utility / Extra"}</span>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(additionalTotal, locale)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500">{locale === "bn" ? "সর্বমোট প্রদেয়" : "Total Payable"}</span>
            <p className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
              {formatCurrency(totalAmount, locale)}
            </p>
          </div>
        </div>

        {/* Existing Additional Items List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {locale === "bn" ? "বর্তমান অতিরিক্ত খরচসমূহ:" : "Current Additional Costs:"}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">
              {items.length} {locale === "bn" ? "টি আইটেম" : "items"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              {locale === "bn"
                ? "কোনো অতিরিক্ত খরচ যোগ করা হয়নি (শুধুমাত্র মূল ভাড়া প্রযোজ্য)।"
                : "No additional costs added (only base rent applies)."}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => {
                const isEditing = editingItemId === item.id;

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border-2 border-teal-500/80 bg-teal-50/50 dark:bg-teal-950/30 space-y-2.5 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1">
                          <Pencil className="w-3 h-3" />
                          <span>{locale === "bn" ? "চার্জ পরিবর্তন করুন:" : "Edit Cost Item:"}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateCharge(item.id)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{locale === "bn" ? "সংরক্ষণ" : "Save"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            title={locale === "bn" ? "বাতিল" : "Cancel"}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                            {locale === "bn" ? "খরচের নাম" : "Description"}
                          </label>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="h-8 text-xs"
                            placeholder={locale === "bn" ? "যেমন: বিদ্যুৎ বিল" : "e.g. Electricity Bill"}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                            {locale === "bn" ? "টাকার পরিমাণ (৳)" : "Amount (৳)"}
                          </label>
                          <NumberInput
                            value={editAmountBDT}
                            onChange={(val) => setEditAmountBDT(val)}
                            className="h-8 text-xs"
                            prefix="৳"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-all duration-150 animate-in fade-in"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.description}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {locale === "bn" ? "ম্যানুয়াল এন্ট্রি" : "Manual entry"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mr-1">
                        {formatCurrency(item.amount, locale)}
                      </span>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 active:scale-90 transition-all cursor-pointer"
                        title={locale === "bn" ? "সম্পাদনা / পরিবর্তন করুন" : "Edit cost"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCharge(item.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-90 transition-all cursor-pointer"
                        title={
                          isAdmin
                            ? (locale === "bn" ? "মুছে ফেলুন" : "Delete")
                            : (locale === "bn" ? "মুছে ফেলার জন্য অ্যাডমিন অনুমোদন প্রয়োজন" : "Requires Admin Approval to Remove")
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Cost Form */}
        <form onSubmit={handleAddCharge} className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === "bn" ? "অতিরিক্ত খরচ যোগ করুন (ম্যানুয়াল)" : "Add Extra Cost / Utility Bill"}</span>
            </h4>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
              {locale === "bn" ? "তাত্ক্ষণিক হিসাব" : "Instant Calculation"}
            </span>
          </div>

          {/* Quick preset chips */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              {locale === "bn" ? "দ্রুত বাছাই করুন (ক্লিক করুন):" : "Quick Select Presets:"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CHARGES.map((preset) => {
                const label = locale === "bn" ? preset.bn : preset.en;
                const isSelected = description === label;
                return (
                  <button
                    key={preset.bn}
                    type="button"
                    onClick={() => setDescription(label)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-teal-600 text-white shadow-2xs scale-102"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/50"
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {locale === "bn" ? "খরচের বিবরণ বা কাস্টম নাম" : "Description / Custom Name"}
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={locale === "bn" ? "যেমন: অতিরিক্ত খরচ বা বিদ্যুৎ বিল" : "e.g. Extra Cost or Electricity Bill"}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {locale === "bn" ? "টাকার পরিমাণ (৳)" : "Amount (৳)"}
              </label>
              <NumberInput
                value={amountBDT}
                onChange={(val) => setAmountBDT(val)}
                prefix="৳"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {locale === "bn" ? "খরচ যোগ করুন" : "Add Cost"}
            </Button>
          </div>
        </form>

        <div className="pt-2 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-slate-400" />
            <span>
              {locale === "bn"
                ? "খরচ যোগ বা পরিবর্তন সরাসরি কার্যকর হয়; মুছে ফেলতে অ্যাডমিন অনুমোদন প্রয়োজন।"
                : "Adding/editing takes effect immediately; deletions require admin approval."}
            </span>
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
