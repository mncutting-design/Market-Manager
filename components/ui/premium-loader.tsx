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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#F4F1EA] dark:bg-[#121214] text-black dark:text-white transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Neo-brutalist center card */}
      <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm w-full bg-white dark:bg-[#1E1F24] border-3 border-black p-8 rounded-2xl shadow-[8px_8px_0px_#000000] animate-in zoom-in-95 duration-500">
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#FED734] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_#000000]">
            <Building2 className="w-10 h-10 text-black animate-bounce duration-1000" />
          </div>
          <div className="absolute -top-1.5 -right-1.5">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00BCD4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00BCD4] border-2 border-black"></span>
            </span>
          </div>
        </div>

        {/* App Title & Tagline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FED734] border-2 border-black text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000000]">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>Market Manager Pro</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-black dark:text-white">
            {locale === "bn" ? "মার্কেট ম্যানেজার" : "Market Manager"}
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold tracking-wide">
            {locale === "bn"
              ? "বাণিজ্যিক মার্কেট ও সম্পত্তি ব্যবস্থাপনা প্ল্যাটফর্ম"
              : "Rental Market & Property Management Platform"}
          </p>
        </div>

        {/* Neo-Brutalist Progress Bar */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-4 bg-[#FBF9F5] dark:bg-[#262830] rounded-full overflow-hidden p-0.5 border-2 border-black shadow-[2px_2px_0px_#000000]">
            <div
              className="h-full rounded-full bg-[#FED734] border-r-2 border-black transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-neutral-700 dark:text-neutral-300 font-black px-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FED734] animate-ping" />
              {locale === "bn" ? "সিস্টেম প্রস্তুত হচ্ছে..." : "Loading workspace..."}
            </span>
            <span className="font-mono text-black dark:text-[#FED734]">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
