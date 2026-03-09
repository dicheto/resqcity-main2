import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";
import { sendNotification, formatIncidentNotification } from "@/hooks/lib/notifications";
import { notifyUserIncident } from "@/hooks/lib/websocket";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and super_admin can access
    if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const incident = await prisma.vehicleIncident.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        photos: true,
        verification: {
          include: {
            dispatcher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and super_admin can verify
    if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const incident = await prisma.vehicleIncident.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        user: true,
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, notes, rejectionReason } = body;

    if (!["verify", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const newStatus = action === "verify" ? "VERIFIED" : "REJECTED";

    // Update incident status
    const updatedIncident = await prisma.vehicleIncident.update({
      where: { id: params.id },
      data: { status: newStatus as any },
    });

    // Create verification record
    const verification = await prisma.dispatcherVerification.create({
      data: {
        incidentId: params.id,
        dispatcherId: auth.user.userId,
        status: newStatus as any,
        notes,
        rejectionReason: action === "reject" ? rejectionReason : null,
      },
    });

    // Push notification to connected citizen clients (real-time in-app).
    const notificationMessage = formatIncidentNotification(
      incident.vehicle.registrationPlate,
      incident.type,
      newStatus as "VERIFIED" | "REJECTED",
      rejectionReason
    );

    notifyUserIncident(incident.userId, {
      incidentId: incident.id,
      status: newStatus,
      title: "Актуализация по сигнал за автомобил",
      message: notificationMessage,
      createdAt: new Date().toISOString(),
    });

    // SMS remains optional and is used only when enabled and phone is present.
    if (incident.user.phone) {
      try {
        const notificationSent = await sendNotification(
          incident.user.phone,
          notificationMessage,
          { type: "sms" }
        );

        if (notificationSent) {
          await prisma.dispatcherVerification.update({
            where: { id: verification.id },
            data: {
              notificationSent: true,
              notificationSentAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }

    return NextResponse.json({
      incident: updatedIncident,
      verification,
    });
  } catch (error) {
    console.error("Error verifying incident:", error);
    return NextResponse.json(
      { error: "Failed to verify incident" },
      { status: 500 }
    );
  }
}
