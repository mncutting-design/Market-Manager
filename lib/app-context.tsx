"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface MarketSummary {
  id: string;
  name: string;
  address: string | null;
  totalShops: number;
  occupiedShops: number;
  vacantShops: number;
  monthlyExpected: number;
}

interface AppContextType {
  selectedMarketId: string;
  setSelectedMarketId: (id: string) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  markets: MarketSummary[];
  isLoadingMarkets: boolean;
  refreshMarkets: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  // Modal states
  isQuickCollectOpen: boolean;
  setIsQuickCollectOpen: (open: boolean) => void;
  quickCollectInitialData: { marketId?: string; shopId?: string; billId?: string; dueAmount?: number } | null;
  openQuickCollect: (data?: { marketId?: string; shopId?: string; billId?: string; dueAmount?: number }) => void;
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
  openAddExpense: (marketId?: string) => void;
  isGenerateBillsOpen: boolean;
  setIsGenerateBillsOpen: (open: boolean) => void;
  openGenerateBills: () => void;
  activeReceipt: any | null;
  setActiveReceipt: (receipt: any | null) => void;
  showReceipt: (receipt: any) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [selectedMarketId, setSelectedMarketId] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Default to current seeded month
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Modals
  const [isQuickCollectOpen, setIsQuickCollectOpen] = useState(false);
  const [quickCollectInitialData, setQuickCollectInitialData] = useState<any>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isGenerateBillsOpen, setIsGenerateBillsOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  const fetchMarkets = async () => {
    try {
      setIsLoadingMarkets(true);
      const res = await fetch("/api/markets");
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.markets || []);
      }
    } catch (e) {
      console.error("Failed to load markets:", e);
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [refreshKey]);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const openQuickCollect = (data?: { marketId?: string; shopId?: string; billId?: string; dueAmount?: number }) => {
    setQuickCollectInitialData(data || null);
    setIsQuickCollectOpen(true);
  };

  const openAddExpense = (marketId?: string) => {
    setIsAddExpenseOpen(true);
  };

  const openGenerateBills = () => {
    setIsGenerateBillsOpen(true);
  };

  const showReceipt = (receipt: any) => {
    setActiveReceipt(receipt);
  };

  return (
    <AppContext.Provider
      value={{
        selectedMarketId,
        setSelectedMarketId,
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        markets,
        isLoadingMarkets,
        refreshMarkets: fetchMarkets,
        refreshKey,
        triggerRefresh,
        activeTab,
        setActiveTab,
        isQuickCollectOpen,
        setIsQuickCollectOpen,
        quickCollectInitialData,
        openQuickCollect,
        isAddExpenseOpen,
        setIsAddExpenseOpen,
        openAddExpense,
        isGenerateBillsOpen,
        setIsGenerateBillsOpen,
        openGenerateBills,
        activeReceipt,
        setActiveReceipt,
        showReceipt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
