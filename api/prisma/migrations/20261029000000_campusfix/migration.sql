-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('REPORTED', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkRequest" (
    "id" UUID NOT NULL,
    "sourceSessionId" UUID NOT NULL,
    "targetSessionId" UUID,
    "codeHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "parentId" UUID,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueGroup" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "IssueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "IssueType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reference" SERIAL NOT NULL,
    "fixtureKey" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "profileId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "issueTypeId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "customIssueName" TEXT,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "exactLocation" VARCHAR(300) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'REPORTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "resolvedById" UUID,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "profileId" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("reportId","profileId")
);

-- CreateTable
CREATE TABLE "StatusEvent" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "fromStatus" "ReportStatus",
    "actorType" TEXT NOT NULL,
    "staffId" UUID,
    "note" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportMedia" (
    "reportId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ReportMedia_pkey" PRIMARY KEY ("reportId","mediaId")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "LinkRequest_codeHash_key" ON "LinkRequest"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Location_sourceKey_key" ON "Location"("sourceKey");

-- CreateIndex
CREATE INDEX "Location_parentId_sortOrder_idx" ON "Location"("parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "IssueGroup_code_key" ON "IssueGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "IssueType_code_key" ON "IssueType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reference_key" ON "Report"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Report_fixtureKey_key" ON "Report"("fixtureKey");

-- CreateIndex
CREATE UNIQUE INDEX "Report_idempotencyKey_key" ON "Report"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_id_idx" ON "Report"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Report_profileId_createdAt_idx" ON "Report"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_locationId_issueTypeId_idx" ON "Report"("locationId", "issueTypeId");

-- CreateIndex
CREATE INDEX "StatusEvent_reportId_createdAt_idx" ON "StatusEvent"("reportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueType" ADD CONSTRAINT "IssueType_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "IssueGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_issueTypeId_fkey" FOREIGN KEY ("issueTypeId") REFERENCES "IssueType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportMedia" ADD CONSTRAINT "ReportMedia_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportMedia" ADD CONSTRAINT "ReportMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
