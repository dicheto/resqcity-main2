-- Create taxonomy i18n tables
CREATE TABLE "taxonomy_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameBg" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportCategoryId" TEXT,
    CONSTRAINT "taxonomy_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taxonomy_subcategories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameBg" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "taxonomy_subcategories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taxonomy_situations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameBg" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    CONSTRAINT "taxonomy_situations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxonomy_categories_key_key" ON "taxonomy_categories"("key");
CREATE UNIQUE INDEX "taxonomy_subcategories_key_key" ON "taxonomy_subcategories"("key");
CREATE UNIQUE INDEX "taxonomy_situations_key_key" ON "taxonomy_situations"("key");

CREATE INDEX "taxonomy_categories_active_sortOrder_idx" ON "taxonomy_categories"("active", "sortOrder");
CREATE INDEX "taxonomy_categories_reportCategoryId_idx" ON "taxonomy_categories"("reportCategoryId");
CREATE INDEX "taxonomy_subcategories_categoryId_active_sortOrder_idx" ON "taxonomy_subcategories"("categoryId", "active", "sortOrder");
CREATE INDEX "taxonomy_situations_subcategoryId_active_sortOrder_idx" ON "taxonomy_situations"("subcategoryId", "active", "sortOrder");

ALTER TABLE "taxonomy_categories"
ADD CONSTRAINT "taxonomy_categories_reportCategoryId_fkey"
FOREIGN KEY ("reportCategoryId") REFERENCES "report_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "taxonomy_subcategories"
ADD CONSTRAINT "taxonomy_subcategories_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "taxonomy_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "taxonomy_situations"
ADD CONSTRAINT "taxonomy_situations_subcategoryId_fkey"
FOREIGN KEY ("subcategoryId") REFERENCES "taxonomy_subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
