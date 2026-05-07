-- AlterTable
ALTER TABLE `teampost` ADD COLUMN `teamId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TeamSettings` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NULL,
    `accentColor` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'es-ES',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Madrid',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `supportEmail` VARCHAR(191) NULL,
    `legalEmail` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `contractTemplate` TEXT NULL,
    `privacyNotice` TEXT NULL,
    `termsNotice` TEXT NULL,
    `contractVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `defaultCheckinDays` INTEGER NOT NULL DEFAULT 7,
    `defaultReviewDays` INTEGER NOT NULL DEFAULT 7,
    `features` JSON NULL,
    `branding` JSON NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `TeamSettings_teamId_key`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TeamPost_teamId_isPinned_createdAt_idx` ON `TeamPost`(`teamId`, `isPinned`, `createdAt`);

-- CreateIndex
CREATE INDEX `TeamPost_teamId_createdAt_idx` ON `TeamPost`(`teamId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `TeamSettings` ADD CONSTRAINT `TeamSettings_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamPost` ADD CONSTRAINT `TeamPost_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
