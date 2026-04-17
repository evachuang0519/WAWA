# 長照交通服務平台 — 安裝手冊
> 版本：1.0 · 日期：2026-04-16

---

## 一、系統軟體需求

### 必要環境

| 軟體 | 最低版本 | 建議版本 | 說明 |
|------|---------|---------|------|
| **Node.js** | 18.17.0 | 22.x LTS | 含 npm |
| **PostgreSQL** | 14 | 16.x | 正式環境必須；無 DB 可用記憶體模式 |
| **作業系統** | Windows 10 / macOS 12 / Ubuntu 20.04 | — | 64 位元 |
| **瀏覽器** | Chrome 110+ / Edge 110+ / Firefox 115+ | Chrome 最新版 | 管理後台 |
| **Git** | 2.x | — | 選用，用於版本控制 |

### 正式環境額外需求

| 項目 | 說明 |
|------|------|
| **HTTPS 憑證** | LINE LIFF 與 GPS 功能須 HTTPS |
| **網域名稱** | LINE Login callback URI 不接受 localhost |
| **LINE Developers 帳號** | LINE WebView / OAuth 登入功能需要 |
| **AppSheet 帳號** | AppSheet 同步功能需要（選用）|
| **Google Maps API Key** | 地圖功能需要（選用）|

---

## 二、開發環境安裝步驟

### 步驟 1：安裝 Node.js

