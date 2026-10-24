"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Trash2,
  Edit3,
  Search,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Layers,
  ChevronDown,
  ChevronUp,
  Radio,
  Clock,
  Sparkles,
  ShieldAlert,
  Power,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_DEFINITIONS, UserRole } from "@/lib/permissions";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  isOnline?: boolean;
  lastActiveAgo_bn?: string;
  lastActiveAgo_en?: string;
  lastActiveAt?: string;
  createdAt?: string;
}

export function UsersView() {
  const { locale } = useTranslation();
  const { currentUser, openChangePassword } = useApp();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showMatrix, setShowMatrix] = useState(false);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [adminResetTargetUser, setAdminResetTargetUser] = useState<UserItem | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [statusToggleTarget, setStatusToggleTarget] = useState<UserItem | null>(null);

  // Add User Form State (Strictly username + password + role, NO email!)
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("MANAGER");
  const [newUserActive, setNewUserActive] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Admin Reset Password State
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Role Edit Inline
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState<UserRole>("MANAGER");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        const cleanList = (data.users || []).filter(
          (u: UserItem) =>
            u.email !== "admin@marketmanager.com" &&
            u.name !== "প্রশাসক (Admin)"
        );
        setUsers(cleanList);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Refresh user list & online status every 30 seconds
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Add New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPassword) {
      toast.error(
        locale === "bn"
          ? "ইউজারনেম এবং পাসওয়ার্ড উভয়ই আবশ্যক"
          : "Username and password are required"
      );
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUserName.trim(),
          phone: newUserPhone.trim() || undefined,
          password: newUserPassword,
          role: newUserRole,
          isActive: newUserActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create user");
        return;
      }

      toast.success(
        locale === "bn"
          ? `'${data.user?.name}' ব্যবহারকারী সফলভাবে তৈরি হয়েছে!`
          : `User '${data.user?.name}' created successfully!`
      );
      setNewUserName("");
      setNewUserPhone("");
      setNewUserPassword("");
      setNewUserRole("MANAGER");
      setNewUserActive(true);
      setIsAddUserOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to create user");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Admin Password Reset (For any user who forgot password)
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminResetTargetUser) return;
    if (!resetNewPassword || resetNewPassword.length < 4) {
      toast.error(
        locale === "bn"
          ? "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে"
          : "Password must be at least 4 characters long"
      );
      return;
    }

    try {
      setIsSubmittingReset(true);
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: adminResetTargetUser.id,
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }

      toast.success(
        locale === "bn"
          ? `'${adminResetTargetUser.name}' এর পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!`
          : `Password for '${adminResetTargetUser.name}' updated successfully!`
      );
      setAdminResetTargetUser(null);
      setResetNewPassword("");
    } catch (err) {
      toast.error("Failed to reset password");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Active / Inactive Status Toggle
  const handleToggleStatus = async () => {
    if (!statusToggleTarget) return;
    const targetId = statusToggleTarget.id;
    const newStatus = !statusToggleTarget.isActive;

    try {
      setIsUpdatingStatus(true);
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          isActive: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }

      toast.success(
        locale === "bn"
          ? `'${statusToggleTarget.name}' অ্যাকাউন্টটি এখন ${newStatus ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Inactive)"}!`
          : `User '${statusToggleTarget.name}' is now ${newStatus ? "Active" : "Inactive"}!`
      );
      setStatusToggleTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update user status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Role Change
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
        return;
      }

      toast.success(
        locale === "bn" ? "ব্যবহারকারীর রোল পরিবর্তন হয়েছে" : "Role updated successfully"
      );
      setEditingRoleId(null);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;

    try {
      const res = await fetch(`/api/users?id=${deleteTargetUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success(
        locale === "bn"
          ? `'${deleteTargetUser.name}' ব্যবহারকারী মুছে ফেলা হয়েছে`
          : `User '${deleteTargetUser.name}' deleted successfully`
      );
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  // Filtering users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? u.isActive !== false
        : u.isActive === false;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const managerCount = users.filter((u) => u.role === "MANAGER" || u.role === "OPERATOR").length;
  const onlineCount = users.filter((u) => u.isOnline).length;
  const inactiveCount = users.filter((u) => u.isActive === false).length;

  // -------------------------------------------------------------
  // NON-ADMIN VIEW: ONLY SHOW THEIR OWN NAME & PROFILE
  // (Requirement: WITHOUT ADMIN ALL USER ONLY SHOW THEIR OWN NAME IN USER PAGE)
  // -------------------------------------------------------------
  if (!isAdmin) {
    const selfUser = users[0] || {
      id: currentUser?.id || "my-id",
      name: currentUser?.name || "User",
      email: currentUser?.email || "user@internal",
      role: (currentUser?.role as UserRole) || "MANAGER",
      isActive: true,
      isOnline: true,
    };
    const def = ROLE_DEFINITIONS[selfUser.role] || ROLE_DEFINITIONS.MANAGER;

    return (
      <div className="space-y-6 max-w-2xl mx-auto py-4 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>{locale === "bn" ? "আমার অ্যাকাউন্ট ও নিরাপত্তা" : "My Account & Profile"}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {locale === "bn"
                ? "আপনার ব্যক্তিগত অ্যাকাউন্ট বিবরণী এবং পাসওয়ার্ড পরিবর্তন সুবিধা।"
                : "Your personal account profile details and security management."}
            </p>
          </div>

          <Button
            size="sm"
            onClick={openChangePassword}
            className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm"
          >
            <KeyRound className="w-4 h-4 mr-1.5" />
            <span>{locale === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}</span>
          </Button>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FED734] border-2 border-black text-black font-black text-2xl flex items-center justify-center shadow-[3px_3px_0px_#000000] shrink-0">
              {selfUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-black dark:text-white">
                  {selfUser.name}
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#00BA88] text-white border border-black shadow-[1px_1px_0px_#000000]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {locale === "bn" ? "অনলাইন" : "Online"}
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-400 mt-0.5">
                @{selfUser.name.toLowerCase().replace(/\s+/g, "")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-black/10 dark:border-white/10">
            <div className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000]">
              <p className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                {locale === "bn" ? "আপনার রোল (Role)" : "Your Assigned Role"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${def.badgeColor}`}>
                  {selfUser.role}
                </span>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">
                  {locale === "bn" ? def.label_bn : def.label_en}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000]">
              <p className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                {locale === "bn" ? "লগইন স্ট্যাটাস" : "Account Status"}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-black text-[#00BA88]">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{locale === "bn" ? "সক্রিয় (Active)" : "Active"}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FED734]/20 dark:bg-[#FED734]/10 border-2 border-black shadow-[2px_2px_0px_#000000] text-xs text-black dark:text-white space-y-1">
            <p className="font-black flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-black dark:text-[#FED734] stroke-[2.5]" />
              <span>{locale === "bn" ? "নিরাপত্তা ও গোপনীয়তা বিজ্ঞপ্তি" : "Privacy & Security Notice"}</span>
            </p>
            <p className="text-[11px] leading-relaxed text-gray-800 dark:text-gray-300 font-bold">
              {locale === "bn"
                ? "সিস্টেমের প্রাতিষ্ঠানিক গোপনীয়তা নীতি অনুযায়ী কেবল নিজের অ্যাকাউন্ট তথ্য দৃশ্যমান। অন্য ব্যবহারকারীদের তালিকা ও নিয়ন্ত্রণ কেবল সুপার অ্যাডমিন কর্তৃক নিয়ন্ত্রিত।"
                : "In accordance with institutional security policies, non-administrator users only view their own account profile. Full user roster and system roles are administered exclusively by Super Admin."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN VIEW: FULL CONTROL, WHO IS ONLINE, LAST TIME AGO, ACTIVE/INACTIVE
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
            <span>
              {locale === "bn" ? "ব্যবহারকারী ও নিরাপত্তা ব্যবস্থাপনা" : "Users & Access Control"}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-bold mt-1">
            {locale === "bn"
              ? "সিস্টেম ইউজার তৈরি, একটিভ/নিষ্ক্রিয় নিয়ন্ত্রণ, অনলাইন উপস্থিতি ও পাসওয়ার্ড রিসেট।"
              : "User provisioning, active/inactive login gating, online telemetry, and role architecture."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="cursor-pointer font-black"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {/* User can change own password anytime */}
          <Button
            variant="outline"
            size="sm"
            onClick={openChangePassword}
            className="cursor-pointer font-black"
          >
            <KeyRound className="w-4 h-4 mr-1.5 text-black dark:text-white stroke-[2.5]" />
            <span>{locale === "bn" ? "আমার পাসওয়ার্ড" : "My Password"}</span>
          </Button>

          {/* Admin Add User */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddUserOpen(true)}
            className="font-black cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            <span>{locale === "bn" ? "নতুন ইউজার যোগ করুন" : "Add User"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Telemetry & Statistics - 100% Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000]">
          <p className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-wider truncate">
            {locale === "bn" ? "মোট ব্যবহারকারী" : "Total Users"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-black dark:text-white mt-1">
            {totalCount}
          </p>
        </div>

        {/* Live Online Telemetry */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-[#00BA88] uppercase tracking-wider truncate">
              {locale === "bn" ? "অনলাইন ব্যবহারকারী" : "Online Users"}
            </p>
            <span className="w-2 h-2 rounded-full bg-[#00BA88] animate-ping shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#00BA88] mt-1 flex items-center gap-1.5 truncate">
            <span>{onlineCount}</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {locale === "bn" ? "সক্রিয়" : "active"}
            </span>
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000]">
          <p className="text-[10px] font-black text-[#00BCD4] uppercase tracking-wider truncate">
            {locale === "bn" ? "সুপার এডমিন" : "Super Admins"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-black dark:text-white mt-1">
            {adminCount}
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000]">
          <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-wider truncate">
            {locale === "bn" ? "ম্যানেজার ও স্টাফ" : "Staff & Ops"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-black dark:text-white mt-1">
            {managerCount}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000]">
          <p className="text-[10px] font-black text-[#FF4B55] uppercase tracking-wider truncate">
            {locale === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive Users"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-[#FF4B55] mt-1">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000]">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === "bn" ? "ইউজারনেম বা রোল খুঁজুন..." : "Search by username or role..."}
            prefixIcon={<Search className="w-4 h-4 stroke-[2.5]" />}
            className="h-10 text-xs font-bold"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-black dark:text-white">
              {locale === "bn" ? "স্ট্যাটাস:" : "Status:"}
            </span>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs font-bold min-w-[110px]"
            >
              <option value="ALL">{locale === "bn" ? "সব স্ট্যাটাস" : "All Status"}</option>
              <option value="ACTIVE">{locale === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
              <option value="INACTIVE">{locale === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-black dark:text-white">
              {locale === "bn" ? "রোল:" : "Role:"}
            </span>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 text-xs font-bold min-w-[110px]"
            >
              <option value="ALL">{locale === "bn" ? "সব রোল" : "All Roles"}</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="VIEWER">VIEWER</option>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. Active Users Grid with Telemetry & Active/Inactive Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
            {locale === "bn" ? "নিবন্ধিত অ্যাকাউন্ট তালিকা" : "Registered User Accounts"} ({filteredUsers.length})
          </h2>
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-400">
            {locale === "bn" ? "প্রতি ৩০ সেকেন্ডে স্বয়ংক্রিয় রিফ্রেশ হয়" : "Live updates every 30s"}
          </span>
        </div>

        {isLoading && users.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-700 dark:text-gray-400 font-bold">Loading user roster...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#1E1F24] border-2 border-black shadow-[3px_3px_0px_#000000] text-center text-xs text-gray-700 dark:text-gray-400 font-bold">
            {locale === "bn" ? "কোন ব্যবহারকারী পাওয়া যায়নি" : "No users matching query"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredUsers.map((u) => {
              const isNazrul = u.name.toUpperCase() === "NAZRUL" || u.email.includes("nazrul");
              const isSelf = currentUser?.id === u.id || currentUser?.name === u.name;
              const def = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.ADMIN;
              const isEditingRole = editingRoleId === u.id;
              const isActive = u.isActive !== false;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 group ${
                    !isActive
                      ? "border-[#FF4B55] bg-[#FFEBEF] dark:bg-[#2C1417] shadow-[3px_3px_0px_#FF4B55]"
                      : u.isOnline
                      ? "border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#00BA88]"
                      : "border-black bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000] hover:shadow-[5px_5px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top: Avatar, Info, and Live Online Pill */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl text-black font-black text-sm flex items-center justify-center shrink-0 border-2 border-black shadow-[2px_2px_0px_#000000] ${
                            !isActive
                              ? "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              : "bg-[#FED734]"
                          }`}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-black text-black dark:text-white truncate">
                              {u.name}
                            </p>
                            {isNazrul && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#00BCD4] text-black font-black border border-black shadow-[1px_1px_0px_#000000]">
                                Primary Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#00BA88] text-white font-black border border-black shadow-[1px_1px_0px_#000000]">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-400 mt-0.5">
                            @{u.name.toLowerCase().replace(/\s+/g, "")}
                          </p>
                        </div>
                      </div>

                      {/* Role & Status Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {!isEditingRole ? (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${def.badgeColor}`}
                          >
                            {u.role}
                          </span>
                        ) : null}

                        {/* Status Badge: Active vs Inactive */}
                        {isActive ? (
                          <span className="text-[10px] font-black text-white flex items-center gap-1 bg-[#00BA88] px-1.5 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_#000000]">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            {locale === "bn" ? "সক্রিয়" : "Active"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-white flex items-center gap-1 bg-[#FF4B55] px-1.5 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_#000000]">
                            <UserX className="w-2.5 h-2.5 stroke-[2.5]" />
                            {locale === "bn" ? "নিষ্ক্রিয়" : "Inactive"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Online Status & Last Active Telemetry */}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-700 dark:text-gray-400 font-bold">
                      {u.isOnline ? (
                        <div className="flex items-center gap-1.5 text-black font-black bg-[#00BA88] px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_#000000]">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span className="text-white">{locale === "bn" ? "অনলাইন (সিস্টেমে রয়েছেন)" : "Online now"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-400 font-bold">
                          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>
                            {locale === "bn"
                              ? `শেষ ব্যবহার: ${u.lastActiveAgo_bn || "এইমাত্র"}`
                              : `Last active: ${u.lastActiveAgo_en || "Just now"}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Role Editor */}
                  {isEditingRole && (
                    <div className="p-2.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-2">
                      <Select
                        value={editingRoleValue}
                        onChange={(e) => setEditingRoleValue(e.target.value as UserRole)}
                        className="h-9 text-xs flex-1 font-bold"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="OPERATOR">OPERATOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </Select>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-9 px-3 font-black"
                        onClick={() => handleUpdateRole(u.id, editingRoleValue)}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-2.5 font-black"
                        onClick={() => setEditingRoleId(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  )}

                  {/* Card Actions Bottom Toolbar */}
                  <div className="pt-3 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Active / Inactive Toggle Button */}
                      {!isNazrul && !isSelf && (
                        <button
                          type="button"
                          onClick={() => setStatusToggleTarget(u)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border border-black shadow-[1px_1px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 ${
                            isActive
                              ? "bg-white dark:bg-[#1E1F24] text-[#FF4B55] hover:bg-[#FFEBEF]"
                              : "bg-[#00BA88] text-white hover:bg-[#00BA88]/90"
                          }`}
                          title={
                            isActive
                              ? locale === "bn"
                                ? "ইউজার নিষ্ক্রিয় করুন"
                                : "Deactivate User"
                              : locale === "bn"
                              ? "ইউজার সক্রিয় করুন"
                              : "Activate User"
                          }
                        >
                          <Power className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>
                            {isActive
                              ? locale === "bn"
                                ? "নিষ্ক্রিয় করুন"
                                : "Deactivate"
                              : locale === "bn"
                              ? "সক্রিয় করুন"
                              : "Activate"}
                          </span>
                        </button>
                      )}

                      {/* Admin Reset Password Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setAdminResetTargetUser(u);
                          setResetNewPassword("");
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-black text-black dark:text-white bg-white dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] dark:hover:text-black border border-black shadow-[1px_1px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        title="Admin Password Reset"
                      >
                        <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{locale === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset"}</span>
                      </button>

                      {/* Admin Role Edit */}
                      {!isNazrul && !isEditingRole && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoleId(u.id);
                            setEditingRoleValue(u.role);
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-black text-black dark:text-white bg-white dark:bg-[#262830] hover:bg-gray-100 dark:hover:bg-gray-800 border border-black shadow-[1px_1px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                          title="Change Role"
                        >
                          <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{locale === "bn" ? "রোল" : "Role"}</span>
                        </button>
                      )}
                    </div>

                    {/* Delete User Button */}
                    {!isNazrul && !isSelf && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetUser(u)}
                        className="p-1.5 rounded-lg text-white bg-[#FF4B55] hover:bg-[#FF4B55]/90 border border-black shadow-[1px_1px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                        title={locale === "bn" ? "মুছে ফেলুন" : "Delete User"}
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Role Permission Matrix (RBAC System) Accordion */}
      <div className="pt-4 border-t-2 border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => setShowMatrix(!showMatrix)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1E1F24] hover:bg-[#FED734]/20 text-xs font-black text-black dark:text-white cursor-pointer transition-all border-2 border-black shadow-[3px_3px_0px_#000000]"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? "রোল ভিত্তিক পূর্ণ পারমিশন চার্ট দেখুন (RBAC Architecture)"
                : "View Full Role-Based Permission Architecture Matrix"}
            </span>
          </span>
          {showMatrix ? <ChevronUp className="w-4 h-4 stroke-[2.5]" /> : <ChevronDown className="w-4 h-4 stroke-[2.5]" />}
        </button>

        {showMatrix && (
          <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000] animate-in fade-in duration-150">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FED734] text-black font-black border-b-2 border-black">
                <tr>
                  <th className="p-3">ফিচার / পারমিশন</th>
                  <th className="p-3 text-center font-black">ADMIN</th>
                  <th className="p-3 text-center font-black">MANAGER</th>
                  <th className="p-3 text-center font-black">OPERATOR</th>
                  <th className="p-3 text-center font-black">VIEWER</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 dark:divide-white/10 text-black dark:text-white">
                <tr>
                  <td className="p-3 font-bold">মার্কেট তৈরি, এডিট ও মুছা</td>
                  <td className="p-3 text-center text-[#00BA88] font-black">✓ সরাসরি নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-[#F59E0B] font-bold">অনুমোদনের আবেদন</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">দোকান তথ্য ও ভাড়া পরিবর্তন</td>
                  <td className="p-3 text-center text-[#00BA88] font-black">✓ সরাসরি সেভ</td>
                  <td className="p-3 text-center text-[#F59E0B] font-bold">অনুমোদনের আবেদন</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">ভাড়া আদায় ও মানি রিসিট প্রিন্ট</td>
                  <td className="p-3 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                  <td className="p-3 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                  <td className="p-3 text-center text-[#00BA88] font-black">✓ শুধু আদায় ও রিসিট</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">ইউজার তৈরি, ডিলিট, এক্টিভ/নিষ্ক্রিয়</td>
                  <td className="p-3 text-center text-[#00BA88] font-black">✓ পূর্ণ নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  <td className="p-3 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD USER MODAL */}
      <Dialog
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-base font-black text-black dark:text-white">
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
            <span>{locale === "bn" ? "নতুন ব্যবহারকারী যোগ করুন" : "Register New User"}</span>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-black text-black dark:text-gray-200 mb-1">
              {locale === "bn" ? "ব্যবহারকারীর ইউজারনেম" : "Username"}
            </label>
            <Input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. KAMAL"
              required
              className="font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black dark:text-gray-200 mb-1">
              {locale === "bn" ? "মোবাইল নম্বর (Phone)" : "Phone Number"}
            </label>
            <Input
              value={newUserPhone}
              onChange={(e) => setNewUserPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black dark:text-gray-200 mb-1">
              {locale === "bn" ? "লগইন পাসওয়ার্ড" : "Login Password"}
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10 font-bold"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-black dark:text-white cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-black dark:text-gray-200 mb-1">
              {locale === "bn" ? "অ্যাসাইনকৃত রোল (Role)" : "Assigned Role"}
            </label>
            <Select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="font-bold"
            >
              <option value="ADMIN">ADMIN (সুপার এডমিন - পূর্ণ ক্ষমতা)</option>
              <option value="MANAGER">MANAGER (ম্যানেজার - কালেকশন ও হিসাব)</option>
              <option value="COLLECTOR">COLLECTOR (কালেকশন স্টাফ - শুধু এন্ট্রি ও রিসিট)</option>
              <option value="OPERATOR">OPERATOR (কালেকশন স্টাফ - শুধু এন্ট্রি)</option>
              <option value="VIEWER">VIEWER (দর্শক - শুধু দেখার অনুমতি)</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-black text-black dark:text-gray-200 mb-1">
              {locale === "bn" ? "প্রাথমিক লগইন স্ট্যাটাস" : "Initial Login Status"}
            </label>
            <Select
              value={newUserActive ? "true" : "false"}
              onChange={(e) => setNewUserActive(e.target.value === "true")}
              className="font-bold"
            >
              <option value="true">সক্রিয় (Active - লগইন করতে পারবে)</option>
              <option value="false">নিষ্ক্রিয় (Inactive - লগইন বন্ধ থাকবে)</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-black"
              onClick={() => setIsAddUserOpen(false)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isSubmittingAdd}
              className="font-black"
            >
              <UserCheck className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {locale === "bn" ? "ইউজার সংরক্ষণ করুন" : "Create User"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: STATUS TOGGLE CONFIRMATION (ACTIVE <-> INACTIVE) */}
      <Dialog
        isOpen={!!statusToggleTarget}
        onClose={() => setStatusToggleTarget(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-base font-black text-black dark:text-white">
            <Power className="w-5 h-5 stroke-[2.5]" />
            <span>
              {statusToggleTarget?.isActive
                ? locale === "bn"
                  ? "অ্যাকাউন্ট নিষ্ক্রিয় করার নিশ্চিতকরণ"
                  : "Confirm Account Deactivation"
                : locale === "bn"
                ? "অ্যাকাউন্ট পুনরায় সক্রিয়করণ"
                : "Confirm Account Activation"}
            </span>
          </div>
        }
      >
        <div className="space-y-3 py-1 text-xs text-black dark:text-white">
          <p>
            {statusToggleTarget?.isActive ? (
              locale === "bn" ? (
                <>
                  আপনি কি নিশ্চিত যে <strong>&apos;{statusToggleTarget?.name}&apos;</strong> অ্যাকাউন্টটি
                  <strong> নিষ্ক্রিয় (Inactive)</strong> করতে চান?
                </>
              ) : (
                <>
                  Are you sure you want to <strong>deactivate</strong> user <strong>&apos;{statusToggleTarget?.name}&apos;</strong>?
                </>
              )
            ) : locale === "bn" ? (
              <>
                আপনি কি নিশ্চিত যে <strong>&apos;{statusToggleTarget?.name}&apos;</strong> অ্যাকাউন্টটি পুনরায়
                <strong> সক্রিয় (Active)</strong> করতে চান?
              </>
            ) : (
              <>
                Are you sure you want to <strong>activate</strong> user <strong>&apos;{statusToggleTarget?.name}&apos;</strong>?
              </>
            )}
          </p>

          <div
            className={`p-3 rounded-xl border-2 text-xs font-bold ${
              statusToggleTarget?.isActive
                ? "bg-[#FFEBEF] dark:bg-[#2C1417] border-[#FF4B55] shadow-[2px_2px_0px_#FF4B55] text-[#FF4B55] dark:text-[#FF8088]"
                : "bg-[#E6F9F0] dark:bg-[#0E281E] border-[#00BA88] shadow-[2px_2px_0px_#00BA88] text-[#00BA88] dark:text-[#4ADE80]"
            }`}
          >
            {statusToggleTarget?.isActive
              ? locale === "bn"
                ? "⚠️ নিষ্ক্রিয় করা হলে এই ব্যবহারকারী আর সিস্টেমে লগইন করতে পারবে না এবং বর্তমান সেশন সাথে সাথে বাতিল হবে।"
                : "⚠️ Once deactivated, this user will NOT be able to log in, and their current active session will be invalidated immediately."
              : locale === "bn"
              ? "✓ সক্রিয় করা হলে এই ব্যবহারকারী পুনরায় ইউজারনেম ও পাসওয়ার্ড দিয়ে স্বাভাবিকভাবে লগইন করতে পারবেন।"
              : "✓ Once activated, this user will be able to log in normally with their existing credentials."}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-black"
              onClick={() => setStatusToggleTarget(null)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isUpdatingStatus}
              variant={statusToggleTarget?.isActive ? "destructive" : "primary"}
              className="font-black"
              onClick={handleToggleStatus}
            >
              {statusToggleTarget?.isActive
                ? locale === "bn"
                  ? "হ্যাঁ, নিষ্ক্রিয় করুন"
                  : "Deactivate User"
                : locale === "bn"
                ? "হ্যাঁ, সক্রিয় করুন"
                : "Activate User"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 3: ADMIN PASSWORD RESET MODAL */}
      <Dialog
        isOpen={!!adminResetTargetUser}
        onClose={() => setAdminResetTargetUser(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-base font-black text-black dark:text-white">
            <KeyRound className="w-5 h-5 stroke-[2.5]" />
            <span>
              {locale === "bn"
                ? `${adminResetTargetUser?.name}-এর পাসওয়ার্ড রিসেট`
                : `Reset Password for ${adminResetTargetUser?.name}`}
            </span>
          </div>
        }
      >
        <form onSubmit={handleAdminResetPassword} className="space-y-4 py-1">
          <div className="p-3 rounded-xl bg-[#FED734]/20 border-2 border-black shadow-[2px_2px_0px_#000000] text-xs font-bold text-black dark:text-white">
            {locale === "bn"
              ? "এডমিন হিসেবে আপনি যেকোনো ব্যবহারকারীর জন্য সরাসরি নতুন পাসওয়ার্ড নির্ধারণ করতে পারবেন (পূর্বের পাসওয়ার্ড জানার প্রয়োজন নেই)।"
              : "As an Administrator, you can set a new password directly for this user without needing their previous password."}
          </div>

          <div>
            <label className="block text-xs font-black text-black dark:text-gray-200 mb-1">
              {locale === "bn" ? "নতুন পাসওয়ার্ড প্রদান করুন" : "Enter New Password"}
            </label>
            <div className="relative">
              <Input
                type={showResetPassword ? "text" : "password"}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10 font-bold"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-black dark:text-white cursor-pointer"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-black"
              onClick={() => setAdminResetTargetUser(null)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isSubmittingReset}
              className="font-black"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {locale === "bn" ? "পাসওয়ার্ড সংরক্ষণ করুন" : "Set New Password"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 4: DELETE CONFIRMATION MODAL */}
      <Dialog
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-base font-black text-[#FF4B55]">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            <span>{locale === "bn" ? "ব্যবহারকারী মুছে ফেলার নিশ্চিতকরণ" : "Confirm Delete User"}</span>
          </div>
        }
      >
        <div className="space-y-3 py-1 text-xs text-black dark:text-white">
          <p className="font-bold">
            {locale === "bn"
              ? `আপনি কি নিশ্চিত যে '${deleteTargetUser?.name}' অ্যাকাউন্টটি সম্পূর্ণ মুছে ফেলতে চান?`
              : `Are you sure you want to permanently delete user account '${deleteTargetUser?.name}'?`}
          </p>
          <p className="text-[#FF4B55] font-black">
            {locale === "bn"
              ? "মুছে ফেলার পর এই ইউজার আর সিস্টেমে লগইন করতে পারবে না।"
              : "This action cannot be undone and will revoke their system access."}
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-black"
              onClick={() => setDeleteTargetUser(null)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="font-black"
              onClick={handleDeleteUser}
            >
              <Trash2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {locale === "bn" ? "হ্যাঁ, মুছে ফেলুন" : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

