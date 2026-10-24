"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatCurrency, toBanglaDigits } from "@/lib/format";
import { formatFloorName } from "@/lib/floors";
import { toast } from "sonner";
import { Wallet, CheckCircle2, Building, Smartphone, CreditCard, User, Landmark } from "lucide-react";

const STANDARD_BANKS = [
  { id: "Sonali Bank", name_en: "Sonali Bank", name_bn: "সোনালী ব্যাংক" },
  { id: "Janata Bank", name_en: "Janata Bank", name_bn: "জনতা ব্যাংক" },
  { id: "Agrani Bank", name_en: "Agrani Bank", name_bn: "অগ্রণী ব্যাংক" },
  { id: "Rupali Bank", name_en: "Rupali Bank", name_bn: "রূপালী ব্যাংক" },
  { id: "Islami Bank Bangladesh", name_en: "Islami Bank Bangladesh", name_bn: "ইসলামী ব্যাংক বাংলাদেশ" },
  { id: "Dutch-Bangla Bank", name_en: "Dutch-Bangla Bank", name_bn: "ডাচ্-বাংলা ব্যাংক" },
  { id: "The City Bank", name_en: "The City Bank", name_bn: "দ্য সিটি ব্যাংক" },
  { id: "BRAC Bank", name_en: "BRAC Bank", name_bn: "ব্র্যাক ব্যাংক" },
  { id: "Other", name_en: "Other Bank", name_bn: "অন্যান্য ব্যাংক" },
];

