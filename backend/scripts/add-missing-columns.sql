-- Add missing columns to users table
-- Run this on your VPS database to fix the login error

-- Check if columns exist before adding (safe to run multiple times)
SET @dbname = DATABASE();
SET @tablename = "users";

-- Add resetToken column (if it doesn't exist)
SET @columnname = "resetToken";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column resetToken already exists in users' AS result;",
  "ALTER TABLE users ADD COLUMN resetToken VARCHAR(191) NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add resetTokenExpires column (if it doesn't exist)
SET @columnname = "resetTokenExpires";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column resetTokenExpires already exists in users' AS result;",
  "ALTER TABLE users ADD COLUMN resetTokenExpires DATETIME(3) NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add meetingUrl to sessions table (if it doesn't exist)
SET @tablename = "sessions";
SET @columnname = "meetingUrl";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column meetingUrl already exists in sessions' AS result;",
  "ALTER TABLE sessions ADD COLUMN meetingUrl VARCHAR(191) NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT 'All missing columns have been added successfully!' AS result;

