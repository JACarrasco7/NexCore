-- DropIndex
DROP INDEX `AuditLog_entity_entityId_idx` ON `auditlog`;

-- DropIndex
DROP INDEX `AuditLog_userId_idx` ON `auditlog`;

-- AlterTable
ALTER TABLE `auditlog` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` TEXT NULL;

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `channel` ENUM('EMAIL', 'SMS', 'PUSH', 'IN_APP') NOT NULL DEFAULT 'IN_APP',
    ADD COLUMN `deliveryStatus` ENUM('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `lastRetryAt` DATETIME(3) NULL,
    ADD COLUMN `retriesAttempted` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `OtpToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `code` CHAR(6) NOT NULL,
    `type` ENUM('LOGIN', 'SIGNATURE', 'RESET') NOT NULL DEFAULT 'LOGIN',
    `expiresAt` DATETIME(3) NOT NULL,
    `attemptsLeft` INTEGER NOT NULL DEFAULT 3,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OtpToken_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `OtpToken_userId_code_type_idx`(`userId`, `code`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSignature` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dniHash` VARCHAR(191) NULL,
    `otpUsed` BOOLEAN NOT NULL DEFAULT false,
    `otpCode` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `timestampServer` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `signaturePath` TEXT NULL,
    `pdfHash` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SIGNED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentSignature_documentId_status_idx`(`documentId`, `status`),
    INDEX `DocumentSignature_athleteId_createdAt_idx`(`athleteId`, `createdAt`),
    INDEX `DocumentSignature_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `DocumentSignature_status_revokedAt_idx`(`status`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AuditLog_userId_createdAt_idx` ON `AuditLog`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `AuditLog_entity_entityId_createdAt_idx` ON `AuditLog`(`entity`, `entityId`, `createdAt`);

-- CreateIndex
CREATE INDEX `AuditLog_action_createdAt_idx` ON `AuditLog`(`action`, `createdAt`);

-- CreateIndex
CREATE INDEX `Notification_userId_channel_deliveryStatus_idx` ON `Notification`(`userId`, `channel`, `deliveryStatus`);

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`);

-- AddForeignKey
ALTER TABLE `OtpToken` ADD CONSTRAINT `OtpToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSignature` ADD CONSTRAINT `DocumentSignature_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSignature` ADD CONSTRAINT `DocumentSignature_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSignature` ADD CONSTRAINT `DocumentSignature_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
