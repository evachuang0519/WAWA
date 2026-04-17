import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)

  async function fetchMe() {
    loading.value = true
    try {
      const res = await authApi.me()
      // Next.js API 回應格式: { data: { ...user } }
      user.value = res.data?.data ?? res.data
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      const res = await authApi.login(email, password)
      // Next.js API 回應格式: { data: { ...user } }
      user.value = res.data?.data ?? res.data
      return user.value
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      user.value = null
    }
  }

  function roleLabel(role) {
    const map = {
      system_admin: '系統管理員',
      org_admin: '機構管理員',
      fleet_admin: '車隊管理員',
      driver: '駕駛'
    }
    return map[role] ?? role
  }

  function roleBadgeClass(role) {
    const map = {
      system_admin: 'bg-danger',
      org_admin: 'bg-primary',
      fleet_admin: 'bg-warning text-dark',
      driver: 'bg-success'
    }
    return map[role] ?? 'bg-secondary'
  }

  return { user, loading, fetchMe, login, logout, roleLabel, roleBadgeClass }
})
