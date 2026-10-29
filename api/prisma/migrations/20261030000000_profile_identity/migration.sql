-- Add optional anonymous profile presentation without changing identity or report ownership.
ALTER TABLE "Profile" ADD COLUMN "displayName" VARCHAR(60), ADD COLUMN "avatarMediaId" UUID;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
