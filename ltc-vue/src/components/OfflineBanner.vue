<template>
  <!-- 離線提示橫幅 -->
  <div v-if="!offlineStore.isOnline" class="offline-banner d-flex align-items-center gap-2 px-3 py-2">
    <i class="bi bi-wifi-off"></i>
    <span class="flex-grow-1">
      離線模式
      <span v-if="offlineStore.pendingCount > 0" class="ms-1">
        · <strong>{{ offlineStore.pendingCount }}</strong> 筆操作待同步
      </span>
    </span>
    <small v-if="lastSyncLabel" class="opacity-75">{{ lastSyncLabel }}</small>
  </div>

  <!-- 同步中提示 -->
  <div v-else-if="offlineStore.isSyncing" class="sync-banner d-flex align-items-center gap-2 px-3 py-2">
    <div class="spinner-border spinner-border-sm"></div>
    <span>同步中，請稍候…</span>
  </div>

  <!-- Toast 通知（右下角浮動） -->
  <Teleport to="body">
    <div
      v-if="offlineStore.toast"
      class="offline-toast d-flex align-items-center gap-2"
      :class="`offline-toast--${offlineStore.toast.type}`"
    >
      <i :class="toastIcon(offlineStore.toast.type)"></i>
      <span>{{ offlineStore.toast.message }}</span>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useOfflineStore } from '@/stores/offline.js'

const props = defineProps({
  lastSyncLabel: { type: String, default: '' }
})

const offlineStore = useOfflineStore()

const lastSyncLabel = computed(() => props.lastSyncLabel)

function toastIcon(type) {
  const map = {
    success: 'bi bi-check-circle-fill',
    warning: 'bi bi-exclamation-triangle-fill',
    error: 'bi bi-x-circle-fill'
  }
  return map[type] ?? 'bi bi-info-circle-fill'
}
</script>

<style scoped>
.offline-banner {
  background: #f59e0b;
  color: #1c1917;
  font-size: 0.85rem;
  font-weight: 600;
}

.sync-banner {
  background: #3b82f6;
  color: #fff;
  font-size: 0.85rem;
}

.offline-toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  padding: 0.75rem 1.1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  max-width: 320px;
  animation: toast-in 0.25s ease;
}

.offline-toast--success { background: #22c55e; color: #fff; }
.offline-toast--warning { background: #f59e0b; color: #1c1917; }
.offline-toast--error   { background: #ef4444; color: #fff; }

@keyframes toast-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
