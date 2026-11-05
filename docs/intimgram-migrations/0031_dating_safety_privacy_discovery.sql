-- Handoff copy for the COMMUNITY (Intimgram) repo.
-- Dating app must NEVER run prisma migrate / db push.
-- Canonical path after copy:
--   GEOESKORT/prisma/migrations/0031_dating_safety_privacy_discovery/migration.sql
-- Apply with docs/DEPLOY.md (backup → BEGIN → SQL → _prisma_migrations → COMMIT).
--
-- Adds:
--   DatingBlock, DatingAlbumGrant, DatingTap
--   DatingProfile.visibilityMode / geohashCell / presenceEnabled
--   DatingPhoto.visibility
--   DatingProfileReport.receivedAt / resolvedAt
--
-- DatingContactHash already exists (0029).

ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "visibilityMode" TEXT NOT NULL DEFAULT 'discoverable';
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "geohashCell" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "presenceEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "DatingProfile_geohashCell_idx" ON "DatingProfile"("geohashCell");
CREATE INDEX IF NOT EXISTS "DatingProfile_visibilityMode_isVisible_idx"
  ON "DatingProfile"("visibilityMode", "isVisible");

ALTER TABLE "DatingPhoto" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public';
CREATE INDEX IF NOT EXISTS "DatingPhoto_profileId_visibility_idx"
  ON "DatingPhoto"("profileId", "visibility");

ALTER TABLE "DatingProfileReport" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "DatingProfileReport" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

UPDATE "DatingProfileReport"
SET "receivedAt" = "createdAt"
WHERE "receivedAt" IS NULL;

ALTER TABLE "DatingProfileReport"
  ALTER COLUMN "receivedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "DatingProfileReport"
  ALTER COLUMN "receivedAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "DatingProfileReport_resolvedAt_receivedAt_idx"
  ON "DatingProfileReport"("resolvedAt", "receivedAt");

CREATE TABLE IF NOT EXISTS "DatingBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DatingBlock_blockerId_blockedUserId_key"
  ON "DatingBlock"("blockerId", "blockedUserId");
CREATE INDEX IF NOT EXISTS "DatingBlock_blockerId_idx" ON "DatingBlock"("blockerId");
CREATE INDEX IF NOT EXISTS "DatingBlock_blockedUserId_idx" ON "DatingBlock"("blockedUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingBlock_blockerId_fkey'
  ) THEN
    ALTER TABLE "DatingBlock"
      ADD CONSTRAINT "DatingBlock_blockerId_fkey"
      FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingBlock_blockedUserId_fkey'
  ) THEN
    ALTER TABLE "DatingBlock"
      ADD CONSTRAINT "DatingBlock_blockedUserId_fkey"
      FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DatingAlbumGrant" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingAlbumGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DatingAlbumGrant_ownerUserId_viewerUserId_key"
  ON "DatingAlbumGrant"("ownerUserId", "viewerUserId");
CREATE INDEX IF NOT EXISTS "DatingAlbumGrant_viewerUserId_idx"
  ON "DatingAlbumGrant"("viewerUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingAlbumGrant_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "DatingAlbumGrant"
      ADD CONSTRAINT "DatingAlbumGrant_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingAlbumGrant_viewerUserId_fkey'
  ) THEN
    ALTER TABLE "DatingAlbumGrant"
      ADD CONSTRAINT "DatingAlbumGrant_viewerUserId_fkey"
      FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DatingTap" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingTap_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DatingTap_toProfileId_createdAt_idx"
  ON "DatingTap"("toProfileId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DatingTap_fromUserId_createdAt_idx"
  ON "DatingTap"("fromUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DatingTap_fromUserId_toProfileId_createdAt_idx"
  ON "DatingTap"("fromUserId", "toProfileId", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingTap_fromUserId_fkey'
  ) THEN
    ALTER TABLE "DatingTap"
      ADD CONSTRAINT "DatingTap_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingTap_toProfileId_fkey'
  ) THEN
    ALTER TABLE "DatingTap"
      ADD CONSTRAINT "DatingTap_toProfileId_fkey"
      FOREIGN KEY ("toProfileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
