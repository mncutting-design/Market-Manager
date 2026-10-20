"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import {
  TrendingUp,
  Wallet,
  Wrench,
  FileSpreadsheet,
  Menu,
  Building2,
  Store,
  Receipt,
  AlertCircle,
  Users,
  Database,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";

export function BottomNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    { id: "dashboard", labelKey: "nav.dashboard", icon: TrendingUp },
    { id: "collections", labelKey: "nav.collections", icon: Wallet },
    { id: "expenses", labelKey: "nav.expenses", icon: Wrench },
    { id: "reports", labelKey: "nav.reports", icon: FileSpreadsheet },
  ];

  const moreItems = [
    { id: "markets", labelKey: "nav.markets", icon: Building2 },
    { id: "shops", labelKey: "nav.shops", icon: Store },
    { id: "billing", labelKey: "nav.billing", icon: Receipt },
    { id: "dues", labelKey: "nav.dues", icon: AlertCircle, badgeColor: "text-red-500" },
    { id: "users", labelKey: "nav.users", icon: Users },
    { id: "backup", labelKey: "nav.backup", icon: Database },
    { id: "settings", labelKey: "nav.settings", icon: Settings },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#101726]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#2d3b52] shadow-lg px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-around h-15 sm:h-16">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors relative",
                  isActive
                    ? "text-teal-600 dark:text-teal-400 font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[11px] leading-tight truncate max-w-[64px]">
                  {t(tab.labelKey)}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-6 h-0.5 bg-teal-600 dark:bg-teal-400 rounded-full" />
                )}
              </button>
            );
          })}

          {/* More Menu Tab */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors relative",
              moreItems.some((item) => item.id === activeTab)
                ? "text-teal-600 dark:text-teal-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-[11px] leading-tight">আরও</span>
          </button>
        </div>
      </nav>

      {/* More Navigation Sheet */}
      <Sheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="মেনু ও অন্যান্য বিভাগ"
        description="মার্কেট, দোকান, বিলিং এবং বকেয়া তালিকা"
      >
        <div className="grid grid-cols-1 gap-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={cn(
                  "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left min-h-[48px]",
                  isActive
                    ? "bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t(item.labelKey)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
