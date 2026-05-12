-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `athlete` ADD COLUMN `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `verificationMethod` ENUM('EMAIL', 'SMS') NOT NULL DEFAULT 'EMAIL';

-- AlterTable
ALTER TABLE `coach` ADD COLUMN `phoneVerificationToken` VARCHAR(255) NULL,
    ADD COLUMN `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    ALTER COLUMN `trialEndsAt` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));
