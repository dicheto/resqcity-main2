-- Align nullable/default drift after routing/dispatch migration

-- Prisma @updatedAt columns should not have default now()
ALTER TABLE "report_categories"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "responsible_persons"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Ensure categoryId is required
UPDATE "reports"
SET "categoryId" = (
  SELECT id FROM "report_categories" WHERE name = 'other' LIMIT 1
)
WHERE "categoryId" IS NULL;

ALTER TABLE "reports"
  ALTER COLUMN "categoryId" SET NOT NULL;
