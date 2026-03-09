-- Manual migration script to handle existing data
-- Run this before the Prisma migration

-- Step 1: Create new tables
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

-- Step 2: Insert default categories
INSERT INTO "report_categories" ("id", "name", "nameEn", "nameBg", "description", "icon", "color", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'pothole', 'Pothole', 'Дупка на пътя', 'Повреди на пътната настилка, дупки, неравности', '🕳️', '#ef4444', NOW(), NOW()),
    (gen_random_uuid()::text, 'street_light', 'Street Light', 'Улично осветление', 'Неработещо или повредено улично осветление', '💡', '#f59e0b', NOW(), NOW()),
    (gen_random_uuid()::text, 'garbage', 'Garbage', 'Боклук', 'Нерегламентирано изхвърляне на боклук, препълнени контейнери', '🗑️', '#10b981', NOW(), NOW()),
    (gen_random_uuid()::text, 'graffiti', 'Graffiti', 'Графити', 'Нежелани графити и вандализъм', '🎨', '#8b5cf6', NOW(), NOW()),
    (gen_random_uuid()::text, 'traffic_signal', 'Traffic Signal', 'Светофар', 'Неработещ или повреден светофар', '🚦', '#ec4899', NOW(), NOW()),
    (gen_random_uuid()::text, 'water_leak', 'Water Leak', 'Теч на вода', 'Течове на водопроводи, канализация', '💧', '#06b6d4', NOW(), NOW()),
    (gen_random_uuid()::text, 'park_maintenance', 'Park Maintenance', 'Поддръжка на парк', 'Проблеми с поддръжката на паркове и зелени площи', '🌳', '#84cc16', NOW(), NOW()),
    (gen_random_uuid()::text, 'noise_complaint', 'Noise Complaint', 'Шумово замърсяване', 'Оплаквания за прекомерен шум', '🔊', '#f97316', NOW(), NOW()),
    (gen_random_uuid()::text, 'illegal_parking', 'Illegal Parking', 'Незаконно паркиране', 'Неправилно паркирани автомобили', '🚗', '#6366f1', NOW(), NOW()),
    (gen_random_uuid()::text, 'other', 'Other', 'Друго', 'Други проблеми', '📝', '#64748b', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Step 3: Add temporary column to reports
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "categoryId_temp" TEXT;

-- Step 4: Map old enum values to new category IDs
UPDATE "reports" r
SET "categoryId_temp" = rc.id
FROM "report_categories" rc
WHERE 
    (r.category = 'POTHOLE' AND rc.name = 'pothole') OR
    (r.category = 'STREET_LIGHT' AND rc.name = 'street_light') OR
    (r.category = 'GARBAGE' AND rc.name = 'garbage') OR
    (r.category = 'GRAFFITI' AND rc.name = 'graffiti') OR
    (r.category = 'TRAFFIC_SIGNAL' AND rc.name = 'traffic_signal') OR
    (r.category = 'WATER_LEAK' AND rc.name = 'water_leak') OR
    (r.category = 'PARK_MAINTENANCE' AND rc.name = 'park_maintenance') OR
    (r.category = 'NOISE_COMPLAINT' AND rc.name = 'noise_complaint') OR
    (r.category = 'ILLEGAL_PARKING' AND rc.name = 'illegal_parking') OR
    (r.category = 'OTHER' AND rc.name = 'other');

-- Step 5: Add district column
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "district" TEXT;

-- Step 6: Add assignedToId column
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

-- Step 7: Now we can safely drop the old category column and rename the temp one
-- This will be done by Prisma migrate after this script
