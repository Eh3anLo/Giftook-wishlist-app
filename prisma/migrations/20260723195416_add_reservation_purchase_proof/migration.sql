-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "receipt_image_url" TEXT,
ADD COLUMN     "shipping_address" VARCHAR(500),
ADD COLUMN     "tracking_code" VARCHAR(100);
