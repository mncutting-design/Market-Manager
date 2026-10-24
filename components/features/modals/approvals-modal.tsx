"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatDate, toBanglaDigits } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiffViewer, getChangePurposeSummary } from "@/components/ui/diff-viewer";
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
  Target,
  Sparkles,
  ArrowRight,
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
        return <Building2 className="w-4 h-4 text-black stroke-[2.5]" />;
      case "SHOP":
        return <Store className="w-4 h-4 text-black stroke-[2.5]" />;
      case "TENANT":
        return <User className="w-4 h-4 text-black stroke-[2.5]" />;
      case "BILL":
        return <Receipt className="w-4 h-4 text-black stroke-[2.5]" />;
      default:
        return <FileText className="w-4 h-4 text-black stroke-[2.5]" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "DELETE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FF4B55] text-white border-2 border-black shadow-[1px_1px_0px_#000000]">
            {locale === "bn" ? "মুছে ফেলার আবেদন" : "Deletion Request"}
          </span>
        );
      case "RENT_REVISION":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#F59E0B] text-black border-2 border-black shadow-[1px_1px_0px_#000000]">
            {locale === "bn" ? "ভাড়া সংশোধন" : "Rent Revision"}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FED734] text-black border-2 border-black shadow-[1px_1px_0px_#000000]">
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
          <ShieldCheck className="w-5 h-5 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
          <span className="text-base sm:text-lg font-black">{locale === "bn" ? "অ্যাডমিন অনুমোদন কেন্দ্র" : "Admin Approvals Center"}</span>
        </div>
      }
      description={
        locale === "bn"
          ? "ম্যানেজার কর্তৃক প্রস্তাবিত পরিবর্তনের উদ্দেশ্য ও কেবল পরিবর্তিত ফিল্ডগুলো যাচাই করে অনুমোদন করুন।"
          : "Review purpose of changes and strictly modified fields before approving."
      }
      maxWidth="3xl"
    >
      <div className="space-y-4 w-full">
        {/* Status Filter Tabs - Scrollable on mobile */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black rounded-xl overflow-x-auto no-scrollbar shadow-[2px_2px_0px_#000000]">
          {[
            { id: "PENDING", label: locale === "bn" ? "অপেক্ষমান (Pending)" : "Pending" },
            { id: "APPROVED", label: locale === "bn" ? "অনুমোদিত (Approved)" : "Approved" },
            { id: "REJECTED", label: locale === "bn" ? "প্রত্যাখ্যাত (Rejected)" : "Rejected" },
            { id: "ALL", label: locale === "bn" ? "সকল (All)" : "All" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 py-1.5 px-2.5 text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                statusFilter === tab.id
                  ? "bg-[#FED734] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="py-12 text-center text-neutral-500 text-xs font-bold">
            {t("common.loading")}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <CheckCircle2 className="w-10 h-10 text-[#00BA88] mx-auto mb-2 stroke-[2.5]" />
            <p className="text-sm font-black text-black dark:text-white">
              {locale === "bn"
                ? "কোনো অপেক্ষমান অনুমোদনের আবেদন নেই!"
                : "No pending approval requests!"}
            </p>
            <p className="text-xs text-neutral-500 mt-1 font-bold">
              {locale === "bn"
                ? "সকল তথ্য হালনাগাদ ও অনুমোদিত রয়েছে।"
                : "Everything is up-to-date and approved."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[62vh] sm:max-h-[65vh] overflow-y-auto pr-1">
            {requests.map((cr) => {
              // Calculate human-readable change purpose
              const purpose = getChangePurposeSummary({
                entityType: cr.entityType,
                entityTitle: cr.entityTitle,
                actionType: cr.actionType,
                requestedBy: cr.requestedBy,
                currentData: cr.currentDataParsed,
                proposedData: cr.proposedDataParsed,
                locale: locale as "bn" | "en",
              });

              return (
                <div
                  key={cr.id}
                  className="p-3.5 sm:p-4 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] shadow-[4px_4px_0px_#000000] space-y-3"
                >
                  {/* 1. Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b-2 border-black">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-[#FED734] border-2 border-black shadow-[1.5px_1.5px_0px_#000000] shrink-0">
                        {getEntityIcon(cr.entityType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm font-black text-black dark:text-white truncate">
                            {cr.entityTitle || `${cr.entityType} ${cr.entityId}`}
                          </h4>
                          {getActionBadge(cr.actionType)}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold mt-0.5 truncate">
                          {locale === "bn"
                            ? `প্রস্তাবক: ${cr.requestedBy} • ${formatDate(cr.createdAt, locale)}`
                            : `Requested by: ${cr.requestedBy} • ${formatDate(cr.createdAt, locale)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                      {cr.status === "PENDING" && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-black bg-[#FED734] px-2 py-0.5 rounded-md border-2 border-black shadow-[1px_1px_0px_#000000]">
                          <Clock className="w-3 h-3 stroke-[2.5]" />
                          <span>{locale === "bn" ? "অনুমোদনের অপেক্ষায়" : "Awaiting Approval"}</span>
                        </span>
                      )}
                      {cr.status === "APPROVED" && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-white bg-[#00BA88] px-2 py-0.5 rounded-md border-2 border-black shadow-[1px_1px_0px_#000000]">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>{locale === "bn" ? "অনুমোদিত" : "Approved"}</span>
                        </span>
                      )}
                      {cr.status === "REJECTED" && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-white bg-[#FF4B55] px-2 py-0.5 rounded-md border-2 border-black shadow-[1px_1px_0px_#000000]">
                          <XCircle className="w-3 h-3 stroke-[2.5]" />
                          <span>{locale === "bn" ? "প্রত্যাখ্যাত" : "Rejected"}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. CRYSTAL-CLEAR PURPOSE & WHAT WILL CHANGE BANNER */}
                  <div className="p-3 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black text-xs space-y-1.5 shadow-[2px_2px_0px_#000000]">
                    <div className="flex items-center gap-1.5 font-black text-black dark:text-white">
                      <Target className="w-4 h-4 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
                      <span>{locale === "bn" ? "পরিবর্তনের উদ্দেশ্য ও সারসংক্ষেপ:" : "Purpose of Change:"}</span>
                    </div>
                    {purpose.bullets.length > 0 ? (
                      <ul className="space-y-1 pl-5 list-disc text-black dark:text-white font-bold">
                        {purpose.bullets.map((b, idx) => (
                          <li key={idx} className="leading-snug">
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-neutral-600 dark:text-neutral-300 font-bold">
                        {locale === "bn"
                          ? "ম্যানেজার কর্তৃক রেকর্ডের তথ্য সংশোধনের আবেদন।"
                          : "Manager requested update for this record."}
                      </p>
                    )}
                  </div>

                  {/* 3. VISUAL DIFFERENCE VIEWER: ONLY MODIFIED FIELDS */}
                  <DiffViewer
                    currentData={cr.currentDataParsed}
                    proposedData={cr.proposedDataParsed}
                    title={locale === "bn" ? "পার্থক্য প্রিভিউ (What have ➔ What will have)" : "Diff Preview"}
                    hideUnchanged={true}
                  />

                  {/* Review note if present */}
                  {cr.reviewNote && (
                    <div className="p-2.5 rounded-lg bg-[#FEF3C7] dark:bg-[#3D2F14] border-2 border-black text-xs text-black dark:text-white flex items-start gap-1.5 shadow-[2px_2px_0px_#000000]">
                      <MessageSquare className="w-3.5 h-3.5 text-black dark:text-[#FED734] shrink-0 mt-0.5 stroke-[2.5]" />
                      <div>
                        <span className="font-black">{locale === "bn" ? "অ্যাডমিন মন্তব্য: " : "Admin Note: "}</span>
                        <span className="font-bold">{cr.reviewNote}</span>
                      </div>
                    </div>
                  )}

                  {/* Reject Input box if actively rejecting */}
                  {rejectingId === cr.id && (
                    <div className="p-3 rounded-xl bg-[#FFEBEF] dark:bg-[#2F1418] border-2 border-black space-y-2 shadow-[3px_3px_0px_#000000]">
                      <label className="block text-xs font-black text-black dark:text-white">
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
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t-2 border-black">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 sm:flex-initial min-h-[40px] text-xs font-black"
                        onClick={() => {
                          setRejectingId(cr.id);
                          setRejectNote("");
                        }}
                        disabled={!!processingId}
                      >
                        <XCircle className="w-4 h-4 mr-1 stroke-[2.5]" />
                        {locale === "bn" ? "বাতিল করুন" : "Reject"}
                      </Button>
                      <Button
                        size="sm"
                        variant="neo"
                        className="bg-[#00BA88] hover:bg-[#009b72] text-white flex-1 sm:flex-initial min-h-[40px] text-xs font-black shadow-[3px_3px_0px_#000000]"
                        isLoading={processingId === cr.id}
                        onClick={() => handleApprove(cr.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                        {locale === "bn" ? "অনুমোদন ও কার্যকর করুন" : "Approve & Apply"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
