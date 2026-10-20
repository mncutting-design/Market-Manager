"use client";

import React, { useState } from "react";
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
  Cpu,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { t, locale, toggleLocale } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error(
        locale === "bn"
          ? "ইউজারনেম এবং পাসওয়ার্ড উভয়ই আবশ্যক"
          : "Username and password are required"
      );
      return;
    }

    try {
      setIsLoading(true);
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
        toast.error(
          data.error || (locale === "bn" ? "ভুল ইউজারনেম বা পাসওয়ার্ড" : "Invalid username or password")
        );
        return;
      }

      toast.success(
        locale === "bn"
          ? `স্বাগতম ${data.user?.name || identifier}! সিস্টেম আনলক হয়েছে।`
          : `Welcome ${data.user?.name || identifier}! Access authorized.`
      );
      onLoginSuccess();
    } catch (e) {
      toast.error(locale === "bn" ? "লগইন এরর হয়েছে" : "Authentication error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#050711] text-white selection:bg-teal-500 selection:text-black">
      {/* 1. FUTURISTIC AMBIENT NEON CYBER GRID BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing Quantum Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-[140px] animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[160px]" />

        {/* Futuristic Cyber Perspective Grid */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(6, 182, 212, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(6, 182, 212, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />

        {/* Scanning Laser Beam */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 blur-xs animate-bounce"
          style={{ animationDuration: "5s" }}
        />
      </div>

      {/* 2. TOP HUD STATUS & LANGUAGE TOGGLE */}
      <div className="absolute top-3 sm:top-5 left-3 sm:left-6 right-3 sm:right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md text-[11px] font-mono tracking-wider text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold">SYSTEM ACTIVE // ENCRYPTION AES-256</span>
        </div>

        <button
          onClick={toggleLocale}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-500/40 bg-slate-900/80 text-teal-300 font-bold text-xs shadow-lg backdrop-blur-md hover:bg-teal-950/80 hover:border-teal-400 transition-all cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5 text-teal-400" />
          <span>{locale === "bn" ? "English (EN)" : "বাংলা (BN)"}</span>
        </button>
      </div>

      {/* 3. MAIN HOLOGRAPHIC CYBER CARD */}
      <div className="relative w-full max-w-md z-10 pt-10 sm:pt-4">
        {/* Holographic Glowing Outer Border */}
        <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-cyan-400/50 via-teal-500/20 to-emerald-500/40 shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]">
          {/* Futuristic HUD Corner Accents */}
          <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
          <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
          <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

          {/* Card Body with Glassmorphism */}
          <div className="rounded-[22px] bg-[#0c1222]/90 backdrop-blur-2xl p-6 sm:p-8 space-y-6">
            {/* Holographic Reactor Brand */}
            <div className="text-center space-y-2">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                {/* Concentric rotating neon rings */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-dashed border-cyan-400/60 animate-spin"
                  style={{ animationDuration: "14s" }}
                />
                <div className="absolute inset-1.5 rounded-xl border border-teal-500/40 animate-pulse" />
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                  <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                    RENT PRO
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                    OS v2.6
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs font-mono text-cyan-200/70 uppercase tracking-widest mt-1">
                  Intelligent Commercial Asset Manager
                </p>
              </div>
            </div>

            {/* Secure Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-cyan-300/80">
                  {locale === "bn" ? "ব্যবহারকারীর নাম / ইউজারনেম" : "Username / Identity"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={locale === "bn" ? "ইউজারনেম লিখুন..." : "Enter username..."}
                    required
                    autoComplete="username"
                    className="pl-9 pr-3 h-11 bg-slate-900/80 border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20 text-white font-mono text-sm placeholder:text-slate-500 rounded-xl"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-cyan-300/80">
                  {locale === "bn" ? "সিকিউরিটি পাসওয়ার্ড" : "Security Password"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={locale === "bn" ? "পাসওয়ার্ড লিখুন..." : "Enter password..."}
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10 h-11 bg-slate-900/80 border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20 text-white font-mono text-sm placeholder:text-slate-500 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Futuristic Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-3 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-300/50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{locale === "bn" ? "অনুমোদন প্রক্রিয়াধীন..." : "Authenticating Node..."}</span>
                  </div>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>{locale === "bn" ? "সিস্টেম আনলক করুন (LOGIN)" : "INITIALIZE SYSTEM ACCESS"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Security Assurance Tag */}
            <div className="pt-2 text-center">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <Lock className="w-3 h-3 text-cyan-500" />
                <span>RESTRICTED ACCESS • SECURED WITH ROLE-BASED ACCESS CONTROL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

