"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex p-1.5 gap-1.5 bg-[#FBF9F5] border-2 border-black rounded-xl overflow-x-auto no-scrollbar shadow-[2px_2px_0px_#000000]",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 text-xs md:text-sm font-black rounded-lg transition-all shrink-0 select-none cursor-pointer min-h-[38px] active:translate-x-0.5 active:translate-y-0.5",
              isActive
                ? "bg-[#FED734] text-black border-2 border-black shadow-[2px_2px_0px_#000000]"
                : "text-gray-700 hover:text-black hover:bg-white border-2 border-transparent hover:border-black font-bold"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 text-[10px] font-black rounded-full border border-black",
                  isActive
                    ? "bg-black text-[#FED734]"
                    : "bg-white text-black dark:bg-[#2D2F39] dark:text-white"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
