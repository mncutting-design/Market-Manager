"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import {
  Building2,
  KeyRound,
  User,
  Languages,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  ShieldAlert,
  Sun,
  Moon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { t, locale, toggleLocale } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Theme state for login page
  const [isDark, setIsDark] = useState(false);

  // Wrong Password Animation & Error States
  const [isShaking, setIsShaking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect active theme
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    setIsDark(isCurrentlyDark);
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    }
  };

  const triggerWrongPasswordAnimation = (msg: string) => {
    setHasError(true);
    setErrorMessage(msg);
    setIsShaking(true);

    // Haptic feedback if supported by browser/device
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate([100, 60, 100]);
      } catch (_) {}
    }

    // Clear password and refocus
    setPassword("");
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);

    // Reset shake animation after 600ms so subsequent wrong attempts shake again
    setTimeout(() => {
      setIsShaking(false);
    }, 600);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!identifier.trim()) {
      triggerWrongPasswordAnimation(
        locale === "bn"
          ? "ইউজারনেম আবশ্যক"
          : "Username is required"
      );
      toast.error(locale === "bn" ? "ইউজারনেম দিন" : "Please enter username");
      return;
    }

    if (!password) {
      triggerWrongPasswordAnimation(
        locale === "bn"
          ? "পাসওয়ার্ড আবশ্যক"
          : "Password is required"
      );
      toast.error(locale === "bn" ? "পাসওয়ার্ড দিন" : "Please enter password");
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage("");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier.trim(),
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorText =
          data.error ||
          (locale === "bn"
            ? "ভুল পাসওয়ার্ড বা ইউজারনেম! অনুগ্রহ করে সঠিক তথ্য দিন।"
            : "Invalid username or password! Please check credentials.");

        triggerWrongPasswordAnimation(errorText);
        toast.error(errorText);
        setIsLoading(false);
        return;
      }

      const userName = data.user?.name || identifier.trim();
      toast.success(
        locale === "bn"
          ? `স্বাগতম ${userName}! সিস্টেম আনলক হয়েছে।`
          : `Welcome ${userName}! Access authorized.`
      );
      onLoginSuccess();
    } catch (e) {
      const networkError =
        locale === "bn"
          ? "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি"
          : "Authentication network error";
      triggerWrongPasswordAnimation(networkError);
      toast.error(networkError);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 bg-[#F4F1EA] dark:bg-[#121214] text-black dark:text-white transition-colors duration-150 overflow-hidden select-none">
      {/* Subtle Neo-Brutalist Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(currentColor 1.5px, transparent 1.5px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* TOP HUD BAR: Status, Theme Toggle, Language Toggle */}
      <div className="absolute top-3 sm:top-5 left-3 sm:left-6 right-3 sm:right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black text-black dark:text-white shadow-[2px_2px_0px_#000000] text-xs font-black">
          <span className="w-2 h-2 rounded-full bg-[#00BA88] border border-black animate-ping" />
          <span>{locale === "bn" ? "সিস্টেম অনলাইন // নিরাপদ প্ল্যাটফর্ম" : "RENT PRO OS // ENCRYPTED"}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-black dark:text-white hover:bg-[#FED734] dark:hover:bg-[#FED734] dark:hover:text-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Moon className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLocale}
            type="button"
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] text-black dark:text-white font-black text-xs shadow-[2px_2px_0px_#000000] hover:bg-[#FED734] dark:hover:bg-[#FED734] dark:hover:text-black transition-all cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{locale === "bn" ? "English" : "বাংলা"}</span>
          </button>
        </div>
      </div>

      {/* MAIN LOGIN CARD */}
      <div
        className={`relative w-full max-w-md z-10 pt-12 sm:pt-4 transition-transform duration-200 ${
          isShaking ? "animate-brutal-shake" : ""
        }`}
      >
        <div
          className={`rounded-2xl border-3 p-6 sm:p-8 space-y-5 bg-white dark:bg-[#1E1F24] text-black dark:text-white transition-all ${
            hasError
              ? "border-[#FF4B55] shadow-[8px_8px_0px_#FF4B55]"
              : "border-black shadow-[8px_8px_0px_#000000]"
          }`}
        >
          {/* App Header & Building Icon */}
          <div className="text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FED734] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000000]">
                <Building2 className="w-8 h-8 text-black stroke-[2.5]" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FED734] border border-black text-black text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#000000]">
                <Sparkles className="w-3 h-3 text-black" />
                <span>Market Manager Pro</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black dark:text-white mt-1">
                {locale === "bn" ? "লগইন করুন" : "Sign In"}
              </h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold mt-0.5">
                {locale === "bn"
                  ? "মার্কেট ও ভাড়াটিয়া ব্যবস্থাপনা অ্যাকাউন্টে প্রবেশ করুন"
                  : "Enter your credentials to access the workspace"}
              </p>
            </div>
          </div>

          {/* DYNAMIC WRONG PASSWORD / ERROR BANNER */}
          {hasError && (
            <div className="p-3 rounded-xl bg-[#FFEBEF] dark:bg-[#2A1417] border-2 border-[#FF4B55] text-[#FF4B55] shadow-[3px_3px_0px_#FF4B55] flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-200">
              <ShieldAlert className="w-5 h-5 text-[#FF4B55] shrink-0 mt-0.5 stroke-[2.5] animate-bounce" />
              <div className="text-xs font-black leading-snug">
                <span className="block text-[11px] uppercase tracking-wider text-[#FF4B55]">
                  {locale === "bn" ? "⚠️ প্রমাণীকরণ ব্যর্থ" : "⚠️ Authentication Failed"}
                </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white">
                {locale === "bn" ? "ব্যবহারকারীর নাম / ইউজারনেম *" : "Username / Identity *"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-neutral-400">
                  <User className="w-4 h-4 stroke-[2.5]" />
                </div>
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (hasError) setHasError(false);
                  }}
                  placeholder={locale === "bn" ? "ইউজারনেম লিখুন (e.g. NAZRUL)" : "Enter username..."}
                  required
                  autoComplete="username"
                  className="pl-9 pr-3 h-11 text-xs font-bold rounded-xl border-2 border-black bg-[#FBF9F5] dark:bg-[#262830] text-black dark:text-white shadow-[2px_2px_0px_#000000] focus:bg-white dark:focus:bg-[#1E1F24]"
                />
              </div>
            </div>

            {/* Password Input with Wrong Password Animation Style */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center justify-between">
                <span>{locale === "bn" ? "সিকিউরিটি পাসওয়ার্ড *" : "Security Password *"}</span>
                {hasError && (
                  <span className="text-[11px] font-black text-[#FF4B55] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                    {locale === "bn" ? "ভুল পাসওয়ার্ড" : "Incorrect"}
                  </span>
                )}
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                    hasError ? "text-[#FF4B55]" : "text-black dark:text-neutral-400"
                  }`}
                >
                  <KeyRound className="w-4 h-4 stroke-[2.5]" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (hasError) setHasError(false);
                  }}
                  placeholder={locale === "bn" ? "পাসওয়ার্ড লিখুন..." : "Enter password..."}
                  required
                  autoComplete="current-password"
                  className={`w-full pl-9 pr-10 h-11 text-xs font-bold rounded-xl border-2 transition-all shadow-[2px_2px_0px_#000000] focus:outline-none ${
                    hasError
                      ? "border-[#FF4B55] bg-[#FFEBEF] dark:bg-[#2A1417] text-[#FF4B55] shadow-[2px_2px_0px_#FF4B55] placeholder:text-[#FF4B55]/70"
                      : "border-black bg-[#FBF9F5] dark:bg-[#262830] text-black dark:text-white focus:bg-white dark:focus:bg-[#1E1F24]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>

            {/* Neo-Brutalist Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-11 mt-2 rounded-xl font-black text-xs tracking-wider uppercase border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                hasError
                  ? "bg-[#FF4B55] hover:bg-[#e03d46] text-white border-black shadow-[3px_3px_0px_#000000]"
                  : "bg-[#FED734] hover:bg-[#FED734]/90 text-black border-black shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{locale === "bn" ? "যাচাই করা হচ্ছে..." : "Authenticating..."}</span>
                </div>
              ) : hasError ? (
                <>
                  <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                  <span>{locale === "bn" ? "পুনরায় চেষ্টা করুন" : "TRY AGAIN"}</span>
                </>
              ) : (
                <>
                  <span>{locale === "bn" ? "লগইন করুন (LOGIN)" : "SIGN IN TO WORKSPACE"}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Security Assurance Tag */}
          <div className="pt-2 text-center border-t-2 border-black/10 dark:border-white/10">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-neutral-600 dark:text-neutral-400">
              <Lock className="w-3.5 h-3.5 text-black dark:text-[#FED734] stroke-[2.5]" />
              <span>{locale === "bn" ? "সুরক্ষিত রোল-ভিত্তিক অ্যাক্সেস কন্ট্রোল" : "SECURED WITH ROLE-BASED ACCESS CONTROL"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
