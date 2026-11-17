-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('USER', 'PREMIUM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "avatar" TEXT,
    "profileIcon" TEXT,
    "gender" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "plan" "Plan" NOT NULL DEFAULT 'USER',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nearbyLat" DOUBLE PRECISION,
    "nearbyLng" DOUBLE PRECISION,
    "nearbyFuzzM" INTEGER NOT NULL DEFAULT 100,
    "nearbySharing" BOOLEAN NOT NULL DEFAULT false,
    "nearbyUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "genderBucket" TEXT NOT NULL,
    "presetCase" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'other',
    "bio" TEXT NOT NULL DEFAULT '',
    "name" TEXT,
    "age" INTEGER,
    "height" INTEGER,
    "zodiacSign" TEXT,
    "lookingFor" TEXT,
    "interests" TEXT,
    "showMe" TEXT NOT NULL DEFAULT 'everyone',
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT NOT NULL DEFAULT 'active',
    "moderationReason" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "photosPublishedAt" TIMESTAMP(3),
    "hideFromContacts" BOOLEAN NOT NULL DEFAULT false,
    "requireMutualInterest" BOOLEAN NOT NULL DEFAULT false,
    "phoneHash" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "visibilityMode" TEXT NOT NULL DEFAULT 'discoverable',
    "geohashCell" TEXT,
    "presenceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weightKg" INTEGER,
    "bodyType" TEXT,
    "relationshipStatus" TEXT,
    "lookingForTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meetAt" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pronouns" TEXT,
    "genderIdentity" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smoking" TEXT,
    "drinking" TEXT,
    "kids" TEXT,
    "education" TEXT,
    "work" TEXT,
    "position" TEXT,
    "communityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingFilterPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatingFilterPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingContactHash" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingContactHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingProfileView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingAlbumGrant" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingAlbumGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingPhoto" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingTap" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingTap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingLike" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "photoId" TEXT,
    "promptAnswerId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingProfileReport" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DatingProfileReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "roomId" TEXT,
    "body" TEXT NOT NULL,
    "isDating" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmReadState" (
    "userId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmReadState_pkey" PRIMARY KEY ("userId","peerId")
);

-- CreateTable
CREATE TABLE "UserDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "UserDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingPromptAnswer" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatingPromptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatingPass" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatingPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE INDEX "User_nearbySharing_nearbyUpdatedAt_idx" ON "User"("nearbySharing", "nearbyUpdatedAt");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "DatingProfile_userId_key" ON "DatingProfile"("userId");

