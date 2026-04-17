# 長照交通服務平台 — 專案現況紀錄
> 最後更新：2026-04-16

---

## 一、系統概覽

多機構長照交通派車管理平台，提供兩套介面：
- **後台儀表板**（Web）：機構管理員、車行管理員、系統管理員操作
- **LINE WebView**：駕駛日常任務、GPS 打卡、服務紀錄填寫

技術棧：Next.js 16.2.4 App Router · PostgreSQL (postgres.js) · JWT (jose) · Tailwind CSS v4 · Leaflet 地圖

---

## 二、角色與帳號

| 角色 | 帳號 | 密碼 | 預設登入頁 |
|------|------|------|-----------|
| 系統管理員 | admin@ltc.tw | admin1234 | /dashboard |
| 機構管理員 | org@ltc.tw | org12345 | /dashboard |
| 車行管理員 | fleet@ltc.tw | fleet123 | /dashboard |
| 駕駛 | driver@ltc.tw | driver123 | /driver/tasks（今日任務）|

> 駕駛角色登入後直接導向今日任務頁，不經儀表板。

---

## 三、功能清單

### 3.1 訂車管理（機構管理員）
- [x] 訂單列表：狀態篩選、日期區間搜尋
- [x] 新增訂單：單日 / 多日（週一–週日勾選 × 同一時段）
- [x] 往返程：同時建立去程＋返程兩筆訂單
- [x] 多日往返：N 天 × 2 程，批次建立，顯示建立筆數
- [x] 複製訂單（`?from=<id>`）：快速建立新單
- [x] 取消訂單

### 3.2 個案管理（機構管理員）
- [x] 個案列表（依機構篩選）
- [x] 新增 / 編輯 / 刪除個案
- [x] 輪椅旗標、殘障等級、緊急聯絡人
- [x] 預設上下車地址（自動帶入訂單）

### 3.3 任務指派（車行管理員）
- [x] 待指派 / 已指派分區列表
- [x] 每筆顯示起訖地點（上車地址 → 下車地址）
- [x] 點擊任意列開啟右側抽屜，顯示完整訂單明細
  - 起訖路線圖（垂直時間軸）
  - 乘客資訊（電話、輪椅、殘障等級）
  - 指派駕駛 + 車輛詳細資訊
  - 訂單 ID、批次 ID
- [x] 下拉選單指派駕駛 + 車輛、改派

### 3.4 駕駛管理（車行管理員）
- [x] 駕駛列表、新增 / 編輯 / 刪除
- [x] 駕照到期、健康證明到期追蹤

### 3.5 車輛管理（車行管理員）
- [x] 車輛列表、新增 / 編輯 / 刪除
- [x] 車型（轎車/廂型/無障礙/巴士）、輪椅格數
- [x] 保險到期、定檢到期追蹤
- [x] 地圖即時位置顯示（Leaflet）

### 3.6 主儀表板（全角色）
- [x] 今日行程數、已完成、待指派、在線駕駛 KPI
- [x] 今日排班列表
- [x] 駕照 / 保險 / 定檢到期預警

### 3.7 駕駛後台（dashboard driver 路由）
- [x] **我的任務**（`/driver/tasks`）
  - 今日任務清單，依服務時間排序
  - 點擊卡片展開訂單明細（乘客、機構、車輛、時間、訂單號）
  - 「開始接送」按鈕：PATCH 狀態 → 進行中，同時抓取時間戳 + GPS 座標存 localStorage
  - 「完成任務」按鈕：PATCH 狀態 → 已完成，同時抓取時間戳 + GPS 座標存 localStorage
  - 「開啟導航路線」：單一按鈕，Google Maps 帶入起點→迄點完整路線
  - Toast 提示操作結果（含 GPS 是否取得）
- [x] **服務明細填寫**（`/driver/records`）
  - 列出今日已完成任務，任務卡顯示已記錄的上下車時間預覽
  - 選擇任務後自動帶入：
    - 實際上車時間（開始接送時間戳）
    - 實際下車時間（完成任務時間戳）
    - 上車座標（緯度/經度，點開始接送時的 GPS）
    - 下車座標（緯度/經度，點完成任務時的 GPS）
  - 時間欄位可手動修改；座標欄位唯讀 font-mono 顯示
  - 送出後清除 localStorage 事件紀錄

### 3.8 LINE WebView（駕駛端）
- [x] LINE OAuth 登入（LIFF）
- [x] 任務列表、任務詳情、GPS 打卡
- [x] 地圖：今日路線、即時位置
- [x] 服務紀錄填寫
- [x] 歷史紀錄（依日期查詢）
- [x] 我的（駕駛資訊、車輛）

### 3.9 系統設定（系統管理員 /admin/settings）
- [x] **Google Maps 設定**：API Key（遮罩）、Map ID、預設中心座標 + 縮放層級
- [x] **AppSheet 同步設定**：App ID、Access Key（遮罩）、Google Sheets 試算表 ID、取得憑證說明
- [x] **同步資料表**（DB → AppSheet）：
  - 4 張資料表：日照名單→passengers、日照班表→booking_records、司機→drivers、服務明細表→service_records
  - 每張可獨立啟用/停用
  - 同步頻率：預設選項（5/15/30/60/120/360 分鐘）或自訂分鐘數
  - 全域自動同步排程開關（關閉時所有表只能手動觸發）
  - 倒數計時顯示（每秒更新）「下次同步：N 分 N 秒後」
  - 單張「同步」按鈕 + 「全部同步」按鈕
  - 顯示上次同步時間、狀態（從未/成功/失敗）、推送筆數、錯誤訊息
  - 調度器每 10 秒檢查到期資料表，自動觸發（頁面開啟中有效）
