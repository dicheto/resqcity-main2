import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId: auth.user.userId },
      select: {
        id: true,
        registrationPlate: true,
        brand: true,
        model: true,
        year: true,
        color: true,
        verified: true,
        active: true,
        createdAt: true,
        incidents: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { registrationPlate, brand, model, year, color, vin } = body;

    const normalizedRegistrationPlate = String(registrationPlate || "")
      .trim()
      .toUpperCase();
    const normalizedBrand = String(brand || "").trim();
    const normalizedModel = String(model || "").trim();
    const normalizedColor = typeof color === "string" ? color.trim() || null : null;
    const normalizedVin = typeof vin === "string" ? vin.trim().toUpperCase() || null : null;
    const parsedYear = Number.parseInt(String(year), 10);

    // Validate required fields
    if (!normalizedRegistrationPlate || !normalizedBrand || !normalizedModel || Number.isNaN(parsedYear)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if vehicle already exists for this user
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { registrationPlate: normalizedRegistrationPlate },
    });

    if (existingVehicle && existingVehicle.userId !== auth.user.userId) {
      return NextResponse.json(
        { error: "Registration plate already registered by another user" },
        { status: 400 }
      );
    }

    if (existingVehicle && existingVehicle.userId === auth.user.userId) {
      return NextResponse.json(
        { error: "Vehicle with this registration plate already exists" },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationPlate: normalizedRegistrationPlate,
        brand: normalizedBrand,
        model: normalizedModel,
        year: parsedYear,
        color: normalizedColor,
        vin: normalizedVin,
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Vehicle with duplicate unique field already exists" },
        { status: 409 }
      );
    }

    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
