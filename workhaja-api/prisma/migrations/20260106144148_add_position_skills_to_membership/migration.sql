-- AlterTable
ALTER TABLE "memberships" ADD COLUMN "position" TEXT,
ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

