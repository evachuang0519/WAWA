import Dexie from 'dexie'

/**
 * 離線資料庫（IndexedDB via Dexie）
 *
 * tasks         — 今日任務快取（每次有網路時覆寫）
 * pendingActions — 離線期間累積的操作佇列（上線後依序送出）
 * syncMeta       — 同步元資料（上次同步時間等）
 */
const db = new Dexie('ltc_driver_offline')

db.version(1).stores({
  tasks:          'id, service_date, status, synced_at',
  pendingActions: '++id, type, taskId, created_at, sent',
  syncMeta:       'key'
})

// ── Tasks ────────────────────────────────────────────────────

/** 儲存今日任務（覆蓋舊快取） */
export async function saveTasks(tasks) {
  await db.tasks.clear()
  const now = new Date().toISOString()
  await db.tasks.bulkPut(tasks.map(t => ({ ...t, synced_at: now })))
  await db.syncMeta.put({ key: 'lastTaskSync', value: now })
}

/** 讀取快取的任務 */
export async function loadCachedTasks() {
  return db.tasks.toArray()
}

/** 更新本地任務狀態（離線打卡時呼叫） */
export async function updateLocalTaskStatus(taskId, status) {
  await db.tasks.update(taskId, { status })
}

/** 取得上次同步時間 */
export async function getLastSyncTime() {
  const meta = await db.syncMeta.get('lastTaskSync')
  return meta?.value ?? null
}

// ── Pending Actions ──────────────────────────────────────────

/**
 * 加入待同步操作
 * @param {'UPDATE_STATUS'} type
 * @param {string} taskId
 * @param {object} payload  - e.g. { status: '進行中', lat, lng, timestamp }
 */
export async function queueAction(type, taskId, payload) {
  await db.pendingActions.add({
    type,
    taskId,
    payload,
    created_at: new Date().toISOString(),
    sent: false
  })
}

/** 取得所有未送出的操作（依建立時間排序） */
export async function getPendingActions() {
  return db.pendingActions
    .where('sent').equals(0)
    .sortBy('created_at')
}

/** 標記操作為已送出 */
export async function markActionSent(id) {
  await db.pendingActions.update(id, { sent: true })
}

/** 標記操作為失敗（加上錯誤訊息） */
export async function markActionFailed(id, error) {
  await db.pendingActions.update(id, { sent: false, error })
}

/** 清除所有已送出的操作 */
export async function clearSentActions() {
  await db.pendingActions.where('sent').equals(1).delete()
}

/** 取得待送出操作數量 */
export async function getPendingCount() {
  return db.pendingActions.where('sent').equals(0).count()
}

export default db
