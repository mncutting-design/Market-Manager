import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePolicy } from "@/lib/policy";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "GLOBAL";
    const marketId = searchParams.get("marketId") || undefined;
    const tenantId = searchParams.get("tenantId") || undefined;

    const effective = await getEffectivePolicy({ marketId, tenantId });

    // Fetch version history for this policy
    const history = await prisma.policyVersion.findMany({
      where: { policyId: effective.policyId },
      orderBy: { versionNumber: "desc" },
      select: {
        id: true,
        versionNumber: true,
        effectiveFrom: true,
        requiredAdvanceMonths: true,
        rentDueDay: true,
        gracePeriodDays: true,
        lateFeeType: true,
        lateFeeAmount: true,
        lateFeeCap: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      policyId: effective.policyId,
      versionId: effective.versionId,
      versionNumber: effective.versionNumber,
      policy: effective.data,
      history,
    });
  } catch (error) {
    console.error("Failed to fetch policy:", error);
    return NextResponse.json(
      { error: "Failed to fetch policy" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update policy settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      policyId,
      requiredAdvanceMonths,
      requiredAdvanceFixed,
      rentDueDay,
      gracePeriodDays,
      lateFeeType,
      lateFeeAmount,
      lateFeeCap,
      noticePeriodDays,
      noticePenaltyAmount,
      advanceRefundDeadlineDays,
      requireAdvanceTopup,
      annualRentIncreasePercent,
      contractExpiryWarningDays,
      overdueEscalation,
      allowedDeductions,
      rulesTextEn,
      rulesTextBn,
    } = body;

    // Get current policy
    let targetPolicy = null;
    if (policyId) {
      targetPolicy = await prisma.tenantPolicy.findUnique({
        where: { id: policyId },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      });
    }

    if (!targetPolicy) {
      targetPolicy = await prisma.tenantPolicy.findFirst({
        where: { scope: "GLOBAL" },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      });
    }

    if (!targetPolicy) {
      targetPolicy = await prisma.tenantPolicy.create({
        data: { scope: "GLOBAL" },
        include: { versions: true },
      });
    }

    const currentVersionNumber = targetPolicy.versions?.[0]?.versionNumber || 0;
    const nextVersionNumber = currentVersionNumber + 1;

    // Create a new immutable policy version
    const newVersion = await prisma.policyVersion.create({
      data: {
        policyId: targetPolicy.id,
        versionNumber: nextVersionNumber,
        effectiveFrom: new Date(),
        requiredAdvanceMonths: Number(requiredAdvanceMonths ?? 3),
        requiredAdvanceFixed: requiredAdvanceFixed ? Math.round(Number(requiredAdvanceFixed)) : null,
        rentDueDay: Number(rentDueDay ?? 10),
        gracePeriodDays: Number(gracePeriodDays ?? 5),
        lateFeeType: lateFeeType || "NONE",
        lateFeeAmount: Math.round(Number(lateFeeAmount ?? 0)),
        lateFeeCap: lateFeeCap ? Math.round(Number(lateFeeCap)) : null,
        noticePeriodDays: Number(noticePeriodDays ?? 30),
        noticePenaltyAmount: Math.round(Number(noticePenaltyAmount ?? 0)),
        advanceRefundDeadlineDays: Number(advanceRefundDeadlineDays ?? 15),
        requireAdvanceTopup: requireAdvanceTopup ?? true,
        annualRentIncreasePercent: Number(annualRentIncreasePercent ?? 10),
        contractExpiryWarningDays: Number(contractExpiryWarningDays ?? 60),
        overdueEscalationJson: JSON.stringify(overdueEscalation || []),
        allowedDeductionsJson: JSON.stringify(allowedDeductions || []),
        rulesTextEn: rulesTextEn?.trim() || "",
        rulesTextBn: rulesTextBn?.trim() || "",
        createdById: session.id,
      },
    });

    // Record audit log
    await logAudit({
      userId: session.id,
      userName: session.name,
      action: "POLICY_UPDATED",
      entityType: "TenantPolicy",
      entityId: targetPolicy.id,
      details: {
        versionNumber: nextVersionNumber,
        effectiveFrom: newVersion.effectiveFrom,
        changes: {
          requiredAdvanceMonths,
          rentDueDay,
          gracePeriodDays,
          lateFeeType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      policyId: targetPolicy.id,
      version: newVersion,
    });
  } catch (error) {
    console.error("Failed to save policy version:", error);
    return NextResponse.json(
      { error: "Failed to save policy version" },
      { status: 500 }
    );
  }
}
