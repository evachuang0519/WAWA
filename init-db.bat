@echo off
chcp 65001 >nul
title 資料庫初始化

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       資料庫初始化 / DB Init         ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── 檢查 psql ───────────────────────────────────────────────
where psql >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 找不到 psql，請確認 PostgreSQL 已安裝並加入 PATH
  echo        預設路徑: C:\Program Files\PostgreSQL\<版本>\bin
  pause
  exit /b 1
)

set PGPASSWORD=2iaidioL
set PGUSER=postgres
set PGHOST=localhost
set PGPORT=5432

:: ── 確認連線 ────────────────────────────────────────────────
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -c "\conninfo" >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 無法連線至 PostgreSQL，請確認服務已啟動
  echo        服務名稱: postgresql-x64-<版本>
  pause
  exit /b 1
)

echo  PostgreSQL 連線成功
echo.

:: ── 執行初始化腳本 ───────────────────────────────────────────
echo  正在建立資料庫與資料表...
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -f "ltc-transport\scripts\init-db.sql"

if errorlevel 1 (
  echo.
  echo [錯誤] 初始化失敗（若資料庫已存在可忽略此錯誤）
) else (
  echo.
  echo  資料庫初始化完成！
)

echo.
echo  接下來請執行 start.bat 啟動伺服器
echo.
pause
