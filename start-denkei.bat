@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Denkei Startup Script

rem Move to project root (folder where this batch file exists)
cd /d "%~dp0"

echo ========================================
echo   Denkei (Denkei) Standalone Startup
echo ========================================
echo.

echo [INFO] Working folder: %~dp0
echo.

rem Check if Docker is installed and running
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running.
    echo       Please start Docker Desktop and run this again.
    echo.
    pause
    exit /b 1
)

rem Create .env file with randomly generated secrets if it does not exist
if not exist .env (
    echo [INFO] .env file not found. Creating with randomly generated secrets.
    for /f %%a in ('powershell -NoProfile -Command "[string][guid]::NewGuid()"') do set "GEN_SECRET_1=%%a"
    set "GEN_SECRET_1=!GEN_SECRET_1:-=!"
    for /f %%a in ('powershell -NoProfile -Command "[string][guid]::NewGuid()"') do set "GEN_SECRET_2=%%a"
    set "GEN_SECRET_2=!GEN_SECRET_2:-=!"
    for /f %%a in ('powershell -NoProfile -Command "[string][guid]::NewGuid()"') do set "GEN_SECRET_3=%%a"
    set "GEN_SECRET_3=!GEN_SECRET_3:-=!"
    echo NEXTAUTH_SECRET=!GEN_SECRET_1!>> .env
    echo NEXT_PRIVATE_ENCRYPTION_KEY=!GEN_SECRET_2!>> .env
    echo NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=!GEN_SECRET_3!>> .env
    echo NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000 >> .env
    echo NEXT_PRIVATE_JOBS_PROVIDER=local >> .env
    echo NEXT_PRIVATE_SIGNING_ENABLE_TSA=false >> .env
    echo NEXT_PRIVATE_IDENTITY_PROVIDER=otp >> .env
    echo NEXT_PRIVATE_SIGNING_TRANSPORT=local >> .env
    echo NEXT_PUBLIC_UPLOAD_TRANSPORT=database >> .env
    echo NEXT_PRIVATE_SMTP_TRANSPORT=smtp-auth >> .env
    echo [INFO] .env file created.
    echo.
)

rem Start containers (with --build to reflect any code changes)
echo [INFO] Starting Docker containers (rebuilding if code changed)...
docker compose -f docker/compose.standalone.yml --env-file .env up -d --build

if errorlevel 1 (
    echo [ERROR] Docker Compose startup failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo     Started!
echo ========================================
echo Main app: http://localhost:3000
echo.
echo Logs: docker compose -f docker/compose.standalone.yml logs -f app
echo Stop:   docker compose -f docker/compose.standalone.yml down
echo.
echo Containers keep running in background after closing this window.
echo.
pause
