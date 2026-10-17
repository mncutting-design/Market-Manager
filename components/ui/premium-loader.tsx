"use client";

import React, { useEffect, useState } from "react";
import { Building2, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function PremiumLoader({
  onFinished,
  minDuration = 800,
}: {
  onFinished?: () => void;
  minDuration?: number;
}) {
  const { t, locale } = useTranslation();
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Smooth progress animation
    const timer1 = setTimeout(() => setProgress(45), 150);
    const timer2 = setTimeout(() => setProgress(80), 400);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinished) onFinished();
      }, 350);
    }, minDuration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [minDuration, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#141c2b] via-[#162032] to-[#101724] text-white transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

      {/* Center Branding Card */}
      <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm w-full animate-in zoom-in-95 duration-500">
        {/* Animated Icon with Multi-ring Glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-teal-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-teal-400 p-0.5 shadow-2xl shadow-teal-500/30">
            <div className="w-full h-full rounded-[22px] bg-[#141c2b] flex items-center justify-center">
              <Building2 className="w-10 h-10 text-teal-400 animate-bounce duration-1000" />
            </div>
          </div>
          <div className="absolute -top-1.5 -right-1.5">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500"></span>
            </span>
          </div>
        </div>

        {/* App Title & Tagline */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Market Manager Pro</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
            {locale === "bn" ? "মার্কেট ম্যানেজার" : "Market Manager"}
          </h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            {locale === "bn"
              ? "বাণিজ্যিক মার্কেট ও সম্পত্তি ব্যবস্থাপনা প্ল্যাটফর্ম"
              : "Rental Market & Property Management Platform"}
          </p>
        </div>

        {/* Smooth Dynamic Progress Bar */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 transition-all duration-300 ease-out shadow-sm shadow-teal-400/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium px-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              {locale === "bn" ? "সিস্টেম প্রস্তুত হচ্ছে..." : "Loading workspace..."}
            </span>
            <span className="font-mono text-teal-400">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
