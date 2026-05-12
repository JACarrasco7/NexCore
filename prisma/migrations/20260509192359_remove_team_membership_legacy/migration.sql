/*
  Warnings:

  - You are about to drop the `teammembership` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `teammembership` DROP FOREIGN KEY `TeamMembership_coachId_fkey`;

-- DropForeignKey
ALTER TABLE `teammembership` DROP FOREIGN KEY `TeamMembership_teamId_fkey`;

-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- DropTable
DROP TABLE `teammembership`;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));
