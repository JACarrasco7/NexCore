-- AlterTable
ALTER TABLE `exerciseprescription` ADD COLUMN `coachCue` TEXT NULL,
    ADD COLUMN `loadKg` DOUBLE NULL,
    ADD COLUMN `loadNote` VARCHAR(191) NULL,
    ADD COLUMN `progressionNote` TEXT NULL,
    ADD COLUMN `technique` VARCHAR(191) NULL,
    ADD COLUMN `techniqueDetail` TEXT NULL,
    ADD COLUMN `tempoConc` INTEGER NULL,
    ADD COLUMN `tempoEcc` INTEGER NULL,
    ADD COLUMN `tempoPause` INTEGER NULL,
    ADD COLUMN `videoUrl` VARCHAR(191) NULL;
