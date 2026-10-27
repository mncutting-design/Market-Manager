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
  Coins,
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
    { id: "deposits", labelKey: "nav.deposits", icon: Coins },
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F4F1EA] dark:bg-[#121214] border-t-2 border-black shadow-[0px_-4px_0px_#000000] px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-around h-16 gap-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-12 py-1 min-h-[44px] transition-all cursor-pointer rounded-xl",
                  isActive
                    ? "bg-[#FED734] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                    : "text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-white/80 dark:hover:bg-[#1E1F24] font-bold border-2 border-transparent hover:border-black"
                )}
              >
                <Icon className="w-4 h-4 mb-0.5 stroke-[2.5]" />
                <span className="text-[10px] leading-tight truncate max-w-[64px]">
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}

          {/* More Menu Tab */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-12 py-1 min-h-[44px] transition-all cursor-pointer rounded-xl",
              moreItems.some((item) => item.id === activeTab)
                ? "bg-[#FED734] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                : "text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-white/80 dark:hover:bg-[#1E1F24] font-bold border-2 border-transparent hover:border-black"
            )}
          >
            <Menu className="w-4 h-4 mb-0.5 stroke-[2.5]" />
            <span className="text-[10px] leading-tight">আরও</span>
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
        <div className="grid grid-cols-1 gap-2.5">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={cn(
                  "flex items-center gap-3.5 p-3 rounded-xl border-2 border-black transition-all text-left min-h-[48px] cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5",
                  isActive
                    ? "bg-[#FED734] text-black font-black"
                    : "bg-white dark:bg-[#1E1F24] text-black dark:text-white hover:bg-[#FBF9F5] dark:hover:bg-[#262830] font-bold"
                )}
              >
                <div className="w-9 h-9 rounded-lg border-2 border-black bg-white dark:bg-[#262830] text-black dark:text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000000]">
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black">{t(item.labelKey)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
