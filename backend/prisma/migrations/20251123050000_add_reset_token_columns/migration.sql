-- AlterTable
-- Add resetToken columns to users table (only if they don't exist)
ALTER TABLE `users` ADD COLUMN `resetToken` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `resetTokenExpires` DATETIME(3) NULL;

