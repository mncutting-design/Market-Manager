"use client";

import React from "react";
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
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toBanglaDigits } from "@/lib/format";

export function Sidebar() {
  const { t, locale } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    currentUser,
    pendingApprovalsCount,
    isSidebarOpen,
    toggleSidebar,
    isSidebarMini,
    toggleSidebarMini,
  } = useApp();

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
          badgeColor: "bg-[#FF4B55] text-white",
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
          badge:
            pendingApprovalsCount > 0
              ? locale === "bn"
                ? toBanglaDigits(pendingApprovalsCount)
                : pendingApprovalsCount
              : undefined,
          badgeColor: "bg-[#FED734] text-black font-black",
        },
        { id: "backup", labelKey: "nav.backup", icon: Database },
        { id: "settings", labelKey: "nav.settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r-2 border-black bg-[#F4F1EA] dark:bg-[#121214] text-black dark:text-white transition-all duration-300 ease-in-out select-none shrink-0",
        "md:sticky md:top-14 md:self-start md:z-30",
        "md:h-[calc(100dvh-3.5rem)]",
        !isSidebarOpen
          ? "w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none p-0"
          : isSidebarMini
          ? "w-14"
          : "w-60"
      )}
    >
      {/* Top Header with Compact Neo-Brutalist Controls */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b-2 border-black shrink-0 h-10 bg-white dark:bg-[#1E1F24]">
        {!isSidebarMini ? (
          <>
            <div className="flex items-center gap-1.5 px-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#FED734] border border-black" />
              <span className="text-[10px] font-black tracking-widest uppercase text-black dark:text-white truncate">
                {locale === "bn" ? "মেনু" : "NAVIGATION"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Mini rail button */}
              <button
                onClick={toggleSidebarMini}
                className="p-1 rounded-md text-black dark:text-white border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] dark:hover:text-black shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                title={locale === "bn" ? "সংকুচিত আইকন বার" : "Collapse to mini rail"}
              >
                <ChevronsLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              {/* Close completely */}
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-md text-black dark:text-white border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FF4B55] hover:text-white dark:hover:bg-[#FF4B55] dark:hover:text-white shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                title={locale === "bn" ? "মেনুবার বন্ধ করুন (Ctrl+B)" : "Close sidebar (Ctrl+B)"}
              >
                <PanelLeftClose className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <button
              onClick={toggleSidebarMini}
              className="p-1 rounded-md text-black dark:text-white border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] dark:hover:text-black shadow-[1.5px_1.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              title={locale === "bn" ? "মেনুবার বিস্তারিত করুন" : "Expand sidebar"}
            >
              <ChevronsRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      {/* Nav List with Sections */}
      <nav className="flex-1 px-2 py-2.5 space-y-3 overflow-y-auto custom-scrollbar min-h-0">
        {navSections.map((section, sIdx) => (
          <div key={section.id} className="space-y-1">
            {/* Section Header */}
            {!isSidebarMini ? (
              <div className="px-2 pt-1 pb-0.5">
                <p className="text-[10px] font-black tracking-wider uppercase text-gray-700 dark:text-gray-300">
                  {locale === "bn" ? section.titleBn : section.titleEn}
                </p>
              </div>
            ) : sIdx > 0 ? (
              <div className="my-2 mx-2 h-0.5 bg-black/10 dark:bg-white/20" />
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
                      "w-full flex items-center rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer text-left relative group font-bold",
                      isSidebarMini
                        ? "justify-center w-10 h-10 mx-auto"
                        : "gap-2.5 px-3 py-2",
                      isActive
                        ? "bg-[#FED734] text-black border-2 border-black shadow-[3px_3px_0px_#000000] font-black"
                        : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-white/80 dark:hover:bg-[#2D2F39] border-2 border-transparent hover:border-black"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform duration-150 stroke-[2.2]",
                        isActive ? "text-black scale-110" : "text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white"
                      )}
                    />

                    {!isSidebarMini && (
                      <span className="truncate flex-1 tracking-tight font-black">
                        {t(item.labelKey)}
                      </span>
                    )}

                    {/* Badge if present and expanded */}
                    {!isSidebarMini && (item as any).badge && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 border border-black shadow-[1px_1px_0px_#000000]",
                          (item as any).badgeColor || "bg-[#FED734] text-black"
                        )}
                      >
                        {(item as any).badge}
                      </span>
                    )}

                    {/* Floating Tooltip in Mini Mode */}
                    {isSidebarMini && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E1F24] text-black dark:text-white border-2 border-black text-xs font-black whitespace-nowrap shadow-[4px_4px_0px_#000000] z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 translate-x-1 group-hover:translate-x-0 flex items-center gap-2">
                        <span>{t(item.labelKey)}</span>
                        {(item as any).badge && (
                          <span className="px-1.5 py-0.2 rounded-md bg-[#FED734] text-black text-[10px] font-black border border-black">
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
      <div className="p-2 border-t-2 border-black shrink-0 bg-white dark:bg-[#1E1F24]">
        <div
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000] hover:bg-[#FED734] dark:hover:bg-[#FED734] transition-all cursor-pointer group relative",
            isSidebarMini && "justify-center p-1"
          )}
          onClick={() => setActiveTab("settings")}
          title={locale === "bn" ? "প্রোফাইল সেটিংস দেখুন" : "View Profile & Settings"}
        >
          {/* Avatar with Status Dot */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#FED734] text-black border-2 border-black flex items-center justify-center font-black text-xs shadow-[1.5px_1.5px_0px_#000000]">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "NZ"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00BA88] border-2 border-black" />
          </div>

          {!isSidebarMini && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-black text-black dark:text-white group-hover:text-black dark:group-hover:text-black truncate">
                  {currentUser?.name || "NAZRUL"}
                </p>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-black text-[#FED734] shrink-0">
                  {currentUser?.role || "ADMIN"}
                </span>
              </div>
              <p className="text-[10px] text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-black font-bold truncate flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00BA88] inline-block border border-black" />
                <span>{locale === "bn" ? "সক্রিয় রয়েছেন" : "Online"}</span>
              </p>
            </div>
          )}

          {/* Floating Tooltip in Mini Mode */}
          {isSidebarMini && (
            <div className="absolute left-full ml-3 px-3 py-2 rounded-xl bg-white dark:bg-[#1E1F24] text-black dark:text-white border-2 border-black text-xs font-black whitespace-nowrap shadow-[4px_4px_0px_#000000] z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 translate-x-1 group-hover:translate-x-0">
              <p className="font-black">{currentUser?.name || "NAZRUL"}</p>
              <p className="text-[10px] text-black dark:text-white font-black uppercase">{currentUser?.role || "ADMIN"}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
