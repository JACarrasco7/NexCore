-- DropIndex
DROP INDEX `Athlete_contactEmail_key` ON `athlete`;

-- CreateTable
CREATE TABLE `TeamUserMembership` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamUserMembership_userId_isActive_idx`(`userId`, `isActive`),
    UNIQUE INDEX `TeamUserMembership_teamId_userId_key`(`teamId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill coaches from legacy TeamMembership (team <-> coach)
INSERT IGNORE INTO `TeamUserMembership` (`id`, `teamId`, `userId`, `role`, `isActive`, `createdAt`, `updatedAt`)
SELECT
    REPLACE(UUID(), '-', ''),
    tm.`teamId`,
    c.`userId`,
    tm.`role`,
    tm.`isActive`,
    tm.`createdAt`,
    CURRENT_TIMESTAMP(3)
FROM `TeamMembership` tm
INNER JOIN `Coach` c ON c.`id` = tm.`coachId`;

-- Backfill athletes already assigned to a team
INSERT IGNORE INTO `TeamUserMembership` (`id`, `teamId`, `userId`, `role`, `isActive`, `createdAt`, `updatedAt`)
SELECT
    REPLACE(UUID(), '-', ''),
    a.`teamId`,
    a.`userId`,
    'MEMBER',
    TRUE,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Athlete` a
WHERE a.`teamId` IS NOT NULL;

-- CreateIndex
CREATE INDEX `Athlete_contactEmail_idx` ON `Athlete`(`contactEmail`);

-- AddForeignKey
ALTER TABLE `TeamUserMembership` ADD CONSTRAINT `TeamUserMembership_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamUserMembership` ADD CONSTRAINT `TeamUserMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
