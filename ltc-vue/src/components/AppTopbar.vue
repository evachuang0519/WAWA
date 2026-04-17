<template>
  <nav class="topbar d-flex align-items-center px-3 px-lg-4 gap-3">
    <!-- Hamburger (mobile only) -->
    <button
      class="btn btn-sm btn-outline-secondary d-lg-none"
      type="button"
      data-bs-toggle="offcanvas"
      data-bs-target="#mobileSidebar"
      aria-controls="mobileSidebar"
    >
      <i class="bi bi-list fs-5"></i>
    </button>

    <!-- Brand -->
    <span class="fw-bold text-primary d-none d-md-inline" style="font-size:1.05rem;">
      <i class="bi bi-bus-front me-1"></i>長照交通平台
    </span>

    <div class="ms-auto d-flex align-items-center gap-3">
      <!-- Role badge -->
      <span class="badge" :class="auth.roleBadgeClass(auth.user?.role)">
        {{ auth.roleLabel(auth.user?.role) }}
      </span>

      <!-- User name -->
      <span class="text-muted small d-none d-sm-inline">
        <i class="bi bi-person-circle me-1"></i>{{ auth.user?.name ?? auth.user?.email }}
      </span>

      <!-- Logout -->
      <button class="btn btn-sm btn-outline-danger" @click="doLogout">
        <i class="bi bi-box-arrow-right"></i>
        <span class="ms-1 d-none d-sm-inline">登出</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function doLogout() {
  await auth.logout()
  router.push('/login')
}
</script>
