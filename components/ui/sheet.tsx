"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  children,
}: SheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full bg-white dark:bg-[#1E1F24] rounded-t-3xl p-6 border-t-4 border-x-2 border-black shadow-[0px_-6px_0px_#000000] text-black dark:text-white transition-all animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col",
          "md:max-w-xl md:mx-auto md:rounded-b-none md:bottom-0"
        )}
      >
        {/* Drag handle */}
        <div className="w-14 h-2 bg-black dark:bg-white/40 rounded-full mx-auto mb-4 shrink-0" />

        <div className="flex items-start justify-between pb-3 border-b-2 border-black">
          <div>
            {title && (
              <h2 className="text-lg font-black text-black dark:text-white">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-black bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] text-black dark:text-white dark:hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="overflow-y-auto py-4 flex-1 pb-8">{children}</div>
      </div>
    </div>
  );
}
