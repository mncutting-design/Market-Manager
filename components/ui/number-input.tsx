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
          <span className="absolute left-3.5 text-black dark:text-white font-black select-none pointer-events-none z-10 text-sm">
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
            "flex h-11 w-full rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] px-3.5 py-2 text-sm text-black dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#1E1F24] focus:outline-none focus:shadow-[3px_3px_0px_#000000] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            prefix && "pl-8",
            suffix && "pr-8",
            className
          )}
        />
        {suffix && (
          <span className="absolute right-3.5 text-black font-black text-sm select-none pointer-events-none z-10">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
