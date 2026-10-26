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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
      {/* Crisp Solid Pitch Black Overlay */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in no-print"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Neo-Brutalist Dialog Box */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full bg-white dark:bg-[#1E1F24] text-black dark:text-white rounded-2xl p-4 sm:p-6 border-2 border-black shadow-[8px_8px_0px_#000000] animate-in zoom-in-95 duration-150 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col",
          maxWidths[maxWidth] || maxWidths.lg
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between pb-3 sm:pb-4 border-b-2 border-black gap-2 shrink-0 no-print">
            <div className="flex-1 min-w-0 pr-1">
              {title && (
                <div className="text-base sm:text-lg md:text-xl font-black text-black dark:text-white leading-snug truncate">
                  {title}
                </div>
              )}
              {description && (
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-bold mt-0.5 line-clamp-2">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] text-black dark:text-white dark:hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto py-3 sm:py-4 flex-1 overscroll-contain pr-1 custom-scrollbar min-h-0 text-black dark:text-white">
          {children}
        </div>
      </div>
    </div>
  );
}
