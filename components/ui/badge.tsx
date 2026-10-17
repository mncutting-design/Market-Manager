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
  variant?: "default" | "success" | "warning" | "danger" | "neutral" | "outline" | "teal";
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
      variant = "teal";
      labelKey = "status.recurring";
      break;
    default:
      variant = "neutral";
      labelKey = "status.vacant";
  }

  return (
    <Badge variant={variant} className={className}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block shrink-0 bg-current opacity-80" />
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
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    danger:
      "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800",
    neutral:
      "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    outline:
      "bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    teal:
      "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors",
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
