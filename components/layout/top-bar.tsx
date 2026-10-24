"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { getMonthList, toBanglaDigits } from "@/lib/format";
import {
  Building2,
  Languages,
  Sun,
  Moon,
  ChevronDown,
  Calendar,
  Settings,
  Database,
  LogOut,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  User,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

export function TopBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { t, locale, setLocale, toggleLocale } = useTranslation();
  const {
    selectedMarketId,
    setSelectedMarketId,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    markets,
    setActiveTab,
    openApprovals,
    pendingApprovalsCount,
    triggerRefresh,
    currentUser,
    openChangePassword,
    isSidebarOpen,
    toggleSidebar,
  } = useApp();

  const handleToggleSidebar = onToggleSidebar || toggleSidebar;

  const [isDark, setIsDark] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  const months = getMonthList(locale);
  const years = [2025, 2026, 2027];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b-2 border-black transition-colors shadow-[0px_3px_0px_#000000]">
      {/* 1. TOP MAIN BAR */}
      <div className="h-14 px-2 min-[900px]:px-5 flex items-center justify-between gap-2 min-[900px]:gap-4">
        {/* LEFT: Sidebar Toggle Button + Logo & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Sidebar Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl text-black hover:bg-[#FED734] border-2 border-black shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
            title={
              isSidebarOpen
                ? (locale === "bn" ? "মেনুবার বন্ধ করুন (Ctrl+B)" : "Close sidebar (Ctrl+B)")
                : (locale === "bn" ? "মেনুবার খুলুন (Ctrl+B)" : "Open sidebar (Ctrl+B)")
            }
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-black stroke-[2.5]" />
            ) : (
              <PanelLeftOpen className="w-5 h-5 text-black stroke-[2.5]" />
            )}
          </button>

          {/* Logo & Brand Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#FED734] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_#000000] shrink-0">
              <Building2 className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm min-[900px]:text-base font-black tracking-tight text-black whitespace-nowrap">
                  {t("common.appName")}
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-[#FED734] text-black border border-black shadow-[1px_1px_0px_#000000] shrink-0">
                  PRO
                </span>
              </div>
              <p className="hidden xl:block text-[11px] text-gray-700 font-bold truncate max-w-[220px]">
                {t("common.appTagline")}
              </p>
            </div>
          </div>
        </div>

        {/* DESKTOP (>= 900px) CENTER: Market, Month & Year Selectors */}
        <div className="hidden min-[900px]:flex items-center justify-center gap-2.5 flex-1 px-4 max-w-3xl mx-auto">
          {/* Market selector - Auto-adjusts width based on text size */}
          <SearchableSelect
            value={selectedMarketId}
            onChange={(val) => setSelectedMarketId(val || "ALL")}
            options={[
              { value: "ALL", label: t("common.allMarkets") },
              ...markets.map((m) => ({
                value: m.id,
                label: m.name,
                sublabel: `${m.totalShops || 0} ${locale === "bn" ? "দোকান" : "Shops"}`,
              })),
            ]}
            placeholder={t("dashboard.selectMarket")}
            searchPlaceholder={locale === "bn" ? "মার্কেট খুঁজুন..." : "Search..."}
            autoWidth={true}
            showSublabelInTrigger={false}
            buttonClassName="h-10 text-xs md:text-sm font-bold rounded-xl bg-white border-2 border-black shadow-[2.5px_2.5px_0px_#000000]"
          />

          {/* Month selector */}
          <div className="relative w-[135px] shrink-0">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label={t("dashboard.selectMonth")}
              className="w-full h-10 pl-6 pr-6 text-xs md:text-sm font-bold bg-white border-2 border-black rounded-xl text-black appearance-none focus:outline-none shadow-[2.5px_2.5px_0px_#000000] cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-black absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-black absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
          </div>

          {/* Year selector */}
          <div className="relative w-[95px] shrink-0">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label={t("dashboard.selectYear")}
              className="w-full h-10 pl-3 pr-6 text-xs md:text-sm font-bold bg-white border-2 border-black rounded-xl text-black appearance-none focus:outline-none shadow-[2.5px_2.5px_0px_#000000] cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {locale === "bn" ? toBanglaDigits(y) : y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-black absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
          </div>
        </div>

        {/* RIGHT AREA: Desktop Actions (>= 900px) + Profile Icon */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          {/* DESKTOP ONLY: Realtime Sync Indicator */}
          <button
            onClick={() => {
              triggerRefresh("ALL");
              toast.success(
                locale === "bn"
                  ? "সকল ডেটা রিয়েলটাইমে সিঙ্ক করা হয়েছে!"
                  : "All data synchronized in real-time!"
              );
            }}
            type="button"
            className="hidden min-[900px]:flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl border-2 border-black bg-[#00BA88] text-black hover:bg-[#00a87a] transition-all cursor-pointer text-xs font-black shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[40px]"
            title={locale === "bn" ? "রিয়েলটাইম সিঙ্ক সক্রিয়" : "Realtime Sync Active"}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span className="text-xs">{locale === "bn" ? "লাইভ সিঙ্ক" : "Live Sync"}</span>
          </button>

          {/* DESKTOP ONLY: Visible Language Switcher Button */}
          <button
            onClick={toggleLocale}
            type="button"
            className="hidden min-[900px]:flex items-center justify-center gap-1 px-3 h-10 rounded-xl border-2 border-black bg-[#FED734] text-black hover:bg-[#edd028] font-black text-xs sm:text-sm cursor-pointer shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all min-h-[40px]"
            title="Switch Language / ভাষা পরিবর্তন"
            aria-label="Toggle language between English and Bangla"
          >
            <Languages className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
            <span>{locale === "bn" ? "EN" : "বাং"}</span>
          </button>

          {/* DESKTOP ONLY: Theme toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="hidden min-[900px]:flex w-10 h-10 items-center justify-center rounded-xl border-2 border-black bg-white text-black hover:bg-[#FBF9F5] transition-all cursor-pointer shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[40px] min-w-[40px]"
            title={isDark ? t("common.lightMode") : t("common.darkMode")}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-black stroke-[2.5]" /> : <Moon className="w-4 h-4 text-black stroke-[2.5]" />}
          </button>

          {/* DESKTOP ONLY: Admin Approvals Button */}
          <button
            onClick={openApprovals}
            type="button"
            className="hidden min-[900px]:flex relative w-10 h-10 items-center justify-center rounded-xl border-2 border-black bg-white text-black hover:bg-[#FED734] transition-all cursor-pointer shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[40px] min-w-[40px]"
            title={locale === "bn" ? "অ্যাডমিন অনুমোদন কেন্দ্র" : "Admin Approvals"}
            aria-label="Admin Approvals"
          >
            <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#FF4B55] text-[10px] font-black text-white border border-black shadow-[1px_1px_0px_#000000]">
                {locale === "bn" ? toBanglaDigits(pendingApprovalsCount) : pendingApprovalsCount}
              </span>
            )}
          </button>

          {/* User Profile Icon & Trigger (ALWAYS VISIBLE) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              type="button"
              className="flex items-center gap-1.5 p-1 rounded-xl bg-white border-2 border-black hover:bg-[#FED734] shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer min-h-[40px] min-w-[40px] justify-center"
              aria-label="User Profile and Menu"
              aria-expanded={isProfileOpen}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-[#FED734] text-black border border-black font-black text-xs flex items-center justify-center">
                  {(currentUser?.name || "NAZRUL").slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#00BA88] border border-black rounded-full" />
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-black text-black leading-tight">
                  {currentUser?.name || "NAZRUL"}
                </span>
                <span className="text-[9px] text-gray-700 font-extrabold uppercase">
                  {currentUser?.role || "ADMIN"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-black hidden lg:block stroke-[2.5]" />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border-2 border-black shadow-[6px_6px_0px_#000000] py-2 z-50 animate-in fade-in-50 zoom-in-95 text-black divide-y-2 divide-black/10">
                {/* User Header */}
                <div className="px-4 py-3 bg-[#FBF9F5]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-black truncate">
                      {currentUser?.name || "NAZRUL"}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#FED734] text-black border border-black">
                      {currentUser?.role || "ADMIN"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-bold truncate mt-0.5">
                    {currentUser?.email || "nazrul@rentpro.internal"}
                  </p>
                </div>

                {/* Account Settings & Shortcuts */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      openChangePassword();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-black hover:bg-[#FED734] transition-colors text-left cursor-pointer min-h-[40px]"
                  >
                    <KeyRound className="w-4 h-4 text-black stroke-[2.2]" />
                    <span>{locale === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setActiveTab("backup");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-black hover:bg-[#FED734] transition-colors text-left cursor-pointer min-h-[40px]"
                  >
                    <Database className="w-4 h-4 text-black stroke-[2.2]" />
                    <span>{t("nav.backup")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setActiveTab("settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-black hover:bg-[#FED734] transition-colors text-left cursor-pointer min-h-[40px]"
                  >
                    <Settings className="w-4 h-4 text-black stroke-[2.2]" />
                    <span>{t("nav.settings")}</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-black text-[#FF4B55] hover:bg-[#FFEBEF] transition-colors text-left cursor-pointer min-h-[40px]"
                  >
                    <LogOut className="w-4 h-4 stroke-[2.2]" />
                    <span>{t("nav.logout")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MOBILE DEDICATED SUB-BAR: Market & Month Filters */}
      <div className="min-[900px]:hidden border-t-2 border-black bg-[#FBF9F5] px-2 py-1.5 flex items-center gap-1.5">
        {/* Market selector */}
        <div className="flex-1 min-w-0">
          <SearchableSelect
            value={selectedMarketId}
            onChange={(val) => setSelectedMarketId(val || "ALL")}
            options={[
              { value: "ALL", label: t("common.allMarkets") },
              ...markets.map((m) => ({
                value: m.id,
                label: m.name,
                sublabel: `${m.totalShops || 0} ${locale === "bn" ? "দোকান" : "Shops"}`,
              })),
            ]}
            placeholder={t("dashboard.selectMarket")}
            searchPlaceholder={locale === "bn" ? "মার্কেট..." : "Search..."}
            showSublabelInTrigger={false}
            buttonClassName="h-10 text-xs font-bold rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000000]"
          />
        </div>

        {/* Month selector */}
        <div className="relative w-[110px] shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            aria-label={t("dashboard.selectMonth")}
            className="w-full h-10 pl-5 pr-5 text-[11px] font-bold bg-white border-2 border-black rounded-xl text-black appearance-none focus:outline-none shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Calendar className="w-3.5 h-3.5 text-black absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-black absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>

        {/* Year selector */}
        <div className="relative w-[76px] shrink-0">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label={t("dashboard.selectYear")}
            className="w-full h-10 pl-2 pr-4 text-[11px] font-bold bg-white border-2 border-black rounded-xl text-black appearance-none focus:outline-none shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {locale === "bn" ? toBanglaDigits(y) : y}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-black absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>
      </div>
    </header>
  );
}
