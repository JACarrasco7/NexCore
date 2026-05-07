-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `pendingTotpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `pendingTotpSecret` TEXT NULL;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));