1. 前往 [https://nodejs.org/](https://nodejs.org/) 下載 LTS 版本
2. 執行安裝程式，勾選「Add to PATH」
3. 確認安裝：
```bash
node -v    # 應顯示 v22.x.x
npm -v     # 應顯示 10.x.x
```

### 步驟 2：安裝 PostgreSQL（可選，無 DB 使用記憶體模式）

1. 前往 [https://www.postgresql.org/download/](https://www.postgresql.org/download/) 下載
2. 安裝時記住：
   - 使用者名稱：`postgres`
   - 密碼：自訂（預設使用 `2iaidioL`）
   - Port：`5432`（預設）
3. 確認服務已啟動：
   - Windows：服務管理員 → `postgresql-x64-16` → 執行中
   - macOS/Linux：`pg_ctl status`

### 步驟 3：取得專案

```bash
# 複製專案（或直接解壓縮）
git clone <repository-url>
cd WAWA
```

### 步驟 4：安裝相依套件

```bash
cd ltc-transport
npm install
```

> 約需 1–2 分鐘，完成後出現 `added N packages`

### 步驟 5：設定環境變數

在 `ltc-transport/` 目錄建立 `.env.local` 檔案：

```env
# ── 資料庫（無此設定則使用記憶體模式）──────────────
DATABASE_URL=postgres://postgres:你的密碼@localhost:5432/ltc_transport

# ── JWT 金鑰（請修改為隨機字串，至少 32 字元）──────
JWT_SECRET=ltc-transport-jwt-secret-2026-min-32-chars

# ── 應用程式 ────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=長照交通服務平台
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── LINE Login（選用，需 LINE Developers 帳號）──────
LINE_CHANNEL_ID=你的_LINE_CHANNEL_ID
LINE_CHANNEL_SECRET=你的_LINE_CHANNEL_SECRET
LINE_REDIRECT_URI=http://localhost:3000/api/auth/line/callback
```

> **記憶體模式**：不設定 `DATABASE_URL` 即可使用內建測試資料，重啟後資料重置。

### 步驟 6：初始化資料庫（僅需執行一次）

**方法 A：使用 init-db.bat（Windows）**
```
雙擊執行：C:\project\WAWA\init-db.bat
```

**方法 B：手動執行**
```bash
psql -U postgres -h localhost -f ltc-transport/scripts/init-db.sql
```

成功後會建立：
- 資料庫：`ltc_transport`
- 11 張資料表 + 索引
- 測試種子資料（4 個帳號、機構、車輛、個案等）

### 步驟 7：啟動開發伺服器

**方法 A：使用 start.bat（Windows）**
```
雙擊執行：C:\project\WAWA\start.bat
```

**方法 B：手動啟動**
```bash
cd ltc-transport
npm run dev
```

開啟瀏覽器：**http://localhost:3000**

---

## 三、測試帳號

| 角色 | 帳號 | 密碼 | 登入後頁面 |
|------|------|------|-----------|
| 系統管理員 | admin@ltc.tw | admin1234 | /dashboard |
| 機構管理員 | org@ltc.tw | org12345 | /dashboard |
| 車行管理員 | fleet@ltc.tw | fleet123 | /dashboard |
| 駕駛 | driver@ltc.tw | driver123 | /driver/tasks |

---

## 四、正式環境部署

### 選項 A：Vercel + Supabase（推薦）

1. **建立 Supabase 專案**
   - 前往 [https://supabase.com](https://supabase.com) 建立新專案
   - 取得 Connection String（格式：`postgres://...`）
   - 在 Supabase SQL Editor 執行 `ltc-transport/scripts/init-db.sql`

2. **部署至 Vercel**
   ```bash
   npm install -g vercel
   cd ltc-transport
   vercel
   ```
   在 Vercel 專案設定 → Environment Variables 加入：
   ```
   DATABASE_URL=postgres://...（Supabase connection string）
   JWT_SECRET=（隨機 32+ 字元）
   LINE_CHANNEL_ID=...
   LINE_CHANNEL_SECRET=...
   LINE_REDIRECT_URI=https://你的網域/api/auth/line/callback
   NEXT_PUBLIC_APP_URL=https://你的網域
   ```

3. **建置指令**
   ```
   Build Command:    npm run build
   Output Directory: .next
   Install Command:  npm install
   ```

### 選項 B：自架伺服器（Ubuntu）

```bash
# 安裝 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安裝 PostgreSQL
sudo apt-get install -y postgresql-16
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 初始化 DB
sudo -u postgres psql -f /path/to/scripts/init-db.sql

# 安裝 PM2（背景執行）
npm install -g pm2

# 建置並啟動
cd ltc-transport
npm install
npm run build
pm2 start npm --name "ltc-transport" -- start
pm2 save
pm2 startup
```

---

## 五、LINE Login 設定（啟用 LINE WebView）

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Provider → 建立 LINE Login Channel
3. 在 Channel 設定：
   - **Callback URL**：`https://你的網域/api/auth/line/callback`
   - **OpenID Connect** → Scopes：勾選 `profile`、`openid`
4. 取得：
   - **Channel ID** → 填入 `LINE_CHANNEL_ID`
   - **Channel Secret** → 填入 `LINE_CHANNEL_SECRET`
5. 若需 LIFF：建立 LIFF App，Endpoint URL 設為 `https://你的網域/line`

> ⚠️ LINE Login **不支援 localhost**，本機測試需搭配 [ngrok](https://ngrok.com/)：
> ```bash
> ngrok http 3000
> # 將 https://xxxx.ngrok.io 填入 LINE Callback URL 與 LINE_REDIRECT_URI
> ```

---

## 六、AppSheet 同步設定

1. 登入 AppSheet 後台 → 你的 App → **Manage → Integrations**
2. 在「IN: from cloud services to your app」區段：
   - 複製 **App ID**
   - 點擊「Enable」產生 **Application Access Key**
3. 從 Google Sheets 網址取得**試算表 ID**（`/d/` 後的字串）
4. 在本系統後台 **系統設定 → AppSheet 同步設定** 填入上述值
5. 啟用要同步的資料表，設定同步頻率或手動觸發

---

## 七、Google Maps 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立或選擇專案 → APIs & Services → Credentials
3. 建立 API 金鑰，啟用以下 API：
   - **Maps JavaScript API**
   - **Geocoding API**（地址搜尋，選用）
   - **Directions API**（路線導航，選用）
4. 在本系統後台 **系統設定 → Google Maps 設定** 填入 API 金鑰

---

## 八、常見問題排除

### Q1：啟動後出現「Both middleware file and proxy file are detected」
```
已修復：確認 src/middleware.ts 不存在，僅保留 src/proxy.ts
```

### Q2：登入後出現「invalid input syntax for type uuid」
```
原因：瀏覽器有舊版 session（cookie 中儲存假 ID）
解決：清除 ltc_session cookie 後重新登入
```

### Q3：`npm install` 失敗
```bash
# 清除 npm 快取後重試
npm cache clean --force
npm install
```

### Q4：PostgreSQL 連線失敗
```
1. 確認 PostgreSQL 服務已啟動
2. 確認 .env.local 中的密碼與安裝時設定一致
3. 確認 port 5432 未被其他程式佔用
4. Windows 可不設定 DATABASE_URL，使用記憶體模式測試
```

### Q5：GPS 座標無法取得
```
原因：瀏覽器 Geolocation API 需 HTTPS 或 localhost
解決：
  - 開發環境：localhost 已允許，確認瀏覽器未封鎖位置權限
  - 正式環境：確認網站有 HTTPS 憑證
```

### Q6：LINE WebView 登入後導向失敗
```
確認 LINE_REDIRECT_URI 與 LINE Developers Console 中的 Callback URL 完全一致
本機測試需使用 ngrok，不可用 localhost
```

---

## 九、目錄結構

```
WAWA/
├── ltc-transport/               # Next.js 主專案
│   ├── src/
│   │   ├── app/                 # App Router 頁面與 API
│   │   │   ├── (auth)/login/    # 登入頁
│   │   │   ├── (dashboard)/     # 管理後台頁面
│   │   │   │   ├── admin/       # 系統管理員（含 settings）
│   │   │   │   ├── org/         # 機構管理員
│   │   │   │   ├── fleet/       # 車行管理員
│   │   │   │   └── driver/      # 駕駛後台
│   │   │   ├── api/             # API 路由
│   │   │   └── line/            # LINE WebView 頁面
│   │   ├── components/          # 共用元件
│   │   ├── lib/                 # 工具函式、DB queries、auth
│   │   ├── types/               # TypeScript 型別定義
│   │   └── proxy.ts             # 路由保護（取代 middleware.ts）
│   ├── scripts/
│   │   └── init-db.sql          # 資料庫建立腳本
│   ├── .env.local               # 環境變數（不納入版控）
│   ├── package.json
│   └── next.config.ts
├── start.bat                    # Windows 一鍵啟動
├── init-db.bat                  # Windows 資料庫初始化
├── PROJECT_STATUS.md            # 專案功能與進度紀錄
└── INSTALL.md                   # 本安裝手冊
```