-- CreateIndex
CREATE INDEX "DatingProfile_genderBucket_isVisible_updatedAt_idx" ON "DatingProfile"("genderBucket", "isVisible", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "DatingProfile_city_isVisible_updatedAt_idx" ON "DatingProfile"("city", "isVisible", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "DatingProfile_moderationStatus_updatedAt_idx" ON "DatingProfile"("moderationStatus", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "DatingProfile_phoneHash_idx" ON "DatingProfile"("phoneHash");

-- CreateIndex
CREATE INDEX "DatingProfile_geohashCell_idx" ON "DatingProfile"("geohashCell");

-- CreateIndex
CREATE INDEX "DatingProfile_visibilityMode_isVisible_idx" ON "DatingProfile"("visibilityMode", "isVisible");

-- CreateIndex
CREATE INDEX "DatingProfile_bodyType_idx" ON "DatingProfile"("bodyType");

-- CreateIndex
CREATE INDEX "DatingProfile_relationshipStatus_idx" ON "DatingProfile"("relationshipStatus");

-- CreateIndex
CREATE INDEX "DatingProfile_age_idx" ON "DatingProfile"("age");

-- CreateIndex
CREATE INDEX "DatingProfile_height_idx" ON "DatingProfile"("height");

-- CreateIndex
CREATE INDEX "DatingProfile_position_idx" ON "DatingProfile"("position");

-- CreateIndex
CREATE UNIQUE INDEX "DatingFilterPreset_userId_key" ON "DatingFilterPreset"("userId");

-- CreateIndex
CREATE INDEX "DatingContactHash_phoneHash_idx" ON "DatingContactHash"("phoneHash");

-- CreateIndex
CREATE INDEX "DatingContactHash_userId_idx" ON "DatingContactHash"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DatingContactHash_userId_phoneHash_key" ON "DatingContactHash"("userId", "phoneHash");

-- CreateIndex
CREATE INDEX "DatingBlock_blockerId_idx" ON "DatingBlock"("blockerId");

-- CreateIndex
CREATE INDEX "DatingBlock_blockedUserId_idx" ON "DatingBlock"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DatingBlock_blockerId_blockedUserId_key" ON "DatingBlock"("blockerId", "blockedUserId");

-- CreateIndex
CREATE INDEX "DatingProfileView_profileId_viewedAt_idx" ON "DatingProfileView"("profileId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "DatingProfileView_viewerId_viewedAt_idx" ON "DatingProfileView"("viewerId", "viewedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DatingProfileView_viewerId_profileId_key" ON "DatingProfileView"("viewerId", "profileId");

-- CreateIndex
CREATE INDEX "DatingAlbumGrant_viewerUserId_idx" ON "DatingAlbumGrant"("viewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DatingAlbumGrant_ownerUserId_viewerUserId_key" ON "DatingAlbumGrant"("ownerUserId", "viewerUserId");

-- CreateIndex
CREATE INDEX "DatingPhoto_profileId_sortOrder_idx" ON "DatingPhoto"("profileId", "sortOrder");

-- CreateIndex
CREATE INDEX "DatingPhoto_profileId_status_idx" ON "DatingPhoto"("profileId", "status");

-- CreateIndex
CREATE INDEX "DatingPhoto_profileId_visibility_idx" ON "DatingPhoto"("profileId", "visibility");

-- CreateIndex
CREATE INDEX "DatingPhoto_status_createdAt_idx" ON "DatingPhoto"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatingTap_toProfileId_createdAt_idx" ON "DatingTap"("toProfileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatingTap_fromUserId_createdAt_idx" ON "DatingTap"("fromUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatingTap_fromUserId_toProfileId_createdAt_idx" ON "DatingTap"("fromUserId", "toProfileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatingLike_toProfileId_createdAt_idx" ON "DatingLike"("toProfileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatingLike_fromUserId_createdAt_idx" ON "DatingLike"("fromUserId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DatingLike_fromUserId_toProfileId_key" ON "DatingLike"("fromUserId", "toProfileId");

-- CreateIndex
CREATE INDEX "DatingProfileReport_profileId_createdAt_idx" ON "DatingProfileReport"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatingProfileReport_resolvedAt_receivedAt_idx" ON "DatingProfileReport"("resolvedAt", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DatingProfileReport_profileId_reporterId_key" ON "DatingProfileReport"("profileId", "reporterId");

-- CreateIndex
CREATE INDEX "Message_roomId_archivedAt_createdAt_idx" ON "Message"("roomId", "archivedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_senderId_recipientId_createdAt_idx" ON "Message"("senderId", "recipientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_recipientId_archivedAt_createdAt_idx" ON "Message"("recipientId", "archivedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_isDating_recipientId_archivedAt_createdAt_idx" ON "Message"("isDating", "recipientId", "archivedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DmReadState_userId_idx" ON "DmReadState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDeletionRequest_userId_key" ON "UserDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "UserDeletionRequest_status_requestedAt_idx" ON "UserDeletionRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "DatingPromptAnswer_profileId_sortOrder_idx" ON "DatingPromptAnswer"("profileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DatingPromptAnswer_profileId_promptKey_key" ON "DatingPromptAnswer"("profileId", "promptKey");

-- CreateIndex
CREATE INDEX "DatingPass_fromUserId_createdAt_idx" ON "DatingPass"("fromUserId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DatingPass_fromUserId_toProfileId_key" ON "DatingPass"("fromUserId", "toProfileId");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingProfile" ADD CONSTRAINT "DatingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingFilterPreset" ADD CONSTRAINT "DatingFilterPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingContactHash" ADD CONSTRAINT "DatingContactHash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingBlock" ADD CONSTRAINT "DatingBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingBlock" ADD CONSTRAINT "DatingBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingProfileView" ADD CONSTRAINT "DatingProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingProfileView" ADD CONSTRAINT "DatingProfileView_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingAlbumGrant" ADD CONSTRAINT "DatingAlbumGrant_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingAlbumGrant" ADD CONSTRAINT "DatingAlbumGrant_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingPhoto" ADD CONSTRAINT "DatingPhoto_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingTap" ADD CONSTRAINT "DatingTap_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingTap" ADD CONSTRAINT "DatingTap_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingLike" ADD CONSTRAINT "DatingLike_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingLike" ADD CONSTRAINT "DatingLike_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingLike" ADD CONSTRAINT "DatingLike_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "DatingPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingLike" ADD CONSTRAINT "DatingLike_promptAnswerId_fkey" FOREIGN KEY ("promptAnswerId") REFERENCES "DatingPromptAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingProfileReport" ADD CONSTRAINT "DatingProfileReport_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingProfileReport" ADD CONSTRAINT "DatingProfileReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReadState" ADD CONSTRAINT "DmReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReadState" ADD CONSTRAINT "DmReadState_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeletionRequest" ADD CONSTRAINT "UserDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingPromptAnswer" ADD CONSTRAINT "DatingPromptAnswer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingPass" ADD CONSTRAINT "DatingPass_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingPass" ADD CONSTRAINT "DatingPass_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "DatingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

