/*
  Warnings:

  - You are about to drop the column `servicePlanId` on the `athlete` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `athlete` DROP FOREIGN KEY `Athlete_servicePlanId_fkey`;

-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `athlete` DROP COLUMN `servicePlanId`;

-- AlterTable
ALTER TABLE `otptoken` MODIFY `type` ENUM('LOGIN', 'SIGNATURE', 'RESET', 'VERIFICATION') NOT NULL DEFAULT 'LOGIN';

-- CreateTable
CREATE TABLE `CoachInvite` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `invitedEmail` VARCHAR(191) NOT NULL,
    `invitedByUserId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `acceptedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CoachInvite_token_key`(`token`),
    INDEX `CoachInvite_token_idx`(`token`),
    INDEX `CoachInvite_teamId_expiresAt_idx`(`teamId`, `expiresAt`),
    INDEX `CoachInvite_acceptedAt_idx`(`acceptedAt`),
    UNIQUE INDEX `CoachInvite_teamId_invitedEmail_key`(`teamId`, `invitedEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AthleteSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `servicePlanId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `priceEurPaid` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AthleteSubscription_athleteId_status_idx`(`athleteId`, `status`),
    INDEX `AthleteSubscription_servicePlanId_idx`(`servicePlanId`),
    INDEX `AthleteSubscription_status_endDate_idx`(`status`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));

-- AddForeignKey
ALTER TABLE `CoachInvite` ADD CONSTRAINT `CoachInvite_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoachInvite` ADD CONSTRAINT `CoachInvite_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoachInvite` ADD CONSTRAINT `CoachInvite_acceptedByUserId_fkey` FOREIGN KEY (`acceptedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AthleteSubscription` ADD CONSTRAINT `AthleteSubscription_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AthleteSubscription` ADD CONSTRAINT `AthleteSubscription_servicePlanId_fkey` FOREIGN KEY (`servicePlanId`) REFERENCES `ServicePlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
