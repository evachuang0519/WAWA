# 長照交通服務平台 — 專案功能與開發進度
> 版本：1.1.0 · 最後更新：2026-04-17

---

## 一、系統概覽

多機構長照交通派車管理平台，分為兩個子專案：

| 子專案 | 技術 | Port | 說明 |
|--------|------|------|------|
| `ltc-transport` | Next.js 15 + TypeScript | 3000 | REST API 後端 |
| `ltc-vue` | Vue 3 + Bootstrap 5 | 5174 | RWD 前端 SPA |

---

## 二、測試帳號

| 角色 | 帳號 | 密碼 | Vue 前端首頁 |
|------|------|------|-------------|
| 系統管理員 | admin@ltc.tw | admin1234 | /dashboard |
| 機構管理員 | org@ltc.tw | org12345 | /bookings |
| 車行管理員 | fleet@ltc.tw | fleet123 | /assignments |
| 駕駛 | driver@ltc.tw | driver123 | /tasks |

---

## 三、功能完成狀態

### 3.1 後端 API（ltc-transport）

#### 認證
- [x] POST /api/auth/login — JWT 登入，HTTP-only cookie
- [x] POST /api/auth/logout — 清除 cookie
- [x] GET /api/auth/me — 取得目前使用者資訊

#### 訂車管理
- [x] GET /api/bookings — 列表（角色隔離：org_admin→自己機構，fleet_admin→自己車行，driver→自己任務）
- [x] POST /api/bookings — 新增（org_admin/system_admin，org_admin 強制帶入 care_unit_id）
- [x] GET /api/bookings/:id — 單筆（含所有權驗證）
- [x] PATCH /api/bookings/:id — 更新（driver 只能改 status，fleet_admin 禁止）
- [x] DELETE /api/bookings/:id — 刪除（org_admin/system_admin，所有權驗證）

#### 個案管理
- [x] GET /api/passengers — 列表（org_admin→自己機構）
- [x] POST /api/passengers — 新增（org_admin 強制 care_unit_id）
- [x] GET/PATCH/DELETE /api/passengers/:id

#### 駕駛管理
- [x] GET /api/drivers — 列表（fleet_admin→自己車行）
- [x] POST /api/drivers — 新增（fleet_admin 強制 company_id）
- [x] PATCH /api/drivers/:id — 更新（fleet_admin 驗證所有權，禁止改 company_id）
- [x] DELETE /api/drivers/:id

#### 車輛管理
- [x] GET /api/vehicles — 列表（fleet_admin→自己車行）
- [x] POST /api/vehicles — 新增（fleet_admin 強制 company_id）
- [x] PATCH /api/vehicles/:id — 更新（fleet_admin 驗證所有權）
- [x] DELETE /api/vehicles/:id

#### 任務指派
- [x] GET /api/assignments — 列表（fleet_admin→自己車行）
- [x] POST /api/assignments — 新增（fleet_admin 驗證駕駛+車輛均屬自己車行）
- [x] PATCH /api/assignments/:id

#### 服務紀錄
- [x] GET /api/service-records — 列表（driver→自己，org_admin→自己機構，fleet_admin→自己車行）
- [x] POST /api/service-records — 新增（driver 強制自己 driver_id，並驗證任務指派）

#### 長照機構
- [x] GET /api/care-units — 列表（org_admin 只看自己）
- [x] POST /api/care-units — 新增（system_admin only）
- [x] PATCH/DELETE /api/care-units/:id

#### 車行管理
- [x] GET /api/companies — 列表（fleet_admin 只看自己）
- [x] POST /api/companies — 新增（system_admin only）
- [x] PATCH/DELETE /api/companies/:id

#### 使用者管理
- [x] GET /api/users — 列表（system_admin only，可依 role 篩選）
- [x] POST /api/users — 新增（system_admin only，密碼 bcrypt hash）
- [x] PATCH/DELETE /api/users/:id

