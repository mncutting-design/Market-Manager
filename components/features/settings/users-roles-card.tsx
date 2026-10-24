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
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("MANAGER");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPassword) {
      toast.error(
        locale === "bn" ? "ইউজারনেম এবং পাসওয়ার্ড উভয়ই আবশ্যক" : "Username and password are required"
      );
      return;
    }

    try {
      setIsSubmitting(true);
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
          ? `'${data.user?.name}' ব্যবহারকারী সফলভাবে যুক্ত হয়েছে!`
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
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
              <span>
                {locale === "bn"
                  ? "ব্যবহারকারী ও রোল পারমিশন (Role-Based Permissions)"
                  : "Users & Role Permissions Architecture"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-0.5">
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
            className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b-2 border-black/10 dark:border-white/10">
              <span className="text-xs font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                {locale === "bn" ? "নতুন ব্যবহারকারী নিবন্ধন" : "Register New User with Role"}
              </span>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-xs font-black text-black dark:text-white hover:text-[#FF4B55] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black uppercase text-black dark:text-white mb-1">
                  {locale === "bn" ? "ব্যবহারকারীর ইউজারনেম" : "Username"}
                </label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. KAMAL"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black dark:text-white mb-1">
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
                <label className="block text-xs font-black uppercase text-black dark:text-white mb-1">
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
          <div className="text-xs font-black text-black dark:text-white uppercase tracking-wider px-1">
            {locale === "bn" ? "সক্রিয় ব্যবহারকারী তালিকা" : "Active Registered Users"}
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs font-bold text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black text-center text-xs font-bold text-gray-500">
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
                    className="p-3 rounded-xl border-2 border-black bg-white dark:bg-[#262830] flex items-center justify-between gap-2 shadow-[2.5px_2.5px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FED734] text-black font-black text-xs flex items-center justify-center shrink-0 border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-black dark:text-white truncate flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isNazrul && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-black text-[#FED734] font-black border border-black uppercase">
                              Super Admin
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-gray-600 dark:text-gray-300 font-bold truncate">
                          ইউজারনেম: {u.name}
                        </p>
                      </div>
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 border-2 border-black bg-[#FED734] text-black shadow-[1px_1px_0px_#000000]"
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
        <div className="pt-2 border-t-2 border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] hover:bg-[#FED734] dark:hover:bg-[#FED734] hover:text-black dark:hover:text-black text-xs font-black text-black dark:text-white cursor-pointer transition-all border-2 border-black shadow-[2px_2px_0px_#000000]"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 stroke-[2.5]" />
              <span>
                {locale === "bn"
                  ? "রোল ভিত্তিক অনুমতি তালিকা দেখুন (Permission Matrix Table)"
                  : "View Role-Based Access Control (RBAC) Matrix"}
              </span>
            </span>
            {showMatrix ? <ChevronUp className="w-4 h-4 stroke-[2.5]" /> : <ChevronDown className="w-4 h-4 stroke-[2.5]" />}
          </button>

          {showMatrix && (
            <div className="mt-2 overflow-x-auto rounded-xl border-2 border-black shadow-[4px_4px_0px_#000000] animate-in fade-in duration-150">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FED734] text-black font-black border-b-2 border-black">
                  <tr>
                    <th className="p-2.5">ফিচার / পারমিশন</th>
                    <th className="p-2.5 text-center font-black">
                      ADMIN
                    </th>
                    <th className="p-2.5 text-center font-black">
                      MANAGER
                    </th>
                    <th className="p-2.5 text-center font-black">
                      OPERATOR
                    </th>
                    <th className="p-2.5 text-center font-black">
                      VIEWER
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 dark:divide-white/10 bg-white dark:bg-[#1E1F24] font-bold">
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">মার্কেট তৈরি, এডিট ও মুছা</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ পূর্ণ নিয়ন্ত্রণ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">দোকান তথ্য ও ভাড়া পরিবর্তন</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ সরাসরি সেভ</td>
                    <td className="p-2.5 text-center text-[#F59E0B] font-black">অনুমোদনের আবেদন</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">ভাড়া আদায় ও মানি রিসিট প্রিন্ট</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">মাসিক বিল জেনারেশন</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">খরচ (Expense) এন্ট্রি</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">অ্যাডমিন অনুমোদন (Approve / Reject)</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">ইউজার তৈরি ও পাসওয়ার্ড নিয়ন্ত্রণ</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">✕ নিষেধ</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-black dark:text-white">রিপোর্ট ও ড্যাশবোর্ড পরিদর্শন</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-[#00BA88] font-black">✓ অনুমোদিত</td>
                    <td className="p-2.5 text-center text-gray-500 font-bold">বকেয়া অনুসন্ধান</td>
                    <td className="p-2.5 text-center text-[#00BCD4] font-black">✓ শুধু দেখা</td>
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
