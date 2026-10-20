"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import {
  TrendingUp,
  Building2,
  Store,
  Receipt,
  Wallet,
  AlertCircle,
  Wrench,
  FileSpreadsheet,
  Users,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, currentUser } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: "dashboard", labelKey: "nav.dashboard", icon: TrendingUp },
    { id: "markets", labelKey: "nav.markets", icon: Building2 },
    { id: "shops", labelKey: "nav.shops", icon: Store },
    { id: "billing", labelKey: "nav.billing", icon: Receipt },
    { id: "collections", labelKey: "nav.collections", icon: Wallet },
    { id: "dues", labelKey: "nav.dues", icon: AlertCircle, badgeColor: "bg-red-500" },
    { id: "expenses", labelKey: "nav.expenses", icon: Wrench },
    { id: "reports", labelKey: "nav.reports", icon: FileSpreadsheet },
    { id: "users", labelKey: "nav.users", icon: Users },
    { id: "backup", labelKey: "nav.backup", icon: Database },
    { id: "settings", labelKey: "nav.settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-200/80 dark:border-[#2d3b52] bg-white dark:bg-[#101726] transition-all duration-300 select-none shrink-0",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-end p-3 border-b border-slate-100 dark:border-[#2d3b52]">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left",
                isActive
                  ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold shadow-xs border border-teal-200/80 dark:border-teal-500/40"
                  : "text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#182234] hover:text-slate-900 dark:hover:text-white font-medium"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-teal-600 dark:text-teal-300" : "text-slate-500 dark:text-white"
                )}
              />
              {!isCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile bottom bar */}
      <div className="p-3 border-t border-slate-100 dark:border-[#2d3b52]">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52]",
            isCollapsed && "justify-center p-1.5"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "NZ"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name || "NAZRUL"}
              </p>
              <p className="text-[11px] text-teal-600 dark:text-teal-300 font-medium truncate font-mono">
                {currentUser?.role || "ADMIN"}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
