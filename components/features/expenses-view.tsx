"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits, formatPercent } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Wrench,
  Plus,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  Shield,
  Zap,
  Droplets,
  Building2,
  Users,
  AlertCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  LayoutList,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeData } from "@/lib/realtime-sync";
import { EditExpenseModal } from "@/components/features/modals/edit-expense-modal";

export function ExpensesView() {
  const { t, locale } = useTranslation();
  const {
    selectedMarketId,
    selectedMonth,
    selectedYear,
    refreshKey,
    triggerRefresh,
    openAddExpense,
    currentUser,
    isAdmin,
    markets,
  } = useApp();
  const isOperator = currentUser?.role === "OPERATOR";

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"list" | "breakdown">("breakdown");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const queryParams = new URLSearchParams();
  if (selectedMarketId && selectedMarketId !== "ALL") queryParams.set("marketId", selectedMarketId);
  if (selectedCategory && selectedCategory !== "ALL") queryParams.set("categoryId", selectedCategory);
  queryParams.set("month", String(selectedMonth));
  queryParams.set("year", String(selectedYear));
  const expensesUrl = `/api/expenses?${queryParams.toString()}`;

  const { data: expensesData, isLoading, isSyncing, refetch: refetchExpenses } = useRealtimeData<{
    expenses: any[];
    totalAmount: number;
  }>(expensesUrl, { tag: "expenses", refreshInterval: 12000 });

  const expenses = expensesData?.expenses || [];
  const totalAmount = expensesData?.totalAmount || 0;

  // Add Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catNameEn, setCatNameEn] = useState("");
  const [catNameBn, setCatNameBn] = useState("");
  const [catIcon, setCatIcon] = useState("Wrench");
  const [catColor, setCatColor] = useState("#0d9488");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, [refreshKey]);

  // Group expenses by category for Category-wise breakdown view
  const groupedByCategory = useMemo(() => {
    const map = new Map<
      string,
      {
        categoryId: string;
        categoryNameBn: string;
        categoryNameEn: string;
        color: string;
        icon: string;
        totalAmount: number;
        count: number;
        items: any[];
      }
    >();

    for (const exp of expenses) {
      const catId = exp.categoryId || exp.category?.id || "OTHER";
      if (!map.has(catId)) {
        map.set(catId, {
          categoryId: catId,
          categoryNameBn: exp.category?.name_bn || "অন্যান্য",
          categoryNameEn: exp.category?.name_en || "Other",
          color: exp.category?.color || "#0d9488",
          icon: exp.category?.icon || "Wrench",
          totalAmount: 0,
          count: 0,
          items: [],
        });
      }
      const entry = map.get(catId)!;
      entry.totalAmount += exp.amount;
      entry.count += 1;
      entry.items.push(exp);
    }

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleAllCategories = () => {
    if (expandedCategories.size === groupedByCategory.length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(groupedByCategory.map((g) => g.categoryId)));
    }
  };

  const handleDeleteExpense = async (e: any) => {
    const isDirectAdmin = currentUser?.role === "ADMIN";
    const catName = e.category?.name_bn || e.category?.name_en || "খরচ";
    const amtStr = formatCurrency(e.amount, locale);

    const confirmMsg = isDirectAdmin
      ? `${locale === "bn" ? "আপনি কি নিশ্চিতভাবে এই খরচ এন্ট্রি মুছে ফেলতে চান?" : "Are you sure you want to delete this expense record?"}\n\n${catName} - ${amtStr}`
      : `${locale === "bn" ? "খরচ মুছে ফেলার আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হবে। আপনি কি আবেদন পাঠাতে চান?" : "Submit deletion request for Admin approval?"}`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/expenses?id=${e.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete expense");
        return;
      }
      if (data.requiresApproval) {
        toast.info(
          data.message ||
            (locale === "bn"
              ? "খরচ মুছে ফেলার আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে!"
              : "Deletion request submitted for admin approval!")
        );
      } else {
        toast.success(
          locale === "bn" ? "খরচ সফলভাবে মুছে ফেলা হয়েছে!" : "Expense deleted successfully!"
        );
      }
      triggerRefresh();
      refetchExpenses();
    } catch (err) {
      toast.error("Failed to delete expense");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameBn.trim() && !catNameEn.trim()) {
      toast.error(t("validation.required"));
      return;
    }

    try {
      setIsSavingCategory(true);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: catNameEn,
          name_bn: catNameBn,
          icon: catIcon,
          color: catColor,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save category");
        return;
      }

      toast.success("Category created successfully");
      triggerRefresh();
      setIsCategoryModalOpen(false);
      setCatNameEn("");
      setCatNameBn("");
    } catch (e) {
      toast.error("Failed to save category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>{t("expenses.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-bold mt-0.5">
            {t("expenses.subtitle")}
          </p>
        </div>

        {!isOperator && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setIsCategoryModalOpen(true)}
                className="font-black border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                {t("expenses.addCategory")}
              </Button>
            )}

            <Button
              onClick={() => openAddExpense()}
              className="font-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {t("expenses.addExpense")}
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI & Category Filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 sm:col-span-1 rounded-xl bg-[#FED734]/20 border-2 border-black shadow-[3px_3px_0px_#000000]">
          <p className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
            {t("expenses.totalExpenses")}
          </p>
          <p className="text-2xl font-black text-black dark:text-white mt-1 font-mono">
            {formatCurrency(totalAmount, locale)}
          </p>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-bold mt-0.5">
            {locale === "bn" ? toBanglaDigits(expenses.length) : expenses.length} টি রেকর্ড সংরক্ষিত
          </p>
        </Card>

        {/* Category Filter Pills */}
        <div className="sm:col-span-2 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer border-2 border-black ${
              selectedCategory === "ALL"
                ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                : "bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[2px_2px_0px_#000000] hover:bg-[#FED734]/20"
            }`}
          >
            {t("common.all")}
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer border-2 border-black flex items-center gap-1.5 ${
                selectedCategory === c.id
                  ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                  : "bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[2px_2px_0px_#000000] hover:bg-[#FED734]/20"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black"
                style={{ backgroundColor: c.color || "#0d9488" }}
              />
              <span>{locale === "bn" ? c.name_bn || c.name_en : c.name_en || c.name_bn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Notice Banner when Active Filter matches zero records */}
      {selectedCategory !== "ALL" && expenses.length === 0 && !isLoading && (
        <div className="p-3 rounded-xl bg-[#FFF8D6] dark:bg-[#2C2405] border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-between text-xs text-black dark:text-white font-bold">
          <div className="flex items-center gap-2 font-black">
            <AlertCircle className="w-4 h-4 text-black dark:text-white shrink-0 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? "রেকর্ড সংরক্ষিত রয়েছে, কিন্তু বর্তমান ক্যাটাগরি ফিল্টারের কারণে প্রদর্শিত হচ্ছে না।"
                : "Saved, but hidden by current category filter."}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedCategory("ALL")}
            className="h-7 text-xs font-black border-2 border-black bg-white dark:bg-[#1E1F24] text-black dark:text-white shadow-[1.5px_1.5px_0px_#000000]"
          >
            {locale === "bn" ? "ফিল্টার মুছুন" : "Clear filter"}
          </Button>
        </div>
      )}

      {/* View Switcher Bar: All List vs Category Breakdown Accordion */}
      <div className="p-2 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("breakdown")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 border-black ${
              viewMode === "breakdown"
                ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                : "bg-white dark:bg-[#262830] text-black dark:text-white shadow-[1px_1px_0px_#000000]"
            }`}
          >
            <FolderTree className="w-4 h-4 stroke-[2.5]" />
            <span>{locale === "bn" ? "খাতওয়ারী ব্যয়ের হিসাব (ওপেন/ক্লোজ)" : "Category Breakdown (Open/Close)"}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 border-black ${
              viewMode === "list"
                ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                : "bg-white dark:bg-[#262830] text-black dark:text-white shadow-[1px_1px_0px_#000000]"
            }`}
          >
            <LayoutList className="w-4 h-4 stroke-[2.5]" />
            <span>{locale === "bn" ? "সকল খরচের তালিকা" : "All Expenses List"}</span>
          </button>
        </div>

        {viewMode === "breakdown" && groupedByCategory.length > 0 && (
          <button
            type="button"
            onClick={toggleAllCategories}
            className="px-2.5 py-1 text-xs font-black rounded-lg border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] hover:bg-[#FED734] hover:text-black text-black dark:text-white shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            {expandedCategories.size === groupedByCategory.length
              ? locale === "bn"
                ? "সব খাত বন্ধ করুন (Collapse All)"
                : "Collapse All"
              : locale === "bn"
              ? "সব খাত একসাথে খুলুন (Expand All)"
              : "Expand All"}
          </button>
        )}
      </div>

      {/* Main Expenses Content */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : expenses.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
          <Wrench className="w-12 h-12 text-black dark:text-white mx-auto mb-3 stroke-[2]" />
          <p className="text-base font-black text-black dark:text-white">
            {t("expenses.noExpensesFound")}
          </p>
          <Button
            onClick={() => openAddExpense()}
            className="mt-4 font-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            {t("expenses.addExpense")}
          </Button>
        </Card>
      ) : viewMode === "breakdown" ? (
        /* ========================================================
           MODE A: CATEGORY BREAKDOWN ACCORDION (OPEN / CLOSE)
           ======================================================== */
        <div className="space-y-3.5">
          {groupedByCategory.map((group) => {
            const isExpanded = expandedCategories.has(group.categoryId);
            const percentage = totalAmount > 0 ? (group.totalAmount / totalAmount) * 100 : 0;

            return (
              <div
                key={group.categoryId}
                className="rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000] overflow-hidden transition-all"
              >
                {/* Category Header Card (Clickable to Toggle Open/Close) */}
                <div
                  onClick={() => toggleCategory(group.categoryId)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#FED734]/10 dark:hover:bg-[#FED734]/15 transition-colors border-b-2 border-black"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-[#FED734] text-black shadow-[1.5px_1.5px_0px_#000000] shrink-0"
                      aria-label="Toggle Category Details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 stroke-[3]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 stroke-[3]" />
                      )}
                    </button>

                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 border-black shrink-0"
                      style={{ backgroundColor: group.color }}
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                          {locale === "bn" ? group.categoryNameBn : group.categoryNameEn}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-[#FBF9F5] dark:bg-[#262830] text-black dark:text-white border border-black shadow-[1px_1px_0px_#000000]">
                          {locale === "bn" ? toBanglaDigits(group.count) : group.count} টি
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mt-0.5">
                        {isExpanded
                          ? locale === "bn"
                            ? "বিস্তারিত বন্ধ করতে ক্লিক করুন (ক্লোজ)"
                            : "Click to close details"
                          : locale === "bn"
                          ? "খরচের বিস্তারিত দেখতে ক্লিক করুন (ওপেন)"
                          : "Click to open details"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10 dark:border-white/10">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-gray-500 font-bold uppercase">মোট ব্যয়</p>
                      <p className="text-lg sm:text-xl font-black text-black dark:text-white font-mono">
                        {formatCurrency(group.totalAmount, locale)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg border-2 border-black bg-[#FED734] text-black shadow-[1.5px_1.5px_0px_#000000]">
                        {formatPercent(percentage, locale)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Items List */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-[#FBF9F5] dark:bg-[#18191E] space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-black text-gray-700 dark:text-gray-300 px-1 pb-1 border-b border-black/10 dark:border-white/10">
                      <span>
                        {locale === "bn" ? group.categoryNameBn : group.categoryNameEn} খাতের সকল খরচের তালিকা (
                        {locale === "bn" ? toBanglaDigits(group.items.length) : group.items.length}টি)
                      </span>
                      <span className="font-mono">মোট: {formatCurrency(group.totalAmount, locale)}</span>
                    </div>

                    <div className="space-y-2">
                      {group.items.map((e) => (
                        <div
                          key={e.id}
                          className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[2.5px_2.5px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-3 hover:-translate-y-0.5 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                                {e.market?.name}
                              </span>
                              <span className="text-xs text-black/30 dark:text-white/30">•</span>
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {formatDate(e.date, locale)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FED734] text-black border border-black shadow-[1px_1px_0px_#000000]">
                                {e.paymentMethod || "CASH"}
                              </span>
                            </div>

                            <p className="text-sm font-black text-black dark:text-white mt-1">
                              {e.description || "রক্ষণাবেক্ষণ ব্যয়"}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                              {e.attachmentUrl && <span>ভাউচার: {e.attachmentUrl}</span>}
                              {(e.enteredByUser?.name || e.createdByName) && (
                                <span>
                                  • এন্ট্রি করেছেন: {e.enteredByUser?.name || e.createdByName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-black/10 dark:border-white/10">
                            <span className="text-lg font-black text-black dark:text-white font-mono">
                              {formatCurrency(e.amount, locale)}
                            </span>

                            {!isOperator && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setEditingExpense(e);
                                  }}
                                  className="h-8 px-2 text-xs font-black border-2 border-black bg-[#FED734] text-black hover:bg-[#edd028] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
                                  title={locale === "bn" ? "খরচ এডিট করুন" : "Edit Expense"}
                                >
                                  <Pencil className="w-3.5 h-3.5 sm:mr-1 stroke-[2.5]" />
                                  <span className="hidden sm:inline">
                                    {locale === "bn" ? "এডিট" : "Edit"}
                                  </span>
                                </Button>

                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDeleteExpense(e);
                                  }}
                                  className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FF4B55] hover:text-white text-black dark:text-white shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                                  title={t("common.delete")}
                                >
                                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================
           MODE B: FLAT EXPENSES LIST VIEW
           ======================================================== */
        <div className="space-y-3">
          {expenses.map((e) => (
            <Card
              key={e.id}
              className="p-4 md:p-5 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_#000000] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]"
                    style={{
                      backgroundColor: `${e.category?.color || "#0d9488"}25`,
                      color: "#000000",
                    }}
                  >
                    {locale === "bn"
                      ? e.category?.name_bn || e.category?.name_en
                      : e.category?.name_en || e.category?.name_bn}
                  </span>
                  <span className="text-xs text-black/40 dark:text-white/40 font-black">•</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {e.market?.name}
                  </span>
                </div>

                <p className="text-sm font-black text-black dark:text-white mt-2">
                  {e.description || "রক্ষণাবেক্ষণ ব্যয়"}
                </p>

                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                    {formatDate(e.date, locale)} • {t("expenses.paymentMethod")}: {e.paymentMethod}
                    {e.attachmentUrl && ` • Voucher: ${e.attachmentUrl}`}
                  </p>
                  {(e.enteredByUser?.name || e.createdByName) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black dark:text-white bg-[#FBF9F5] dark:bg-[#262830] border border-black px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#000000]">
                      <Users className="w-3 h-3 text-black dark:text-white stroke-[2.5]" />
                      <span>
                        {locale === "bn" ? "এন্ট্রি করেছেন" : "Entered by"}:{" "}
                        {e.enteredByUser?.name || e.createdByName}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t-2 md:border-t-0 border-black/10 dark:border-white/10">
                <span className="text-xl font-black text-black dark:text-white font-mono">
                  {formatCurrency(e.amount, locale)}
                </span>

                {!isOperator && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingExpense(e)}
                      className="h-8 px-2 text-xs font-black border-2 border-black bg-[#FED734] text-black hover:bg-[#edd028] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
                      title={locale === "bn" ? "খরচ এন্ট্রি এডিট করুন" : "Edit Expense"}
                    >
                      <Pencil className="w-3.5 h-3.5 sm:mr-1 stroke-[2.5]" />
                      <span className="hidden sm:inline">{locale === "bn" ? "এডিট" : "Edit"}</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(e)}
                      className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FF4B55] hover:text-white text-black dark:text-white shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        categories={categories}
        markets={markets}
        onUpdated={() => refetchExpenses()}
      />

      {/* Add Category Modal */}
      <Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={t("expenses.addCategory")}
        maxWidth="md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {t("expenses.categoryNameBn")}
            </label>
            <Input
              value={catNameBn}
              onChange={(e) => setCatNameBn(e.target.value)}
              placeholder="e.g. জেনারেটর সার্ভিসিং"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {t("expenses.categoryNameEn")}
            </label>
            <Input
              value={catNameEn}
              onChange={(e) => setCatNameEn(e.target.value)}
              placeholder="e.g. Generator Servicing"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("expenses.categoryColor")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-black shadow-[2px_2px_0px_#000000]"
                />
                <Input value={catColor} onChange={(e) => setCatColor(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("expenses.categoryIcon")}
              </label>
              <Select value={catIcon} onChange={(e) => setCatIcon(e.target.value)}>
                <option value="Wrench">Wrench (যন্ত্রপাতি)</option>
                <option value="Shield">Shield (নিরাপত্তা)</option>
                <option value="Users">Users (স্টাফ)</option>
                <option value="Zap">Zap (বিদ্যুৎ)</option>
                <option value="Droplets">Droplets (পানি)</option>
                <option value="Building2">Building (বিল্ডিং)</option>
              </Select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSavingCategory}>
              <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
