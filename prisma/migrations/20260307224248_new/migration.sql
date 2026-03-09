/*
  Warnings:

  - You are about to drop the column `parentId` on the `report_categories` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "report_categories" DROP CONSTRAINT "report_categories_parentId_fkey";

-- DropIndex
DROP INDEX "report_categories_parentId_idx";

-- DropIndex
DROP INDEX "report_routing_targets_reportId_institutionId_key";

-- AlterTable
ALTER TABLE "passkey_credentials" ALTER COLUMN "transports" DROP DEFAULT;

-- AlterTable
ALTER TABLE "report_categories" DROP COLUMN "parentId";

-- CreateIndex
CREATE INDEX "report_routing_targets_reportId_idx" ON "report_routing_targets"("reportId");

-- CreateIndex
CREATE INDEX "report_routing_targets_adHocInstitutionId_idx" ON "report_routing_targets"("adHocInstitutionId");

-- CreateIndex
CREATE INDEX "report_routing_targets_recommendation_idx" ON "report_routing_targets"("recommendation");

-- RenameIndex
ALTER INDEX "responsible_person_subcategories_responsiblePersonId_categoryId" RENAME TO "responsible_person_subcategories_responsiblePersonId_catego_key";
