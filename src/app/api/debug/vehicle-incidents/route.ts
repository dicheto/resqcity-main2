import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check vehicle incidents in database
 * Only accessible to ADMIN/SUPER_ADMIN
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can access
    if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all incident counts
    const stats = {
      total: await prisma.vehicleIncident.count(),
      byStatus: await prisma.vehicleIncident.groupBy({
        by: ["status"],
        _count: true,
      }),
      recent: await prisma.vehicleIncident.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          type: true,
          description: true,
          createdAt: true,
          vehicle: {
            select: {
              registrationPlate: true,
              brand: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
          photos: {
            select: {
              id: true,
            },
          },
        },
      }),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Debug failed", details: String(error) },
      { status: 500 }
    );
  }
}