- [x] Sidebar「系統設定」連結僅 system_admin 可見

### 3.10 系統管理（系統管理員）
- [x] 機構管理、車行管理、使用者管理（含角色指派）
- [x] 報表頁面（框架已建）

### 3.11 基礎設施
- [x] JWT 認證（jose，HTTP-only cookie，8 小時有效）
- [x] `proxy.ts` 路由保護（儀表板 + LINE 路由）
- [x] 角色路由守衛（/admin 僅 system_admin）
- [x] 登入後依角色跳轉（駕駛 → /driver/tasks，其他 → /dashboard）
- [x] 雙模式資料層（PostgreSQL / 記憶體 mock）
- [x] DB 種子資料（固定 UUID）
- [x] 啟動腳本 `start.bat` / `init-db.bat`

---

## 四、資料庫結構（11 張資料表）

```
care_units          機構
transport_companies 車行
users               系統帳號（所有角色）
vehicles            車輛
drivers             駕駛（可連結 users）
passengers          服務個案
routes              固定路線（JSONB stops）
booking_records     訂車單（含 batch_id）
task_assignments    任務指派（booking ↔ driver ↔ vehicle）
service_records     完成紀錄（含 GPS 座標、上下車時間、距離）
system_logs         操作稽核紀錄
```

---

## 五、localStorage 資料結構

駕駛操作事件儲存於瀏覽器 localStorage，key 為 `ltc_task_event_<booking_id>`：

```json
{
  "pickup_time":  "08:23",
  "pickup_lat":   24.148123,
  "pickup_lng":   120.673456,
  "dropoff_time": "09:05",
  "dropoff_lat":  24.152789,
  "dropoff_lng":  120.683012
}
```
> 服務明細送出後自動清除此筆 key。

---

## 六、AppSheet 同步 API

**端點：** `POST /api/settings/sync`  
**同步方向：** 本地 PostgreSQL → AppSheet  
**呼叫方式：** AppSheet REST API `Action: Add`（upsert）

```
POST https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
Header: ApplicationAccessKey: {accessKey}
Body: { Action: "Add", Properties: { Locale: "zh-TW" }, Rows: [...] }
```

| AppSheet 表 | 本地資料表 | 預設啟用 |
|-------------|-----------|---------|
| 日照名單 | passengers | ✓ |
| 日照班表 | booking_records | ✓ |
| 司機 | drivers | ✓ |
| 服務明細表 | service_records | — |

---

## 七、開發進度

### ✅ 本輪已完成
- 訂車新增：單日 / 多日週選擇模式
- 任務指派列表：起訖地點顯示 + 右側抽屜訂單明細
- 系統設定頁（Google Maps / AppSheet / 同步排程），僅 system_admin 可存取
- 駕駛登入後直接導向今日任務
- 我的任務：點擊展開訂單明細、開始接送 / 完成任務按鈕功能、單一導航路線按鈕
- 開始接送 / 完成任務同步記錄時間戳 + GPS 至 localStorage
- 服務明細填寫自動帶入上下車時間與座標（唯讀顯示）
- AppSheet 同步方向改為「DB 推送至 AppSheet」

### 🚧 已建框架、尚未完整實作
- **報表頁面** `/admin/reports`：頁面存在，資料尚為靜態
- **排班管理** `/org/schedule`：頁面框架已建，排班邏輯尚未實作
- **推播通知**：LINE Messaging API 架構預留，尚未串接
- **車行地圖** `/fleet/map`：Leaflet 地圖已顯示，即時位置需 SSE/WebSocket
- **設定頁持久化**：目前使用 global 記憶體，重啟後重置；需寫入 DB 或環境變數

---

## 八、尚待改善方向

### 高優先
| 項目 | 說明 |
|------|------|
| 設定值持久化 | `/admin/settings` 資料存入 DB `system_settings` 資料表，重啟後保留 |
| 推播通知 | 指派完成時 LINE push 通知駕駛 |
| 報表匯出 | 月結帳單、服務統計 Excel/PDF |
| 排班管理 | 週排班檢視、批次建立固定班表 |

### 中優先
| 項目 | 說明 |
|------|------|
| 即時位置更新 | 駕駛 GPS 透過 SSE 推送至車行地圖 |
| 地址自動補全 | 串接 TGOS 或 Google Places API |
| 訂車列表分頁 | 目前前端全量載入，需 offset 分頁 |
| TopBar 搜尋 | 搜尋框尚無查詢邏輯 |
| 駕照到期提醒 | 到期前 30 天 LINE 訊息通知 |

### 技術債
| 項目 | 說明 |
|------|------|
| mock/DB 混用 | 部分頁面仍 import `PASSENGERS`/`CARE_UNITS`，應改 API 呼叫 |
| API 錯誤格式 | 各路由 error 不一致，應共用 `apiError()` helper |
| system_logs | API 操作尚未寫入稽核日誌 |
| 軟刪除 | 目前實體刪除，應改 `deleted_at` |
| E2E 測試 | 核心流程（訂車→指派→完成→填寫）補 Playwright |

---

## 九、已知問題

| 問題 | 狀態 | 備註 |
|------|------|------|
| LINE OAuth 本機需 ngrok | 待處理 | LINE 不接受 localhost redirect URI |
| 設定值重啟後重置 | 待處理 | global.__appSettings 為記憶體，需 DB 持久化 |
| `routes` 資料表未使用 | 低優先 | 固定路線功能未開發 |
