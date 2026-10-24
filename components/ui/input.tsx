"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, prefixIcon, suffixIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center w-full">
          {prefixIcon && (
            <div className="absolute left-3.5 text-black dark:text-white pointer-events-none flex items-center">
              {prefixIcon}
            </div>
          )}
          <input
            type={type}
            disabled={disabled}
            className={cn(
              "flex h-11 w-full rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] px-3.5 py-2 text-sm text-black dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#1E1F24] focus:outline-none focus:shadow-[3px_3px_0px_#000000] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              prefixIcon && "pl-10",
              suffixIcon && "pr-10",
              error && "border-[#FF4B55] focus:shadow-[3px_3px_0px_#FF4B55]",
              className
            )}
            ref={ref}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3.5 text-black dark:text-white flex items-center">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-[#FF4B55] font-black">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
