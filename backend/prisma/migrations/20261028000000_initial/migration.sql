CREATE TABLE "Project" (
  "id" UUID NOT NULL,
  "ownerId" VARCHAR(255) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "description" VARCHAR(2000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Project_ownerId_slug_key" ON "Project"("ownerId", "slug");
CREATE INDEX "Project_ownerId_createdAt_id_idx" ON "Project"("ownerId", "createdAt", "id");
