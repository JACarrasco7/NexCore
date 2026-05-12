-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `otptoken` ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `usedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));
