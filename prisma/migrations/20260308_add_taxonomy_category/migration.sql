-- Add missing taxonomyCategory column to reports table
ALTER TABLE "public"."reports" ADD COLUMN "taxonomyCategory" TEXT;

-- Add index for better query performance
CREATE INDEX "reports_taxonomyCategory_idx" ON "public"."reports"("taxonomyCategory");
