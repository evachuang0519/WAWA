# 長照交通服務平台 (LTC Transport System)

> 多機構長照交通派車管理平台  
> 版本：1.1.0 · 最後更新：2026-04-17

---

## 專案簡介

本系統為長照機構的交通接送服務提供完整的資訊化管理，涵蓋訂車、派車、駕駛任務、服務紀錄等全流程管理。採用多租戶架構，各機構、車行之間資料完全隔離。

### 系統組成

```
WAWA/
├── ltc-transport/   # 後端 API — Next.js 15 App Router
└── ltc-vue/         # 前端 SPA — Vue 3 + Bootstrap 5
```

---

## 快速啟動

### 需求環境

- **Node.js** 18+（建議 22.x LTS）
- **PostgreSQL** 14+（選用，無 DB 自動使用記憶體模式）

### 安裝與啟動

```bash
# 1. 安裝後端相依套件
cd ltc-transport
npm install

# 2. 安裝前端相依套件
cd ../ltc-vue
npm install

# 3. 設定環境變數（後端）
# 複製以下內容至 ltc-transport/.env.local
```

```env
# 資料庫（不設定則使用記憶體模式）
DATABASE_URL=postgres://postgres:密碼@localhost:5432/ltc_transport

# JWT 金鑰（請修改為隨機 32+ 字元字串）
JWT_SECRET=ltc-transport-jwt-secret-2026-min-32-chars
```

```bash
# 4. 初始化資料庫（有 PostgreSQL 時執行）
psql -U postgres -f ltc-transport/scripts/init-db.sql

# 5a. Windows 一鍵啟動（同時啟動前後端）
start.bat

# 5b. 手動啟動
# 終端機 1（後端 API）
cd ltc-transport && npm run dev        # http://localhost:3000

# 終端機 2（前端 SPA）
cd ltc-vue && npm run dev -- --port 5174  # http://localhost:5174
```

---

## 測試帳號

| 角色 | Email | 密碼 | 登入後頁面 |
|------|-------|------|-----------|
| 系統管理員 | admin@ltc.tw | admin1234 | /dashboard |
| 機構管理員 | org@ltc.tw | org12345 | /bookings |
| 車行管理員 | fleet@ltc.tw | fleet123 | /assignments |
| 駕駛 | driver@ltc.tw | driver123 | /tasks |

---

## 系統架構

### 後端（ltc-transport）

```
Next.js 15 App Router
│
├── /api/auth/*          認證（login / logout / me）
├── /api/bookings/*      訂車管理
├── /api/passengers/*    個案管理
├── /api/drivers/*       駕駛管理
├── /api/vehicles/*      車輛管理
├── /api/assignments/*   任務指派
├── /api/service-records 服務紀錄
├── /api/care-units/*    長照機構管理
├── /api/companies/*     車行管理
├── /api/users/*         使用者管理
├── /api/recurring-templates/* 定期範本
└── /api/settings/*      系統設定
```

**技術棧：**
- Next.js 15 App Router（TypeScript）
- JWT 認證（jose，HTTP-only cookie，8 小時有效）
- PostgreSQL + postgres.js（支援記憶體模式 fallback）
- 角色型存取控制（RBAC）：session 端強制租戶隔離

### 前端（ltc-vue）

```
Vue 3 Composition API (<script setup>)
│
├── /login               登入頁
├── /dashboard           系統總覽（system_admin）
├── /bookings            訂車管理（org_admin / system_admin）
├── /passengers          個案管理（org_admin / system_admin）
├── /recurring-templates 定期範本（org_admin / system_admin）
├── /assignments         任務指派（fleet_admin / system_admin）
├── /drivers             駕駛管理（fleet_admin / system_admin）
├── /vehicles            車輛管理（fleet_admin / system_admin）
├── /tasks               今日任務（driver）
├── /service-records     服務紀錄（全角色）
├── /care-units          長照機構（org_admin / system_admin）
├── /companies           車行管理（fleet_admin / system_admin）
└── /users               使用者管理（system_admin）
```

