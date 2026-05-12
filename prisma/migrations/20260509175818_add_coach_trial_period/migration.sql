/*
  Warnings:

  - Added the required column `trialEndsAt` to the `Coach` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `coach` ADD COLUMN `trialStartsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `trialEndsAt` DATETIME(3) NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 30 DAY));

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));
