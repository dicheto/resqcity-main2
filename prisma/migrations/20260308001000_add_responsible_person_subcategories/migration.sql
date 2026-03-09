-- Create table for many-to-many assignment: responsible person <-> taxonomy subcategory
CREATE TABLE IF NOT EXISTS "responsible_person_subcategories" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responsiblePersonId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "subcategoryName" TEXT NOT NULL,

  CONSTRAINT "responsible_person_subcategories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "responsible_person_subcategories_responsiblePersonId_categoryId_subcategoryName_key"
ON "responsible_person_subcategories"("responsiblePersonId", "categoryId", "subcategoryName");

CREATE INDEX IF NOT EXISTS "responsible_person_subcategories_categoryId_subcategoryName_idx"
ON "responsible_person_subcategories"("categoryId", "subcategoryName");

CREATE INDEX IF NOT EXISTS "responsible_person_subcategories_responsiblePersonId_idx"
ON "responsible_person_subcategories"("responsiblePersonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responsible_person_subcategories_responsiblePersonId_fkey'
  ) THEN
    ALTER TABLE "responsible_person_subcategories"
      ADD CONSTRAINT "responsible_person_subcategories_responsiblePersonId_fkey"
      FOREIGN KEY ("responsiblePersonId") REFERENCES "responsible_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responsible_person_subcategories_categoryId_fkey'
  ) THEN
    ALTER TABLE "responsible_person_subcategories"
      ADD CONSTRAINT "responsible_person_subcategories_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
