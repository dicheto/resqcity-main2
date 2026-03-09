-- Add municipal councilor role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MUNICIPAL_COUNCILOR';

-- Backfill structures that may be missing in older migration chains (required for shadow DB)
CREATE TABLE IF NOT EXISTS "report_categories" (
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

CREATE INDEX IF NOT EXISTS "report_categories_name_idx" ON "report_categories"("name");

INSERT INTO "report_categories" (
  "id", "name", "nameEn", "nameBg", "description", "icon", "color", "active", "createdAt", "updatedAt"
)
SELECT * FROM (
  VALUES
    ('cat-pothole', 'pothole', 'Pothole', 'Дупка на пътя', 'Повреди на пътната настилка, дупки, неравности', '🕳️', '#ef4444', true, NOW(), NOW()),
    ('cat-street-light', 'street_light', 'Street Light', 'Улично осветление', 'Неработещо или повредено улично осветление', '💡', '#f59e0b', true, NOW(), NOW()),
    ('cat-garbage', 'garbage', 'Garbage', 'Боклук', 'Нерегламентирано изхвърляне на боклук, препълнени контейнери', '🗑️', '#10b981', true, NOW(), NOW()),
    ('cat-graffiti', 'graffiti', 'Graffiti', 'Графити', 'Нежелани графити и вандализъм', '🎨', '#8b5cf6', true, NOW(), NOW()),
    ('cat-traffic-signal', 'traffic_signal', 'Traffic Signal', 'Светофар', 'Неработещ или повреден светофар', '🚦', '#ec4899', true, NOW(), NOW()),
    ('cat-water-leak', 'water_leak', 'Water Leak', 'Теч на вода', 'Течове на водопроводи, канализация', '💧', '#06b6d4', true, NOW(), NOW()),
    ('cat-park-maintenance', 'park_maintenance', 'Park Maintenance', 'Поддръжка на парк', 'Проблеми с поддръжката на паркове и зелени площи', '🌳', '#84cc16', true, NOW(), NOW()),
    ('cat-noise-complaint', 'noise_complaint', 'Noise Complaint', 'Шумово замърсяване', 'Оплаквания за прекомерен шум', '🔊', '#f97316', true, NOW(), NOW()),
    ('cat-illegal-parking', 'illegal_parking', 'Illegal Parking', 'Незаконно паркиране', 'Неправилно паркирани автомобили', '🚗', '#6366f1', true, NOW(), NOW()),
    ('cat-other', 'other', 'Other', 'Друго', 'Други проблеми', '📝', '#64748b', true, NOW(), NOW())
) AS seed(
  "id", "name", "nameEn", "nameBg", "description", "icon", "color", "active", "createdAt", "updatedAt"
)
WHERE NOT EXISTS (
  SELECT 1 FROM "report_categories" rc WHERE rc."name" = seed."name"
);

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "district" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'category'
  ) THEN
    UPDATE "reports" r
    SET "categoryId" = rc."id"
    FROM "report_categories" rc
    WHERE r."categoryId" IS NULL
      AND (
        (r."category" = 'POTHOLE' AND rc."name" = 'pothole') OR
        (r."category" = 'STREET_LIGHT' AND rc."name" = 'street_light') OR
        (r."category" = 'GARBAGE' AND rc."name" = 'garbage') OR
        (r."category" = 'GRAFFITI' AND rc."name" = 'graffiti') OR
        (r."category" = 'TRAFFIC_SIGNAL' AND rc."name" = 'traffic_signal') OR
        (r."category" = 'WATER_LEAK' AND rc."name" = 'water_leak') OR
        (r."category" = 'PARK_MAINTENANCE' AND rc."name" = 'park_maintenance') OR
        (r."category" = 'NOISE_COMPLAINT' AND rc."name" = 'noise_complaint') OR
        (r."category" = 'ILLEGAL_PARKING' AND rc."name" = 'illegal_parking') OR
        (r."category" = 'OTHER' AND rc."name" = 'other')
      );

    UPDATE "reports"
    SET "categoryId" = 'cat-other'
    WHERE "categoryId" IS NULL;

    ALTER TABLE "reports" DROP COLUMN IF EXISTS "category";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_categoryId_fkey'
  ) THEN
    ALTER TABLE "reports"
      ADD CONSTRAINT "reports_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "reports_categoryId_idx" ON "reports"("categoryId");
CREATE INDEX IF NOT EXISTS "reports_district_idx" ON "reports"("district");

CREATE TABLE IF NOT EXISTS "responsible_persons" (
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'responsible_persons_categoryId_fkey'
  ) THEN
    ALTER TABLE "responsible_persons"
      ADD CONSTRAINT "responsible_persons_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_assignedToId_fkey'
  ) THEN
    ALTER TABLE "reports"
      ADD CONSTRAINT "reports_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "responsible_persons"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "responsible_persons_district_idx" ON "responsible_persons"("district");
