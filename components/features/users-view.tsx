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
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Trash2,
  Edit3,
  Search,
  Check,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_DEFINITIONS, UserRole } from "@/lib/permissions";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export function UsersView() {
  const { locale } = useTranslation();
  const { currentUser, openChangePassword } = useApp();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showMatrix, setShowMatrix] = useState(false);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [adminResetTargetUser, setAdminResetTargetUser] = useState<UserItem | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);

  // Add User Form State (Strictly username + password + role, NO email!)
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("MANAGER");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Admin Reset Password State
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Role Edit Inline
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState<UserRole>("MANAGER");

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
          password: newUserPassword,
          role: newUserRole,
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
      setNewUserPassword("");
      setNewUserRole("MANAGER");
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
          ? `'${adminResetTargetUser.name}' এর পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!`
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
        locale === "bn" ? "ব্যবহারকারীর রোল আপডেট হয়েছে" : "Role updated successfully"
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
    return matchesSearch && matchesRole;
  });

  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const managerCount = users.filter((u) => u.role === "MANAGER" || u.role === "OPERATOR").length;
  const viewerCount = users.filter((u) => u.role === "VIEWER").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>
              {locale === "bn" ? "ব্যবহারকারী ও নিরাপত্তা ব্যবস্থাপনা" : "Users & Access Control"}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {locale === "bn"
              ? "সিস্টেম ইউজার তৈরি, পাসওয়ার্ড রিসেট, রোল নিয়ন্ত্রণ এবং নিরাপত্তা পরিচালনা।"
              : "Provision accounts, reset forgotten passwords, and manage role-based system permissions."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* User can change own password anytime */}
          <Button
            variant="outline"
            size="sm"
            onClick={openChangePassword}
            className="cursor-pointer border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <KeyRound className="w-4 h-4 mr-1.5 text-amber-500" />
            <span>{locale === "bn" ? "আমার পাসওয়ার্ড পরিবর্তন" : "Change My Password"}</span>
          </Button>

          {/* Admin Add User */}
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setIsAddUserOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>{locale === "bn" ? "নতুন ইউজার যোগ করুন" : "Add New User"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Key Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {locale === "bn" ? "মোট ব্যবহারকারী" : "Total Users"}
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            {locale === "bn" ? "সুপার এডমিন" : "Super Admins"}
          </p>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {adminCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {locale === "bn" ? "ম্যানেজার ও স্টাফ" : "Managers & Operators"}
          </p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {managerCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            {locale === "bn" ? "দর্শক (ভিউয়ার)" : "Auditor / Viewers"}
          </p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {viewerCount}
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === "bn" ? "ইউজারনেম বা রোল খুঁজুন..." : "Search by username or role..."}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {locale === "bn" ? "রোল ফিল্টার:" : "Filter Role:"}
          </span>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 text-xs min-w-[120px]"
          >
            <option value="ALL">{locale === "bn" ? "সকল রোল (All)" : "All Roles"}</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="VIEWER">VIEWER</option>
          </Select>
        </div>
      </div>

      {/* 4. Active Users Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          {locale === "bn" ? "নিবন্ধিত অ্যাকাউন্ট তালিকা" : "Registered User Accounts"} ({filteredUsers.length})
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading user roster...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            {locale === "bn" ? "কোন ব্যবহারকারী পাওয়া যায়নি" : "No users matching query"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredUsers.map((u) => {
              const isNazrul = u.name.toUpperCase() === "NAZRUL" || u.email.includes("nazrul");
              const isSelf = currentUser?.id === u.id || currentUser?.name === u.name;
              const def = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.ADMIN;
              const isEditingRole = editingRoleId === u.id;

              return (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 shadow-xs transition-all flex flex-col justify-between gap-4 group"
                >
                  {/* Top: Avatar & Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          {isNazrul && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/30">
                              Primary Super Admin
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          ইউজারনেম: @{u.name.toLowerCase().replace(/\s+/g, "")}
                        </p>
                      </div>
                    </div>

                    {/* Role Badge */}
                    {!isEditingRole ? (
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 border ${def.badgeColor}`}
                      >
                        {u.role}
                      </span>
                    ) : null}
                  </div>

                  {/* Inline Role Editor */}
                  {isEditingRole && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-teal-500/40 flex items-center gap-2">
                      <Select
                        value={editingRoleValue}
                        onChange={(e) => setEditingRoleValue(e.target.value as UserRole)}
                        className="h-8 text-xs flex-1"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="OPERATOR">OPERATOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 px-2.5 bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => handleUpdateRole(u.id, editingRoleValue)}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => setEditingRoleId(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  )}

                  {/* Card Actions Bottom Toolbar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {/* Admin Reset Password Button (Admin can change their password if they forgot) */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdminResetTargetUser(u);
                            setResetNewPassword("");
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          title="Admin Password Reset"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          <span>{locale === "bn" ? "পাসওয়ার্ড রিসেট" : "Reset Pass"}</span>
                        </button>
                      )}

                      {/* Admin Role Edit */}
                      {isAdmin && !isNazrul && !isEditingRole && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoleId(u.id);
                            setEditingRoleValue(u.role);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Change Role"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{locale === "bn" ? "রোল" : "Role"}</span>
                        </button>
                      )}
                    </div>

                    {/* Delete User Button (Cannot delete NAZRUL or self) */}
                    {isAdmin && !isNazrul && !isSelf && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetUser(u)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title={locale === "bn" ? "ব্যবহারকারী মুছুন" : "Delete User"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowMatrix(!showMatrix)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition-all border border-slate-200 dark:border-slate-800 shadow-xs"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>
              {locale === "bn"
                ? "রোল ভিত্তিক পূর্ণ পারমিশন চার্ট দেখুন (RBAC Architecture)"
                : "View Full Role-Based Permission Architecture Matrix"}
            </span>
          </span>
          {showMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMatrix && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs animate-in fade-in duration-150">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">ফিচার / পারমিশন</th>
                  <th className="p-3 text-center text-teal-600 dark:text-teal-400 font-bold">ADMIN</th>
                  <th className="p-3 text-center text-blue-600 dark:text-blue-400 font-bold">MANAGER</th>
                  <th className="p-3 text-center text-amber-600 dark:text-amber-400 font-bold">OPERATOR</th>
                  <th className="p-3 text-center text-purple-600 dark:text-purple-400 font-bold">VIEWER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <tr>
                  <td className="p-3 font-medium">মার্কেট তৈরি, এডিট ও মুছা</td>
                  <td className="p-3 text-center text-emerald-600">✓ পূর্ণ নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">দোকান তথ্য ও ভাড়া পরিবর্তন</td>
                  <td className="p-3 text-center text-emerald-600">✓ সরাসরি সেভ</td>
                  <td className="p-3 text-center text-amber-600">অনুমোদনের আবেদন</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">ভাড়া আদায় ও মানি রিসিট প্রিন্ট</td>
                  <td className="p-3 text-center text-emerald-600">✓ অনুমোদিত</td>
                  <td className="p-3 text-center text-emerald-600">✓ অনুমোদিত</td>
                  <td className="p-3 text-center text-emerald-600">✓ অনুমোদিত</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">ইউজার তৈরি, ডিলিট ও পাসওয়ার্ড রিসেট</td>
                  <td className="p-3 text-center text-emerald-600">✓ পূর্ণ নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
                  <td className="p-3 text-center text-slate-400">✕ নিষেধ</td>
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
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <UserPlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>{locale === "bn" ? "নতুন ব্যবহারকারী যোগ করুন" : "Register New User"}</span>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {locale === "bn" ? "ব্যবহারকারীর ইউজারনেম" : "Username"}
            </label>
            <Input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. KAMAL"
              required
              className="font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {locale === "bn" ? "লগইন পাসওয়ার্ড" : "Login Password"}
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {locale === "bn" ? "অ্যাসাইনকৃত রোল (Role)" : "Assigned Role"}
            </label>
            <Select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
            >
              <option value="ADMIN">ADMIN (সুপার এডমিন - পূর্ণ ক্ষমতা)</option>
              <option value="MANAGER">MANAGER (ম্যানেজার - কালেকশন ও হিসাব)</option>
              <option value="OPERATOR">OPERATOR (কালেকশন স্টাফ - শুধু এন্ট্রি)</option>
              <option value="VIEWER">VIEWER (দর্শক - শুধু দেখার অনুমতি)</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddUserOpen(false)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmittingAdd}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              {locale === "bn" ? "ইউজার সংরক্ষণ করুন" : "Create User"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: ADMIN PASSWORD RESET MODAL (Admin resets any user's password) */}
      <Dialog
        isOpen={!!adminResetTargetUser}
        onClose={() => setAdminResetTargetUser(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-base font-bold text-amber-600 dark:text-amber-400">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <span>
              {locale === "bn"
                ? `${adminResetTargetUser?.name}-এর পাসওয়ার্ড রিসেট`
                : `Reset Password for ${adminResetTargetUser?.name}`}
            </span>
          </div>
        }
      >
        <form onSubmit={handleAdminResetPassword} className="space-y-4 py-1">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            {locale === "bn"
              ? "এডমিন হিসেবে আপনি যেকোনো ব্যবহারকারীর জন্য সরাসরি নতুন পাসওয়ার্ড নির্ধারণ করতে পারবেন (পূর্বের পাসওয়ার্ড জানার প্রয়োজন নেই)।"
              : "As an Administrator, you can set a new password directly for this user without needing their previous password."}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {locale === "bn" ? "নতুন পাসওয়ার্ড প্রদান করুন" : "Enter New Password"}
            </label>
            <div className="relative">
              <Input
                type={showResetPassword ? "text" : "password"}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdminResetTargetUser(null)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmittingReset}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {locale === "bn" ? "পাসওয়ার্ড সংরক্ষণ করুন" : "Set New Password"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      <Dialog
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-base font-bold text-red-600">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>{locale === "bn" ? "ব্যবহারকারী মুছে ফেলার নিশ্চিতকরণ" : "Confirm Delete User"}</span>
          </div>
        }
      >
        <div className="space-y-3 py-1 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {locale === "bn"
              ? `আপনি কি নিশ্চিত যে '${deleteTargetUser?.name}' অ্যাকাউন্টটি সম্পূর্ণ মুছে ফেলতে চান?`
              : `Are you sure you want to permanently delete user account '${deleteTargetUser?.name}'?`}
          </p>
          <p className="text-red-500 font-semibold">
            {locale === "bn"
              ? "মুছে ফেলার পর এই ইউজার আর সিস্টেমে লগইন করতে পারবে না।"
              : "This action cannot be undone and will revoke their system access."}
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetUser(null)}
            >
              {locale === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteUser}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {locale === "bn" ? "হ্যাঁ, মুছে ফেলুন" : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