#### 定期範本
- [x] GET /api/recurring-templates — 列表（org_admin→自己機構）
- [x] POST /api/recurring-templates — 新增（org_admin 強制 care_unit_id）
- [x] PATCH/DELETE /api/recurring-templates/:id
- [x] POST /api/recurring-templates/generate — 批次產生訂車

#### 系統設定
- [x] GET/PATCH /api/settings — 系統設定（system_admin only）
- [x] POST /api/settings/sync — AppSheet 同步觸發

#### LINE WebView
- [x] LINE OAuth 登入（LIFF）
- [x] 今日任務列表與詳情
- [x] 開始接送 / 完成任務（GPS 打卡 + localStorage 事件記錄）
- [x] 服務紀錄填寫（自動帶入時間戳 + GPS 座標）
- [x] 歷史紀錄查詢

---

### 3.2 前端 SPA（ltc-vue）

#### 基礎架構
- [x] Vue Router 4 + 角色路由守衛（未登入→/login，權限不足→角色首頁）
- [x] Pinia auth store（fetchMe / login / logout / roleLabel / roleBadgeClass）
- [x] Axios 封裝（/api 代理，401 自動重導登入頁）
- [x] RWD 版面（desktop 固定側欄，mobile offcanvas 漢堡選單）
- [x] 角色過濾側欄導覽連結

#### 頁面（13 個）

| 頁面 | 路徑 | 可使用角色 | 主要功能 |
|------|------|-----------|---------|
| 登入 | /login | 全部 | 帳密登入，依角色跳轉首頁 |
| 系統總覽 | /dashboard | system_admin | KPI 卡片、最近訂車列表 |
| 訂車管理 | /bookings | system_admin, org_admin | 狀態分頁、新增/編輯/刪除 Modal |
| 個案管理 | /passengers | system_admin, org_admin | 搜尋、輪椅旗標、新增/編輯 |
| 定期範本 | /recurring-templates | system_admin, org_admin | 範本 CRUD、批次產生訂車 |
| 任務指派 | /assignments | system_admin, fleet_admin | 待指派/已指派分區、駕駛車輛選擇 |
| 駕駛管理 | /drivers | system_admin, fleet_admin | 駕照/健康證明到期警示 |
| 車輛管理 | /vehicles | system_admin, fleet_admin | 保險/定檢到期警示 |
| 今日任務 | /tasks | driver | 今日任務列表，日期顯示 |
| 服務紀錄 | /service-records | 全角色 | 唯讀列表（依角色隔離） |
| 長照機構 | /care-units | system_admin, org_admin | CRUD（org_admin 唯讀自己） |
| 車行管理 | /companies | system_admin, fleet_admin | CRUD（fleet_admin 唯讀自己） |
| 使用者管理 | /users | system_admin | 角色篩選、新增/編輯 |

#### 共用元件
- [x] StatusBadge.vue — 訂車狀態彩色標籤（待指派/已指派/進行中/已完成/取消）
- [x] AppLayout.vue — 主版面框架（sidebar + topbar + main）
- [x] AppSidebar.vue — 側欄（依角色過濾連結，desktop 固定 / mobile offcanvas）
- [x] AppTopbar.vue — 頂列（角色 badge + 使用者名稱 + 登出按鈕）
- [x] ExpiryBadge（DriversView/VehiclesView 內聯）— 到期日顏色警示

---

## 四、資料隔離驗證結果

> 驗證日期：2026-04-17，記憶體模式執行

| 角色 | 登入 | 首頁重導 | 側欄連結數 | 訂車筆數 | 隔離正確 |
|------|------|---------|-----------|---------|---------|
| system_admin | OK | /dashboard | 12 項 | 6 筆（全部）| ✅ |
| org_admin | OK | /bookings | 5 項 | 4 筆（照橙機構）| ✅ |
| fleet_admin | OK | /assignments | 5 項 | — | ✅ 2 駕駛 / 2 車輛 |
| driver | OK | /tasks | 2 項 | — | ✅ 僅自己任務 |

RWD 行動版（375×812）：側欄收折為漢堡選單，點擊展開 offcanvas，關閉正常。✅

