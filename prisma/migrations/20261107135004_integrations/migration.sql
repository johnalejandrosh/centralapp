-- CreateEnum
CREATE TYPE "integration_status" AS ENUM ('pending', 'connected', 'error');

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "external_id" VARCHAR(120),
    "api_key" TEXT,
    "settings" JSONB,
    "status" "integration_status" NOT NULL DEFAULT 'pending',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "last_error" VARCHAR(500),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integrations_provider_idx" ON "integrations"("provider");

-- CreateIndex
CREATE INDEX "integrations_created_by_id_idx" ON "integrations"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_provider_external_id_key" ON "integrations"("provider", "external_id");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