export function QuickCollectModal() {
  const { t, locale } = useTranslation();
  const {
    isQuickCollectOpen,
    setIsQuickCollectOpen,
    quickCollectInitialData,
    markets,
    selectedMonth,
    selectedYear,
    currentUser,
    triggerRefresh,
    showReceipt,
  } = useApp();

  const [marketId, setMarketId] = useState<string>("");
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [amountBDT, setAmountBDT] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBill, setActiveBill] = useState<any | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Staff (Received by) state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [receivedById, setReceivedById] = useState<string>("");

  // Payment Channel States
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [senderNumber, setSenderNumber] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("Islami Bank Bangladesh");
  const [customBankName, setCustomBankName] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");

  // Fetch active staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/users?activeStaff=true");
        if (res.ok) {
          const data = await res.json();
          const users = data.users || [];
          setStaffList(users);
        }
      } catch (e) {
        console.warn("Could not fetch staff users:", e);
      }
    };
    if (isQuickCollectOpen) {
      fetchStaff();
    }
  }, [isQuickCollectOpen]);

  // Set default received by to logged in user
  useEffect(() => {
    if (currentUser?.id) {
      setReceivedById(currentUser.id);
    }
  }, [currentUser, isQuickCollectOpen]);

  // Fetch configured payment accounts for BKASH / NAGAD / BANK
  useEffect(() => {
    if (paymentMethod === "BKASH" || paymentMethod === "NAGAD" || paymentMethod === "BANK") {
      const fetchAccounts = async () => {
        try {
          const res = await fetch(`/api/payment-accounts?accountType=${paymentMethod}&active=true`);
          if (res.ok) {
            const data = await res.json();
            const accs = data.accounts || [];
            setPaymentAccounts(accs);
            if (accs.length > 0) {
              setSelectedAccountId(accs[0].id);
            } else {
              setSelectedAccountId("");
            }
          }
        } catch (e) {
          console.warn("Could not fetch payment accounts:", e);
        }
      };
      fetchAccounts();
    } else {
      setSelectedAccountId("");
    }
  }, [paymentMethod, isQuickCollectOpen]);

  // Helper to load bills for a specific shop
  const loadBillsForShop = async (shopId: string, preferredBillId?: string, isCancelled = false) => {
    if (!shopId) {
      setBills([]);
      setSelectedBillId("");
      setActiveBill(null);
      setAmountBDT(0);
      return;
    }

    try {
      setIsLoadingData(true);
      const res = await fetch(`/api/billing?shopId=${shopId}&status=ALL`);
      if (res.ok) {
        const data = await res.json();
        if (isCancelled) return;
        const shopBills = data.bills || [];
        setBills(shopBills);

        let chosenBill: any = null;
        if (preferredBillId) {
          chosenBill = shopBills.find((b: any) => b.id === preferredBillId);
        }
        if (!chosenBill) {
          chosenBill = shopBills.find((b: any) => b.dueAmount > 0) || shopBills[0] || null;
        }

        if (chosenBill) {
          setSelectedBillId(chosenBill.id);
          setActiveBill(chosenBill);
          setAmountBDT(Math.round(chosenBill.dueAmount / 100));
        } else {
          setSelectedBillId("");
          setActiveBill(null);
          setAmountBDT(0);
        }
      }
    } catch (e) {
      console.error("Failed to load bills for shop:", e);
    } finally {
      if (!isCancelled) {
        setIsLoadingData(false);
      }
    }
  };

  // Coordinated loader on modal open or initial data change
  useEffect(() => {
    if (!isQuickCollectOpen) {
      setIsLoadingData(false);
      return;
    }

    let isCancelled = false;

    const initData = async () => {
      setIsLoadingData(true);

      // 1. Instantly prefill dueAmount if provided
      if (quickCollectInitialData?.dueAmount && quickCollectInitialData.dueAmount > 0) {
        setAmountBDT(Math.round(quickCollectInitialData.dueAmount / 100));
      } else {
        setAmountBDT(0);
      }

      let resolvedMarketId = quickCollectInitialData?.marketId || "";
      const targetShopId = quickCollectInitialData?.shopId || "";
      const targetBillId = quickCollectInitialData?.billId || "";

      // 2. If shopId is provided but marketId is missing or "ALL", resolve market from shop
      if (targetShopId && (!resolvedMarketId || resolvedMarketId === "ALL")) {
        try {
          const shopRes = await fetch(`/api/shops?shopId=${targetShopId}`);
          if (shopRes.ok) {
            const shopData = await shopRes.json();
            const foundShop = (shopData.shops || []).find((s: any) => s.id === targetShopId) || shopData.shops?.[0];
            if (foundShop?.marketId) {
              resolvedMarketId = foundShop.marketId;
            }
          }
        } catch (e) {
          console.warn("Could not resolve market from shopId:", e);
        }
      }

      // 3. Fallback to first market if still not resolved
      if (!resolvedMarketId || resolvedMarketId === "ALL") {
        if (markets.length > 0) {
          resolvedMarketId = markets[0].id;
        }
      }

      if (isCancelled) return;
      setMarketId(resolvedMarketId);

      // 4. Fetch occupied shops for this market
      let occupiedShops: any[] = [];
      if (resolvedMarketId) {
        try {
          const res = await fetch(`/api/shops?marketId=${resolvedMarketId}&status=OCCUPIED`);
          if (res.ok) {
            const data = await res.json();
            occupiedShops = data.shops || [];
          }
        } catch (e) {
          console.error("Could not fetch occupied shops:", e);
        }
      }

      if (isCancelled) return;
      setShops(occupiedShops);

      // 5. Select target shop or fallback to first shop in the market
      let finalShopId = targetShopId;
      if (!finalShopId || !occupiedShops.some((s) => s.id === finalShopId)) {
        finalShopId = occupiedShops[0]?.id || "";
      }
      setSelectedShopId(finalShopId);

      // 6. Fetch bills for the selected shop
      if (finalShopId) {
        await loadBillsForShop(finalShopId, targetBillId, isCancelled);
      } else {
        setBills([]);
        setSelectedBillId("");
        setActiveBill(null);
        setAmountBDT(0);
        if (!isCancelled) {
          setIsLoadingData(false);
        }
      }
    };

    initData();

    return () => {
      isCancelled = true;
    };
  }, [isQuickCollectOpen, quickCollectInitialData, markets]);

  // Handle manual market change by user
  const handleMarketChange = async (newMarketId: string) => {
    setMarketId(newMarketId);
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/shops?marketId=${newMarketId}&status=OCCUPIED`);
      if (res.ok) {
        const data = await res.json();
        const newShops = data.shops || [];
        setShops(newShops);
        const firstShopId = newShops[0]?.id || "";
        setSelectedShopId(firstShopId);
        if (firstShopId) {
          await loadBillsForShop(firstShopId);
        } else {
          setBills([]);
          setSelectedBillId("");
          setActiveBill(null);
          setAmountBDT(0);
          setIsLoadingData(false);
        }
      }
    } catch (e) {
      setIsLoadingData(false);
    }
  };

  // Handle manual shop change by user
  const handleShopChange = async (newShopId: string) => {
    setSelectedShopId(newShopId);
    await loadBillsForShop(newShopId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillId) {
      toast.error(locale === "bn" ? "বকেয়া ইনভয়েস নির্বাচন করুন" : "Please select an invoice with due balance");
      return;
    }
    if (amountBDT <= 0) {
      toast.error(t("validation.positiveNumber"));
      return;
    }

    // Channel validation
    if ((paymentMethod === "BKASH" || paymentMethod === "NAGAD") && paymentAccounts.length > 0 && !selectedAccountId) {
      toast.error(locale === "bn" ? "গ্রহীতা একাউন্ট নির্বাচন করুন" : "Please select a receiving account");
      return;
    }

    const finalBankName =
      paymentMethod === "BANK" || paymentMethod === "CHEQUE"
        ? selectedBank === "Other"
          ? customBankName.trim()
          : selectedBank
        : undefined;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBillId,
          amount: Math.round(amountBDT * 100),
          method: paymentMethod,
          receivedById: receivedById || currentUser?.id,
          paymentAccountId: selectedAccountId || undefined,
          transactionRef: transactionRef.trim() || undefined,
          senderNumber: senderNumber.trim() || undefined,
          bankName: finalBankName,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record payment");
        return;
      }

      toast.success(t("collections.paymentSaved"));
      triggerRefresh("collections");
      setIsQuickCollectOpen(false);

      if (data.receipt) {
        showReceipt(data.receipt);
      }
    } catch (e) {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCollectorOnly = currentUser?.role === "COLLECTOR" || currentUser?.role === "OPERATOR";

  return (
    <Dialog
      isOpen={isQuickCollectOpen}
      onClose={() => setIsQuickCollectOpen(false)}
      title={t("collections.collectPayment")}
      description={t("collections.subtitle")}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Market */}
        <SearchableSelect
          label={t("collections.selectMarket")}
          value={marketId}
          onChange={(val) => handleMarketChange(val)}
          options={markets.map((m) => ({
            value: m.id,
            label: m.name,
            sublabel: `${m.totalShops || 0} ${locale === "bn" ? "দোকান" : "Shops"}`,
          }))}
          placeholder={t("collections.selectMarket")}
          searchPlaceholder={locale === "bn" ? "মার্কেট খুঁজুন..." : "Search market..."}
        />

        {/* Select Shop & Tenant */}
        <SearchableSelect
          label={t("collections.selectShop")}
          value={selectedShopId}
          onChange={(val) => handleShopChange(val)}
          options={shops.map((s) => ({
            value: s.id,
            label: `${s.shopNumber} - ${s.tenant?.name || (locale === "bn" ? "কোনো ভাড়াটিয়া নেই" : "No tenant")}`,
            sublabel: `${formatFloorName(s.floor, locale)}${s.tenant?.phone ? ` • ${s.tenant.phone}` : ""}`,
          }))}
          placeholder={t("collections.selectShop")}
          searchPlaceholder={locale === "bn" ? "দোকান বা ভাড়াটিয়া খুঁজুন..." : "Search shop or tenant..."}
          disabled={shops.length === 0}
        />

        {/* Multi-Invoice Selector if shop has multiple bills */}
        {bills.length > 1 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {locale === "bn" ? "মাসের বিল / ইনভয়েস নির্বাচন" : "Select Due Bill Month"}
            </label>
            <Select
              value={selectedBillId}
              onChange={(e) => {
                const bId = e.target.value;
                setSelectedBillId(bId);
                const found = bills.find((b) => b.id === bId);
                if (found) {
                  setActiveBill(found);
                  setAmountBDT(Math.round(found.dueAmount / 100));
                }
              }}
              className="text-xs font-semibold"
            >
              {bills.map((b) => (
                <option key={b.id} value={b.id}>
                  {locale === "bn" ? toBanglaDigits(b.month) : b.month}/{locale === "bn" ? toBanglaDigits(b.year) : b.year} — {locale === "bn" ? "বকেয়া:" : "Due:"} {formatCurrency(b.dueAmount, locale)} {b.status === "PAID" ? `(${locale === "bn" ? "পরিশোধিত" : "PAID"})` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Invoice Summary Card */}
        {isLoadingData ? (
          <div className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black flex items-center justify-center gap-2.5 py-6 text-black dark:text-white font-bold text-xs shadow-[2px_2px_0px_#000000]">
            <div className="w-4 h-4 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            <span>{locale === "bn" ? "ভাড়া ও বিলের তথ্য নির্ভুলভাবে লোড হচ্ছে..." : "Loading rent and bill data accurately..."}</span>
          </div>
        ) : activeBill ? (
          <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black text-xs md:text-sm space-y-1.5 shadow-[2px_2px_0px_#000000]">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-bold">{t("billing.billDetails")}:</span>
              <span className="font-black text-black dark:text-white">
                {locale === "bn" ? toBanglaDigits(activeBill.month) : activeBill.month}/
                {locale === "bn" ? toBanglaDigits(activeBill.year) : activeBill.year}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-bold">{t("billing.totalBill")}:</span>
              <span className="font-black text-black dark:text-white">{formatCurrency(activeBill.totalAmount, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-bold">{t("billing.paidAmount")}:</span>
              <span className="font-black text-[#00BA88]">
                {formatCurrency(activeBill.paidAmount, locale)}
              </span>
            </div>
            {activeBill.billItems && activeBill.billItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5 pb-0.5 border-t border-black/10 dark:border-white/10 text-[11px]">
                <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">
                  {locale === "bn" ? "মূল ভাড়া" : "Rent"}: {formatCurrency(activeBill.rentAmount, locale)}
                </span>
                {activeBill.billItems.map((item: any) => (
                  <span
                    key={item.id}
                    className="bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800"
                  >
                    {item.description}: {formatCurrency(item.amount, locale)}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-1 border-t-2 border-black/10 dark:border-white/10 font-black text-sm">
              <span className="text-[#FF4B55]">{t("collections.totalDue")}:</span>
              <span className="text-[#FF4B55]">
                {formatCurrency(activeBill.dueAmount, locale)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#FFEBEF] dark:bg-[#2A1417] text-black dark:text-white text-xs flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_#000000]">
            <span className="font-bold">{locale === "bn" ? "এই দোকানের কোনো অপরিশোধিত বকেয়া ইনভয়েস নেই।" : "No pending due invoice for this shop."}</span>
            {selectedShopId && (
              <span className="font-black text-[11px] bg-[#00BA88] text-white px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_#000000]">
                {locale === "bn" ? "পরিশোধিত" : "Settled"}
              </span>
            )}
          </div>
        )}

        {/* Payment Amount & Received by Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
              {t("collections.paymentAmount")} (৳ BDT) *
            </label>
            <NumberInput
              value={amountBDT}
              onChange={(val) => setAmountBDT(val)}
              prefix="৳"
              placeholder="0"
              className="text-lg font-black text-black dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5 flex items-center justify-between">
              <span>{locale === "bn" ? "আদায়কারী (Received by) *" : "Received by *"}</span>
              {isCollectorOnly && (
                <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold lowercase">(only self)</span>
              )}
            </label>
            <Select
              value={receivedById}
              onChange={(e) => setReceivedById(e.target.value)}
              disabled={isCollectorOnly}
              className="font-bold text-xs"
            >
              {staffList.length > 0 ? (
                staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === "ADMIN" ? "Admin" : s.role === "MANAGER" ? "Manager" : "Collector"})
                  </option>
                ))
              ) : (
                <option value={currentUser?.id || ""}>
                  {currentUser?.name || "Current User"} ({currentUser?.role})
                </option>
              )}
            </Select>
          </div>
        </div>

        {/* Payment Channel Selector */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-black dark:text-white mb-1.5">
            {locale === "bn" ? "পেমেন্ট মাধ্যম (Payment Channel)" : "Payment Channel"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "CASH", label_bn: "ক্যাশ", label_en: "Cash" },
              { id: "BKASH", label_bn: "বিকাশ", label_en: "bKash" },
              { id: "NAGAD", label_bn: "নগদ", label_en: "Nagad" },
              { id: "BANK", label_bn: "ব্যাংক", label_en: "Bank" },
              { id: "CHEQUE", label_bn: "চেক", label_en: "Cheque" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer text-center ${
                  paymentMethod === m.id
                    ? "bg-[#FED734] text-black shadow-[2px_2px_0px_#000000]"
                    : "bg-white dark:bg-[#262830] text-black dark:text-white hover:bg-[#FED734]/30 dark:hover:bg-[#2D2F39] shadow-[1px_1px_0px_#000000]"
                }`}
              >
                {locale === "bn" ? m.label_bn : m.label_en}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional Channel Details: bKash / Nagad */}
        {(paymentMethod === "BKASH" || paymentMethod === "NAGAD") && (
          <div className="p-3.5 rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50/50 dark:bg-pink-950/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-pink-900 dark:text-pink-300">
              <Smartphone className="w-4 h-4 text-pink-600" />
              <span>{paymentMethod} একাউন্ট ও লেনদেনের বিবরণ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  গ্রহীতা একাউন্ট (Receiving Account) *
                </label>
                {paymentAccounts.length > 0 ? (
                  <Select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                  >
                    {paymentAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name_bn || acc.name_en} ({acc.number})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="p-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-900">
                    সেটিংস &gt; পেমেন্ট অ্যাকাউন্ট থেকে {paymentMethod} নম্বর কনফিগার করুন
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ট্রানজেকশন আইডি (TrxID)
                </label>
                <Input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. 9B8A7X6Y5Z"
                  className="font-mono uppercase text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  প্রেরকের মোবাইল নম্বর (Sender Number)
                </label>
                <Input
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Conditional Channel Details: Bank or Cheque */}
        {(paymentMethod === "BANK" || paymentMethod === "CHEQUE") && (
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Landmark className="w-4 h-4 text-blue-600" />
              <span>{paymentMethod === "BANK" ? "ব্যাংক ট্রান্সফার" : "চেক পেমেন্ট"} বিবরণ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ব্যাংকের নাম (Bank) *
                </label>
                <Select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  required
                >
                  {STANDARD_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {locale === "bn" ? b.name_bn : b.name_en}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedBank === "Other" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    অন্য ব্যাংকের নাম *
                  </label>
                  <Input
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    placeholder="e.g. পূবালী ব্যাংক"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  শাখা বা একাউন্ট (Branch / Account)
                </label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. মতিঝিল শাখা"
                />
              </div>

              <div className={selectedBank === "Other" ? "col-span-1 sm:col-span-2" : ""}>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {paymentMethod === "CHEQUE" ? "চেক নম্বর (Cheque No.) *" : "রেফারেন্স নম্বর (Ref No.)"}
                </label>
                <Input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. CHQ-882910"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("common.notes")} ({t("common.optional")})
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. অর্ধেক ক্যাশ বাকি বিকাশ"
          />
        </div>

        {/* Submit button */}
        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsQuickCollectOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isLoadingData || isSubmitting || !selectedBillId}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {t("collections.collectPayment")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
