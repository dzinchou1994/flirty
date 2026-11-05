-- 0033_dating_attributes_filters
--
-- Extends DatingProfile with optional discovery attributes and multi-value
-- filter tags. Adds DatingFilterPreset so the last filter set is restored.
--
-- APPLY FROM THE INTIMGRAM REPO ONLY, following docs/DEPLOY.md (back up first).
-- The dating_app role cannot write _prisma_migrations and must not run this.
--
-- lookingFor (single) is kept and backfilled into lookingForTags. Do not drop
-- lookingFor in this migration — live code still reads it.

-- New optional scalars -------------------------------------------------------
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "weightKg" INTEGER;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "bodyType" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "relationshipStatus" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "pronouns" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "genderIdentity" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "smoking" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "drinking" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "kids" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "education" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "work" TEXT;
ALTER TABLE "DatingProfile" ADD COLUMN IF NOT EXISTS "position" TEXT;

-- Multi-value fields (Postgres text[]) ---------------------------------------
ALTER TABLE "DatingProfile"
  ADD COLUMN IF NOT EXISTS "lookingForTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DatingProfile"
  ADD COLUMN IF NOT EXISTS "meetAt" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DatingProfile"
  ADD COLUMN IF NOT EXISTS "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DatingProfile"
  ADD COLUMN IF NOT EXISTS "communityTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill lookingFor → lookingForTags (only where still empty) --------------
UPDATE "DatingProfile"
SET "lookingForTags" = CASE "lookingFor"
  WHEN 'serious'    THEN ARRAY['relationship']::TEXT[]
  WHEN 'casual'     THEN ARRAY['casual']::TEXT[]
  WHEN 'friendship' THEN ARRAY['friends']::TEXT[]
  WHEN 'open'       THEN ARRAY['chat','dates','friends']::TEXT[]
  ELSE ARRAY[]::TEXT[]
END
WHERE "lookingFor" IS NOT NULL
  AND "lookingFor" <> ''
  AND cardinality("lookingForTags") = 0;

-- GIN indexes for hasSome filters --------------------------------------------
CREATE INDEX IF NOT EXISTS "DatingProfile_lookingForTags_gin_idx"
  ON "DatingProfile" USING GIN ("lookingForTags");
CREATE INDEX IF NOT EXISTS "DatingProfile_meetAt_gin_idx"
  ON "DatingProfile" USING GIN ("meetAt");
CREATE INDEX IF NOT EXISTS "DatingProfile_languages_gin_idx"
  ON "DatingProfile" USING GIN ("languages");
CREATE INDEX IF NOT EXISTS "DatingProfile_communityTags_gin_idx"
  ON "DatingProfile" USING GIN ("communityTags");

-- Helpful btree indexes for scalar filters -----------------------------------
CREATE INDEX IF NOT EXISTS "DatingProfile_bodyType_idx"
  ON "DatingProfile"("bodyType");
CREATE INDEX IF NOT EXISTS "DatingProfile_relationshipStatus_idx"
  ON "DatingProfile"("relationshipStatus");
CREATE INDEX IF NOT EXISTS "DatingProfile_age_idx"
  ON "DatingProfile"("age");
CREATE INDEX IF NOT EXISTS "DatingProfile_height_idx"
  ON "DatingProfile"("height");
CREATE INDEX IF NOT EXISTS "DatingProfile_position_idx"
  ON "DatingProfile"("position");

-- Persisted last-used discovery filters --------------------------------------
CREATE TABLE IF NOT EXISTS "DatingFilterPreset" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "filters"   JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DatingFilterPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DatingFilterPreset_userId_key"
  ON "DatingFilterPreset"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingFilterPreset_userId_fkey'
  ) THEN
    ALTER TABLE "DatingFilterPreset"
      ADD CONSTRAINT "DatingFilterPreset_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- NOTE: grants for the dating_app role are NOT here on purpose. They live in
-- dating-app-infra/db/dating-db-role.sql (and the additive grant file).
