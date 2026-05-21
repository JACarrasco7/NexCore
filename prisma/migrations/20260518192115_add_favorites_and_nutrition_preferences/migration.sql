-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- CreateTable
CREATE TABLE `FavoriteExercise` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `exerciseName` VARCHAR(191) NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FavoriteExercise_athleteId_addedAt_idx`(`athleteId`, `addedAt`),
    UNIQUE INDEX `FavoriteExercise_athleteId_exerciseName_key`(`athleteId`, `exerciseName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoriteFood` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `foodName` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `kcal` INTEGER NULL,
    `proteinG` DOUBLE NULL,
    `carbsG` DOUBLE NULL,
    `fatG` DOUBLE NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FavoriteFood_athleteId_addedAt_idx`(`athleteId`, `addedAt`),
    INDEX `FavoriteFood_athleteId_source_idx`(`athleteId`, `source`),
    UNIQUE INDEX `FavoriteFood_athleteId_foodName_source_key`(`athleteId`, `foodName`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NutritionPreference` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `dietType` VARCHAR(191) NOT NULL DEFAULT 'closed',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NutritionPreference_athleteId_key`(`athleteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));

-- AddForeignKey
ALTER TABLE `FavoriteExercise` ADD CONSTRAINT `FavoriteExercise_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteFood` ADD CONSTRAINT `FavoriteFood_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NutritionPreference` ADD CONSTRAINT `NutritionPreference_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
