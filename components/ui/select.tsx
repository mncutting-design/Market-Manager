"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, children, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              "flex h-11 w-full appearance-none rounded-xl border-2 border-black bg-white dark:bg-[#262830] px-3.5 py-2 text-sm text-black dark:text-white font-bold focus:outline-none shadow-[3px_3px_0px_#000000] focus:shadow-[4px_4px_0px_#000000] disabled:cursor-not-allowed disabled:opacity-50 transition-all pr-10 cursor-pointer",
              error && "border-[#FF4B55] shadow-[3px_3px_0px_#FF4B55]",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3.5 flex items-center text-black dark:text-white">
            <ChevronDown className="h-4 w-4 stroke-[2.5]" />
          </div>
        </div>
        {error && <p className="mt-1.5 text-xs text-[#FF4B55] font-black">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
