-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- CreateTable
CREATE TABLE `TeamBillingPlan` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `billingCycle` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `maxAthletes` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamBillingPlan_teamId_idx`(`teamId`),
    INDEX `TeamBillingPlan_teamId_isActive_idx`(`teamId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));

-- AddForeignKey
ALTER TABLE `TeamBillingPlan` ADD CONSTRAINT `TeamBillingPlan_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
