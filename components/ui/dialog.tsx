"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
}: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow || "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths: Record<string, string> = {
    sm: "w-full max-w-sm",
    md: "w-full max-w-md sm:max-w-lg",
    lg: "w-full max-w-lg sm:max-w-xl md:max-w-2xl",
    xl: "w-full max-w-xl sm:max-w-2xl md:max-w-3xl",
    "2xl": "w-full max-w-2xl sm:max-w-3xl md:max-w-4xl",
    "3xl": "w-full max-w-3xl sm:max-w-4xl md:max-w-5xl",
    "4xl": "w-full max-w-4xl sm:max-w-5xl md:max-w-6xl",
    "5xl": "w-full max-w-5xl sm:max-w-6xl md:max-w-7xl",
    full: "w-full max-w-[96vw]",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in no-print"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog box - 100% viewport-fit responsive on mobile and desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full bg-white dark:bg-[#182234] rounded-2xl p-3 sm:p-5 md:p-6 shadow-2xl border border-slate-200 dark:border-[#2d3b52] animate-in zoom-in-95 duration-150 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col",
          maxWidths[maxWidth] || maxWidths.lg
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-[#2d3b52] gap-2 shrink-0 no-print">
            <div className="flex-1 min-w-0 pr-1">
              {title && (
                <div className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {title}
                </div>
              )}
              {description && (
                <div className="text-[11px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-300 mt-0.5 line-clamp-2">
                  {description}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body with sleek custom scrollbar */}
        <div className="overflow-y-auto py-2 sm:py-3.5 flex-1 overscroll-contain pr-0.5 sm:pr-1 custom-scrollbar min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
