"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, KeyRound, Mail, Sparkles, Languages, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { t, locale, toggleLocale } = useTranslation();
  const [email, setEmail] = useState("admin@marketmanager.com");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error(t("validation.required"));
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success(t("common.success"));
      onLoginSuccess();
    } catch (e) {
      toast.error("Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("admin@marketmanager.com");
    setPassword("admin123");
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@marketmanager.com", password: "admin123" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t("common.success"));
        onLoginSuccess();
      }
    } catch (e) {
      toast.error("Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Language switch at top right */}
        <div className="flex justify-end">
          <button
            onClick={toggleLocale}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 font-semibold text-xs shadow-xs hover:bg-teal-50 cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "English" : "বাংলা"}</span>
          </button>
        </div>

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-teal-700/20">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("common.appName")}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {t("common.appTagline")}
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 md:p-8 shadow-xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t("settings.adminEmail")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@marketmanager.com"
                prefixIcon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t("settings.currentPassword")}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                prefixIcon={<KeyRound className="w-4 h-4" />}
                required
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" isLoading={isLoading}>
              <span>{t("common.login")}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill & 1-Click Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <p className="text-xs font-medium text-slate-500">
              {locale === "bn" ? "পরীক্ষামূলক ডেমো লগইন:" : "One-Click Demo Admin Login:"}
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>{locale === "bn" ? "সরাসরি ডেমো প্রবেশ (admin123)" : "Instant Demo Login (admin123)"}</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
