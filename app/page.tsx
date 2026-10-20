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
import { ChangePasswordModal } from "@/components/features/modals/change-password-modal";
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
import { UsersView } from "@/components/features/users-view";
import { SettingsView } from "@/components/features/settings-view";
import { PremiumLoader } from "@/components/ui/premium-loader";

function MainApp() {
  const {
    activeTab,
    isChangePasswordOpen,
    setIsChangePasswordOpen,
    currentUser,
  } = useApp();
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab || "dashboard"]));

  useEffect(() => {
    if (activeTab) {
      setVisitedTabs((prev) => {
        if (prev.has(activeTab)) return prev;
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
    }
  }, [activeTab]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area — Instantaneous Tab Switching */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        <div className={activeTab === "dashboard" ? "block" : "hidden"}>
          {visitedTabs.has("dashboard") && <DashboardView />}
        </div>
        <div className={activeTab === "markets" ? "block" : "hidden"}>
          {visitedTabs.has("markets") && <MarketsView />}
        </div>
        <div className={activeTab === "shops" ? "block" : "hidden"}>
          {visitedTabs.has("shops") && <ShopsView />}
        </div>
        <div className={activeTab === "billing" ? "block" : "hidden"}>
          {visitedTabs.has("billing") && <BillingView />}
        </div>
        <div className={activeTab === "collections" ? "block" : "hidden"}>
          {visitedTabs.has("collections") && <CollectionsView />}
        </div>
        <div className={activeTab === "dues" ? "block" : "hidden"}>
          {visitedTabs.has("dues") && <DuesView />}
        </div>
        <div className={activeTab === "expenses" ? "block" : "hidden"}>
          {visitedTabs.has("expenses") && <ExpensesView />}
        </div>
        <div className={activeTab === "reports" ? "block" : "hidden"}>
          {visitedTabs.has("reports") && <ReportsView />}
        </div>
        <div className={activeTab === "users" ? "block" : "hidden"}>
          {visitedTabs.has("users") && <UsersView />}
        </div>
        <div className={activeTab === "settings" ? "block" : "hidden"}>
          {visitedTabs.has("settings") && <SettingsView />}
        </div>
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
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userName={currentUser?.name || "NAZRUL"}
      />
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
