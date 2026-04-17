<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
    <div class="card shadow-lg border-0" style="width:100%;max-width:420px;border-radius:16px;">
      <div class="card-body p-5">
        <!-- Logo -->
        <div class="text-center mb-4">
          <div class="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width:64px;height:64px;">
            <i class="bi bi-bus-front fs-2 text-primary"></i>
          </div>
          <h4 class="fw-bold mb-1">長照交通服務平台</h4>
          <p class="text-muted small mb-0">Long-Term Care Transport System</p>
        </div>

        <!-- Error alert -->
        <div v-if="errorMsg" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
        </div>

        <!-- Login form -->
        <form @submit.prevent="doLogin" novalidate>
          <div class="mb-3">
            <label class="form-label fw-semibold small">電子郵件</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-envelope"></i></span>
              <input
                v-model="email"
                type="email"
                class="form-control"
                placeholder="user@example.com"
                required
                autocomplete="email"
                :disabled="loading"
              />
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label fw-semibold small">密碼</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                class="form-control"
                placeholder="••••••••"
                required
                autocomplete="current-password"
                :disabled="loading"
              />
              <button type="button" class="btn btn-outline-secondary" @click="showPw = !showPw" tabindex="-1">
                <i :class="showPw ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>
          <button
            type="submit"
            class="btn btn-primary w-100 py-2 fw-semibold"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ loading ? '登入中…' : '登入' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { roleHome } from '@/router/index.js'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)
const showPw = ref(false)

async function doLogin() {
  errorMsg.value = ''
  if (!email.value || !password.value) {
    errorMsg.value = '請填寫電子郵件與密碼'
    return
  }
  loading.value = true
  try {
    const user = await auth.login(email.value, password.value)
    const dest = roleHome[user.role] ?? '/login'
    router.push(dest)
  } catch (err) {
    errorMsg.value = err.response?.data?.message ?? err.response?.data?.error ?? '登入失敗，請確認帳號密碼'
  } finally {
    loading.value = false
  }
}
</script>
