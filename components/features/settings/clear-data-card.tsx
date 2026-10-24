"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

export function ClearDataCard() {
  const { locale } = useTranslation();
  const { isAdmin, triggerRefresh, refreshMarkets } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"EXCLUDING_USERS" | "INCLUDING_USERS">("EXCLUDING_USERS");
  const [confirmInput, setConfirmInput] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  // STRICT PERMISSION: ONLY ADMIN CAN SEE THIS
  if (!isAdmin) return null;

  const handleOpenModal = (mode: "EXCLUDING_USERS" | "INCLUDING_USERS") => {
    setSelectedMode(mode);
    setConfirmInput("");
    setIsModalOpen(true);
  };

  const handleExecuteClear = async () => {
    if (confirmInput.trim().toUpperCase() !== "CLEAR") {
      toast.error(
        locale === "bn"
          ? "নিশ্চিতকরণের জন্য ইনপুট বক্সে 'CLEAR' লিখুন।"
          : "Please type 'CLEAR' to confirm."
      );
      return;
    }

    try {
      setIsClearing(true);
      const includeUsers = selectedMode === "INCLUDING_USERS";
      const res = await fetch("/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeUsers,
          confirmText: confirmInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to clear data");
        return;
      }

      toast.success(
        locale === "bn"
          ? includeUsers
            ? "ব্যবহারকারীসহ সকল ডেটা সফলভাবে মুছে ফেলা হয়েছে!"
            : "ব্যবহারকারী ব্যতীত সকল অপারেশনাল ডেটা মুছে ফেলা হয়েছে!"
          : "System data cleared successfully!"
      );

      setIsModalOpen(false);
      setConfirmInput("");
      await refreshMarkets();
      triggerRefresh();

      // Short reload delay to refresh all state
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e: any) {
      toast.error("Failed to clear data: " + (e?.message || "Unknown error"));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Card className="p-4 sm:p-6 border-2 border-black bg-[#FFEBEF] dark:bg-[#2A1417] shadow-[4px_4px_0px_#000000]">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg font-black text-black dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#FF4B55] shrink-0 stroke-[2.5]" />
              <span>{locale === "bn" ? "ডেটা মুছে ফেলুন (Danger Zone)" : "Danger Zone: Clear System Data"}</span>
            </CardTitle>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF4B55] text-white border-2 border-black shadow-[1px_1px_0px_#000000] shrink-0">
              {locale === "bn" ? "শুধুমাত্র অ্যাডমিন" : "Admin Only"}
            </span>
          </div>
          <CardDescription className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-1">
            {locale === "bn"
              ? "সিস্টেমের সমস্ত তথ্য মুছে নতুন করে শুরু করার জন্য দুটি পৃথক অপশন রয়েছে — ইউজার একাউন্ট রেখে অথবা ইউজার একাউন্টসহ সম্পূর্ণ সিস্টেম ফ্যাক্টরি রিসেট।"
              : "Clear system data and start fresh with two options: either preserve user accounts or perform a complete factory reset."}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* OPTION 1: EXCLUDING USERS */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-black dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 stroke-[2.5]" />
                    <span>{locale === "bn" ? "ব্যবহারকারী ব্যতীত ডেটা মুছুন" : "Clear Data (Excluding Users)"}</span>
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FED734] text-black border border-black shadow-[1px_1px_0px_#000000] shrink-0">
                    {locale === "bn" ? "ইউজার নিরাপদ" : "Users Kept"}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-2 leading-relaxed">
                  {locale === "bn"
                    ? "সকল মার্কেট, দোকান, ভাড়াটিয়া, বিলিং, বকেয়া ও খরচের হিসাব মুছে ফেলা হবে। তবে আপনার ও অন্যান্য স্টাফদের ইউজার একাউন্ট ও পাসওয়ার্ড অপরিবর্তিত থাকবে।"
                    : "Wipes all markets, shops, tenants, bills, and expenses. All staff and admin user accounts remain completely intact."}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenModal("EXCLUDING_USERS")}
                className="w-full text-xs font-black min-h-[40px] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                <span>{locale === "bn" ? "ইউজার ব্যতীত ডেটা মুছুন" : "Clear Excluding Users"}</span>
              </Button>
            </div>

            {/* OPTION 2: INCLUDING USERS */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-[#FF4B55] flex items-center gap-1.5">
                    <UserX className="w-4 h-4 stroke-[2.5]" />
                    <span>{locale === "bn" ? "ব্যবহারকারীসহ সম্পূর্ণ ডেটা মুছুন" : "Clear All (Including Users)"}</span>
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FF4B55] text-white border border-black shadow-[1px_1px_0px_#000000] shrink-0">
                    {locale === "bn" ? "ফ্যাক্টরি রিসেট" : "Factory Reset"}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-2 leading-relaxed">
                  {locale === "bn"
                    ? "সকল মার্কেট, দোকান, বিলিংসহ অন্যান্য সকল স্টাফ ও ইউজারের অ্যাকাউন্ট মুছে ফেলা হবে। শুধুমাত্র আপনার সুপার অ্যাডমিন (NAZRUL) একাউন্টটি সক্রিয় থাকবে।"
                    : "Wipes all operational data and all staff/manager accounts. Only the primary Super Admin account (NAZRUL) remains active for login."}
                </p>
              </div>

              <Button
                type="button"
                variant="destructive"
                onClick={() => handleOpenModal("INCLUDING_USERS")}
                className="w-full text-xs font-black min-h-[40px] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                <span>{locale === "bn" ? "ইউজারসহ সবকিছু মুছে ফেলুন" : "Clear All Including Users"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => !isClearing && setIsModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-black dark:text-white">
            <AlertTriangle className="w-5 h-5 text-[#FF4B55] shrink-0 stroke-[2.5]" />
            <span className="text-base sm:text-lg font-black">
              {selectedMode === "INCLUDING_USERS"
                ? locale === "bn"
                  ? "সতর্কতা: ব্যবহারকারীসহ সম্পূর্ণ ফ্যাক্টরি রিসেট!"
                  : "Warning: Factory Reset Including Users!"
                : locale === "bn"
                ? "সতর্কতা: ব্যবহারকারী ব্যতীত সকল ডেটা মোছা হবে!"
                : "Warning: Clear All Data Excluding Users!"}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 sm:p-4 rounded-xl bg-[#FFEBEF] dark:bg-[#2A1417] border-2 border-black shadow-[2px_2px_0px_#000000] text-xs text-black dark:text-white space-y-2">
            <p className="font-black text-[#FF4B55]">
              {locale === "bn"
                ? "এই পদক্ষেপটি অপরিবর্তনযোগ্য (Irreversible)! ডেটা মুছে ফেলার পর তা আর ফিরিয়ে আনা সম্ভব হবে না।"
                : "This action is irreversible! Once cleared, the selected data cannot be restored unless you downloaded a backup JSON."}
            </p>
            <ul className="list-disc pl-5 space-y-1 font-bold">
              <li>
                {locale === "bn"
                  ? "সমস্ত মার্কেট, দোকান এবং ভাড়ার চুক্তি তালিকা মুছে যাবে।"
                  : "All markets, shops, and rental records will be erased."}
              </li>
              <li>
                {locale === "bn"
                  ? "সকল বিলিং ইনভয়েস, আদায়ের রশিদ এবং বকেয়ার হিসাব মুছে যাবে।"
                  : "All billing invoices, money receipts, and dues records will be erased."}
              </li>
              <li>
                {locale === "bn"
                  ? "অগ্রিম জামানত ও খরচের হিসাব পরিষ্কার হয়ে যাবে।"
                  : "All advance security ledgers and expenses will be cleared."}
              </li>
              <li className="font-black text-black dark:text-white">
                {selectedMode === "INCLUDING_USERS"
                  ? locale === "bn"
                    ? "🔴 অন্যান্য সকল ইউজার একাউন্ট মুছে যাবে (কেবলমাত্র আপনার অ্যাডমিন একাউন্ট থাকবে)।"
                    : "🔴 All staff/manager user accounts will be permanently deleted (only Admin preserved)."
                  : locale === "bn"
                    ? "🟢 সকল ব্যবহারকারী (ইউজার) একাউন্ট ও পাসওয়ার্ড সুরক্ষিত থাকবে।"
                    : "🟢 All user accounts and credentials will remain safely preserved."}
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-black dark:text-white">
              {locale === "bn"
                ? "নিশ্চিত করতে নিচে ইংরেজি অক্ষরে 'CLEAR' টাইপ করুন:"
                : "Type 'CLEAR' in capital letters below to confirm:"}
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="CLEAR"
              className="font-mono font-black tracking-widest text-center uppercase"
              autoFocus
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t-2 border-black">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isClearing}
              className="w-full sm:w-auto text-xs min-h-[40px]"
            >
              {locale === "bn" ? "বাতিল করুন" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmInput.trim().toUpperCase() !== "CLEAR" || isClearing}
              isLoading={isClearing}
              onClick={handleExecuteClear}
              className="w-full sm:w-auto text-xs font-black min-h-[40px]"
            >
              <Trash2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              <span>
                {selectedMode === "INCLUDING_USERS"
                  ? locale === "bn" ? "ইউজারসহ সম্পূর্ণ মুছুন" : "Confirm Clear With Users"
                  : locale === "bn" ? "ইউজার ব্যতীত নিশ্চিত মুছুন" : "Confirm Clear Without Users"}
              </span>
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
