@echo off
chcp 65001 >nul
title 長照交通服務平台

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   長照交通服務平台  LTC Transport    ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0ltc-transport"

:: ── 檢查 Node.js ────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js，請先安裝 https://nodejs.org/
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  Node.js  %%v

:: ── 安裝相依套件 ─────────────────────────────────────────────
if not exist "node_modules" (
  echo.
  echo  正在安裝相依套件，請稍候...
  npm install
  if errorlevel 1 (
    echo [錯誤] npm install 失敗
    pause
    exit /b 1
  )
)

:: ── 讀取 .env.local ──────────────────────────────────────────
if exist ".env.local" (
  echo  環境設定  .env.local 已載入
) else (
  echo  [警告] 找不到 .env.local，將使用記憶體模式（無資料庫）
)

:: ── 顯示啟動資訊 ─────────────────────────────────────────────
echo.
echo  ┌─────────────────────────────────────────────┐
echo  │  瀏覽器開啟:  http://localhost:3000          │
echo  │                                             │
echo  │  管理員      admin@ltc.tw   / admin1234     │
echo  │  機構管理    org@ltc.tw     / org12345      │
echo  │  車行管理    fleet@ltc.tw   / fleet123      │
echo  │  駕駛        driver@ltc.tw  / driver123     │
echo  │                                             │
echo  │  按 Ctrl+C 停止伺服器                       │
echo  └─────────────────────────────────────────────┘
echo.

:: ── 啟動開發伺服器 ───────────────────────────────────────────
npm run dev
