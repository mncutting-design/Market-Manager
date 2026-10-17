"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Plus, Wallet, Wrench, Receipt, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingActionButton() {
  const { t } = useTranslation();
  const { openQuickCollect, openAddExpense, openGenerateBills } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 flex flex-col items-end">
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-30 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Speed Dial Menu Actions */}
      {isOpen && (
        <div className="flex flex-col items-end space-y-3 mb-3 z-40 animate-in slide-in-from-bottom-4 duration-150">
          {/* Quick Collect */}
          <button
            onClick={() => {
              setIsOpen(false);
              openQuickCollect();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-xs md:text-sm cursor-pointer min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span>{t("collections.quickCollect")}</span>
          </button>

          {/* Add Expense */}
          <button
            onClick={() => {
              setIsOpen(false);
              openAddExpense();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-xs md:text-sm cursor-pointer min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <span>{t("expenses.addExpense")}</span>
          </button>

          {/* Generate Bills */}
          <button
            onClick={() => {
              setIsOpen(false);
              openGenerateBills();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-xs md:text-sm cursor-pointer min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <span>{t("billing.generateBills")}</span>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-all transform active:scale-95 z-40 cursor-pointer min-h-[44px] min-w-[44px]",
          isOpen
            ? "bg-slate-800 dark:bg-slate-700 rotate-45"
            : "bg-teal-600 hover:bg-teal-500 shadow-teal-600/30 hover:scale-105"
        )}
        aria-label="Quick Actions"
        title="Quick Actions"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
