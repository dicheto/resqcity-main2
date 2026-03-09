-- CreateEnum
CREATE TYPE "RecommendationSource" AS ENUM ('SITUATION', 'SUBCATEGORY', 'CATEGORY', 'OTHER');

-- AlterTable  
ALTER TABLE "report_routing_targets" ADD COLUMN "adHocInstitutionId" TEXT,
ADD COLUMN "recommendation" "RecommendationSource" NOT NULL DEFAULT 'SITUATION';

-- Drop old unique constraint if it exists
ALTER TABLE "report_routing_targets" DROP CONSTRAINT IF EXISTS "report_routing_targets_reportId_institutionId_key";

-- Make institutionId nullable  
ALTER TABLE "report_routing_targets" ALTER COLUMN "institutionId" DROP NOT NULL;

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

-- CreateIndex
CREATE INDEX "ad_hoc_institutions_reportId_idx" ON "ad_hoc_institutions"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "report_recipient_customizations_reportId_routingTargetId_key" ON "report_recipient_customizations"("reportId", "routingTargetId");

-- CreateIndex
CREATE INDEX "report_recipient_customizations_reportId_idx" ON "report_recipient_customizations"("reportId");

-- AddForeignKey
ALTER TABLE "ad_hoc_institutions" ADD CONSTRAINT "ad_hoc_institutions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_routing_targets" ADD CONSTRAINT "report_routing_targets_adHocInstitutionId_fkey" FOREIGN KEY ("adHocInstitutionId") REFERENCES "ad_hoc_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_recipient_customizations" ADD CONSTRAINT "report_recipient_customizations_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_recipient_customizations" ADD CONSTRAINT "report_recipient_customizations_routingTargetId_fkey" FOREIGN KEY ("routingTargetId") REFERENCES "report_routing_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
