-- 0034_dating_profile_views
--
-- Creates DatingProfileView — "who viewed me". The model was added to the
-- dating app's schema.prisma and is used by lib/dating/views.ts and, more
-- importantly, by lib/dating/deletion.ts, which deletes from it inside the
-- account-deletion transaction. Without this table, account deletion throws
-- and the App Store's mandatory in-app deletion requirement cannot be met.
--
-- APPLY FROM THE INTIMGRAM REPO ONLY, following docs/DEPLOY.md (back up first).
-- The dating_app role cannot write _prisma_migrations and must not run this.
--
-- Grants live in dating-app-infra/db/dating-db-role-profile-views.sql and are
-- run separately, AFTER this migration.

CREATE TABLE IF NOT EXISTS "DatingProfileView" (
  "id"        TEXT NOT NULL,
  "viewerId"  TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "viewedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DatingProfileView_pkey" PRIMARY KEY ("id")
);

-- Backs the upsert in lib/dating/views.ts: one row per (viewer, profile),
-- refreshed on each view rather than appended.
CREATE UNIQUE INDEX IF NOT EXISTS "DatingProfileView_viewerId_profileId_key"
  ON "DatingProfileView"("viewerId", "profileId");

-- "who viewed me", newest first.
CREATE INDEX IF NOT EXISTS "DatingProfileView_profileId_viewedAt_idx"
  ON "DatingProfileView"("profileId", "viewedAt" DESC);

-- "profiles I viewed", newest first.
CREATE INDEX IF NOT EXISTS "DatingProfileView_viewerId_viewedAt_idx"
  ON "DatingProfileView"("viewerId", "viewedAt" DESC);

-- Foreign keys. Both cascade: deleting a user or a dating profile must not
-- strand view rows, and account deletion relies on it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingProfileView_viewerId_fkey'
  ) THEN
    ALTER TABLE "DatingProfileView"
      ADD CONSTRAINT "DatingProfileView_viewerId_fkey"
      FOREIGN KEY ("viewerId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DatingProfileView_profileId_fkey'
  ) THEN
    ALTER TABLE "DatingProfileView"
      ADD CONSTRAINT "DatingProfileView_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "DatingProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
