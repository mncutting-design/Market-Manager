"use client";

import React, { useState, useEffect } from "react";
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
import { toBanglaDigits } from "@/lib/format";

export function Sidebar() {
  const { t, locale } = useTranslation();
  const { activeTab, setActiveTab, currentUser, pendingApprovalsCount } = useApp();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections = [
    {
      id: "core",
      titleBn: "মূল মেনু",
      titleEn: "Main Menu",
      items: [
        { id: "dashboard", labelKey: "nav.dashboard", icon: TrendingUp },
        { id: "markets", labelKey: "nav.markets", icon: Building2 },
        { id: "shops", labelKey: "nav.shops", icon: Store },
      ],
    },
    {
      id: "finance",
      titleBn: "হিসাব ও অর্থায়ন",
      titleEn: "Finance & Rent",
      items: [
        { id: "billing", labelKey: "nav.billing", icon: Receipt },
        { id: "collections", labelKey: "nav.collections", icon: Wallet },
        {
          id: "dues",
          labelKey: "nav.dues",
          icon: AlertCircle,
          badgeColor: "bg-rose-500 text-white",
        },
        { id: "expenses", labelKey: "nav.expenses", icon: Wrench },
        { id: "reports", labelKey: "nav.reports", icon: FileSpreadsheet },
      ],
    },
    {
      id: "system",
      titleBn: "সিস্টেম ও ব্যাকআপ",
      titleEn: "System & Tools",
      items: [
        {
          id: "users",
          labelKey: "nav.users",
          icon: Users,
          badge: pendingApprovalsCount > 0 ? (locale === "bn" ? toBanglaDigits(pendingApprovalsCount) : pendingApprovalsCount) : undefined,
          badgeColor: "bg-teal-500 text-slate-950 font-black",
        },
        { id: "backup", labelKey: "nav.backup", icon: Database },
        { id: "settings", labelKey: "nav.settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-200/90 dark:border-[#1e293b] bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-xl transition-all duration-300 ease-in-out select-none shrink-0 shadow-xs",
        "md:sticky md:top-[109px] min-[900px]:top-16 md:self-start md:z-30",
        "md:h-[calc(100dvh-109px)] min-[900px]:h-[calc(100dvh-4rem)]",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Top Header with Collapse Toggle */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100 dark:border-[#1e293b] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-400 truncate">
              {locale === "bn" ? "মেনুবার" : "Navigation"}
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          </div>
        )}

        <button
          onClick={toggleCollapse}
          className={cn(
            "p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#182234] border border-transparent hover:border-slate-200 dark:hover:border-[#2d3b52] transition-all cursor-pointer flex items-center gap-1",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? (locale === "bn" ? "মেনু খুলুন (Ctrl+B)" : "Expand sidebar (Ctrl+B)") : (locale === "bn" ? "মেনু সংকুচিত করুন (Ctrl+B)" : "Collapse sidebar (Ctrl+B)")}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!isCollapsed && (
            <span className="text-[10px] font-mono opacity-50 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Ctrl+B
            </span>
          )}
        </button>
      </div>

      {/* Nav List with Sections */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
        {navSections.map((section, sIdx) => (
          <div key={section.id} className="space-y-1">
            {/* Section Header */}
            {!isCollapsed ? (
              <div className="px-3 pt-1 pb-1.5">
                <p className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-400">
                  {locale === "bn" ? section.titleBn : section.titleEn}
                </p>
              </div>
            ) : sIdx > 0 ? (
              <div className="my-2 mx-3 h-px bg-slate-200/70 dark:bg-[#1e293b]" />
            ) : null}

            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer text-left relative group",
                      isCollapsed
                        ? "justify-center w-11 h-11 mx-auto"
                        : "gap-3 px-3.5 py-2.5",
                      isActive
                        ? "bg-gradient-to-r from-teal-500/15 via-teal-500/10 to-emerald-500/5 text-teal-800 dark:text-teal-200 font-bold border border-teal-300/80 dark:border-teal-500/40 shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-teal-500 before:rounded-r-full before:shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#182234]/80 font-medium hover:translate-x-0.5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4.5 h-4.5 shrink-0 transition-transform duration-150",
                        isActive
                          ? "text-teal-600 dark:text-teal-300 scale-110 drop-shadow-xs"
                          : "text-slate-400 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white group-hover:scale-105"
                      )}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 tracking-tight">
                        {t(item.labelKey)}
                      </span>
                    )}

                    {/* Badge if present and expanded */}
                    {!isCollapsed && (item as any).badge && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 shadow-2xs",
                          (item as any).badgeColor || "bg-teal-500 text-slate-950"
                        )}
                      >
                        {(item as any).badge}
                      </span>
                    )}

                    {/* Floating Tooltip in Collapsed Mode */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-[#1c2738] dark:border dark:border-[#2d3b52] text-xs font-bold whitespace-nowrap shadow-xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 translate-x-1 group-hover:translate-x-0 flex items-center gap-2">
                        <span>{t(item.labelKey)}</span>
                        {(item as any).badge && (
                          <span className="px-1.5 py-0.2 rounded-full bg-teal-500 text-slate-950 text-[10px] font-black">
                            {(item as any).badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Modern User Profile & Status Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-[#1e293b] shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-2xl bg-slate-50/80 dark:bg-[#141e2e]/90 border border-slate-200/80 dark:border-[#1e293b] shadow-2xs hover:border-teal-500/40 dark:hover:border-teal-500/40 transition-colors cursor-pointer group relative",
            isCollapsed && "justify-center p-1.5"
          )}
          onClick={() => setActiveTab("settings")}
          title={locale === "bn" ? "প্রোফাইল সেটিংস দেখুন" : "View Profile & Settings"}
        >
          {/* Avatar with Live Indicator */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm shadow-teal-500/20 ring-2 ring-white/60 dark:ring-teal-500/30">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "NZ"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c1322]" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || "NAZRUL"}
                </p>
                <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
                  {currentUser?.role || "ADMIN"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>{locale === "bn" ? "সক্রিয় রয়েছেন" : "Online"}</span>
              </p>
            </div>
          )}

          {/* Floating Tooltip in Collapsed Mode */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-[#1c2738] dark:border dark:border-[#2d3b52] text-xs font-bold whitespace-nowrap shadow-xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 translate-x-1 group-hover:translate-x-0">
              <p className="font-extrabold">{currentUser?.name || "NAZRUL"}</p>
              <p className="text-[10px] text-teal-400 uppercase font-mono">{currentUser?.role || "ADMIN"}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
