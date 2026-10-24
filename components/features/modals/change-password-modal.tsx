"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ShieldCheck, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userName = "NAZRUL",
}: ChangePasswordModalProps) {
  const { t, locale } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error(
        locale === "bn"
          ? "বর্তমান এবং নতুন পাসওয়ার্ড উভয়ই প্রদান করুন"
          : "Both current and new passwords are required"
      );
      return;
    }

    if (newPassword.length < 4) {
      toast.error(
        locale === "bn"
          ? "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে"
          : "New password must be at least 4 characters"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        locale === "bn"
          ? "নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মিলছে না"
          : "New password and confirmation do not match"
      );
      return;
    }

    try {
      setIsLoading(true);
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

      toast.success(
        locale === "bn"
          ? "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"
          : "Password changed successfully!"
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      toast.error("Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-black dark:text-white">
          <KeyRound className="w-5 h-5 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
          <span className="font-black">{locale === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change User Password"}</span>
        </div>
      }
      description={
        locale === "bn"
          ? `'${userName}' ব্যবহারকারীর সিকিউরিটি পাসওয়ার্ড যে কোনো সময় আপডেট করুন।`
          : `Update security access password for '${userName}' at any time.`
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Identity Banner */}
        <div className="p-3 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black flex items-center justify-between text-xs shadow-[2px_2px_0px_#000000]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FED734] text-black font-black border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000]">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-black dark:text-white">{userName}</p>
              <p className="text-[10px] text-neutral-500 font-bold">Security Credentials</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#00BA88] text-white border-2 border-black shadow-[1px_1px_0px_#000000]">
            Active User
          </span>
        </div>

        {/* Current Password */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
            {locale === "bn" ? "বর্তমান পাসওয়ার্ড (Current Password)" : "Current Password"}
          </label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={locale === "bn" ? "যেমন: NAZRUL" : "e.g. NAZRUL"}
              required
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
            {locale === "bn" ? "নতুন পাসওয়ার্ড (New Password)" : "New Password"}
          </label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
            {locale === "bn" ? "নতুন পাসওয়ার্ড নিশ্চিত করুন" : "Confirm New Password"}
          </label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t-2 border-black">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="neo"
            size="sm"
            isLoading={isLoading}
            className="w-full sm:w-auto font-black"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {locale === "bn" ? "পাসওয়ার্ড আপডেট করুন" : "Update Password"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
