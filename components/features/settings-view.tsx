"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Settings, Shield, KeyRound, Download, Languages, CheckCircle2, FolderArchive, ShieldAlert, Database, Upload } from "lucide-react";
import { toast } from "sonner";
import { TenantPolicyCard } from "./settings/tenant-policy-card";
import { AuditLogsCard } from "./settings/audit-logs-card";
import { UsersRolesCard } from "./settings/users-roles-card";
import { PaymentAccountsCard } from "./settings/payment-accounts-card";
import { ClearDataCard } from "./settings/clear-data-card";

export function SettingsView() {
  const { t, locale, setLocale } = useTranslation();
  const { triggerRefresh, currentUser, setActiveTab } = useApp();

  // Profile Form
  const [adminName, setAdminName] = useState(currentUser?.name || "NAZRUL");
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || "nazrul@rentpro.internal");

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Due Day
  const [defaultDueDay, setDefaultDueDay] = useState<number>(10);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error(t("validation.required"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("validation.passwordMismatch"));
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    toast.success(t("settings.settingsSaved"));
  };

  const handleDownloadBackup = () => {
    window.location.href = "/api/backup";
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
          <span>{t("settings.title")}</span>
        </h2>
        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* 1. Admin Profile Card */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            <span>{t("settings.profile")}</span>
          </CardTitle>
          <CardDescription>{t("settings.adminName")} & {t("settings.adminEmail")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("settings.adminName")}
              </label>
              <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("settings.adminEmail")}
              </label>
              <Input value={adminEmail} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Billing & Language Preferences */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Languages className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            <span>{t("settings.languagePref")} & {t("settings.billDueDay")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("settings.languagePref")}
              </label>
              <Select
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "bn")}
              >
                <option value="bn">বাংলা (Bangla)</option>
                <option value="en">English</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("settings.billDueDay")}
              </label>
              <Input
                type="number"
                min={1}
                max={28}
                value={defaultDueDay}
                onChange={(e) => setDefaultDueDay(Number(e.target.value))}
              />
              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-1">{t("settings.billDueDayDesc")}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSavePreferences}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t("settings.saveSettings")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Change Password */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            <span>{t("settings.changePassword")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                {t("settings.currentPassword")}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                  {t("settings.newPassword")}
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
                  {t("settings.confirmPassword")}
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" isLoading={isChangingPassword}>
                <KeyRound className="w-4 h-4 mr-1.5" />
                {t("settings.changePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. Role-Based Permissions & User Management */}
      <UsersRolesCard />

      {/* 5. Payment Channels & Receiving Accounts */}
      <PaymentAccountsCard />

      {/* 6. Full Database Backup & Export */}
      <Card className="p-6 bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-base font-black text-black dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            <span>{t("settings.systemBackup")}</span>
          </CardTitle>
          <CardDescription className="text-xs text-gray-700 dark:text-gray-300 font-bold">
            {t("settings.backupDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4 flex flex-wrap items-center justify-end gap-2.5">
          <Button variant="outline" onClick={() => setActiveTab("backup")}>
            <Database className="w-4 h-4 mr-1.5" />
            {locale === "bn" ? "ব্যাকআপ ও রিস্টোর পেজে যান" : "Go to Backup & Restore Page"}
          </Button>
          <Button variant="neo" onClick={handleDownloadBackup}>
            <Download className="w-4 h-4 mr-1.5" />
            {t("settings.exportAllData")}
          </Button>
        </CardContent>
      </Card>

      {/* 5. Tenant Policy Configuration */}
      <TenantPolicyCard />

      {/* 6. Security Audit Trail */}
      <AuditLogsCard />

      {/* 7. Download Full Project ZIP */}
      <Card className="p-6 bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000]">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-base font-black text-black dark:text-white flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
            <span>{locale === "bn" ? "প্রজেক্টের সম্পূর্ণ কোড ডাউনলোড (ZIP)" : "Download Full Project Source Code (ZIP)"}</span>
          </CardTitle>
          <CardDescription className="text-xs text-gray-700 dark:text-gray-300 font-bold">
            {locale === "bn"
              ? "সম্পূর্ণ প্রজেক্টের সমস্ত সোর্স ফাইল, কম্পোনেন্ট, প্রিজমা ডাটাবেস স্কিমা এবং ডকুমেন্টেশন একটি প্রস্তুত .zip প্যাকেজে ডাউনলোড করুন।"
              : "Download all source code, Next.js components, Prisma database schema, and configs in a clean .zip package."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4 flex justify-end">
          <a
            href="/api/download-project"
            download="market-manager-project.zip"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm bg-[#FED734] hover:bg-[#edd028] text-black border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{locale === "bn" ? "প্রজেক্ট জিপ ডাউনলোড করুন (.zip)" : "Download Project ZIP (.zip)"}</span>
          </a>
        </CardContent>
      </Card>

      {/* 8. Admin-Only Danger Zone: Clear System Data (Including User / Excluding User) */}
      <ClearDataCard />
    </div>
  );
}
