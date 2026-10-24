import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        shop: {
          include: {
            market: true,
          },
        },
        rentHistory: {
          orderBy: { effectiveFrom: "desc" },
        },
        advanceTransactions: {
          orderBy: { createdAt: "desc" },
        },
        topUpRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Failed to fetch tenant details:", error);
    return NextResponse.json({ error: "Failed to fetch tenant details" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      phone,
      nid,
      permanentAddress,
      referenceName,
      referencePhone,
      referenceRelation,
      photoUrl,
      documentUrl,
      rentAmount,
      advanceDeposit,
      effectiveFrom,
      startDate,
      endDate,
      status,
      note,
    } = body;

    const existing = await prisma.tenant.findUnique({
      where: { id },
      include: {
        shop: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const isAdmin = session.role === "ADMIN";
    const isCollector = session.role === "COLLECTOR" || session.role === "OPERATOR";

    if (isCollector) {
      return NextResponse.json(
        { error: "কালেকশন স্টাফ ভাড়াটিয়ার তথ্য সম্পাদনা করতে পারবেন না।" },
        { status: 403 }
      );
    }

    // If Manager edits, submit as ChangeRequest for admin approval
    if (!isAdmin) {
      const isJamanotChange =
        advanceDeposit !== undefined &&
        Math.round(Number(advanceDeposit)) !== existing.advanceDeposit;

      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "TENANT",
          entityId: id,
          entityTitle: `ভাড়াটিয়া: ${existing.name} (${existing.shop.shopNumber})`,
          actionType: "EDIT",
          status: "PENDING",
          currentData: JSON.stringify({
            name: existing.name,
            phone: existing.phone,
            nid: existing.nid,
            permanentAddress: existing.permanentAddress,
            referenceName: existing.referenceName,
            referencePhone: existing.referencePhone,
            referenceRelation: existing.referenceRelation,
            rentAmount: existing.rentAmount,
            advanceDeposit: existing.advanceDeposit,
          }),
          proposedData: JSON.stringify({
            name: name !== undefined ? name?.trim() : undefined,
            phone: phone !== undefined ? phone?.trim() : undefined,
            nid: nid !== undefined ? nid?.trim() || null : undefined,
            permanentAddress: permanentAddress !== undefined ? permanentAddress?.trim() || null : undefined,
            referenceName: referenceName !== undefined ? referenceName?.trim() || null : undefined,
            referencePhone: referencePhone !== undefined ? referencePhone?.trim() || null : undefined,
            referenceRelation: referenceRelation !== undefined ? referenceRelation?.trim() || null : undefined,
            rentAmount: rentAmount !== undefined ? Math.round(Number(rentAmount)) : undefined,
            advanceDeposit: advanceDeposit !== undefined ? Math.round(Number(advanceDeposit)) : undefined,
            effectiveFrom: effectiveFrom || undefined,
            note: note?.trim() || undefined,
          }),
          requestedBy: session.name || "Manager",
          requesterRole: session.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: isJamanotChange
          ? "জামানতের পরিমাণ পরিবর্তনের আবেদন প্রধান অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে"
          : "ভাড়াটিয়ার তথ্য পরিবর্তনের আবেদন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    // Direct update by Admin: calculate diffs for audit log
    const diffs: Record<string, { old: any; new: any }> = {};
    const updatedData: any = {};

    if (name !== undefined && name.trim() !== existing.name) {
      diffs.name = { old: existing.name, new: name.trim() };
      updatedData.name = name.trim();
    }
    if (phone !== undefined && phone.trim() !== existing.phone) {
      diffs.phone = { old: existing.phone, new: phone.trim() };
      updatedData.phone = phone.trim();
    }
    if (nid !== undefined && (nid?.trim() || null) !== existing.nid) {
      diffs.nid = { old: existing.nid, new: nid?.trim() || null };
      updatedData.nid = nid?.trim() || null;
    }
    if (permanentAddress !== undefined && (permanentAddress?.trim() || null) !== existing.permanentAddress) {
      diffs.permanentAddress = { old: existing.permanentAddress, new: permanentAddress?.trim() || null };
      updatedData.permanentAddress = permanentAddress?.trim() || null;
    }
    if (referenceName !== undefined && (referenceName?.trim() || null) !== existing.referenceName) {
      diffs.referenceName = { old: existing.referenceName, new: referenceName?.trim() || null };
      updatedData.referenceName = referenceName?.trim() || null;
    }
    if (referencePhone !== undefined && (referencePhone?.trim() || null) !== existing.referencePhone) {
      diffs.referencePhone = { old: existing.referencePhone, new: referencePhone?.trim() || null };
      updatedData.referencePhone = referencePhone?.trim() || null;
    }
    if (referenceRelation !== undefined && (referenceRelation?.trim() || null) !== existing.referenceRelation) {
      diffs.referenceRelation = { old: existing.referenceRelation, new: referenceRelation?.trim() || null };
      updatedData.referenceRelation = referenceRelation?.trim() || null;
    }
    if (photoUrl !== undefined && photoUrl !== existing.photoUrl) {
      diffs.photoUrl = { old: existing.photoUrl, new: photoUrl };
      updatedData.photoUrl = photoUrl;
    }
    if (documentUrl !== undefined && documentUrl !== existing.documentUrl) {
      diffs.documentUrl = { old: existing.documentUrl, new: documentUrl };
      updatedData.documentUrl = documentUrl;
    }
    if (startDate !== undefined) {
      const d = new Date(startDate);
      if (d.toISOString() !== existing.startDate.toISOString()) {
        diffs.startDate = { old: existing.startDate, new: d };
        updatedData.startDate = d;
      }
    }
    if (endDate !== undefined) {
      const d = endDate ? new Date(endDate) : null;
      if (d?.toISOString() !== existing.endDate?.toISOString()) {
        diffs.endDate = { old: existing.endDate, new: d };
        updatedData.endDate = d;
      }
    }
    if (status !== undefined && status !== existing.status) {
      diffs.status = { old: existing.status, new: status };
      updatedData.status = status;
    }

    // Check rent amount changes
    let rentChanged = false;
    let newRentPaisa = existing.rentAmount;
    if (rentAmount !== undefined) {
      const parsed = Math.round(Number(rentAmount));
      if (parsed > 0 && parsed !== existing.rentAmount) {
        rentChanged = true;
        newRentPaisa = parsed;
        diffs.rentAmount = { old: existing.rentAmount, new: newRentPaisa };
        updatedData.rentAmount = newRentPaisa;
      }
    }

    // Check advance deposit (jamanot) changes
    let advanceDepositChanged = false;
    let newAdvanceDepositPaisa = existing.advanceDeposit;
    if (advanceDeposit !== undefined) {
      const parsed = Math.round(Number(advanceDeposit));
      if (parsed >= 0 && parsed !== existing.advanceDeposit) {
        advanceDepositChanged = true;
        newAdvanceDepositPaisa = parsed;
        diffs.advanceDeposit = { old: existing.advanceDeposit, new: newAdvanceDepositPaisa };
        updatedData.advanceDeposit = newAdvanceDepositPaisa;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resTenant = await tx.tenant.update({
        where: { id },
        data: updatedData,
        include: {
          shop: { include: { market: true } },
          rentHistory: { orderBy: { effectiveFrom: "desc" } },
        },
      });

      // Record rent history if rent was revised
      if (rentChanged) {
        const effDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
        await tx.rentHistory.create({
          data: {
            shopId: existing.shopId,
            tenantId: existing.id,
            rentAmount: newRentPaisa,
            effectiveFrom: effDate,
            note: note?.trim() || `Rent revised from ৳${(existing.rentAmount / 100).toLocaleString()} to ৳${(newRentPaisa / 100).toLocaleString()}`,
          },
        });

        // Also update defaultRent on shop
        await tx.shop.update({
          where: { id: existing.shopId },
          data: { defaultRent: newRentPaisa },
        });
      }

      // Record advance ledger transaction if advance deposit was edited
      if (advanceDepositChanged) {
        const delta = newAdvanceDepositPaisa - existing.advanceDeposit;
        if (delta !== 0) {
          await tx.advanceTransaction.create({
            data: {
              tenantId: existing.id,
              type: delta > 0 ? "TOPUP" : "DEDUCTION",
              amount: Math.abs(delta),
              reason: note?.trim() || (delta > 0
                ? `Admin updated security deposit: +৳${(delta / 100).toLocaleString()}`
                : `Admin adjusted security deposit: -৳${(Math.abs(delta) / 100).toLocaleString()}`),
              createdBy: session.name || "Admin",
              createdByName: session.name || "Admin",
              enteredById: session.id,
            },
          });
        }
      }

      // Write audit log entry for every edit
      if (Object.keys(diffs).length > 0) {
        await logAudit({
          userId: session.id,
          userName: session.name || "Admin",
          action: "TENANT_UPDATED",
          entityType: "Tenant",
          entityId: id,
          details: {
            tenantName: existing.name,
            shopNumber: existing.shop.shopNumber,
            diffs,
            updatedBy: session.name,
          },
          tx,
        });
      }

      return resTenant;
    });

    return NextResponse.json({ success: true, tenant: updated, diffs });
  } catch (error) {
    console.error("Failed to update tenant details:", error);
    return NextResponse.json({ error: "Failed to update tenant details" }, { status: 500 });
  }
}
