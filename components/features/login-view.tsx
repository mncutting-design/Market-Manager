"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { t, locale, toggleLocale } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Aesthetic Post-Login Portal Warp Transition State
  const [isWarping, setIsWarping] = useState(false);
  const [warpStep, setWarpStep] = useState(1);
  const [authenticatedUser, setAuthenticatedUser] = useState<string>("NAZRUL");

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
          data.error ||
            (locale === "bn"
              ? "ভুল ইউজারনেম বা পাসওয়ার্ড"
              : "Invalid username or password")
        );
        setIsLoading(false);
        return;
      }

      const userName = data.user?.name || identifier.trim();
      setAuthenticatedUser(userName);

      // Trigger Aesthetic Cyber Warp Transition into the system
      setIsWarping(true);
      setWarpStep(1);

      setTimeout(() => setWarpStep(2), 350);
      setTimeout(() => setWarpStep(3), 750);
      setTimeout(() => {
        toast.success(
          locale === "bn"
            ? `স্বাগতম ${userName}! সিস্টেম আনলক হয়েছে।`
            : `Welcome ${userName}! Access authorized.`
        );
        onLoginSuccess();
      }, 1300);
    } catch (e) {
      toast.error(locale === "bn" ? "লগইন এরর হয়েছে" : "Authentication error");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#030611] text-white selection:bg-teal-500 selection:text-black">
      {/* 1. CINEMATIC POST-LOGIN WARP PORTAL OVERLAY */}
      {isWarping && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#02050f]/95 backdrop-blur-3xl animate-in fade-in duration-300">
          {/* Radial Warp Cyber Grid */}
          <div
            className="absolute inset-0 opacity-40 animate-pulse pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(6, 182, 212, 0.4) 0%, rgba(13, 148, 136, 0.2) 40%, transparent 70%)`,
            }}
          />

          {/* High-speed Warp Rings Expanding */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/80 animate-ping" />
            <div
              className="absolute inset-6 rounded-full border border-teal-400 animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <div
              className="absolute inset-12 rounded-full border-2 border-dashed border-emerald-400/90 animate-spin"
              style={{ animationDuration: "6s", animationDirection: "reverse" }}
            />
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.8)] animate-bounce">
              <Building2 className="w-12 h-12 text-slate-950" />
            </div>
          </div>

          {/* Status HUD Terminal Stream */}
          <div className="relative z-10 text-center space-y-3 mt-6 max-w-sm px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 text-xs font-mono tracking-wider">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>INITIALIZING SECURE QUANTUM NODE</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {warpStep === 1 && (
                <span className="text-cyan-300 animate-pulse">
                  VERIFYING CREDENTIALS...
                </span>
              )}
              {warpStep === 2 && (
                <span className="text-teal-300 animate-pulse">
                  DECRYPTING COMMERCIAL ASSET SCHEMAS...
                </span>
              )}
              {warpStep === 3 && (
                <span className="text-emerald-400">
                  SYSTEM READY • WELCOME {authenticatedUser.toUpperCase()}
                </span>
              )}
            </h2>

            {/* Glowing progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-900 border border-cyan-500/30 overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                style={{
                  width: warpStep === 1 ? "40%" : warpStep === 2 ? "80%" : "100%",
                }}
              />
            </div>

            <p className="text-[11px] font-mono text-cyan-200/60 uppercase tracking-widest">
              ENTERING RENT PRO COMMERCIAL MARKET OS
            </p>
          </div>
        </div>
      )}

      {/* 2. FUTURISTIC AMBIENT NEON CYBER GRID BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing Quantum Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-[140px] animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[160px]" />

        {/* Futuristic Cyber Perspective Grid Floor */}
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(6, 182, 212, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(6, 182, 212, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />

        {/* Scanning Laser Beam across screen */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 blur-xs animate-bounce"
          style={{ animationDuration: "5s" }}
        />
      </div>

      {/* 3. TOP HUD STATUS & LANGUAGE TOGGLE */}
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

      {/* 4. MAIN HOLOGRAPHIC CYBER CARD */}
      <div className="relative w-full max-w-md z-10 pt-10 sm:pt-4">
        {/* Holographic Glowing Outer Border */}
        <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-cyan-400/60 via-teal-500/30 to-emerald-500/50 shadow-[0_0_60px_-10px_rgba(6,182,212,0.35)]">
          {/* Futuristic HUD Corner Accents */}
          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400" />
          <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />

          {/* Card Body with Glassmorphism */}
          <div className="rounded-[22px] bg-[#0c1222]/92 backdrop-blur-2xl p-6 sm:p-8 space-y-6">
            {/* ============================================================== */}
            {/* PRO ANIMATED COMMERCIAL MARKET STRUCTURE / BUILDING HERO ICON */}
            {/* ============================================================== */}
            <div className="text-center space-y-3">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {/* Rotating Cyber HUD Radar Ring */}
                <div
                  className="absolute inset-0 rounded-3xl border-2 border-dashed border-cyan-400/50 animate-spin"
                  style={{ animationDuration: "16s" }}
                />
                <div
                  className="absolute -inset-1 rounded-3xl border border-teal-500/30 animate-pulse"
                  style={{ animationDuration: "3s" }}
                />

                {/* Animated Futuristic Commercial Market Complex SVG */}
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-slate-900 to-[#071324] border border-cyan-400/40 p-2 flex items-center justify-center shadow-lg shadow-cyan-500/25 overflow-hidden group">
                  {/* Facade Vertical Laser Scanner */}
                  <div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 blur-xs animate-bounce pointer-events-none"
                    style={{ animationDuration: "2.8s" }}
                  />

                  {/* Multi-story Commercial Market Illustration with Illuminated Windows */}
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    {/* Roof Antenna with Signal Beacon Pulse */}
                    <line x1="32" y1="4" x2="32" y2="12" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="32" cy="4" r="2.5" fill="#34d399" className="animate-ping" />
                    <circle cx="32" cy="3" r="1.5" fill="#22d3ee" />

                    {/* Central Highrise Market Tower Structure */}
                    <rect x="20" y="12" width="24" height="46" rx="2" fill="#0e1e38" stroke="#06b6d4" strokeWidth="1.5" />

                    {/* Left Commercial Wing */}
                    <rect x="8" y="24" width="12" height="34" rx="2" fill="#091426" stroke="#0d9488" strokeWidth="1.2" />

                    {/* Right Commercial Wing */}
                    <rect x="44" y="24" width="12" height="34" rx="2" fill="#091426" stroke="#0d9488" strokeWidth="1.2" />

                    {/* Left Wing Shop Windows (illuminated) */}
                    <rect x="11" y="28" width="6" height="3.5" rx="0.5" fill="#22d3ee" className="animate-pulse" style={{ animationDuration: "2s" }} />
                    <rect x="11" y="35" width="6" height="3.5" rx="0.5" fill="#34d399" />
                    <rect x="11" y="42" width="6" height="3.5" rx="0.5" fill="#22d3ee" className="animate-pulse" style={{ animationDuration: "3s" }} />

                    {/* Central Tower Floor Windows (Floors 5 to 1) */}
                    <rect x="23" y="16" width="7" height="3" rx="0.5" fill="#38bdf8" />
                    <rect x="34" y="16" width="7" height="3" rx="0.5" fill="#34d399" />

                    <rect x="23" y="22" width="7" height="3" rx="0.5" fill="#34d399" className="animate-pulse" style={{ animationDuration: "2.4s" }} />
                    <rect x="34" y="22" width="7" height="3" rx="0.5" fill="#38bdf8" />

                    <rect x="23" y="28" width="7" height="3" rx="0.5" fill="#38bdf8" />
                    <rect x="34" y="28" width="7" height="3" rx="0.5" fill="#34d399" className="animate-pulse" style={{ animationDuration: "1.8s" }} />

                    <rect x="23" y="34" width="7" height="3" rx="0.5" fill="#34d399" />
                    <rect x="34" y="34" width="7" height="3" rx="0.5" fill="#38bdf8" className="animate-pulse" style={{ animationDuration: "2.2s" }} />

                    <rect x="23" y="40" width="7" height="3" rx="0.5" fill="#38bdf8" />
                    <rect x="34" y="40" width="7" height="3" rx="0.5" fill="#34d399" />

                    {/* Right Wing Shop Windows */}
                    <rect x="47" y="28" width="6" height="3.5" rx="0.5" fill="#34d399" />
                    <rect x="47" y="35" width="6" height="3.5" rx="0.5" fill="#22d3ee" className="animate-pulse" style={{ animationDuration: "2.5s" }} />
                    <rect x="47" y="42" width="6" height="3.5" rx="0.5" fill="#34d399" />

                    {/* Ground Level Grand Market Entrance Canopy */}
                    <path d="M16 48 H48 V58 H16 Z" fill="#040b17" stroke="#22d3ee" strokeWidth="1" />
                    <path d="M26 50 H38 V58 H26 Z" fill="#22d3ee" fillOpacity="0.8" />
                    {/* Glowing entry arch */}
                    <line x1="28" y1="58" x2="36" y2="58" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Floating Commercial Hologram Status Badges */}
                <span className="absolute -bottom-1 -right-2 px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-400 text-[9px] font-mono font-bold text-cyan-300 shadow-md">
                  MARKET OS
                </span>
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
                  {locale === "bn"
                    ? "ব্যবহারকারীর নাম / ইউজারনেম"
                    : "Username / Identity"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      locale === "bn" ? "ইউজারনেম লিখুন..." : "Enter username..."
                    }
                    required
                    autoComplete="username"
                    className="pl-9 pr-3 h-11 bg-slate-900/80 border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20 text-white font-mono text-sm placeholder:text-slate-500 rounded-xl"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-cyan-300/80">
                  {locale === "bn"
                    ? "সিকিউরিটি পাসওয়ার্ড"
                    : "Security Password"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      locale === "bn" ? "পাসওয়ার্ড লিখুন..." : "Enter password..."
                    }
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10 h-11 bg-slate-900/80 border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20 text-white font-mono text-sm placeholder:text-slate-500 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Futuristic Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isWarping}
                className="w-full h-11 mt-3 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-300/50"
              >
                {isLoading || isWarping ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>
                      {locale === "bn"
                        ? "অনুমোদন প্রক্রিয়াধীন..."
                        : "Authenticating Node..."}
                    </span>
                  </div>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>
                      {locale === "bn"
                        ? "সিস্টেম আনলক করুন (LOGIN)"
                        : "INITIALIZE SYSTEM ACCESS"}
                    </span>
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


