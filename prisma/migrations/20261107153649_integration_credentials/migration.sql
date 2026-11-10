-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "api_secret" TEXT,
ADD COLUMN     "token_expires_at" TIMESTAMP(3);
