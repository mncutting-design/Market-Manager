"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatDate, toBanglaDigits } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiffViewer } from "@/components/ui/diff-viewer";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  Building2,
  User,
  Receipt,
  FileText,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

export function ApprovalsModal() {
  const { t, locale } = useTranslation();
  const { isApprovalsOpen, setIsApprovalsOpen, refreshApprovals, triggerRefresh } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/approvals?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error("Failed to load change requests:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isApprovalsOpen) {
      fetchRequests();
    }
  }, [isApprovalsOpen, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "APPROVED" }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to approve change");
        return;
      }

      toast.success(
        locale === "bn"
          ? "পরিবর্তন সফলভাবে অনুমোদন ও কার্যকর করা হয়েছে!"
          : "Changes approved and applied successfully!"
      );
      await fetchRequests();
      await refreshApprovals();
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to approve change");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "REJECTED",
          reviewNote: rejectNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reject change");
        return;
      }

      toast.info(
        locale === "bn" ? "পরিবর্তনের আবেদনটি বাতিল করা হয়েছে" : "Change request rejected"
      );
      setRejectingId(null);
      setRejectNote("");
      await fetchRequests();
      await refreshApprovals();
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to reject change");
    } finally {
      setProcessingId(null);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "MARKET":
        return <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case "SHOP":
        return <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "TENANT":
        return <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case "BILL":
        return <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "DELETE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
            {locale === "bn" ? "মুছে ফেলার আবেদন" : "Deletion Request"}
          </span>
        );
      case "RENT_REVISION":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
            {locale === "bn" ? "ভাড়া সংশোধন" : "Rent Revision"}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60">
            {locale === "bn" ? "সম্পাদনা আবেদন" : "Edit Request"}
          </span>
        );
    }
  };

  return (
    <Dialog
      isOpen={isApprovalsOpen}
      onClose={() => setIsApprovalsOpen(false)}
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>{locale === "bn" ? "অ্যাডমিন অনুমোদন কেন্দ্র" : "Admin Approvals Center"}</span>
        </div>
      }
      description={
        locale === "bn"
          ? "যেকোনো পরিবর্তনের বর্তমান ও নতুন প্রস্তাবিত পার্থক্য যাচাই করে অনুমোদন করুন।"
          : "Review What Have vs What Will Have differences before approving."
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {[
            { id: "PENDING", label: locale === "bn" ? "অপেক্ষমান (Pending)" : "Pending" },
            { id: "APPROVED", label: locale === "bn" ? "অনুমোদিত (Approved)" : "Approved" },
            { id: "REJECTED", label: locale === "bn" ? "প্রত্যাখ্যাত (Rejected)" : "Rejected" },
            { id: "ALL", label: locale === "bn" ? "সকল (All)" : "All" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {t("common.loading")}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/70 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {locale === "bn"
                ? "কোনো অপেক্ষমান অনুমোদনের আবেদন নেই!"
                : "No pending approval requests!"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {locale === "bn"
                ? "সকল তথ্য হালনাগাদ ও অনুমোদিত রয়েছে।"
                : "Everything is up-to-date and approved."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {requests.map((cr) => (
              <div
                key={cr.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-3"
              >
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-2xs border border-slate-200 dark:border-slate-700">
                      {getEntityIcon(cr.entityType)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{cr.entityTitle || `${cr.entityType} ${cr.entityId}`}</span>
                        {getActionBadge(cr.actionType)}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {locale === "bn"
                          ? `প্রস্তাবক: ${cr.requestedBy} • ${formatDate(cr.createdAt, locale)}`
                          : `Requested by: ${cr.requestedBy} • ${formatDate(cr.createdAt, locale)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {cr.status === "PENDING" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                        <Clock className="w-3 h-3" />
                        <span>{locale === "bn" ? "অনুমোদনের অপেক্ষায়" : "Awaiting Approval"}</span>
                      </span>
                    )}
                    {cr.status === "APPROVED" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{locale === "bn" ? "অনুমোদিত" : "Approved"}</span>
                      </span>
                    )}
                    {cr.status === "REJECTED" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                        <XCircle className="w-3 h-3" />
                        <span>{locale === "bn" ? "প্রত্যাখ্যাত" : "Rejected"}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Difference Viewer */}
                <DiffViewer
                  currentData={cr.currentDataParsed}
                  proposedData={cr.proposedDataParsed}
                  title={locale === "bn" ? "পার্থক্য প্রিভিউ (What have ➔ What will have)" : "Diff Preview"}
                />

                {/* Review note if present */}
                {cr.reviewNote && (
                  <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{locale === "bn" ? "অ্যাডমিন মন্তব্য: " : "Admin Note: "}</span>
                      <span>{cr.reviewNote}</span>
                    </div>
                  </div>
                )}

                {/* Reject Input box if actively rejecting */}
                {rejectingId === cr.id && (
                  <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-2">
                    <label className="block text-xs font-bold text-rose-800 dark:text-rose-300">
                      {locale === "bn" ? "বাতিল করার কারণ (ঐচ্ছিক):" : "Rejection Reason (Optional):"}
                    </label>
                    <Input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder={locale === "bn" ? "বাতিলের কারণ লিখুন..." : "Enter reason..."}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNote("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={processingId === cr.id}
                        onClick={() => handleReject(cr.id)}
                      >
                        {locale === "bn" ? "নিশ্চিত বাতিল করুন" : "Confirm Reject"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                {cr.status === "PENDING" && rejectingId !== cr.id && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                      onClick={() => {
                        setRejectingId(cr.id);
                        setRejectNote("");
                      }}
                      disabled={!!processingId}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      {locale === "bn" ? "বাতিল করুন" : "Reject"}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      isLoading={processingId === cr.id}
                      onClick={() => handleApprove(cr.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {locale === "bn" ? "অনুমোদন ও কার্যকর করুন" : "Approve & Apply"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
