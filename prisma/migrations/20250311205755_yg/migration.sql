/*
  Warnings:

  - You are about to drop the column `createdAt` on the `order_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `order_status_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_status_history" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "statusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
