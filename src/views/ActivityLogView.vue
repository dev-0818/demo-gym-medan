<script setup lang="ts">
import { ref, computed } from 'vue'
import { useActivityLogStore } from '@/stores/activityLog'
import { useUserStore } from '@/stores/users'
import type { ActivityAction } from '@/types'
import { formatDateTime } from '@/utils/helpers'
import { usePagination } from '@/composables/usePagination'
import PaginationBar from '@/components/PaginationBar.vue'

const logStore = useActivityLogStore()
const userStore = useUserStore()

const search = ref('')
const filterAction = ref<string>('all')
const filterDate = ref('')
const filterUser = ref<string>('all')

// Get unique users from logs
const logUsers = computed(() => {
  const userMap = new Map<string, string>()
  logStore.logs.forEach((l) => userMap.set(l.userId, l.userName))
  return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }))
})

const filteredLogs = computed(() => {
  let result = [...logStore.logs]

  if (filterAction.value !== 'all') {
    result = result.filter((l) => l.action === filterAction.value)
  }

  if (filterDate.value) {
    result = result.filter((l) => l.timestamp.slice(0, 10) === filterDate.value)
  }

  if (filterUser.value !== 'all') {
    result = result.filter((l) => l.userId === filterUser.value)
  }

  const q = search.value.toLowerCase()
  if (q) {
    result = result.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.targetName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    )
  }

  return result
})

const logPagination = usePagination(filteredLogs, 30)
const paginatedLogs = logPagination.paginatedItems

function getActionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    create: 'Tambah',
    update: 'Edit',
    delete: 'Hapus',
    reset_password: 'Reset Password',
    toggle_active: 'Toggle Status',
    checkin: 'Check-in',
  }
  return labels[action] || action
}

function getActionColor(action: ActivityAction): string {
  const colors: Record<ActivityAction, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    reset_password: 'bg-amber-100 text-amber-800',
    toggle_active: 'bg-purple-100 text-purple-800',
    checkin: 'bg-teal-100 text-teal-800',
  }
  return colors[action] || 'bg-gray-100 text-gray-800'
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin',
    staff: 'Staff',
    trainer: 'Trainer',
    member: 'Member',
  }
  return labels[role] || role
}

function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    admin: 'bg-indigo-100 text-indigo-800',
    staff: 'bg-cyan-100 text-cyan-800',
    trainer: 'bg-orange-100 text-orange-800',
    member: 'bg-gray-100 text-gray-800',
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}

function getTargetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    member: 'Member',
    staff: 'Staff',
    trainer: 'Trainer',
    package: 'Paket',
    membership: 'Membership',
    payment: 'Pembayaran',
    checkin: 'Check-in',
  }
  return labels[type] || type
}

function getActionIcon(action: ActivityAction): string {
  return action
}

function clearAll() {
  if (confirm('Yakin hapus semua log? Data yang sudah dihapus tidak bisa dikembalikan.')) {
    logStore.clearLogs()
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 7) return `${diffDays} hari lalu`
  return formatDateTime(timestamp)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Riwayat semua aktivitas admin dan staff</p>
      </div>
      <div class="flex gap-2">
        <div class="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span class="text-sm font-semibold text-primary-700">{{ logStore.todayLogs.length }} Hari Ini</span>
        </div>
        <button
          v-if="logStore.logs.length > 0"
          @click="clearAll"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Hapus Semua Log
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Search -->
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            v-model="search"
            type="text"
            placeholder="Cari aktivitas..."
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <!-- Filter action -->
        <select
          v-model="filterAction"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">Semua Aksi</option>
          <option value="create">Tambah</option>
          <option value="update">Edit</option>
          <option value="delete">Hapus</option>
          <option value="reset_password">Reset Password</option>
          <option value="toggle_active">Toggle Status</option>
          <option value="checkin">Check-in</option>
        </select>

        <!-- Filter user -->
        <select
          v-model="filterUser"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">Semua User</option>
          <option v-for="u in logUsers" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>

        <!-- Filter date -->
        <input
          v-model="filterDate"
          type="date"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
    </div>

    <!-- Log List -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <!-- Empty state -->
      <div v-if="filteredLogs.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Belum ada aktivitas</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Log aktivitas akan muncul di sini</p>
      </div>

      <!-- Log items -->
      <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
        <div
          v-for="log in paginatedLogs"
          :key="log.id"
          class="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <!-- Action icon -->
          <div class="mt-0.5 flex-shrink-0">
            <div
              v-if="log.action === 'create'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div
              v-else-if="log.action === 'update'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <div
              v-else-if="log.action === 'delete'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div
              v-else-if="log.action === 'reset_password'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <div
              v-else-if="log.action === 'toggle_active'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div
              v-else-if="log.action === 'checkin'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ log.userName }}</span>
              <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', getRoleColor(log.userRole)]">
                {{ getRoleLabel(log.userRole) }}
              </span>
              <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', getActionColor(log.action)]">
                {{ getActionLabel(log.action) }}
              </span>
              <span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                {{ getTargetTypeLabel(log.targetType) }}
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ log.details }}</p>
            <p class="mt-1 text-xs text-gray-400">{{ formatTime(log.timestamp) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <PaginationBar
      v-if="filteredLogs.length > 0"
      :current-page="logPagination.currentPage.value"
      :total-pages="logPagination.totalPages.value"
      :total-items="logPagination.totalItems.value"
      :start-index="logPagination.startIndex.value"
      :end-index="logPagination.endIndex.value"
      :visible-pages="logPagination.visiblePages.value"
      label="log"
      @go-to-page="logPagination.goToPage"
      @prev="logPagination.prevPage"
      @next="logPagination.nextPage"
    />
  </div>
</template>
