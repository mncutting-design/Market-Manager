"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ShieldCheck,
  UserPlus,
  Users,
  KeyRound,
  Check,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
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

export function UsersRolesCard() {
  const { locale } = useTranslation();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  // Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("MANAGER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error(
        locale === "bn" ? "সকল তথ্য সঠিকভাবে পূরণ করুন" : "Please fill all required fields"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
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
          ? `'${data.user?.name}' ব্যবহারকারী সফলভাবে যুক্ত হয়েছে!`
          : `User '${data.user?.name}' created successfully!`
      );
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("MANAGER");
      setIsAddUserOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 border-slate-200 dark:border-slate-800">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>
                {locale === "bn"
                  ? "ব্যবহারকারী ও রোল পারমিশন (Role-Based Permissions)"
                  : "Users & Role Permissions Architecture"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {locale === "bn"
                ? "এডমিন, ম্যানেজার, অপারেটর ও অডিটর ভূমিকা অনুযায়ী আলাদা অ্যাক্সেস নিয়ন্ত্রণ।"
                : "Manage administrative roles: Admin, Manager, Operator, and Viewer permissions."}
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddUserOpen(!isAddUserOpen)}
            className="self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            <span>{locale === "bn" ? "নতুন ইউজার যোগ করুন" : "Add New User"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Add User Form Section */}
        {isAddUserOpen && (
          <form
            onSubmit={handleCreateUser}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-teal-500/30 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                {locale === "bn" ? "নতুন ব্যবহারকারী নিবন্ধন" : "Register New User with Role"}
              </span>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {locale === "bn" ? "ব্যবহারকারীর নাম" : "User Name"}
                </label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. KAMAL HOSSAIN"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {locale === "bn" ? "ইউজারনেম / ইমেইল" : "Username / Email"}
                </label>
                <Input
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="kamal@marketmanager.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {locale === "bn" ? "লগইন পাসওয়ার্ড" : "Login Password"}
                </label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddUserOpen(false)}
              >
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                <Check className="w-4 h-4 mr-1.5" />
                {locale === "bn" ? "ব্যবহারকারী তৈরি করুন" : "Create User"}
              </Button>
            </div>
          </form>
        )}

        {/* Users Roster List */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            {locale === "bn" ? "সক্রিয় ব্যবহারকারী তালিকা" : "Active Registered Users"}
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-center text-xs text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {users.map((u) => {
                const isNazrul = u.name === "NAZRUL" || u.email.includes("nazrul");
                const def = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.ADMIN;

                return (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-2 shadow-2xs hover:border-teal-500/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isNazrul && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/30">
                              Primary Admin
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${def.badgeColor}`}
                    >
                      {u.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role Permission Matrix Interactive Table */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-all border border-slate-200 dark:border-slate-800"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>
                {locale === "bn"
                  ? "রোল ভিত্তিক অনুমতি তালিকা দেখুন (Permission Matrix Table)"
                  : "View Role-Based Access Control (RBAC) Matrix"}
              </span>
            </span>
            {showMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMatrix && (
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">ফিচার / পারমিশন</th>
                    <th className="p-2.5 text-center text-teal-600 dark:text-teal-400 font-bold">
                      ADMIN
                    </th>
                    <th className="p-2.5 text-center text-blue-600 dark:text-blue-400 font-bold">
                      MANAGER
                    </th>
                    <th className="p-2.5 text-center text-amber-600 dark:text-amber-400 font-bold">
                      OPERATOR
                    </th>
                    <th className="p-2.5 text-center text-purple-600 dark:text-purple-400 font-bold">
                      VIEWER
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/40">
                  <tr>
                    <td className="p-2.5 font-medium">মার্কেট তৈরি, এডিট ও মুছা</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ পূর্ণ নিয়ন্ত্রণ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">দোকান তথ্য ও ভাড়া পরিবর্তন</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ সরাসরি সেভ</td>
                    <td className="p-2.5 text-center text-amber-600">অনুমোদনের আবেদন</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">ভাড়া আদায় ও মানি রিসিট প্রিন্ট</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">মাসিক বিল জেনারেশন</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">খরচ (Expense) এন্ট্রি</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">অ্যাডমিন অনুমোদন (Approve / Reject)</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">ইউজার তৈরি ও পাসওয়ার্ড নিয়ন্ত্রণ</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-slate-400">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">রিপোর্ট ও ড্যাশবোর্ড পরিদর্শন</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-emerald-600">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-slate-400">বকেয়া অনুসন্ধান</td>
                    <td className="p-2.5 text-center text-purple-600">✓ শুধু দেখা</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
