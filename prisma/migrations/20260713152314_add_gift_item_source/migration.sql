-- CreateEnum
CREATE TYPE "GiftItemSource" AS ENUM ('manual', 'genie');

-- AlterTable
ALTER TABLE "gift_items" ADD COLUMN     "source" "GiftItemSource" NOT NULL DEFAULT 'manual';
