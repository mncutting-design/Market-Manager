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
          className="fixed inset-0 bg-black/60 z-30 animate-in fade-in"
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
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black text-black dark:text-white shadow-[3px_3px_0px_#000000] hover:bg-[#FBF9F5] dark:hover:bg-[#262830] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all font-black text-xs md:text-sm cursor-pointer min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#00BA88] text-white flex items-center justify-center shadow-[1px_1px_0px_#000000]">
              <Wallet className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span>{t("collections.quickCollect")}</span>
          </button>

          {/* Add Expense */}
          <button
            onClick={() => {
              setIsOpen(false);
              openAddExpense();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black text-black dark:text-white shadow-[3px_3px_0px_#000000] hover:bg-[#FBF9F5] dark:hover:bg-[#262830] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all font-black text-xs md:text-sm cursor-pointer min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#F59E0B] text-black flex items-center justify-center shadow-[1px_1px_0px_#000000]">
              <Wrench className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span>{t("expenses.addExpense")}</span>
          </button>

          {/* Generate Bills */}
          <button
            onClick={() => {
              setIsOpen(false);
              openGenerateBills();
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black text-black dark:text-white shadow-[3px_3px_0px_#000000] hover:bg-[#FBF9F5] dark:hover:bg-[#262830] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all font-black text-xs md:text-sm cursor-pointer min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#FED734] text-black flex items-center justify-center shadow-[1px_1px_0px_#000000]">
              <Receipt className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span>{t("billing.generateBills")}</span>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_#000000] transition-all transform active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#000000] z-40 cursor-pointer min-h-[44px] min-w-[44px]",
          isOpen
            ? "bg-[#FF4B55] text-white rotate-45"
            : "bg-[#FED734] hover:bg-[#ffe169] text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000000]"
        )}
        aria-label="Quick Actions"
        title="Quick Actions"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>
    </div>
  );
}
