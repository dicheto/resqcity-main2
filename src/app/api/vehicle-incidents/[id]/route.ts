import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incident = await prisma.vehicleIncident.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        photos: true,
        verification: {
          include: {
            dispatcher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (
      incident.userId !== auth.user.userId &&
      auth.user.role !== "ADMIN" &&
      auth.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incident = await prisma.vehicleIncident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Only allow deletion by owner or admin, and only if not verified
    if (incident.userId !== auth.user.userId && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (incident.status === "VERIFIED") {
      return NextResponse.json(
        { error: "Cannot delete a verified incident" },
        { status: 400 }
      );
    }

    await prisma.vehicleIncident.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting incident:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}
