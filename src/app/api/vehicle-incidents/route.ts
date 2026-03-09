import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";
import { uploadIncidentPhotos } from "@/hooks/lib/supabase-storage";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    const status = searchParams.get("status");

    const where: any = { userId: auth.user.userId };
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;

    const incidents = await prisma.vehicleIncident.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            registrationPlate: true,
            brand: true,
            model: true,
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
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      console.error("[VehicleIncidents] POST: Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[VehicleIncidents] POST: Creating incident for user", auth.user.userId);

    const formData = await req.formData();
    const vehicleId = formData.get("vehicleId") as string;
    const type = formData.get("type") as string;
    const description = formData.get("description") as string;
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
    const address = formData.get("address") as string;
    const otherVehiclePlate = formData.get("other_vehicle_plate") as string;
    const witnessContact = formData.get("witness_contact") as string;
    const photos = formData.getAll("photos") as File[];

    console.log("[VehicleIncidents] POST: Form data extracted", {
      vehicleId,
      type,
      description: description?.substring(0, 50),
      photoCount: photos.length,
    });

    // Validate required fields
    if (!vehicleId || !type || !description) {
      console.error("[VehicleIncidents] POST: Missing required fields", {
        vehicleId: !!vehicleId,
        type: !!type,
        description: !!description,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Photos are mandatory
    if (!photos || photos.length === 0) {
      console.error("[VehicleIncidents] POST: No photos provided");
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 }
      );
    }

    // Validate vehicle ownership
    console.log("[VehicleIncidents] POST: Checking vehicle ownership for", vehicleId);
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      console.error("[VehicleIncidents] POST: Vehicle not found", vehicleId);
      return NextResponse.json(
        { error: "Vehicle not found or not owned by user" },
        { status: 403 }
      );
    }

    if (vehicle.userId !== auth.user.userId) {
      console.error("[VehicleIncidents] POST: Vehicle not owned by user", {
        vehicleUserId: vehicle.userId,
        authUserId: auth.user.userId,
      });
      return NextResponse.json(
        { error: "Vehicle not found or not owned by user" },
        { status: 403 }
      );
    }

    // Create incident
    console.log("[VehicleIncidents] POST: Creating incident in database");
    const incident = await prisma.vehicleIncident.create({
      data: {
        vehicleId,
        userId: auth.user.userId,
        type: type as any,
        description,
        latitude,
        longitude,
        address,
        other_vehicle_plate: otherVehiclePlate,
        witness_contact: witnessContact,
        // New incidents go directly into dispatcher review queue.
        status: "UNDER_REVIEW",
      },
    });

    console.log("[VehicleIncidents] POST: Incident created successfully", {
      id: incident.id,
      status: incident.status,
    });

    // Upload photos to Supabase
    console.log("[VehicleIncidents] POST: Uploading", photos.length, "photos to Supabase");
    const uploadedPhotos = [];
    try {
      const uploadResults = await uploadIncidentPhotos(photos, incident.id);

      // Save photo metadata to database
      for (const uploadResult of uploadResults) {
        try {
          const photoRecord = await prisma.incidentPhoto.create({
            data: {
              incidentId: incident.id,
              fileName: uploadResult.fileName,
              filePath: uploadResult.publicUrl, // Store full public URL for direct display
              mimeType: uploadResult.mimeType,
              size: uploadResult.size,
            },
          });

          uploadedPhotos.push(photoRecord);
          console.log("[VehicleIncidents] POST: Photo metadata saved", uploadResult.fileName);
        } catch (dbError) {
          console.error("[VehicleIncidents] POST: Failed to save photo metadata", {
            fileName: uploadResult.fileName,
            error: String(dbError),
          });
        }
      }
    } catch (uploadError) {
      console.error("[VehicleIncidents] POST: Photo upload error", {
        error: String(uploadError),
      });
      // Even if photos fail, we still created the incident
      // Return partial success
    }

    // Fetch the created incident with photos and vehicle info
    console.log("[VehicleIncidents] POST: Fetching complete incident data");
    const fullIncident = await prisma.vehicleIncident.findUnique({
      where: { id: incident.id },
      include: {
        vehicle: {
          select: {
            registrationPlate: true,
            brand: true,
            model: true,
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
      },
    });

    console.log("[VehicleIncidents] POST: Success! Response", {
      id: fullIncident?.id,
      status: fullIncident?.status,
      photoCount: fullIncident?.photos.length,
    });

    return NextResponse.json(fullIncident, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    );
  }
}
