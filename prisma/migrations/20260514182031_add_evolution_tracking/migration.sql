/*
  Warnings:

  - You are about to drop the column `servicePlanId` on the `athletesubscription` table. All the data in the column will be lost.
  - The values [PAST_DUE,EXPIRED,UNPAID] on the enum `AthleteSubscription_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- DropForeignKey
ALTER TABLE `athletesubscription` DROP FOREIGN KEY `AthleteSubscription_servicePlanId_fkey`;

-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `athletesubscription` DROP COLUMN `servicePlanId`,
    MODIFY `status` ENUM('TRIAL', 'ACTIVE', 'INACTIVE', 'CANCELED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `plan` ADD COLUMN `lastReviewDate` DATETIME(3) NULL,
    ADD COLUMN `reviewFrequencyDays` INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE `sessionlog` ADD COLUMN `muscleTargets` JSON NULL;

-- AlterTable
ALTER TABLE `setlog` ADD COLUMN `primaryMuscle` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ExerciseMuscleMapping` (
    `id` VARCHAR(191) NOT NULL,
    `exercise` VARCHAR(191) NOT NULL,
    `primaryMuscle` VARCHAR(191) NOT NULL,
    `secondaryMuscles` JSON NULL,
    `externalImageUrl` VARCHAR(191) NULL,
    `externalVideoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExerciseMuscleMapping_exercise_key`(`exercise`),
    INDEX `ExerciseMuscleMapping_primaryMuscle_idx`(`primaryMuscle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvolutionSetting` (
    `id` VARCHAR(191) NOT NULL,
    `athleteId` VARCHAR(191) NOT NULL,
    `muscleGroups` JSON NOT NULL,
    `volumeGoals` JSON NOT NULL,
    `enableAutoSuggestions` BOOLEAN NOT NULL DEFAULT true,
    `suggestionThreshold` INTEGER NOT NULL DEFAULT 15,
    `enabledCharts` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EvolutionSetting_athleteId_key`(`athleteId`),
    INDEX `EvolutionSetting_athleteId_idx`(`athleteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));

-- AddForeignKey
ALTER TABLE `EvolutionSetting` ADD CONSTRAINT `EvolutionSetting_athleteId_fkey` FOREIGN KEY (`athleteId`) REFERENCES `Athlete`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
