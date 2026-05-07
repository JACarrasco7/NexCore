-- AlterTable
ALTER TABLE `team` ADD COLUMN `contractTemplate` TEXT NULL;

-- CreateTable
CREATE TABLE `AthleteConsent` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `content` TEXT NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `signatureRef` TEXT NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT true,
    `revokedAt` DATETIME(3) NULL,

    INDEX `AthleteConsent_athleteId_acceptedAt_idx`(`athleteId`, `acceptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthConnection` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `provider` ENUM('APPLE_HEALTH', 'HEALTH_CONNECT', 'GARMIN', 'POLAR', 'FITBIT', 'WHOOP', 'MANUAL') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HealthConnection_athleteId_isActive_idx`(`athleteId`, `isActive`),
    UNIQUE INDEX `HealthConnection_athleteId_provider_key`(`athleteId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AthleteConsent` ADD CONSTRAINT `AthleteConsent_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthConnection` ADD CONSTRAINT `HealthConnection_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
