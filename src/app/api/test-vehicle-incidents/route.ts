import { NextRequest, NextResponse } from "next/server";

/**
 * Simple test endpoint to verify API is working
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Vehicle incidents API is working",
    timestamp: new Date().toISOString(),
  });
}
