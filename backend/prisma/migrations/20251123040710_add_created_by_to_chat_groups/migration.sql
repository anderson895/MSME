-- AlterTable
ALTER TABLE `chat_groups` ADD COLUMN `createdBy` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `chat_groups` ADD CONSTRAINT `chat_groups_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
