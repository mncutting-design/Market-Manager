"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  CreditCard,
  PlusCircle,
  Smartphone,
  Landmark,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentAccount {
  id: string;
  accountType: "BKASH" | "NAGAD" | "BANK";
  name_en: string;
  name_bn: string;
  number: string;
  bankName?: string | null;
  branch?: string | null;
  isActive: boolean;
  createdAt: string;
}

export function PaymentAccountsCard() {
  const { t, locale } = useTranslation();
  const { isAdmin } = useApp();

  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);

  // Form State
  const [accountType, setAccountType] = useState<"BKASH" | "NAGAD" | "BANK">("BKASH");
  const [nameEn, setNameEn] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [number, setNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/payment-accounts?all=true");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error("Failed to load payment accounts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openAddModal = () => {
    setEditingAccount(null);
    setAccountType("BKASH");
    setNameEn("bKash Merchant");
    setNameBn("বিকাশ মার্চেন্ট");
    setNumber("");
    setBankName("");
    setBranch("");
    setIsModalOpen(true);
  };

  const openEditModal = (acc: PaymentAccount) => {
    setEditingAccount(acc);
    setAccountType(acc.accountType);
    setNameEn(acc.name_en);
    setNameBn(acc.name_bn);
    setNumber(acc.number);
    setBankName(acc.bankName || "");
    setBranch(acc.branch || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) {
      toast.error(locale === "bn" ? "হিসাব বা মোবাইল নম্বর আবশ্যক" : "Account or Mobile number is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = "/api/payment-accounts";
      const method = editingAccount ? "PUT" : "POST";
      const payload: any = {
        accountType,
        name_en: nameEn.trim() || undefined,
        name_bn: nameBn.trim() || undefined,
        number: number.trim(),
        bankName: accountType === "BANK" ? bankName.trim() || null : null,
        branch: accountType === "BANK" ? branch.trim() || null : null,
      };

      if (editingAccount) {
        payload.id = editingAccount.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save payment account");
        return;
      }

      toast.success(
        editingAccount
          ? locale === "bn"
            ? "একাউন্ট সফলভাবে হালনাগাদ করা হয়েছে"
            : "Account updated successfully"
          : locale === "bn"
          ? "নতুন একাউন্ট সফলভাবে যুক্ত হয়েছে"
          : "Payment account added successfully"
      );

      setIsModalOpen(false);
      fetchAccounts();
    } catch (e) {
      toast.error("Failed to save payment account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (acc: PaymentAccount) => {
    try {
      const res = await fetch("/api/payment-accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id, isActive: !acc.isActive }),
      });
      if (res.ok) {
        toast.success(
          !acc.isActive
            ? locale === "bn"
              ? "একাউন্ট সক্রিয় করা হয়েছে"
              : "Account activated"
            : locale === "bn"
            ? "একাউন্ট নিষ্ক্রিয় করা হয়েছে"
            : "Account deactivated"
        );
        fetchAccounts();
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            <span>
              {locale === "bn"
                ? "পেমেন্ট চ্যানেল ও একাউন্টস (Payment Accounts)"
                : "Payment Receiving Accounts"}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            {locale === "bn"
              ? "ভাড়া ও বিল কালেকশনের জন্য বিকাশ, নগদ ও ব্যাংক একাউন্ট কনফিগার করুন।"
              : "Configure official bKash, Nagad, and Bank accounts for rental payment collections."}
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openAddModal} className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold">
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            <span>{locale === "bn" ? "নতুন একাউন্ট" : "Add Account"}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0 space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading payment accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
            {locale === "bn"
              ? "কোনো পেমেন্ট একাউন্ট কনফিগার করা নেই। নতুন একাউন্ট যোগ করুন।"
              : "No payment accounts configured yet. Add your first receiving account."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const isBkash = acc.accountType === "BKASH";
              const isNagad = acc.accountType === "NAGAD";
              const isBank = acc.accountType === "BANK";

              return (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    acc.isActive
                      ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
                      : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isBkash
                            ? "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
                            : isNagad
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {isBank ? <Landmark className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {locale === "bn" ? acc.name_bn : acc.name_en}
                        </h4>
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          {acc.accountType}
                          {acc.bankName ? ` • ${acc.bankName}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(acc)}
                        title={acc.isActive ? "Deactivate" : "Activate"}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          acc.isActive
                            ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100"
                            : "border-slate-300 text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-teal-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {isBank ? (locale === "bn" ? "হিসাব নম্বর:" : "Account No:") : (locale === "bn" ? "মোবাইল নম্বর:" : "Mobile No:")}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {acc.number}
                    </span>
                  </div>

                  {acc.branch && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{locale === "bn" ? "শাখা:" : "Branch:"}</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{acc.branch}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingAccount
            ? locale === "bn"
              ? "পেমেন্ট একাউন্ট সম্পাদনা"
              : "Edit Payment Account"
            : locale === "bn"
            ? "নতুন পেমেন্ট একাউন্ট যোগ করুন"
            : "Add Receiving Account"
        }
        description={
          locale === "bn"
            ? "বিকাশ, নগদ বা ব্যাংক একাউন্ট বিবরণ লিখুন"
            : "Enter channel details for collection"
        }
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {locale === "bn" ? "চ্যানেলের ধরন (Type) *" : "Channel Type *"}
            </label>
            <Select
              value={accountType}
              onChange={(e) => {
                const val = e.target.value as any;
                setAccountType(val);
                if (val === "BKASH") {
                  setNameEn("bKash Merchant");
                  setNameBn("বিকাশ মার্চেন্ট");
                } else if (val === "NAGAD") {
                  setNameEn("Nagad Merchant");
                  setNameBn("নগদ মার্চেন্ট");
                } else {
                  setNameEn("Main Bank Account");
                  setNameBn("প্রধান ব্যাংক হিসাব");
                }
              }}
            >
              <option value="BKASH">বিকাশ (bKash)</option>
              <option value="NAGAD">নগদ (Nagad)</option>
              <option value="BANK">ব্যাংক একাউন্ট (Bank)</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                লেবেল (বাংলা) *
              </label>
              <Input
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="e.g. বিকাশ পার্সোনাল"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Label (English) *
              </label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. bKash Personal"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {accountType === "BANK"
                ? locale === "bn"
                  ? "হিসাব নম্বর (Account Number) *"
                  : "Account Number *"
                : locale === "bn"
                ? "মোবাইল নম্বর (Phone Number) *"
                : "Phone Number *"}
            </label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={accountType === "BANK" ? "e.g. 205012345678" : "017XXXXXXXX"}
              required
              className="font-mono"
            />
          </div>

          {accountType === "BANK" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  ব্যাংকের নাম
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. সোনালী ব্যাংক"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  শাখা (Branch)
                </label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. মতিঝিল শাখা"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-teal-600 hover:bg-teal-500 text-white font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {locale === "bn" ? "সংরক্ষণ করুন" : "Save Account"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
