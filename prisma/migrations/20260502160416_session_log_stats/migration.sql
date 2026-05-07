-- AlterTable
ALTER TABLE `sessionlog` ADD COLUMN `durationMin` INTEGER NULL,
    ADD COLUMN `heartRateAvg` INTEGER NULL,
    ADD COLUMN `kcalBurned` INTEGER NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'manual';
