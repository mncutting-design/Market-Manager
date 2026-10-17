"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { toBanglaDigits, toLatinDigits, formatIndianNumbering } from "@/lib/format";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | string;
  onChange?: (val: number) => void;
  allowDecimals?: boolean;
  prefix?: string;
  suffix?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      allowDecimals = false,
      prefix,
      suffix,
      disabled,
      placeholder,
      ...props
    },
    ref
  ) => {
    const { locale } = useTranslation();
    const [displayVal, setDisplayVal] = useState<string>("");

    // Synchronize external numeric value with internal display string
    useEffect(() => {
      if (value === undefined || value === null || value === "") {
        setDisplayVal("");
        return;
      }
      const num = typeof value === "string" ? parseFloat(toLatinDigits(value)) : value;
      if (isNaN(num)) {
        setDisplayVal("");
        return;
      }

      // Format initial value
      const formatted = num.toString();
      setDisplayVal(locale === "bn" ? toBanglaDigits(formatted) : formatted);
    }, [value, locale]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;

      // Normalize any Bangla digits to Latin digits
      const latinized = toLatinDigits(rawInput);

      // Clean non-numeric characters (allow digits and single decimal dot if allowDecimals)
      let cleaned = latinized.replace(/[^0-9.]/g, "");
      if (!allowDecimals) {
        cleaned = cleaned.replace(/\./g, "");
      } else {
        const parts = cleaned.split(".");
        if (parts.length > 2) {
          cleaned = parts[0] + "." + parts.slice(1).join("");
        }
      }

      // Display in active locale digits
      const localizedDisplay = locale === "bn" ? toBanglaDigits(cleaned) : cleaned;
      setDisplayVal(localizedDisplay);

      const parsedNum = cleaned === "" ? 0 : parseFloat(cleaned);
      if (onChange) {
        onChange(isNaN(parsedNum) ? 0 : parsedNum);
      }
    };

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-3 text-slate-500 dark:text-slate-400 font-medium select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={displayVal}
          onChange={handleChange}
          placeholder={placeholder ? (locale === "bn" ? toBanglaDigits(placeholder) : placeholder) : ""}
          className={cn(
            "flex h-11 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-base md:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-xs",
            prefix && "pl-8",
            suffix && "pr-8",
            className
          )}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-500 dark:text-slate-400 text-sm font-medium select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
