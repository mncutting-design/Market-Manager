"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export type BadgeStatus =
  | "PAID"
  | "PARTIAL"
  | "DUE"
  | "VACANT"
  | "OCCUPIED"
  | "ACTIVE"
  | "ARCHIVED"
  | "RECURRING"
  | "ONE_TIME";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  variant?: "default" | "success" | "warning" | "danger" | "neutral" | "outline" | "teal" | "cyan";
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  className,
}: {
  status: BadgeStatus | string;
  className?: string;
}) {
  const { t } = useTranslation();
  const normalized = (status || "").toUpperCase() as BadgeStatus;

  let variant: BadgeProps["variant"] = "neutral";
  let labelKey = "status.vacant";

  switch (normalized) {
    case "PAID":
      variant = "success";
      labelKey = "status.paid";
      break;
    case "PARTIAL":
      variant = "warning";
      labelKey = "status.partial";
      break;
    case "DUE":
      variant = "danger";
      labelKey = "status.due";
      break;
    case "OCCUPIED":
      variant = "teal";
      labelKey = "status.occupied";
      break;
    case "VACANT":
      variant = "neutral";
      labelKey = "status.vacant";
      break;
    case "ACTIVE":
      variant = "success";
      labelKey = "status.active";
      break;
    case "ARCHIVED":
      variant = "neutral";
      labelKey = "status.archived";
      break;
    case "RECURRING":
      variant = "cyan";
      labelKey = "status.recurring";
      break;
    default:
      variant = "neutral";
      labelKey = "status.vacant";
  }

  return (
    <Badge variant={variant} className={className}>
      <span className="w-2 h-2 rounded-full mr-1.5 inline-block shrink-0 bg-current border border-black" />
      {t(labelKey)}
    </Badge>
  );
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-[#FED734] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    success:
      "bg-[#00BA88] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    warning:
      "bg-[#F59E0B] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    danger:
      "bg-[#FF4B55] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    neutral:
      "bg-white dark:bg-[#262830] text-black dark:text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    outline:
      "bg-transparent text-black dark:text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    teal:
      "bg-[#FED734] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
    cyan:
      "bg-[#00BCD4] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] font-black",
    md: "px-2.5 py-1 text-xs font-black",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-black select-none tracking-tight",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
