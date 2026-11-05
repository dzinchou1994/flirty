-- Community repo owns _prisma_migrations. Apply there, then npm run db:generate here.
-- Grindr-style "Viewed Me" history for the dating product.

CREATE TABLE IF NOT EXISTS "DatingProfileView" (
  "id" TEXT PRIMARY KEY,
  "viewerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "profileId" TEXT NOT NULL REFERENCES "DatingProfile"("id") ON DELETE CASCADE,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "DatingProfileView_viewerId_profileId_key"
  ON "DatingProfileView"("viewerId", "profileId");

CREATE INDEX IF NOT EXISTS "DatingProfileView_profileId_viewedAt_idx"
  ON "DatingProfileView"("profileId", "viewedAt" DESC);

CREATE INDEX IF NOT EXISTS "DatingProfileView_viewerId_viewedAt_idx"
  ON "DatingProfileView"("viewerId", "viewedAt" DESC);
