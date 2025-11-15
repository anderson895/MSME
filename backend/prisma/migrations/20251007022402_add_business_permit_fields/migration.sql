-- AlterTable
ALTER TABLE `users` ADD COLUMN `businessPermitFileName` VARCHAR(191) NULL,
    ADD COLUMN `businessPermitFileSize` INTEGER NULL,
    ADD COLUMN `businessPermitUrl` VARCHAR(191) NULL;
