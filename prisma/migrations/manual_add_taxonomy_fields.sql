-- AlterTable ADD taxonomy_category and custom fields
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "taxonomy_category" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "custom_subcategory" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "custom_situation" TEXT;