---

## 五、資料庫結構

```
care_units            長照機構
transport_companies   車行
users                 系統帳號（所有角色）
vehicles              車輛
drivers               駕駛（可連結 users.id）
passengers            服務個案
routes                固定路線（JSONB stops，保留未開發）
booking_records       訂車單（含 batch_id 批次 UUID）
task_assignments      任務指派（booking ↔ driver ↔ vehicle）
service_records       完成紀錄（GPS 座標、上下車時間、距離）
system_logs           操作稽核紀錄
```

---

## 六、開發里程碑

### ✅ 第一階段：後端 API 建置（2026-04-16 完成）
- Next.js App Router 架構建立
- JWT 認證流程（登入/登出/session 驗證）
- 11 張資料表 schema + 種子資料
- 記憶體 mock 模式（無需 DB 即可執行）
- 所有 CRUD API 端點

### ✅ 第二階段：資料隔離強化（2026-04-16 完成）
- 所有 API 加入角色型存取控制（RBAC）
- org_admin → care_unit_id 強制隔離（伺服器端）
- fleet_admin → company_id 強制隔離（伺服器端）
- driver → userId → driverId 查找後隔離
- fleet_admin 可見未指派訂車（可指派用），不見他車行訂車
- 所有 PATCH/DELETE 加入所有權驗證，拒絕越權操作

### ✅ 第三階段：Vue 3 前端建置（2026-04-17 完成）
- 登入頁、路由守衛、Pinia auth store
- 13 個頁面元件全數完成
- RWD 行動版（offcanvas 側欄）
- 所有頁面含新增/編輯 Bootstrap Modal
- 到期日警示顏色（駕照、保險、定檢）
- API 客戶端完整封裝（11 組 API）

### ✅ 第四階段：整合驗證與版本控制（2026-04-17 完成）
- 4 種角色登入與資料隔離驗證通過
- 行動版 RWD 確認
- Git 初始化，144 個檔案，27,265 行
- 推送至 GitHub：https://github.com/evachuang0519/WAWA

---

## 七、技術債 / 待辦事項

### 高優先

| 項目 | 說明 | 估計 |
|------|------|------|
| 系統設定持久化 | `/api/settings` 存 DB，重啟後保留 | 2h |
| 推播通知 | 指派完成時 LINE push 通知駕駛 | 4h |
| 報表匯出 | 月結帳單、服務統計 Excel/PDF | 8h |

### 中優先

| 項目 | 說明 | 估計 |
|------|------|------|
| 訂車列表分頁 | 目前前端全量載入，需 offset 分頁 | 3h |
| 地址自動補全 | 串接 TGOS 或 Google Places API | 4h |
| 即時 GPS 更新 | 駕駛位置 SSE 推送至車行地圖 | 6h |
| 週排班管理 | 批次建立固定班表 | 8h |
| 駕照到期提醒 | 到期前 30 天 LINE 訊息通知 | 3h |

### 低優先 / 技術債

| 項目 | 說明 |
|------|------|
| API 錯誤格式統一 | 各路由 error 格式不一致，應共用 apiError() |
| system_logs 寫入 | 大部分 API 尚未寫入稽核日誌 |
| 軟刪除 | 目前實體刪除，應改 deleted_at 欄位 |
| E2E 測試 | 核心流程補 Playwright 自動化測試 |
| Vue 前端分頁 | 使用者、服務紀錄清單需分頁 |

---

## 八、已知問題

| 問題 | 嚴重度 | 狀態 |
|------|--------|------|
| 設定值重啟後重置 | 中 | 待處理（global.__appSettings 為記憶體） |
| LINE OAuth 本機需 ngrok | 低 | 待處理 |
| routes 資料表未使用 | 低 | 保留，固定路線功能未開發 |

---

## 九、相關連結

- GitHub：https://github.com/evachuang0519/WAWA
- 後端 API：http://localhost:3000
- 前端 SPA：http://localhost:5174
- 安裝手冊：INSTALL.md
