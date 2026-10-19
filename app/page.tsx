"use client";

import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "@/lib/app-context";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingActionButton } from "@/components/layout/fab";
import { QuickCollectModal } from "@/components/features/modals/quick-collect-modal";
import { MoneyReceiptModal } from "@/components/features/modals/money-receipt-modal";
import { GenerateBillsModal } from "@/components/features/modals/generate-bills-modal";
import { AddExpenseModal } from "@/components/features/modals/add-expense-modal";
import { ApprovalsModal } from "@/components/features/modals/approvals-modal";
import { LoginView } from "@/components/features/login-view";

// Feature Views
import { DashboardView } from "@/components/features/dashboard-view";
import { MarketsView } from "@/components/features/markets-view";
import { ShopsView } from "@/components/features/shops-view";
import { BillingView } from "@/components/features/billing-view";
import { CollectionsView } from "@/components/features/collections-view";
import { DuesView } from "@/components/features/dues-view";
import { ExpensesView } from "@/components/features/expenses-view";
import { ReportsView } from "@/components/features/reports-view";
import { SettingsView } from "@/components/features/settings-view";
import { PremiumLoader } from "@/components/ui/premium-loader";

function MainApp() {
  const { activeTab } = useApp();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "markets" && <MarketsView />}
        {activeTab === "shops" && <ShopsView />}
        {activeTab === "billing" && <BillingView />}
        {activeTab === "collections" && <CollectionsView />}
        {activeTab === "dues" && <DuesView />}
        {activeTab === "expenses" && <ExpensesView />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "settings" && <SettingsView />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Floating Action Button for Quick Actions */}
      <FloatingActionButton />

      {/* Modals & Dialogs */}
      <QuickCollectModal />
      <MoneyReceiptModal />
      <GenerateBillsModal />
      <AddExpenseModal />
      <ApprovalsModal />
    </div>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoaderDone, setIsLoaderDone] = useState(false);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(!!data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (!isLoaderDone || isAuthenticated === null) {
    return (
      <PremiumLoader
        minDuration={900}
        onFinished={() => setIsLoaderDone(true)}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#101726] text-slate-900 dark:text-white transition-colors">
        <TopBar />
        <MainApp />
      </div>
    </AppProvider>
  );
}
