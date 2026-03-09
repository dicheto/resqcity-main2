-- DropIndex
DROP INDEX "report_categories_name_idx";

-- AlterTable
ALTER TABLE "report_categories" ADD COLUMN     "parentId" TEXT;

-- DropEnum
DROP TYPE "Category";

-- CreateIndex
CREATE INDEX "report_categories_parentId_idx" ON "report_categories"("parentId");

-- AddForeignKey
ALTER TABLE "report_categories" ADD CONSTRAINT "report_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "report_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
