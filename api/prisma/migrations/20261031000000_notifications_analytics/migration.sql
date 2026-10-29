BEGIN;
ALTER TABLE "StatusEvent" ADD COLUMN "actorDisplayName" VARCHAR(120);
-- Fill only the new presentation snapshot; existing actor IDs and timestamps are untouched.
ALTER TABLE "StatusEvent" DISABLE TRIGGER status_event_immutable;
UPDATE "StatusEvent" e SET "actorDisplayName" = LEFT(s."displayName", 120)
FROM "Staff" s WHERE e."staffId" = s.id;
ALTER TABLE "StatusEvent" ENABLE TRIGGER status_event_immutable;
CREATE TYPE "NotificationType" AS ENUM ('UPVOTE','ACCEPTED','IN_PROGRESS','RESOLVED','REJECTED');
CREATE TYPE "NotificationActorKind" AS ENUM ('REPORTER','STAFF');
CREATE TABLE "VoteEvent" (
 "id" UUID PRIMARY KEY, "reportId" UUID NOT NULL REFERENCES "Report"(id),
 "profileId" UUID NOT NULL REFERENCES "Profile"(id), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Preserve evidence for currently stored votes, without sending retrospective inbox alerts.
INSERT INTO "VoteEvent" (id,"reportId","profileId","createdAt")
SELECT md5("reportId"::text || ':' || "profileId"::text)::uuid, "reportId","profileId","createdAt" FROM "Vote";
CREATE TRIGGER vote_event_immutable BEFORE UPDATE OR DELETE ON "VoteEvent"
FOR EACH ROW EXECUTE FUNCTION campusfix_immutable_event();
CREATE TABLE "Notification" (
 "id" UUID PRIMARY KEY, "recipientId" UUID NOT NULL REFERENCES "Profile"(id),
 "actorKind" "NotificationActorKind" NOT NULL,
 "actorProfileId" UUID REFERENCES "Profile"(id), "actorStaffId" UUID REFERENCES "Staff"(id),
 "actorDisplayName" VARCHAR(120), "type" "NotificationType" NOT NULL,
 "reportId" UUID NOT NULL REFERENCES "Report"(id), "reportTitle" VARCHAR(120) NOT NULL,
 "statusEventId" UUID UNIQUE REFERENCES "StatusEvent"(id), "voteEventId" UUID UNIQUE REFERENCES "VoteEvent"(id),
 "note" VARCHAR(500), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "readAt" TIMESTAMP(3),
 CONSTRAINT "Notification_actor_event" CHECK (
  ("actorKind" = 'REPORTER' AND "actorProfileId" IS NOT NULL AND "actorStaffId" IS NULL AND "type" = 'UPVOTE' AND "voteEventId" IS NOT NULL AND "statusEventId" IS NULL) OR
  ("actorKind" = 'STAFF' AND "actorStaffId" IS NOT NULL AND "actorProfileId" IS NULL AND "type" <> 'UPVOTE' AND "statusEventId" IS NOT NULL AND "voteEventId" IS NULL)
 )
);
CREATE INDEX "Notification_recipientId_createdAt_id_idx" ON "Notification"("recipientId","createdAt",id);
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId","readAt");
CREATE INDEX "VoteEvent_createdAt_idx" ON "VoteEvent"("createdAt");
CREATE INDEX "VoteEvent_reportId_idx" ON "VoteEvent"("reportId");
CREATE INDEX "StatusEvent_status_createdAt_idx" ON "StatusEvent"(status,"createdAt");
CREATE INDEX "StatusEvent_staffId_status_idx" ON "StatusEvent"("staffId",status);
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_resolvedById_status_idx" ON "Report"("resolvedById",status);
COMMIT;
