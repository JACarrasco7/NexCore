/*
  Warnings:

  - You are about to drop the column `notes` on the `athletesubscription` table. All the data in the column will be lost.
  - You are about to drop the column `priceEurPaid` on the `athletesubscription` table. All the data in the column will be lost.
  - The values [PAUSED,CANCELLED] on the enum `AthleteSubscription_status` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[athleteId,teamBillingPlanId]` on the table `AthleteSubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamBillingPlanId` to the `AthleteSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `athletesubscription` DROP FOREIGN KEY `AthleteSubscription_servicePlanId_fkey`;

-- DropIndex
DROP INDEX `AthleteSubscription_status_endDate_idx` ON `athletesubscription`;

-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `athletesubscription` DROP COLUMN `notes`,
    DROP COLUMN `priceEurPaid`,
    ADD COLUMN `manualRenewal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paymentMethod` ENUM('MANUAL', 'STRIPE', 'CASH') NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `renewalDate` DATETIME(3) NULL,
    ADD COLUMN `stripeSubscriptionId` VARCHAR(191) NULL,
    ADD COLUMN `teamBillingPlanId` VARCHAR(191) NOT NULL,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    MODIFY `servicePlanId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'UNPAID', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `CoachSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `teamBillingPlanId` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL',
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `trialEndsAt` DATETIME(3) NOT NULL,
    `renewalDate` DATETIME(3) NULL,
    `autoRenewal` BOOLEAN NOT NULL DEFAULT true,
    `lastRenewalAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CoachSubscription_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    INDEX `CoachSubscription_teamId_status_idx`(`teamId`, `status`),
    INDEX `CoachSubscription_status_trialEndsAt_idx`(`status`, `trialEndsAt`),
    INDEX `CoachSubscription_stripeSubscriptionId_idx`(`stripeSubscriptionId`),
    UNIQUE INDEX `CoachSubscription_teamId_teamBillingPlanId_key`(`teamId`, `teamBillingPlanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('COACH', 'ATHLETE') NOT NULL,
    `coachSubscriptionId` VARCHAR(191) NULL,
    `athleteSubscriptionId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `status` ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `dueDate` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,

    INDEX `Invoice_entityType_status_idx`(`entityType`, `status`),
    INDEX `Invoice_dueDate_status_idx`(`dueDate`, `status`),
    INDEX `Invoice_coachSubscriptionId_idx`(`coachSubscriptionId`),
    INDEX `Invoice_athleteSubscriptionId_idx`(`athleteSubscriptionId`),
    INDEX `Invoice_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AthleteSubscription_teamBillingPlanId_status_idx` ON `AthleteSubscription`(`teamBillingPlanId`, `status`);

-- CreateIndex
CREATE INDEX `AthleteSubscription_status_trialEndsAt_idx` ON `AthleteSubscription`(`status`, `trialEndsAt`);

-- CreateIndex
CREATE UNIQUE INDEX `AthleteSubscription_athleteId_teamBillingPlanId_key` ON `AthleteSubscription`(`athleteId`, `teamBillingPlanId`);

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));

-- AddForeignKey
ALTER TABLE `CoachSubscription` ADD CONSTRAINT `CoachSubscription_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoachSubscription` ADD CONSTRAINT `CoachSubscription_teamBillingPlanId_fkey` FOREIGN KEY (`teamBillingPlanId`) REFERENCES `TeamBillingPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AthleteSubscription` ADD CONSTRAINT `AthleteSubscription_teamBillingPlanId_fkey` FOREIGN KEY (`teamBillingPlanId`) REFERENCES `TeamBillingPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AthleteSubscription` ADD CONSTRAINT `AthleteSubscription_servicePlanId_fkey` FOREIGN KEY (`servicePlanId`) REFERENCES `ServicePlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_coachSubscriptionId_fkey` FOREIGN KEY (`coachSubscriptionId`) REFERENCES `CoachSubscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_athleteSubscriptionId_fkey` FOREIGN KEY (`athleteSubscriptionId`) REFERENCES `AthleteSubscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
