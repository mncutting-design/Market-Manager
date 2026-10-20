"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { broadcastMutation } from "./realtime-sync";

export interface MarketSummary {
  id: string;
  name: string;
  address: string | null;
  notes?: string | null;
  totalFloors?: number;
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
  triggerRefresh: (tag?: string) => void;
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
  // Change Password Modal
  isChangePasswordOpen: boolean;
  setIsChangePasswordOpen: (open: boolean) => void;
  openChangePassword: () => void;
  // User Session & Approvals
  currentUser: { id: string; name: string; email: string; role: string; locale: string } | null;
  isAdmin: boolean;
  pendingApprovalsCount: number;
  refreshApprovals: () => Promise<void>;
  isApprovalsOpen: boolean;
  setIsApprovalsOpen: (open: boolean) => void;
  openApprovals: () => void;
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

  // User & Approvals State
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; locale: string } | null>({
    id: "user-nazrul-admin-2026",
    name: "NAZRUL",
    email: "nazrul@rentpro.internal",
    role: "ADMIN",
    locale: "bn",
  });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);

  // Modals
  const [isQuickCollectOpen, setIsQuickCollectOpen] = useState(false);
  const [quickCollectInitialData, setQuickCollectInitialData] = useState<any>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isGenerateBillsOpen, setIsGenerateBillsOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const openChangePassword = () => {
    setIsChangePasswordOpen(true);
  };

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

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
    } catch (e) {
      console.warn("Could not fetch current user:", e);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals?status=PENDING");
      if (res.ok) {
        const data = await res.json();
        setPendingApprovalsCount(data.pendingCount || 0);
      }
    } catch (e) {
      console.warn("Could not fetch approvals count:", e);
    }
  };

  useEffect(() => {
    fetchMarkets();
    fetchCurrentUser();
    fetchApprovals();
  }, [refreshKey]);

  // Periodic heartbeat telemetry: tracks online presence and immediately detects if admin deactivated account
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/auth/heartbeat", { method: "POST" });
        if (res.status === 401) {
          window.location.reload();
        }
      } catch {}
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 45000);
    return () => clearInterval(heartbeatInterval);
  }, []);


  const triggerRefresh = (tag: string = "ALL") => {
    setRefreshKey((prev) => prev + 1);
    broadcastMutation(tag);
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

  const openApprovals = () => {
    setIsApprovalsOpen(true);
  };

  const showReceipt = (receipt: any) => {
    setActiveReceipt(receipt);
  };

  const isAdmin = currentUser?.role === "ADMIN";

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
        isChangePasswordOpen,
        setIsChangePasswordOpen,
        openChangePassword,
        currentUser,
        isAdmin,
        pendingApprovalsCount,
        refreshApprovals: fetchApprovals,
        isApprovalsOpen,
        setIsApprovalsOpen,
        openApprovals,
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
