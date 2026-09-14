-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'OTHER');

-- CreateEnum
CREATE TYPE "RefererSource" AS ENUM ('DIRECT', 'SEARCH', 'SOCIAL', 'EMAIL', 'PAID', 'REFERRAL', 'QR', 'OTHER');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" BIGSERIAL NOT NULL,
    "linkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceType" "DeviceType" NOT NULL DEFAULT 'OTHER',
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "refererHost" TEXT,
    "refererSource" "RefererSource" NOT NULL DEFAULT 'DIRECT',
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "visitorHash" TEXT,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorLabel" TEXT NOT NULL DEFAULT 'system',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_isActive_idx" ON "campaigns"("isActive");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "links_code_key" ON "links"("code");

-- CreateIndex
CREATE INDEX "links_campaignId_idx" ON "links"("campaignId");

-- CreateIndex
CREATE INDEX "links_isActive_deletedAt_idx" ON "links"("isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "links_createdAt_idx" ON "links"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "links_clickCount_idx" ON "links"("clickCount" DESC);

-- CreateIndex
CREATE INDEX "clicks_linkId_createdAt_idx" ON "clicks"("linkId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "clicks_createdAt_idx" ON "clicks"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "clicks_linkId_visitorHash_idx" ON "clicks"("linkId", "visitorHash");

-- CreateIndex
CREATE INDEX "clicks_country_idx" ON "clicks"("country");

-- CreateIndex
CREATE INDEX "clicks_deviceType_idx" ON "clicks"("deviceType");

-- CreateIndex
CREATE INDEX "clicks_refererSource_idx" ON "clicks"("refererSource");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
