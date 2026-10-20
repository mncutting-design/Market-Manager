"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate, toBanglaDigits } from "@/lib/format";
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
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeData } from "@/lib/realtime-sync";

export function ExpensesView() {
  const { t, locale } = useTranslation();
  const { selectedMarketId, selectedMonth, selectedYear, refreshKey, triggerRefresh, openAddExpense, currentUser, isAdmin } =
    useApp();
  const isOperator = currentUser?.role === "OPERATOR";


  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

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



  const handleDeleteExpense = async (id: string) => {
    if (!confirm(t("common.confirm") + "?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("expenses.expenseDeleted"));
        triggerRefresh();
      }
    } catch (e) {
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            <span>{t("expenses.title")}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("expenses.subtitle")}
          </p>
        </div>

        {!isOperator && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                {t("expenses.addCategory")}
              </Button>
            )}

            <Button onClick={() => openAddExpense()}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t("expenses.addExpense")}
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI & Category Filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:col-span-1 bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            {t("expenses.totalExpenses")}
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {formatCurrency(totalAmount, locale)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {locale === "bn" ? toBanglaDigits(expenses.length) : expenses.length} items recorded
          </p>
        </Card>

        {/* Category Filter Pills */}
        <div className="sm:col-span-2 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            {t("common.all")}
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedCategory === c.id
                  ? "bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700 font-semibold shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: c.color || "#0d9488" }}
              />
              <span>{locale === "bn" ? c.name_bn || c.name_en : c.name_en || c.name_bn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Notice Banner when Active Filter matches zero records */}
      {selectedCategory !== "ALL" && expenses.length === 0 && !isLoading && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
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
            className="h-7 text-xs bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700"
          >
            {locale === "bn" ? "ফিল্টার মুছুন" : "Clear filter"}
          </Button>
        </div>
      )}

      {/* Expenses List */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("expenses.noExpensesFound")}
          </p>
          <Button onClick={() => openAddExpense()} className="mt-4">
            {t("expenses.addExpense")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((e) => (
            <Card
              key={e.id}
              className="p-4 md:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: `${e.category.color}20`,
                      color: e.category.color,
                      borderColor: `${e.category.color}40`,
                    }}
                  >
                    {locale === "bn"
                      ? e.category.name_bn || e.category.name_en
                      : e.category.name_en || e.category.name_bn}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {e.market.name}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-2">
                  {e.description || "রক্ষণাবেক্ষণ ব্যয়"}
                </p>

                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  <p className="text-xs text-slate-400">
                    {formatDate(e.date, locale)} • {t("expenses.paymentMethod")}: {e.paymentMethod}
                    {e.attachmentUrl && ` • Voucher: ${e.attachmentUrl}`}
                  </p>
                  {(e.enteredByUser?.name || e.createdByName) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>
                        {locale === "bn" ? "এন্ট্রি করেছেন" : "Entered by"}: {e.enteredByUser?.name || e.createdByName}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(e.amount, locale)}
                </span>

                {!isOperator && (
                  <button
                    onClick={() => handleDeleteExpense(e.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title={t("common.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      <Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={t("expenses.addCategory")}
        maxWidth="md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t("expenses.categoryColor")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                />
                <Input value={catColor} onChange={(e) => setCatColor(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
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
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
