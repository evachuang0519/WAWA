<template>
  <div class="sidebar d-flex flex-column py-3">
    <!-- Logo -->
    <div class="px-3 mb-4">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-bus-front fs-4 text-primary"></i>
        <span class="fw-bold text-white" style="font-size:1rem;">長照交通</span>
      </div>
      <div class="text-muted small mt-1" style="font-size:0.72rem;">Long-Term Care Transport</div>
    </div>

    <!-- Nav -->
    <nav class="nav flex-column gap-1 flex-grow-1">
      <router-link
        v-for="link in visibleLinks"
        :key="link.to"
        :to="link.to"
        class="nav-link d-flex align-items-center gap-2 px-3 py-2"
        :class="{ active: isActive(link.to) }"
        @click="$emit('close')"
      >
        <i :class="link.icon" style="font-size:1rem;"></i>
        <span>{{ link.label }}</span>
      </router-link>
    </nav>

    <!-- Bottom info -->
    <div class="px-3 pt-3 border-top border-secondary mt-auto" style="border-color:rgba(255,255,255,0.1)!important;">
      <div class="text-muted small" style="font-size:0.72rem;">v1.0.0 · © 2026</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

defineEmits(['close'])

const auth = useAuthStore()
const route = useRoute()

const allLinks = [
  { to: '/dashboard', label: '系統總覽', icon: 'bi bi-speedometer2', roles: ['system_admin'] },
  { to: '/bookings', label: '訂車管理', icon: 'bi bi-calendar-check', roles: ['system_admin', 'org_admin'] },
  { to: '/passengers', label: '個案管理', icon: 'bi bi-people', roles: ['system_admin', 'org_admin'] },
  { to: '/recurring-templates', label: '定期範本', icon: 'bi bi-arrow-repeat', roles: ['system_admin', 'org_admin'] },
  { to: '/assignments', label: '任務指派', icon: 'bi bi-diagram-3', roles: ['system_admin', 'fleet_admin'] },
  { to: '/drivers', label: '駕駛管理', icon: 'bi bi-person-badge', roles: ['system_admin', 'fleet_admin'] },
  { to: '/vehicles', label: '車輛管理', icon: 'bi bi-truck', roles: ['system_admin', 'fleet_admin'] },
  { to: '/tasks', label: '今日任務', icon: 'bi bi-list-task', roles: ['driver'] },
  { to: '/service-records', label: '服務紀錄', icon: 'bi bi-journal-text', roles: ['system_admin', 'org_admin', 'fleet_admin', 'driver'] },
  { to: '/care-units', label: '長照機構', icon: 'bi bi-building', roles: ['system_admin', 'org_admin'] },
  { to: '/companies', label: '車行管理', icon: 'bi bi-building-gear', roles: ['system_admin', 'fleet_admin'] },
  { to: '/users', label: '使用者管理', icon: 'bi bi-people-fill', roles: ['system_admin'] }
]

const visibleLinks = computed(() =>
  allLinks.filter((l) => l.roles.includes(auth.user?.role))
)

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
