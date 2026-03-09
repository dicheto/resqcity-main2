-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('BLOCKING', 'COLLISION', 'PARKING_PROBLEM', 'TRAFFIC_VIOLATION', 'ACCIDENT', 'DAMAGE', 'THEFT_ATTEMPT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "registrationPlate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "vin" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_incidents" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "other_vehicle_plate" TEXT,
    "witness_contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "vehicle_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_photos" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "incident_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatcher_verifications" (
    "id" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "incidentId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,

    CONSTRAINT "dispatcher_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registrationPlate_key" ON "vehicles"("registrationPlate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_userId_idx" ON "vehicles"("userId");

-- CreateIndex
CREATE INDEX "vehicles_verified_idx" ON "vehicles"("verified");

-- CreateIndex
CREATE INDEX "vehicle_incidents_status_idx" ON "vehicle_incidents"("status");

-- CreateIndex
CREATE INDEX "vehicle_incidents_vehicleId_idx" ON "vehicle_incidents"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_incidents_userId_idx" ON "vehicle_incidents"("userId");

-- CreateIndex
CREATE INDEX "vehicle_incidents_createdAt_idx" ON "vehicle_incidents"("createdAt");

-- CreateIndex
CREATE INDEX "incident_photos_incidentId_idx" ON "incident_photos"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatcher_verifications_incidentId_key" ON "dispatcher_verifications"("incidentId");

-- CreateIndex
CREATE INDEX "dispatcher_verifications_status_idx" ON "dispatcher_verifications"("status");

-- CreateIndex
CREATE INDEX "dispatcher_verifications_incidentId_idx" ON "dispatcher_verifications"("incidentId");

-- CreateIndex
CREATE INDEX "dispatcher_verifications_dispatcherId_idx" ON "dispatcher_verifications"("dispatcherId");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_incidents" ADD CONSTRAINT "vehicle_incidents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_incidents" ADD CONSTRAINT "vehicle_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "vehicle_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_verifications" ADD CONSTRAINT "dispatcher_verifications_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "vehicle_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_verifications" ADD CONSTRAINT "dispatcher_verifications_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
