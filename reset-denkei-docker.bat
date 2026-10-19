@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title デンケイ Docker 完全初期化・クリーン再構築スクリプト

cd /d "%~dp0"

echo ===================================================
echo   デンケイ (Denkei) Docker 完全初期化・再構築
echo ===================================================
echo.
echo [警告] 既存のDockerコンテナ、データベースボリューム、
echo       古いビルドキャッシュをすべて削除して、
echo       最新のソースコードからクリーンに再構築します。
echo.

rem Dockerの動作確認
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker がインストールされていないか、PATH に通っていません。
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop が起動していません。
    echo       Docker Desktop を起動してから再度実行してください。
    pause
    exit /b 1
)

echo [確認] 既存のDockerコンテナ、データベースボリューム（保存済みの全契約書データを含む）、
echo       古いビルドイメージを完全に削除します。この操作は元に戻せません。
echo.
set /p CONFIRM="実行する場合は RESET と入力してください（中止する場合はそのまま Enter）: "
if /i not "%CONFIRM%"=="RESET" (
    echo.
    echo 中止しました。データは削除されていません。
    pause
    exit /b 0
)
echo.

echo [1/4] 既存のコンテナおよびボリュームを停止・完全削除しています...
docker compose -f docker/compose.standalone.yml down -v --remove-orphans

echo.
echo [2/4] 古いビルド済みイメージを削除しています...
docker rmi denkei-smb-standalone-app >nul 2>&1

echo.
echo [3/4] 最新のソースコードからキャッシュなしで再ビルドしています...
echo       (※ 初回・クリーンビルドには数分かかります)
docker compose -f docker/compose.standalone.yml build --no-cache

if errorlevel 1 (
    echo.
    echo [ERROR] Docker ビルドに失敗しました。
    pause
    exit /b 1
)

echo.
echo [4/4] 初期化されたコンテナを起動しています...
docker compose -f docker/compose.standalone.yml up -d

if errorlevel 1 (
    echo.
    echo [ERROR] Docker コンテナの起動に失敗しました。
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   ✓ デンケイ Docker の初期化・再構築が完了しました！
echo ===================================================
echo.
echo サービスURL: http://localhost:3000
echo.
echo ブラウザで http://localhost:3000 を開き、
echo キャッシュが残っている場合は Ctrl + F5 (強力再読み込み) をお試しください。
echo.
pause
