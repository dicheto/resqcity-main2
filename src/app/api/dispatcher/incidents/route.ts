import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and super_admin can access dispatcher dashboard
    if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
      console.warn("[DispatcherIncidents] Forbidden access attempt", {
        userId: auth.user.userId,
        role: auth.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "UNDER_REVIEW";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log("[DispatcherIncidents] GET: Fetching incidents", {
      requestedStatus: status,
      limit,
      offset,
      admin: auth.user.userId,
    });

    const reviewStatuses = ["SUBMITTED", "UNDER_REVIEW"] as const;
    const statusFilter =
      status === "UNDER_REVIEW" ? { in: reviewStatuses } : (status as any);

    console.log("[DispatcherIncidents] GET: Status filter", {
      statusFilter,
      isUnderReview: status === "UNDER_REVIEW",
    });

    const [incidents, total] = await Promise.all([
      prisma.vehicleIncident.findMany({
        where: {
          status: statusFilter,
        },
        include: {
          vehicle: {
            select: {
              id: true,
              registrationPlate: true,
              brand: true,
              model: true,
              color: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          photos: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              uploadedAt: true,
            },
          },
          verification: {
            select: {
              id: true,
              status: true,
              notes: true,
              rejectionReason: true,
              verifiedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.vehicleIncident.count({
        where: { status: statusFilter },
      }),
    ]);

    console.log("[DispatcherIncidents] GET: Response", {
      incidentCount: incidents.length,
      total,
      hasMore: offset + limit < total,
    });

    return NextResponse.json({
      incidents,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Error fetching dispatcher incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}
