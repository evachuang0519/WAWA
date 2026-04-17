<template>
  <div class="d-flex" style="min-height:100vh;">
    <!-- Desktop Sidebar -->
    <AppSidebar class="d-none d-lg-flex flex-column" />

    <!-- Mobile Offcanvas Sidebar -->
    <div
      class="offcanvas offcanvas-start offcanvas-sidebar"
      tabindex="-1"
      id="mobileSidebar"
      aria-labelledby="mobileSidebarLabel"
    >
      <div class="offcanvas-header border-bottom border-secondary" style="border-color:rgba(255,255,255,0.1)!important;">
        <span id="mobileSidebarLabel" class="text-white fw-bold">
          <i class="bi bi-bus-front me-2 text-primary"></i>長照交通平台
        </span>
        <button
          type="button"
          class="btn-close btn-close-white"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>
      <div class="offcanvas-body p-0" style="background:#1e293b;">
        <AppSidebar @close="closeMobileMenu" style="width:100%;min-height:auto;" />
      </div>
    </div>

    <!-- Main area -->
    <div class="d-flex flex-column flex-grow-1 overflow-hidden">
      <AppTopbar />
      <!-- 離線橫幅：僅駕駛角色顯示（OfflineBanner 內部已有 v-if 判斷） -->
      <OfflineBanner v-if="auth.user?.role === 'driver'" />
      <main class="main-content p-3 p-md-4 flex-grow-1">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import OfflineBanner from './OfflineBanner.vue'
import { useAuthStore } from '@/stores/auth.js'
import { Offcanvas } from 'bootstrap'

const auth = useAuthStore()

function closeMobileMenu() {
  const el = document.getElementById('mobileSidebar')
  if (el) {
    const oc = Offcanvas.getInstance(el)
    oc?.hide()
  }
}
</script>
