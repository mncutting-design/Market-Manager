export type UserRole = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";

export interface RoleDefinition {
  role: UserRole;
  label_bn: string;
  label_en: string;
  description_bn: string;
  description_en: string;
  badgeColor: string;
  canEditDirectly: boolean;
  canSubmitEditRequests: boolean;
  canManageMarkets: boolean;
  canCreateShops: boolean;
  canEditShopsDirectly: boolean;
  canDeleteShops: boolean;
  canApproveChanges: boolean;
  canGenerateBills: boolean;
  canCollectRent: boolean;
  canAddExpenses: boolean;
  canManageUsers: boolean;
  canChangeAnyPassword: boolean;
  canDownloadBackup: boolean;
  canViewReports: boolean;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  ADMIN: {
    role: "ADMIN",
    label_bn: "সুপার অ্যাডমিন",
    label_en: "Super Admin",
    description_bn: "সম্পূর্ণ অধিকার: মার্কেট, দোকান, বিল, খরচ, অনুমোদন ও ব্যবহারকারী নিয়ন্ত্রণ",
    description_en: "Full Access: Markets, shops, billing, expenses, approvals, and user management",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
    canEditDirectly: true,
    canSubmitEditRequests: false,
    canManageMarkets: true,
    canCreateShops: true,
    canEditShopsDirectly: true,
    canDeleteShops: true,
    canApproveChanges: true,
    canGenerateBills: true,
    canCollectRent: true,
    canAddExpenses: true,
    canManageUsers: true,
    canChangeAnyPassword: true,
    canDownloadBackup: true,
    canViewReports: true,
  },
  MANAGER: {
    role: "MANAGER",
    label_bn: "মার্কেট ম্যানেজার",
    label_en: "Market Manager",
    description_bn: "দৈনন্দিন হিসাব: ভাড়া আদায়, বিল তৈরি, খরচ এন্ট্রি ও অনুমোদনের আবেদন",
    description_en: "Daily Operations: Collect rent, generate bills, log expenses, submit edit requests",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    canEditDirectly: false,
    canSubmitEditRequests: true, // Requires admin approval for any changes
    canManageMarkets: false,
    canCreateShops: true,
    canEditShopsDirectly: false, // Must submit for admin approval
    canDeleteShops: false,
    canApproveChanges: false,
    canGenerateBills: true,
    canCollectRent: true,
    canAddExpenses: true,
    canManageUsers: false,
    canChangeAnyPassword: false,
    canDownloadBackup: false,
    canViewReports: true,
  },
  OPERATOR: {
    role: "OPERATOR",
    label_bn: "কালেকশন স্টাফ",
    label_en: "Collection Staff",
    description_bn: "শুধু কালেকশন: ভাড়া আদায় এন্ট্রি ও রিসিট প্রিন্ট (কোনো এডিট বা আবেদন নয়)",
    description_en: "Collections & Receipts: Record payments, print receipts (no edit rights)",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    canEditDirectly: false,
    canSubmitEditRequests: false, // OPERATOR ONLY OPERATES, NO EDIT REQUESTS
    canManageMarkets: false,
    canCreateShops: false,
    canEditShopsDirectly: false,
    canDeleteShops: false,
    canApproveChanges: false,
    canGenerateBills: false,
    canCollectRent: true,
    canAddExpenses: false,
    canManageUsers: false,
    canChangeAnyPassword: false,
    canDownloadBackup: false,
    canViewReports: false,
  },
  VIEWER: {
    role: "VIEWER",
    label_bn: "নিরীক্ষক / দর্শক",
    label_en: "Auditor / Viewer",
    description_bn: "শুধু দেখা: ড্যাশবোর্ড, রিপোর্ট ও রিসিট পরিদর্শন (কোনো তথ্য পরিবর্তন নয়)",
    description_en: "Read Only: View dashboard, reports, and receipts without modification rights",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    canEditDirectly: false,
    canSubmitEditRequests: false,
    canManageMarkets: false,
    canCreateShops: false,
    canEditShopsDirectly: false,
    canDeleteShops: false,
    canApproveChanges: false,
    canGenerateBills: false,
    canCollectRent: false,
    canAddExpenses: false,
    canManageUsers: false,
    canChangeAnyPassword: false,
    canDownloadBackup: false,
    canViewReports: true,
  },
};

export function getRoleDefinition(role: string): RoleDefinition {
  const normalized = (role || "").toUpperCase() as UserRole;
  return ROLE_DEFINITIONS[normalized] || ROLE_DEFINITIONS.ADMIN;
}

export function hasPermission(
  role: string,
  permission: keyof Omit<RoleDefinition, "role" | "label_bn" | "label_en" | "description_bn" | "description_en" | "badgeColor">
): boolean {
  const def = getRoleDefinition(role);
  return !!def[permission];
}
