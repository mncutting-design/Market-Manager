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
  Layers,
  Settings,
  LogOut,
  ShieldCheck,
  FolderArchive,
} from "lucide-react";

export function TopBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { t, locale, toggleLocale } = useTranslation();
  const {
    selectedMarketId,
    setSelectedMarketId,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    markets,
    setActiveTab,
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
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#101726] border-b border-slate-200 dark:border-[#2d3b52] px-3 sm:px-4 md:px-6 h-16 transition-colors flex items-center shadow-xs dark:shadow-lg">
      <div className="w-full flex items-center justify-between gap-2 md:gap-4">
        {/* 1. LEFT CORNER: Web App Logo & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {t("common.appName")}
              </span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30 shrink-0">
                PRO
              </span>
            </div>
            <p className="hidden xl:block text-[11px] text-slate-600 dark:text-slate-200 truncate max-w-[220px]">
              {t("common.appTagline")}
            </p>
          </div>
        </div>

        {/* 2. CENTER POSITION: Market, Month & Year Selectors */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 flex-1 px-1 sm:px-2 max-w-2xl mx-auto">
          {/* Market selector */}
          <div className="relative flex-1 max-w-[130px] sm:max-w-[180px] md:max-w-[220px]">
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              aria-label={t("dashboard.selectMarket")}
              className="w-full h-10 pl-7 md:pl-8 pr-6 md:pr-8 text-xs md:text-sm font-semibold bg-slate-100 dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-xl text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer truncate shadow-xs"
            >
              <option value="ALL">{t("common.allMarkets")}</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Layers className="w-4 h-4 text-slate-500 dark:text-teal-400 absolute left-2 md:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white absolute right-2 md:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month selector */}
          <div className="relative w-[95px] sm:w-[125px] md:w-[140px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label={t("dashboard.selectMonth")}
              className="w-full h-10 pl-6 md:pl-7 pr-6 md:pr-7 text-xs md:text-sm font-semibold bg-slate-100 dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-xl text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-slate-500 dark:text-teal-400 absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Year selector */}
          <div className="relative w-[75px] sm:w-[85px] md:w-[100px]">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label={t("dashboard.selectYear")}
              className="w-full h-10 pl-2.5 md:pl-3 pr-5 md:pr-6 text-xs md:text-sm font-semibold bg-slate-100 dark:bg-[#182234] border border-slate-300 dark:border-[#2d3b52] rounded-xl text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {locale === "bn" ? toBanglaDigits(y) : y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 3. RIGHT CORNER: Language Switcher, Theme Toggle & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          {/* Visible Bilingual Language Switcher Button */}
          <button
            onClick={toggleLocale}
            type="button"
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-teal-300 dark:border-teal-500/50 bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-white hover:bg-teal-100 dark:hover:bg-teal-900 font-bold text-xs md:text-sm cursor-pointer shadow-xs active:scale-95 transition-all"
            title="Switch Language / ভাষা পরিবর্তন"
            aria-label="Toggle language between English and Bangla"
          >
            <Languages className="w-4 h-4 text-teal-600 dark:text-teal-300 shrink-0" />
            <span>{locale === "bn" ? "English" : "বাংলা"}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-300 dark:border-[#2d3b52] bg-white dark:bg-[#182234] text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95"
            title={isDark ? t("common.lightMode") : t("common.darkMode")}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-teal-300" />}
          </button>

          {/* User Profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              type="button"
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-300 dark:hover:border-[#2d3b52] cursor-pointer active:scale-95"
              aria-label="User Profile"
              aria-expanded={isProfileOpen}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-md">
                  MM
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-[#101726] rounded-full" />
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {t("nav.admin")}
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-300 font-semibold leading-tight">
                  {locale === "bn" ? "সুপার এডমিন" : "Super Admin"}
                </span>
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-500 dark:text-white" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#182234] border border-slate-200 dark:border-[#2d3b52] shadow-2xl py-2 z-50 animate-in fade-in-0 zoom-in-95">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/80">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {locale === "bn" ? "প্রশাসক (Admin)" : "Administrator"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-white/80 truncate">
                    admin@marketmanager.com
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-700 w-fit">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>{locale === "bn" ? "সুপার এডমিন" : "Super Admin"}</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setActiveTab("settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500 dark:text-teal-400" />
                    <span>{t("nav.settings")}</span>
                  </button>

                  <a
                    href="/api/download-project"
                    download="market-manager-project.zip"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <FolderArchive className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{locale === "bn" ? "প্রজেক্ট জিপ ডাউনলোড" : "Download Project ZIP"}</span>
                  </a>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700/80 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors text-left cursor-pointer"
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
    </header>
  );
}
