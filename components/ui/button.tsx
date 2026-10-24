"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 transition-all duration-150 rounded-xl focus:outline-none";

    const variants = {
      primary:
        "bg-[#FED734] text-black font-black border-2 border-black shadow-[3px_3px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000000]",
      secondary:
        "bg-white dark:bg-[#262830] text-black dark:text-white font-black border-2 border-black shadow-[3px_3px_0px_#000000] hover:bg-[#FBF9F5] dark:hover:bg-[#323540] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]",
      outline:
        "bg-white dark:bg-[#262830] text-black dark:text-white font-black border-2 border-black shadow-[3px_3px_0px_#000000] hover:bg-[#FBF9F5] dark:hover:bg-[#323540] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]",
      ghost:
        "bg-transparent text-black dark:text-white font-black border-2 border-transparent hover:border-black hover:bg-[#FED734] dark:hover:bg-[#FED734] hover:text-black dark:hover:text-black active:translate-x-[1px] active:translate-y-[1px]",
      destructive:
        "bg-[#FF4B55] text-white font-black border-2 border-black shadow-[3px_3px_0px_#000000] hover:bg-[#e03d46] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]",
      accent:
        "bg-[#FED734] text-black font-black border-2 border-black shadow-[3px_3px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000000]",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs gap-1.5",
      md: "h-11 px-4 text-sm gap-2 min-h-[44px]",
      lg: "h-12 px-6 text-base gap-2.5 min-h-[48px]",
      icon: "h-10 w-10 p-2 min-h-[40px] min-w-[40px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
