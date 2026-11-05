-- 0032_dating_prompts_and_passes
--
-- Hinge-style discovery for the dating product.
--   * DatingPromptAnswer — a profile's answers to prompt questions.
--   * DatingPass         — "skip", so a passed profile stops reappearing.
--   * DatingLike         — gains the element the like was aimed at, plus an
--                          optional comment, which is what turns a like into
--                          an opener instead of a blank chat.
--
-- APPLY FROM THE INTIMGRAM REPO ONLY, following docs/DEPLOY.md (back up first).
-- The dating_app role cannot write _prisma_migrations and must not run this.

-- Prompt answers -------------------------------------------------------------
CREATE TABLE "DatingPromptAnswer" (
  "id"        TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "promptKey" TEXT NOT NULL,
  "answer"    TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DatingPromptAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DatingPromptAnswer_profileId_promptKey_key"
  ON "DatingPromptAnswer"("profileId", "promptKey");
CREATE INDEX "DatingPromptAnswer_profileId_sortOrder_idx"
  ON "DatingPromptAnswer"("profileId", "sortOrder");

ALTER TABLE "DatingPromptAnswer"
  ADD CONSTRAINT "DatingPromptAnswer_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "DatingProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Passes ---------------------------------------------------------------------
CREATE TABLE "DatingPass" (
  "id"          TEXT NOT NULL,
  "fromUserId"  TEXT NOT NULL,
  "toProfileId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DatingPass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DatingPass_fromUserId_toProfileId_key"
  ON "DatingPass"("fromUserId", "toProfileId");
-- Feed exclusion reads by viewer; keep it covering.
CREATE INDEX "DatingPass_fromUserId_createdAt_idx"
  ON "DatingPass"("fromUserId", "createdAt" DESC);

ALTER TABLE "DatingPass"
  ADD CONSTRAINT "DatingPass_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatingPass"
  ADD CONSTRAINT "DatingPass_toProfileId_fkey"
  FOREIGN KEY ("toProfileId") REFERENCES "DatingProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Likes gain a target and a comment ------------------------------------------
-- All nullable: existing rows stay valid as "liked the whole profile".
ALTER TABLE "DatingLike" ADD COLUMN "photoId"        TEXT;
ALTER TABLE "DatingLike" ADD COLUMN "promptAnswerId" TEXT;
ALTER TABLE "DatingLike" ADD COLUMN "comment"        TEXT;

ALTER TABLE "DatingLike"
  ADD CONSTRAINT "DatingLike_photoId_fkey"
  FOREIGN KEY ("photoId") REFERENCES "DatingPhoto"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DatingLike"
  ADD CONSTRAINT "DatingLike_promptAnswerId_fkey"
  FOREIGN KEY ("promptAnswerId") REFERENCES "DatingPromptAnswer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- NOTE: grants for the dating_app role are NOT here on purpose. A migration
-- must not depend on a role existing, or it fails on any database where the
-- role has not been created yet. They live in db/dating-db-role.sql.
