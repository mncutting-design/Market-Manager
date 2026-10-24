"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Check, X, Plus } from "lucide-react";
import { matchesSearchWithDigits } from "@/lib/format";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  id?: string;
  allowClear?: boolean;
  showSublabelInTrigger?: boolean;
  autoWidth?: boolean;
  extraAction?: {
    label: string;
    onClick: () => void;
  };
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  label,
  error,
  disabled = false,
  className,
  buttonClassName,
  dropdownClassName,
  id,
  allowClear = false,
  showSublabelInTrigger = true,
  autoWidth = false,
  extraAction,
}: SearchableSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options with bilingual digit support
  const filteredOptions = options.filter(
    (opt) =>
      matchesSearchWithDigits(opt.label, query) ||
      (opt.sublabel && matchesSearchWithDigits(opt.sublabel, query)) ||
      matchesSearchWithDigits(opt.value, query)
  );

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            handleSelect(opt.value);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={cn(
        autoWidth ? "w-fit relative inline-block transition-all duration-200" : "w-full relative",
        className
      )}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Main trigger button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={selectedOption ? selectedOption.label : placeholder}
        className={cn(
          "flex h-11 items-center justify-between rounded-xl border-2 border-black bg-white px-3.5 py-2 text-left text-sm text-black font-bold transition-all duration-150 shadow-[3px_3px_0px_#000000] hover:bg-[#FBF9F5] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] focus:outline-none",
          autoWidth ? "w-fit min-w-[130px] max-w-[340px] xl:max-w-[420px] gap-2" : "w-full",
          error && "border-[#FF4B55] shadow-[3px_3px_0px_#FF4B55]",
          disabled && "cursor-not-allowed opacity-50 bg-[#FBF9F5]",
          buttonClassName
        )}
      >
        <span
          className={cn(
            "font-black text-black",
            autoWidth ? "truncate whitespace-nowrap min-w-0" : "truncate flex-1"
          )}
        >
          {selectedOption ? (
            <span className="text-black font-black">
              {selectedOption.label}
              {showSublabelInTrigger && selectedOption.sublabel && (
                <span className="text-xs text-gray-600 font-bold ml-2">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 font-bold">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1.5 ml-2 text-black shrink-0">
          {allowClear && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 rounded-md hover:bg-[#FED734] text-black border border-transparent hover:border-black"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 stroke-[2.5]",
              isOpen && "transform rotate-180 text-black"
            )}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 rounded-xl border-2 border-black bg-white shadow-[6px_6px_0px_#000000] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 text-black",
            autoWidth ? "min-w-[260px] sm:min-w-[300px] w-max max-w-sm left-0" : "w-full",
            dropdownClassName
          )}
        >
          {/* Search bar inside popover */}
          <div className="p-2 border-b-2 border-black bg-[#FBF9F5]">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-4 h-4 text-black" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border-2 border-black rounded-lg text-black font-bold placeholder:text-gray-400 focus:outline-none focus:shadow-[2px_2px_0px_#000000]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 text-black hover:text-[#FF4B55]"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1 text-sm divide-y divide-black/5"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 font-bold">
                {query ? "No matching options found" : "No options available"}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs font-bold",
                      isSelected
                        ? "bg-[#FED734] text-black border border-black shadow-[1.5px_1.5px_0px_#000000]"
                        : isHighlighted
                        ? "bg-[#FFF9E6] text-black"
                        : "text-black hover:bg-[#FBF9F5]",
                      opt.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span
                          className={cn(
                            "text-[10px]",
                            isSelected ? "text-black/80 font-bold" : "text-gray-500"
                          )}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Optional Extra Action footer */}
          {extraAction && (
            <div className="p-2 border-t-2 border-black bg-[#FBF9F5]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  extraAction.onClick();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-black text-black bg-[#FED734] border-2 border-black rounded-lg shadow-[2px_2px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{extraAction.label}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
