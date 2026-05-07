-- AlterTable
ALTER TABLE `document` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `message` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `nutritionplan` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `plan` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `Coach_userId_idx` ON `Coach`(`userId`);

-- CreateIndex
CREATE INDEX `Message_fromUserId_toUserId_createdAt_idx` ON `Message`(`fromUserId`, `toUserId`, `createdAt`);

-- CreateIndex
CREATE INDEX `NutritionPlan_athleteId_isActive_idx` ON `NutritionPlan`(`athleteId`, `isActive`);

-- RenameIndex
ALTER TABLE `athlete` RENAME INDEX `Athlete_coachId_fkey` TO `Athlete_coachId_idx`;

-- RenameIndex
ALTER TABLE `document` RENAME INDEX `Document_athleteId_fkey` TO `Document_athleteId_idx`;
