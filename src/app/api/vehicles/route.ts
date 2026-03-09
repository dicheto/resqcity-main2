import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/hooks/lib/auth";
import { prisma } from "@/hooks/lib/prisma";

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
    const {
      registrationPlate,
      brand,
      model,
      year,
      color,
      vin,
    } = body;

    // Validate required fields
    if (!registrationPlate || !brand || !model || !year) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if vehicle already exists for this user
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { registrationPlate },
    });

    if (existingVehicle && existingVehicle.userId !== auth.user.userId) {
      return NextResponse.json(
        { error: "Registration plate already registered by another user" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationPlate,
        brand,
        model,
        year: parseInt(year),
        color,
        vin,
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
