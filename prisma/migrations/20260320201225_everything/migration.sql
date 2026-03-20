-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'ADMIN', 'MUNICIPAL_COUNCILOR', 'INSTITUTION', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "RecommendationSource" AS ENUM ('SITUATION', 'SUBCATEGORY', 'CATEGORY', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoutingSource" AS ENUM ('CATEGORY_DEFAULT', 'ADMIN_UPDATED');

-- CreateEnum
CREATE TYPE "DispatchBatchStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'SENT');

-- CreateEnum
CREATE TYPE "DispatchDocumentKind" AS ENUM ('DRAFT', 'SIGNED');

-- CreateEnum
CREATE TYPE "AuthChallengeKind" AS ENUM ('LOGIN_MFA', 'TOTP_ENROLL', 'PASSKEY_REGISTRATION', 'PASSKEY_AUTHENTICATION');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('BLOCKING', 'COLLISION', 'PARKING_PROBLEM', 'TRAFFIC_VIOLATION', 'ACCIDENT', 'DAMAGE', 'THEFT_ATTEMPT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "kepVerified" BOOLEAN NOT NULL DEFAULT false,
    "kepId" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "taxonomyCategory" TEXT,
    "taxonomySubcategory" TEXT,
    "taxonomySituation" TEXT,
    "customSubcategory" TEXT,
    "customSituation" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "district" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedToId" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_history" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" "ReportStatus",
    "newStatus" "ReportStatus",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportId" TEXT NOT NULL,

    CONSTRAINT "report_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBg" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsible_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT,
    "district" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "responsible_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsible_person_subcategories" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsiblePersonId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryName" TEXT NOT NULL,

    CONSTRAINT "responsible_person_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_accounts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "institution_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_institutions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "category_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_routing_targets" (
    "id" TEXT NOT NULL,
    "source" "RoutingSource" NOT NULL DEFAULT 'CATEGORY_DEFAULT',
    "recommendation" "RecommendationSource" NOT NULL DEFAULT 'SITUATION',
    "included" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT NOT NULL,
    "institutionId" TEXT,
    "adHocInstitutionId" TEXT,

    CONSTRAINT "report_routing_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_hoc_institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "contactPerson" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportId" TEXT NOT NULL,

    CONSTRAINT "ad_hoc_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_recipient_customizations" (
    "id" TEXT NOT NULL,
    "customName" TEXT,
    "customEmail" TEXT,
    "customPhone" TEXT,
    "customNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT NOT NULL,
    "routingTargetId" TEXT NOT NULL,

    CONSTRAINT "report_recipient_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_dispatch_batches" (
    "id" TEXT NOT NULL,
    "status" "DispatchBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "institutionId" TEXT NOT NULL,
    "generatedById" TEXT,

    CONSTRAINT "institution_dispatch_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_batch_items" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "routingTargetId" TEXT,

    CONSTRAINT "dispatch_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_documents" (
    "id" TEXT NOT NULL,
    "kind" "DispatchDocumentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "dispatch_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "webauthnUserId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "deviceType" TEXT,
    "backedUp" BOOLEAN,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AuthChallengeKind" NOT NULL,
    "challenge" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_kepId_key" ON "users"("kepId");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_categoryId_idx" ON "reports"("categoryId");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "reports_district_idx" ON "reports"("district");

-- CreateIndex
CREATE INDEX "reports_isPublic_idx" ON "reports"("isPublic");

-- CreateIndex
CREATE INDEX "responsible_persons_district_idx" ON "responsible_persons"("district");

-- CreateIndex
CREATE INDEX "responsible_persons_categoryId_idx" ON "responsible_persons"("categoryId");

-- CreateIndex
CREATE INDEX "responsible_person_subcategories_categoryId_subcategoryName_idx" ON "responsible_person_subcategories"("categoryId", "subcategoryName");

-- CreateIndex
CREATE INDEX "responsible_person_subcategories_responsiblePersonId_idx" ON "responsible_person_subcategories"("responsiblePersonId");

-- CreateIndex
CREATE UNIQUE INDEX "responsible_person_subcategories_responsiblePersonId_catego_key" ON "responsible_person_subcategories"("responsiblePersonId", "categoryId", "subcategoryName");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");

-- CreateIndex
CREATE INDEX "institution_accounts_institutionId_idx" ON "institution_accounts"("institutionId");

-- CreateIndex
CREATE INDEX "institution_accounts_userId_idx" ON "institution_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "institution_accounts_institutionId_userId_key" ON "institution_accounts"("institutionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "category_institutions_categoryId_institutionId_key" ON "category_institutions"("categoryId", "institutionId");

-- CreateIndex
CREATE INDEX "report_routing_targets_reportId_idx" ON "report_routing_targets"("reportId");

-- CreateIndex
CREATE INDEX "report_routing_targets_institutionId_idx" ON "report_routing_targets"("institutionId");

-- CreateIndex
CREATE INDEX "report_routing_targets_adHocInstitutionId_idx" ON "report_routing_targets"("adHocInstitutionId");

-- CreateIndex
CREATE INDEX "report_routing_targets_included_idx" ON "report_routing_targets"("included");

-- CreateIndex
CREATE INDEX "report_routing_targets_recommendation_idx" ON "report_routing_targets"("recommendation");

-- CreateIndex
CREATE INDEX "ad_hoc_institutions_reportId_idx" ON "ad_hoc_institutions"("reportId");

-- CreateIndex
CREATE INDEX "report_recipient_customizations_reportId_idx" ON "report_recipient_customizations"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "report_recipient_customizations_reportId_routingTargetId_key" ON "report_recipient_customizations"("reportId", "routingTargetId");

-- CreateIndex
CREATE INDEX "institution_dispatch_batches_institutionId_status_idx" ON "institution_dispatch_batches"("institutionId", "status");

-- CreateIndex
CREATE INDEX "dispatch_batch_items_reportId_idx" ON "dispatch_batch_items"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_batch_items_batchId_reportId_key" ON "dispatch_batch_items"("batchId", "reportId");

-- CreateIndex
CREATE INDEX "dispatch_documents_batchId_kind_idx" ON "dispatch_documents"("batchId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentials_credentialId_key" ON "passkey_credentials"("credentialId");

-- CreateIndex
CREATE INDEX "passkey_credentials_userId_idx" ON "passkey_credentials"("userId");

-- CreateIndex
CREATE INDEX "auth_challenges_userId_kind_idx" ON "auth_challenges"("userId", "kind");

-- CreateIndex
CREATE INDEX "auth_challenges_expiresAt_idx" ON "auth_challenges"("expiresAt");

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
ALTER TABLE "reports" ADD CONSTRAINT "reports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "responsible_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_history" ADD CONSTRAINT "report_history_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsible_persons" ADD CONSTRAINT "responsible_persons_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsible_person_subcategories" ADD CONSTRAINT "responsible_person_subcategories_responsiblePersonId_fkey" FOREIGN KEY ("responsiblePersonId") REFERENCES "responsible_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsible_person_subcategories" ADD CONSTRAINT "responsible_person_subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_accounts" ADD CONSTRAINT "institution_accounts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_accounts" ADD CONSTRAINT "institution_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_institutions" ADD CONSTRAINT "category_institutions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_institutions" ADD CONSTRAINT "category_institutions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_routing_targets" ADD CONSTRAINT "report_routing_targets_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_routing_targets" ADD CONSTRAINT "report_routing_targets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_routing_targets" ADD CONSTRAINT "report_routing_targets_adHocInstitutionId_fkey" FOREIGN KEY ("adHocInstitutionId") REFERENCES "ad_hoc_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_hoc_institutions" ADD CONSTRAINT "ad_hoc_institutions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_recipient_customizations" ADD CONSTRAINT "report_recipient_customizations_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_recipient_customizations" ADD CONSTRAINT "report_recipient_customizations_routingTargetId_fkey" FOREIGN KEY ("routingTargetId") REFERENCES "report_routing_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_dispatch_batches" ADD CONSTRAINT "institution_dispatch_batches_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_dispatch_batches" ADD CONSTRAINT "institution_dispatch_batches_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_batch_items" ADD CONSTRAINT "dispatch_batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "institution_dispatch_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_batch_items" ADD CONSTRAINT "dispatch_batch_items_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_batch_items" ADD CONSTRAINT "dispatch_batch_items_routingTargetId_fkey" FOREIGN KEY ("routingTargetId") REFERENCES "report_routing_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_documents" ADD CONSTRAINT "dispatch_documents_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "institution_dispatch_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_documents" ADD CONSTRAINT "dispatch_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
