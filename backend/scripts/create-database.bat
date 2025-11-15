@echo off
echo === Database Setup Script ===
echo.
echo This script will help you create the mentorship_db database.
echo.
set /p username="MySQL username (default: root): "
if "%username%"=="" set username=root
set /p password="MySQL password: "

echo.
echo Creating database...
echo.

if "%password%"=="" (
    mysql -u %username% -e "CREATE DATABASE IF NOT EXISTS mentorship_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
) else (
    mysql -u %username% -p%password% -e "CREATE DATABASE IF NOT EXISTS mentorship_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)

if %errorlevel% equ 0 (
    echo.
    echo ✅ Database 'mentorship_db' created successfully!
    echo.
    echo Next steps:
    echo 1. Run: npm run db:push
    echo 2. Run: npm run db:seed (optional)
    echo 3. Restart your server
) else (
    echo.
    echo ❌ Failed to create database.
    echo.
    echo Please run this manually:
    echo mysql -u %username% -p
    echo Then run: CREATE DATABASE mentorship_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    echo.
    echo Or find MySQL in:
    echo - C:\Program Files\MySQL\MySQL Server X.X\bin\mysql.exe
    echo - C:\xampp\mysql\bin\mysql.exe
    echo - C:\wamp64\bin\mysql\mysqlX.X\bin\mysql.exe
)

pause






