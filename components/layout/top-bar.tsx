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
  FolderArchive,
  KeyRound,
  Trash2,
  RefreshCw,
  User,
  Check,
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
  } = useApp();

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
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#101726] border-b border-slate-200 dark:border-[#2d3b52] transition-colors shadow-xs dark:shadow-lg">
      {/* 1. TOP MAIN BAR */}
      <div className="h-14 min-[900px]:h-16 px-2 min-[900px]:px-6 flex items-center justify-between gap-2 min-[900px]:gap-4">
        {/* LEFT: Web App Logo & Brand Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 min-[900px]:w-10 min-[900px]:h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20 shrink-0">
            <Building2 className="w-4 h-4 min-[900px]:w-5 min-[900px]:h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm min-[900px]:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {t("common.appName")}
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30 shrink-0">
                PRO
              </span>
            </div>
            <p className="hidden xl:block text-[11px] text-slate-500 dark:text-slate-300 truncate max-w-[220px]">
              {t("common.appTagline")}
            </p>
          </div>
        </div>

        {/* DESKTOP (>= 900px) CENTER: Market, Month & Year Selectors */}
        <div className="hidden min-[900px]:flex items-center justify-center gap-2.5 flex-1 px-4 max-w-2xl mx-auto">
          {/* Market selector */}
          <div className="flex-1 max-w-[220px]">
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
              buttonClassName="h-10 text-xs md:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-[#182234] border-slate-300 dark:border-[#2d3b52] shadow-xs"
            />
          </div>

          {/* Month selector */}
          <div className="relative w-[135px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label={t("dashboard.selectMonth")}
              className="w-full h-10 pl-6 pr-6 text-xs md:text-sm font-semibold bg-slate-100 dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-xl text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-slate-500 dark:text-teal-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Year selector */}
          <div className="relative w-[95px]">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label={t("dashboard.selectYear")}
              className="w-full h-10 pl-3 pr-6 text-xs md:text-sm font-semibold bg-slate-100 dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-xl text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {locale === "bn" ? toBanglaDigits(y) : y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            className="hidden min-[900px]:flex items-center justify-center gap-1.5 px-2.5 h-10 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer text-xs font-bold shadow-xs active:scale-95 min-h-[44px]"
            title={locale === "bn" ? "রিয়েলটাইম সিঙ্ক সক্রিয়" : "Realtime Sync Active"}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs">{locale === "bn" ? "লাইভ সিঙ্ক" : "Live Sync"}</span>
          </button>

          {/* DESKTOP ONLY: Visible Language Switcher Button */}
          <button
            onClick={toggleLocale}
            type="button"
            className="hidden min-[900px]:flex items-center justify-center gap-1 px-3 h-10 rounded-xl border border-teal-300 dark:border-teal-500/50 bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-white hover:bg-teal-100 dark:hover:bg-teal-900 font-bold text-xs sm:text-sm cursor-pointer shadow-xs active:scale-95 transition-all min-h-[44px]"
            title="Switch Language / ভাষা পরিবর্তন"
            aria-label="Toggle language between English and Bangla"
          >
            <Languages className="w-4 h-4 text-teal-600 dark:text-teal-300 shrink-0" />
            <span>{locale === "bn" ? "EN" : "বাং"}</span>
          </button>

          {/* DESKTOP ONLY: Theme toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="hidden min-[900px]:flex w-10 h-10 items-center justify-center rounded-xl border border-slate-300 dark:border-[#2d3b52] bg-white dark:bg-[#182234] text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[44px] min-w-[44px]"
            title={isDark ? t("common.lightMode") : t("common.darkMode")}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-teal-300" />}
          </button>

          {/* DESKTOP ONLY: Admin Approvals Button */}
          <button
            onClick={openApprovals}
            type="button"
            className="hidden min-[900px]:flex relative w-10 h-10 items-center justify-center rounded-xl border border-slate-300 dark:border-[#2d3b52] bg-white dark:bg-[#182234] text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[44px] min-w-[44px]"
            title={locale === "bn" ? "অ্যাডমিন অনুমোদন কেন্দ্র" : "Admin Approvals"}
            aria-label="Admin Approvals"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse shadow-sm">
                {locale === "bn" ? toBanglaDigits(pendingApprovalsCount) : pendingApprovalsCount}
              </span>
            )}
          </button>

          {/* User Profile Icon & Trigger (ALWAYS VISIBLE - Touch target >= 44px) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              type="button"
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-300 dark:hover:border-[#2d3b52] cursor-pointer active:scale-95 min-h-[44px] min-w-[44px] justify-center"
              aria-label="User Profile and Menu"
              aria-expanded={isProfileOpen}
            >
              <div className="relative">
                <div className="w-8 h-8 min-[900px]:w-9 min-[900px]:h-9 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                  {(currentUser?.name || "NAZRUL").slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 border-2 border-white dark:border-[#101726] rounded-full" />
                {pendingApprovalsCount > 0 && (
                  <span className="min-[900px]:hidden absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser?.name || "NAZRUL"}
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase">
                  {currentUser?.role || "ADMIN"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300 hidden lg:block" />
            </button>

            {/* Profile Dropdown / Mobile Menu Sheet */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-2xl py-2 z-50 animate-in fade-in-50 zoom-in-95 text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-800">
                {/* User Header */}
                <div className="px-4 py-3 bg-slate-50/50 dark:bg-[#141d2d]/60">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {currentUser?.name || "NAZRUL"}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                      {currentUser?.role || "ADMIN"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 truncate mt-0.5">
                    {currentUser?.email || "nazrul@rentpro.internal"}
                  </p>
                </div>

                {/* MOBILE ONLY (<900px): Language, Theme & Approvals inside Menu */}
                <div className="min-[900px]:hidden px-3 py-2.5 space-y-2">
                  {/* Language Switch Row */}
                  <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
                    <span className="font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Languages className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>{locale === "bn" ? "ভাষা (Language)" : "Language"}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLocale("bn")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                          locale === "bn"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        বাং
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocale("en")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                          locale === "en"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  {/* Dark Mode Row */}
                  <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
                    <span className="font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {isDark ? (
                        <Moon className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <span>{isDark ? "ডার্ক মোড (Dark)" : "লাইট মোড (Light)"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs min-h-[36px]"
                    >
                      {isDark ? "লাইট করুন" : "ডার্ক করুন"}
                    </button>
                  </div>

                  {/* Admin Approvals Shortcut for Mobile */}
                  {currentUser?.role === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        openApprovals();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 min-h-[44px]"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>{locale === "bn" ? "অ্যাডমিন অনুমোদন কেন্দ্র" : "Pending Approvals"}</span>
                      </span>
                      {pendingApprovalsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                          {locale === "bn" ? toBanglaDigits(pendingApprovalsCount) : pendingApprovalsCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">০</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Account Settings & Shortcuts */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      openChangePassword();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>{locale === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setActiveTab("backup");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{t("nav.backup")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setActiveTab("settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <Settings className="w-4 h-4 text-slate-500 dark:text-teal-400" />
                    <span>{t("nav.settings")}</span>
                  </button>

                  <a
                    href="/api/download-project"
                    download="market-manager-project.zip"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <FolderArchive className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{locale === "bn" ? "প্রজেক্ট জিপ ডাউনলোড" : "Download Project ZIP"}</span>
                  </a>

                  {currentUser?.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setActiveTab("settings");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>{locale === "bn" ? "ডেটা মুছে ফেলুন / রিসেট" : "Clear Data / Reset"}</span>
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t("nav.logout")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MOBILE DEDICATED SUB-BAR: Market & Month Filters (Visible ONLY below 900px) */}
      <div className="min-[900px]:hidden border-t border-slate-200/90 dark:border-[#2d3b52] bg-slate-50/95 dark:bg-[#0c1322]/95 backdrop-blur-md px-2 py-1.5 flex items-center gap-1.5 shadow-2xs">
        {/* Market selector (takes maximum available space) */}
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
            buttonClassName="h-10 text-xs font-bold rounded-lg bg-white dark:bg-[#182234] border-slate-300 dark:border-[#2d3b52] shadow-2xs min-h-[44px]"
          />
        </div>

        {/* Month selector */}
        <div className="relative w-[110px] shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            aria-label={t("dashboard.selectMonth")}
            className="w-full h-10 pl-5 pr-5 text-[11px] font-bold bg-white dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-lg text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-2xs min-h-[44px]"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-teal-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-white absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Year selector */}
        <div className="relative w-[76px] shrink-0">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label={t("dashboard.selectYear")}
            className="w-full h-10 pl-2 pr-4 text-[11px] font-bold bg-white dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-lg text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-2xs min-h-[44px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {locale === "bn" ? toBanglaDigits(y) : y}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-white absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </header>
  );
}
