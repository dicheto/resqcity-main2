-- Add visibility flag so citizens can choose if a report is public on the map
ALTER TABLE "reports"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "reports_isPublic_idx" ON "reports"("isPublic");
