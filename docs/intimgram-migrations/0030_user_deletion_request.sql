-- Run in the COMMUNITY app repo / intimgram DB only.
-- Dating app must NEVER run prisma migrate.
--
-- Queues User erasure after the dating app hard-deletes dating data.
-- Login fails while status IN ('pending','processing').

CREATE TABLE IF NOT EXISTS "UserDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "UserDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserDeletionRequest_userId_key" ON "UserDeletionRequest"("userId");
CREATE INDEX IF NOT EXISTS "UserDeletionRequest_status_requestedAt_idx"
  ON "UserDeletionRequest"("status", "requestedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserDeletionRequest_userId_fkey'
  ) THEN
    ALTER TABLE "UserDeletionRequest"
      ADD CONSTRAINT "UserDeletionRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
