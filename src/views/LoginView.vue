<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  email: 'admin@gymmedan.com',
  password: 'Admin@2026',
})
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800))

  const success = authStore.login(form.email, form.password)
  if (success) {
    router.push('/')
  } else {
    error.value = 'Email atau password salah. Hanya Admin & Staff yang bisa login.'
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
    <!-- Background pattern -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');" />
    </div>

    <div class="relative w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
          <span class="text-2xl font-black text-primary-600">G</span>
        </div>
        <h1 class="text-3xl font-bold text-white">GYM MEDAN</h1>
        <p class="mt-1 text-primary-200">Admin Dashboard</p>
      </div>

      <!-- Login card -->
      <div class="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl">
        <div class="mb-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Selamat Datang!</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Masuk ke akun admin Anda</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Error -->
          <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-3">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <!-- Email -->
          <div>
            <label class="label">Email</label>
            <input
              v-model="form.email"
              type="email"
              class="input"
              placeholder="admin@gymmedan.com"
              required
            />
          </div>

          <!-- Password -->
          <div>
            <label class="label">Password</label>
            <input
              v-model="form.password"
              type="password"
              class="input"
              placeholder="••••••••"
              required
            />
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full py-3"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <!-- Demo credentials -->
        <div class="mt-6 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">🔑 Demo Login:</p>
          <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <p><span class="font-medium">Admin:</span> admin@gymmedan.com / Admin@2026</p>
            <p><span class="font-medium">Staff:</span> sari@gymmedan.com / Staff@2026</p>
          </div>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-primary-300">
        © 2026 GYM MEDAN. Demo Version.
      </p>
    </div>
  </div>
</template>
