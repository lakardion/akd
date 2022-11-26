/*
  Warnings:

  - You are about to drop the column `hourId` on the `ClassSession` table. All the data in the column will be lost.
  - You are about to drop the column `hourId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `Hour` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `hours` to the `ClassSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hours` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClassSession" DROP CONSTRAINT "ClassSession_hourId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_hourId_fkey";

-- DropIndex
DROP INDEX "ClassSession_hourId_key";

-- DropIndex
DROP INDEX "Payment_hourId_key";

-- AlterTable
ALTER TABLE "ClassSession" DROP COLUMN "hourId",
ADD COLUMN     "hours" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "hourId",
ADD COLUMN     "hours" DECIMAL(65,30) NOT NULL;

-- DropTable
DROP TABLE "Hour";