**技術棧：**
- Vue 3 + Vite（JavaScript）
- Pinia（狀態管理）
- Vue Router 4（含角色路由守衛）
- Bootstrap 5 + Bootstrap Icons
- Axios（API 呼叫，含 401 自動重導）
- RWD：侧欄 offcanvas（行動版漢堡選單）

---

## 角色與資料隔離

| 角色 | 可見資料範圍 | 首頁 |
|------|------------|------|
| **system_admin** | 全機構全車行，可依單位篩選 | /dashboard |
| **org_admin** | 僅自己機構的個案、訂車、服務紀錄 | /bookings |
| **fleet_admin** | 僅自己車行的駕駛、車輛、任務 | /assignments |
| **driver** | 僅自己被指派的任務與服務紀錄 | /tasks |

> 所有隔離邏輯在**伺服器端** JWT session 強制執行，前端無法繞過。

---

## 資料庫結構

```sql
care_units            -- 長照機構
transport_companies   -- 車行
users                 -- 系統帳號（所有角色）
vehicles              -- 車輛
drivers               -- 駕駛（可連結 users）
passengers            -- 服務個案
routes                -- 固定路線（JSONB stops）
booking_records       -- 訂車單（含 batch_id 批次）
task_assignments      -- 任務指派（booking ↔ driver ↔ vehicle）
service_records       -- 完成紀錄（含 GPS、上下車時間、距離）
system_logs           -- 操作稽核紀錄
```

初始化腳本：`ltc-transport/scripts/init-db.sql`

---

## 目錄結構

```
WAWA/
├── ltc-transport/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/         登入頁（Next.js）
│   │   │   ├── (dashboard)/          管理後台頁面
│   │   │   ├── api/                  REST API 路由
│   │   │   └── line/                 LINE WebView 頁面
│   │   ├── lib/
│   │   │   ├── api-helpers.ts        requireAuth / requireRole
│   │   │   ├── auth.ts               JWT 工具
│   │   │   ├── db.ts                 記憶體 mock 資料
│   │   │   ├── pg.ts                 PostgreSQL 連線
│   │   │   └── queries/              資料庫查詢函式
│   │   ├── types/index.ts            TypeScript 型別定義
│   │   └── proxy.ts                  路由保護
│   ├── scripts/init-db.sql           資料庫建立腳本
│   └── package.json
│
├── ltc-vue/
│   ├── src/
│   │   ├── api/index.js              Axios API 封裝
│   │   ├── components/
│   │   │   ├── AppLayout.vue         主版面（側欄 + 頂列）
│   │   │   ├── AppSidebar.vue        側欄導覽（含角色過濾）
│   │   │   ├── AppTopbar.vue         頂列（角色 badge + 登出）
│   │   │   └── StatusBadge.vue       狀態標籤元件
│   │   ├── router/index.js           路由設定 + 角色守衛
│   │   ├── stores/auth.js            Pinia 認證 Store
│   │   └── views/                    13 個頁面元件
│   └── package.json
│
├── .gitignore
├── README.md                         本文件
├── INSTALL.md                        詳細安裝手冊
├── PROJECT_STATUS.md                 功能清單與開發進度
├── start.bat                         Windows 一鍵啟動
└── init-db.bat                       Windows 資料庫初始化
```

---

## 正式環境部署

### Vercel + Supabase（推薦）

```bash
# 後端部署
cd ltc-transport
npm install -g vercel
vercel

# Vercel 環境變數設定
DATABASE_URL=postgres://...（Supabase connection string）
JWT_SECRET=（隨機 32+ 字元）
```

### 前端部署

```bash
cd ltc-vue
npm run build    # 產生 dist/ 靜態檔案
# 將 dist/ 部署至 Nginx / Vercel / Cloudflare Pages
# 確認 /api/* 代理至後端服務
```

### Nginx 反向代理範例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端靜態檔案
    location / {
        root /var/www/ltc-vue/dist;
        try_files $uri $uri/ /index.html;
    }

    # 代理至後端 API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

---

## 詳細文件

- [安裝手冊](INSTALL.md) — 逐步安裝說明、LINE 設定、FAQ
- [開發進度](PROJECT_STATUS.md) — 功能清單、技術債、待辦事項

---

## 授權

本專案為內部使用專案，版權所有。
