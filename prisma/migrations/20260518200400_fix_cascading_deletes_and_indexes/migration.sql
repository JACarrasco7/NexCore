/*
  Warnings:

  - A unique constraint covering the columns `[athleteId,date]` on the table `CheckIn` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `athlete` DROP FOREIGN KEY `Athlete_coachId_fkey`;

-- DropForeignKey
ALTER TABLE `document` DROP FOREIGN KEY `Document_coachId_fkey`;

-- DropForeignKey
ALTER TABLE `nutritionplan` DROP FOREIGN KEY `NutritionPlan_coachId_fkey`;

-- DropForeignKey
ALTER TABLE `plan` DROP FOREIGN KEY `Plan_coachId_fkey`;

-- DropIndex
DROP INDEX `Notification_externalId_idx` ON `notification`;

-- AlterTable
ALTER TABLE `athlete` MODIFY `coachId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `document` MODIFY `coachId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `nutritionplan` MODIFY `coachId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `plan` MODIFY `coachId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CheckIn_athleteId_date_key` ON `CheckIn`(`athleteId`, `date`);

-- CreateIndex
CREATE INDEX `Notification_externalId_idx` ON `Notification`(`externalId`(191));

-- CreateIndex
CREATE INDEX `SessionLog_athleteId_date_idx` ON `SessionLog`(`athleteId`, `date`);

-- AddForeignKey
ALTER TABLE `Athlete` ADD CONSTRAINT `Athlete_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `Coach`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `Coach`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NutritionPlan` ADD CONSTRAINT `NutritionPlan_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `Coach`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `Coach`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
