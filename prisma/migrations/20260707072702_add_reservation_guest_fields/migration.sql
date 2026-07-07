-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "guest_email" TEXT,
ADD COLUMN     "guest_name" TEXT,
ADD COLUMN     "guest_phone" TEXT,
ADD COLUMN     "message" VARCHAR(1000),
ADD COLUMN     "notes" VARCHAR(500);
