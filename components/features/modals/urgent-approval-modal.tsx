"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { formatDate } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiffViewer, getChangePurposeSummary } from "@/components/ui/diff-viewer";
import {
  BellRing,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  SkipForward,
  Building2,
  Store,
  User,
  Receipt,
  FileText,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function UrgentApprovalModal() {
  const { locale } = useTranslation();
  const { isAdmin, pendingApprovalsCount, refreshApprovals, triggerRefresh } = useApp();

  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll for latest pending approval when Admin is logged in
  const checkPendingRequests = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/approvals?status=PENDING");
      if (res.ok) {
        const data = await res.json();
        const pendingList: any[] = data.requests || [];
        // Find the first pending request that hasn't been skipped in this session
        const unhandled = pendingList.find((r) => !skippedIds.has(r.id));
        if (unhandled) {
          setActiveRequest(unhandled);
        } else {
          setActiveRequest(null);
        }
      }
    } catch (e) {
      console.warn("Could not poll pending approvals:", e);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    checkPendingRequests();
    // Poll every 10 seconds for new approvals
    const interval = setInterval(checkPendingRequests, 10000);
    return () => clearInterval(interval);
  }, [isAdmin, skippedIds, pendingApprovalsCount]);

  const handleApprove = async () => {
    if (!activeRequest) return;
    try {
      setIsProcessing(true);
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeRequest.id, status: "APPROVED" }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to approve request");
        return;
      }

      toast.success(
        locale === "bn"
          ? "অনুরোধটি সফলভাবে অনুমোদিত এবং সিস্টেমে কার্যকর করা হয়েছে!"
          : "Request approved and applied immediately!"
      );
      setActiveRequest(null);
      await refreshApprovals();
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest) return;
    try {
      setIsProcessing(true);
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeRequest.id,
          status: "REJECTED",
          reviewNote: rejectNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reject request");
        return;
      }

      toast.info(
        locale === "bn" ? "অনুরোধটি বাতিল করা হয়েছে" : "Request rejected"
      );
      setIsRejecting(false);
      setRejectNote("");
      setActiveRequest(null);
      await refreshApprovals();
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    if (!activeRequest) return;
    // Mark as skipped so popup doesn't repeatedly show this exact one
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.add(activeRequest.id);
      return next;
    });
    setActiveRequest(null);
    toast.info(
      locale === "bn"
        ? "অনুরোধটি আপাতত বাদ দেওয়া হয়েছে (পরে উপরের শিল্ড আইকনে ক্লিক করে সিদ্ধান্ত নিতে পারবেন)।"
        : "Skipped for now (you can review later from the top-bar shield icon)."
    );
  };

  if (!isAdmin || !activeRequest) return null;

  const purpose = getChangePurposeSummary({
    entityType: activeRequest.entityType,
    entityTitle: activeRequest.entityTitle,
    actionType: activeRequest.actionType,
    requestedBy: activeRequest.requestedBy,
    currentData: activeRequest.currentDataParsed,
    proposedData: activeRequest.proposedDataParsed,
    locale: locale as "bn" | "en",
  });

  return (
    <Dialog
      isOpen={!!activeRequest}
      onClose={handleSkip}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#FED734] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000] shrink-0">
            <BellRing className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-black dark:text-white leading-tight">
              {locale === "bn" ? "জরুরি অনুমোদনের আবেদন এসেছে!" : "New Approval Request Received!"}
            </h3>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-bold">
              {locale === "bn"
                ? "ম্যানেজার কর্তৃক পরিবর্তন প্রস্তাব — এখনই অনুমোদন, বাতিল অথবা বাদ দিন"
                : "Manager proposed modifications — Approve, Reject, or Skip for now"}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 w-full">
        {/* Request Metadata Card */}
        <div className="p-3 sm:p-4 rounded-xl border-2 border-black bg-white dark:bg-[#1E1F24] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_#000000]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-black dark:text-white">
                {activeRequest.entityTitle || `${activeRequest.entityType} ${activeRequest.entityId}`}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FED734] text-black border-2 border-black shadow-[1px_1px_0px_#000000]">
                {activeRequest.actionType === "RENT_REVISION"
                  ? locale === "bn" ? "ভাড়া সংশোধন" : "Rent Revision"
                  : activeRequest.actionType === "DELETE"
                  ? locale === "bn" ? "মুছে ফেলার আবেদন" : "Deletion Request"
                  : locale === "bn" ? "সম্পাদনা আবেদন" : "Edit Request"}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold mt-1">
              {locale === "bn"
                ? `প্রস্তাবক: ${activeRequest.requestedBy} (${activeRequest.requesterRole}) • সময়: ${formatDate(activeRequest.createdAt, locale)}`
                : `Requested by: ${activeRequest.requestedBy} (${activeRequest.requesterRole}) • ${formatDate(activeRequest.createdAt, locale)}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-black bg-[#FED734] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{locale === "bn" ? "অনুমোদন অপেক্ষমান" : "Pending Approval"}</span>
            </span>
          </div>
        </div>

        {/* 🎯 PURPOSE & HIGHLIGHTS OF CHANGE BANNER */}
        <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#262830] border-2 border-black text-xs space-y-2 shadow-[2px_2px_0px_#000000]">
          <div className="flex items-center gap-1.5 font-black text-black dark:text-white text-sm">
            <Target className="w-4 h-4 text-black dark:text-[#FED734] shrink-0 stroke-[2.5]" />
            <span>{locale === "bn" ? "পরিবর্তনের উদ্দেশ্য ও সারসংক্ষেপ:" : "Purpose of Change:"}</span>
          </div>
          {purpose.bullets.length > 0 ? (
            <ul className="space-y-1.5 pl-5 list-disc text-black dark:text-white font-bold text-xs sm:text-sm">
              {purpose.bullets.map((b, idx) => (
                <li key={idx} className="leading-snug">
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-600 dark:text-neutral-300 font-bold">
              {locale === "bn"
                ? "ম্যানেজার কর্তৃক তথ্য সংশোধনের আবেদন।"
                : "Manager requested update for this record."}
            </p>
          )}
        </div>

        {/* 👁️ PREVIEW WHAT JUST CHANGED (STRICTLY MODIFIED FIELDS ONLY) */}
        <div className="rounded-xl border-2 border-black p-2 sm:p-3 bg-white dark:bg-[#1E1F24] shadow-[3px_3px_0px_#000000]">
          <DiffViewer
            currentData={activeRequest.currentDataParsed}
            proposedData={activeRequest.proposedDataParsed}
            title={locale === "bn" ? "কেবলমাত্র পরিবর্তিত তথ্যের পার্থক্য (What have ➔ What will have)" : "Modified Fields Only"}
            hideUnchanged={true}
          />
        </div>

        {/* Rejection Note Input Box */}
        {isRejecting && (
          <div className="p-3 rounded-xl bg-[#FFEBEF] dark:bg-[#2F1418] border-2 border-black space-y-2 shadow-[3px_3px_0px_#000000] animate-in fade-in">
            <label className="block text-xs font-black text-black dark:text-white">
              {locale === "bn" ? "বাতিল করার কারণ (ঐচ্ছিক):" : "Rejection Reason (Optional):"}
            </label>
            <Input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder={locale === "bn" ? "যেমন: ভাড়ার অঙ্ক সঠিক নয়..." : "e.g. Invalid rent rate..."}
              autoFocus
            />
          </div>
        )}

        {/* ACTION BUTTONS: SKIP NOW, REJECT, OR APPROVE ON TIME */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t-2 border-black">
          {/* Skip for Now button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isProcessing}
            className="text-black dark:text-white border-2 border-black min-h-[44px] text-xs font-black justify-center shadow-[2px_2px_0px_#000000] order-3 sm:order-1"
          >
            <SkipForward className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            <span>{locale === "bn" ? "এখন বাদ দিন (Skip for Now)" : "Skip for Now"}</span>
          </Button>

          {/* Right Action buttons: Reject / Approve */}
          <div className="flex items-center gap-2 order-1 sm:order-2 flex-1 sm:flex-initial">
            {!isRejecting ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsRejecting(true)}
                disabled={isProcessing}
                className="min-h-[44px] text-xs font-black flex-1 sm:flex-initial justify-center shadow-[2px_2px_0px_#000000]"
              >
                <XCircle className="w-4 h-4 mr-1 stroke-[2.5]" />
                <span>{locale === "bn" ? "বাতিল (Reject)" : "Reject"}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                isLoading={isProcessing}
                className="min-h-[44px] text-xs font-black flex-1 sm:flex-initial justify-center shadow-[2px_2px_0px_#000000]"
              >
                <XCircle className="w-4 h-4 mr-1 stroke-[2.5]" />
                <span>{locale === "bn" ? "নিশ্চিত বাতিল করুন" : "Confirm Reject"}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="neo"
              onClick={handleApprove}
              isLoading={isProcessing}
              className="bg-[#00BA88] hover:bg-[#009b72] text-white min-h-[44px] text-xs sm:text-sm flex-1 sm:flex-initial justify-center shadow-[3px_3px_0px_#000000] font-black"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              <span>{locale === "bn" ? "অনুমোদন করুন (Approve Now)" : "Approve Now"}</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