CREATE INDEX IF NOT EXISTS "responsible_persons_categoryId_idx" ON "responsible_persons"("categoryId");

-- Add report questionnaire fields
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "taxonomySubcategory" TEXT,
  ADD COLUMN IF NOT EXISTS "taxonomySituation" TEXT;

-- Add routing/disptach enums if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoutingSource') THEN
    CREATE TYPE "RoutingSource" AS ENUM ('CATEGORY_DEFAULT', 'ADMIN_UPDATED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispatchBatchStatus') THEN
    CREATE TYPE "DispatchBatchStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'SENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispatchDocumentKind') THEN
    CREATE TYPE "DispatchDocumentKind" AS ENUM ('DRAFT', 'SIGNED');
  END IF;
END $$;

-- Institutions
CREATE TABLE IF NOT EXISTS "institutions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "institutions_name_key" ON "institutions"("name");

-- Category -> Institution mapping
CREATE TABLE IF NOT EXISTS "category_institutions" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryId" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  CONSTRAINT "category_institutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_institutions_categoryId_institutionId_key"
ON "category_institutions"("categoryId", "institutionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'category_institutions_categoryId_fkey'
  ) THEN
    ALTER TABLE "category_institutions"
      ADD CONSTRAINT "category_institutions_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'category_institutions_institutionId_fkey'
  ) THEN
    ALTER TABLE "category_institutions"
      ADD CONSTRAINT "category_institutions_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "institutions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Per-report routing targets
CREATE TABLE IF NOT EXISTS "report_routing_targets" (
  "id" TEXT NOT NULL,
  "source" "RoutingSource" NOT NULL DEFAULT 'CATEGORY_DEFAULT',
  "included" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reportId" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  CONSTRAINT "report_routing_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "report_routing_targets_reportId_institutionId_key"
ON "report_routing_targets"("reportId", "institutionId");
CREATE INDEX IF NOT EXISTS "report_routing_targets_institutionId_idx"
ON "report_routing_targets"("institutionId");
CREATE INDEX IF NOT EXISTS "report_routing_targets_included_idx"
ON "report_routing_targets"("included");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_routing_targets_reportId_fkey'
  ) THEN
    ALTER TABLE "report_routing_targets"
      ADD CONSTRAINT "report_routing_targets_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "reports"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_routing_targets_institutionId_fkey'
  ) THEN
    ALTER TABLE "report_routing_targets"
      ADD CONSTRAINT "report_routing_targets_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "institutions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Dispatch batches
CREATE TABLE IF NOT EXISTS "institution_dispatch_batches" (
  "id" TEXT NOT NULL,
  "status" "DispatchBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "institutionId" TEXT NOT NULL,
  "generatedById" TEXT,
  CONSTRAINT "institution_dispatch_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "institution_dispatch_batches_institutionId_status_idx"
ON "institution_dispatch_batches"("institutionId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institution_dispatch_batches_institutionId_fkey'
  ) THEN
    ALTER TABLE "institution_dispatch_batches"
      ADD CONSTRAINT "institution_dispatch_batches_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "institutions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institution_dispatch_batches_generatedById_fkey'
  ) THEN
    ALTER TABLE "institution_dispatch_batches"
      ADD CONSTRAINT "institution_dispatch_batches_generatedById_fkey"
      FOREIGN KEY ("generatedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Batch items
CREATE TABLE IF NOT EXISTS "dispatch_batch_items" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "batchId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "routingTargetId" TEXT,
  CONSTRAINT "dispatch_batch_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispatch_batch_items_batchId_reportId_key"
ON "dispatch_batch_items"("batchId", "reportId");
CREATE INDEX IF NOT EXISTS "dispatch_batch_items_reportId_idx"
ON "dispatch_batch_items"("reportId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_batch_items_batchId_fkey'
  ) THEN
    ALTER TABLE "dispatch_batch_items"
      ADD CONSTRAINT "dispatch_batch_items_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "institution_dispatch_batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_batch_items_reportId_fkey'
  ) THEN
    ALTER TABLE "dispatch_batch_items"
      ADD CONSTRAINT "dispatch_batch_items_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "reports"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_batch_items_routingTargetId_fkey'
  ) THEN
    ALTER TABLE "dispatch_batch_items"
      ADD CONSTRAINT "dispatch_batch_items_routingTargetId_fkey"
      FOREIGN KEY ("routingTargetId") REFERENCES "report_routing_targets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Documents
CREATE TABLE IF NOT EXISTS "dispatch_documents" (
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

CREATE INDEX IF NOT EXISTS "dispatch_documents_batchId_kind_idx"
ON "dispatch_documents"("batchId", "kind");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_documents_batchId_fkey'
  ) THEN
    ALTER TABLE "dispatch_documents"
      ADD CONSTRAINT "dispatch_documents_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "institution_dispatch_batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_documents_uploadedById_fkey'
  ) THEN
    ALTER TABLE "dispatch_documents"
      ADD CONSTRAINT "dispatch_documents_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
