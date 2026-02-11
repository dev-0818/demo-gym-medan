<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCheckInStore } from '@/stores/checkins'
import { useUserStore } from '@/stores/users'
import { formatDateTime } from '@/utils/helpers'
import { usePagination } from '@/composables/usePagination'
import PaginationBar from '@/components/PaginationBar.vue'

const checkInStore = useCheckInStore()
const userStore = useUserStore()

const search = ref('')
const filterDate = ref(new Date().toISOString().slice(0, 10))

// Auto-refresh timer for real-time feel
let refreshInterval: ReturnType<typeof setInterval> | null = null
const lastRefresh = ref(new Date())

onMounted(() => {
  refreshInterval = setInterval(() => {
    lastRefresh.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

const displayCheckins = computed(() => {
  // trigger reactivity refresh
  void lastRefresh.value
  let result = filterDate.value
    ? checkInStore.getCheckinsByDate(filterDate.value)
    : checkInStore.todayCheckins

  const q = search.value.toLowerCase()
  if (q) {
    result = result.filter(
      (c) =>
        c.memberName.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
    )
  }
  return result
})

const checkinPagination = usePagination(displayCheckins, 30)
const paginatedCheckins = checkinPagination.paginatedItems

const todayActiveCount = computed(() => {
  void lastRefresh.value
  return checkInStore.activeCheckins.length
})
const todayTotalCount = computed(() => checkInStore.todayCheckins.length)
const todayCheckedOutCount = computed(() => todayTotalCount.value - todayActiveCount.value)

const avgDuration = computed(() => {
  const checkedOut = checkInStore.todayCheckins.filter((c) => c.checkOutTime)
  if (checkedOut.length === 0) return '-'
  const totalMin = checkedOut.reduce((sum, c) => {
    const diff = new Date(c.checkOutTime!).getTime() - new Date(c.checkInTime).getTime()
    return sum + Math.floor(diff / 60000)
  }, 0)
  const avg = Math.floor(totalMin / checkedOut.length)
  const h = Math.floor(avg / 60)
  const m = avg % 60
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
})

function formatTime(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function getDuration(checkIn: string, checkOut?: string): string {
  void lastRefresh.value
  const start = new Date(checkIn).getTime()
  const end = checkOut ? new Date(checkOut).getTime() : Date.now()
  const diffMinutes = Math.floor((end - start) / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (hours > 0) return `${hours}j ${minutes}m`
  return `${minutes}m`
}

function isToday(date: string): boolean {
  return date === new Date().toISOString().slice(0, 10)
}

function formatRefreshTime(): string {
  return lastRefresh.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getMemberAvatar(memberId: string): string | null {
  const member = userStore.getUserById(memberId)
  return member?.avatar || null
}

function getMemberGender(memberId: string): string {
  const member = userStore.getUserById(memberId)
  return member?.gender || 'male'
}

// Simulate a scan check-in (for demo/testing)
const showSimulate = ref(false)
const simulateMemberId = ref('')
const simulateMsg = ref('')
const simulateMsgType = ref<'success' | 'error'>('success')

const activeMembersForSim = computed(() => {
  return userStore.members.filter((m) => m.isActive)
})

function simulateScan() {
  simulateMsg.value = ''
  if (!simulateMemberId.value) {
    simulateMsg.value = 'Pilih member untuk simulasi'
    simulateMsgType.value = 'error'
    return
  }
  const member = userStore.getUserById(simulateMemberId.value)
  if (!member) {
    simulateMsg.value = 'Member tidak ditemukan'
    simulateMsgType.value = 'error'
    return
  }

  // If already checked in today → do checkout
  if (checkInStore.isCheckedInToday(member.id)) {
    const activeCheckin = checkInStore.activeCheckins.find((c) => c.memberId === member.id)
    if (activeCheckin) {
      checkInStore.checkOut(activeCheckin.id)
      simulateMsg.value = `${member.name} berhasil check-out!`
      simulateMsgType.value = 'success'
    }
  } else {
    try {
      checkInStore.checkIn({
        memberId: member.id,
        memberName: member.name,
        notes: 'Scan QR Code',
      })
      simulateMsg.value = `${member.name} berhasil check-in!`
      simulateMsgType.value = 'success'
    } catch (e: any) {
      simulateMsg.value = e.message
      simulateMsgType.value = 'error'
    }
  }
  simulateMemberId.value = ''
  setTimeout(() => (simulateMsg.value = ''), 4000)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Monitoring Check-in</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Pantau kehadiran member secara real-time via scan QR</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Live indicator -->
        <div class="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-3 py-2">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span class="text-xs font-medium text-green-700">Live · {{ formatRefreshTime() }}</span>
        </div>
        <!-- Simulate button (for demo) -->
        <button
          @click="showSimulate = !showSimulate"
          class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-1.5"
          title="Simulasi scan QR untuk demo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          Simulasi Scan
        </button>
      </div>
    </div>

    <!-- Simulate Scan Panel (Demo only) -->
    <div v-if="showSimulate" class="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-5">
      <div class="flex items-start gap-3 mb-4">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-amber-800">Mode Simulasi</h3>
          <p class="text-xs text-amber-600 mt-0.5">Fitur ini hanya untuk demo. Di production, member akan scan QR code dari aplikasi mobile mereka saat datang ke gym.</p>
        </div>
      </div>

      <!-- Simulate message -->
      <div v-if="simulateMsg" :class="['mb-3 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm', simulateMsgType === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700']">
        <svg v-if="simulateMsgType === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {{ simulateMsg }}
      </div>

      <div class="flex gap-3">
        <select
          v-model="simulateMemberId"
          class="flex-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">-- Pilih Member untuk Scan --</option>
          <option v-for="m in activeMembersForSim" :key="m.id" :value="m.id">
            {{ m.name }}{{ checkInStore.isCheckedInToday(m.id) ? ' — 🟢 Sedang di Gym' : '' }}
          </option>
        </select>
        <button
          @click="simulateScan"
          class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          Scan
        </button>
      </div>
      <p class="mt-2 text-[11px] text-amber-500">Jika member sudah check-in, scan akan otomatis check-out.</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ todayActiveCount }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Sedang di Gym</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ todayTotalCount }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Total Check-in</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ todayCheckedOutCount }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Sudah Pulang</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ avgDuration }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Rata-rata Durasi</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Banner -->
    <div class="flex items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-4">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
      </div>
      <div>
        <p class="text-sm font-semibold text-blue-800">Check-in via QR Scan</p>
        <p class="text-xs text-blue-600 mt-0.5">Member melakukan scan QR Code dari aplikasi mobile saat tiba di gym. Data check-in otomatis muncul di halaman ini secara real-time.</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1 max-w-xs">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          v-model="search"
          type="text"
          placeholder="Cari member..."
          class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal:</label>
        <input
          v-model="filterDate"
          type="date"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <span v-if="isToday(filterDate)" class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Hari Ini</span>
      </div>
    </div>

    <!-- Active Members Strip -->
    <div v-if="isToday(filterDate) && checkInStore.activeCheckins.length > 0" class="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-4">
      <div class="flex items-center gap-2 mb-3">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <h3 class="text-sm font-semibold text-green-800">Sedang di Gym ({{ checkInStore.activeCheckins.length }})</h3>
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="ci in checkInStore.activeCheckins"
          :key="ci.id"
          class="flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 px-3 py-1.5 shadow-sm"
        >
          <img
            v-if="getMemberAvatar(ci.memberId)"
            :src="getMemberAvatar(ci.memberId)!"
            :alt="ci.memberName"
            class="h-6 w-6 rounded-full object-cover ring-1 ring-green-300"
          />
          <div v-else class="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
            {{ ci.memberName.charAt(0).toUpperCase() }}
          </div>
          <span class="text-xs font-medium text-gray-800 dark:text-gray-200">{{ ci.memberName }}</span>
          <span class="text-[10px] text-gray-400">{{ getDuration(ci.checkInTime) }}</span>
        </div>
      </div>
    </div>

    <!-- Check-in List Table -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Member</th>
              <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Check-in</th>
              <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Check-out</th>
              <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Durasi</th>
              <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Catatan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="displayCheckins.length === 0">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center">
                  <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  </div>
                  <p class="text-gray-500 dark:text-gray-400 font-medium">Belum ada check-in</p>
                  <p class="text-xs text-gray-400 mt-1">Member akan muncul di sini setelah scan QR Code di aplikasi mobile</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="ci in paginatedCheckins"
              :key="ci.id"
              :class="[
                'transition-colors',
                !ci.checkOutTime ? 'bg-green-50/50 dark:bg-green-900/20 hover:bg-green-50 dark:hover:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
              ]"
            >
              <td class="px-6 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="getMemberAvatar(ci.memberId)"
                    :src="getMemberAvatar(ci.memberId)!"
                    :alt="ci.memberName"
                    :class="[
                      'h-8 w-8 rounded-full object-cover ring-2',
                      !ci.checkOutTime ? 'ring-green-300' : 'ring-gray-200'
                    ]"
                  />
                  <div v-else :class="[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                    !ci.checkOutTime ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  ]">
                    {{ ci.memberName.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ ci.memberName }}</span>
                </div>
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-400">
                <div class="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  {{ formatTime(ci.checkInTime) }}
                </div>
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-400">
                <div v-if="ci.checkOutTime" class="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  {{ formatTime(ci.checkOutTime) }}
                </div>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-6 py-3">
                <span :class="!ci.checkOutTime ? 'text-green-700 font-medium' : 'text-gray-600 dark:text-gray-400'">
                  {{ getDuration(ci.checkInTime, ci.checkOutTime) }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span
                  v-if="!ci.checkOutTime"
                  class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Di Gym
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400"
                >
                  Selesai
                </span>
              </td>
              <td class="px-6 py-3 text-gray-400 text-xs">{{ ci.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary -->
    <PaginationBar
      v-if="displayCheckins.length > 0"
      :current-page="checkinPagination.currentPage.value"
      :total-pages="checkinPagination.totalPages.value"
      :total-items="checkinPagination.totalItems.value"
      :start-index="checkinPagination.startIndex.value"
      :end-index="checkinPagination.endIndex.value"
      :visible-pages="checkinPagination.visiblePages.value"
      label="check-in"
      @go-to-page="checkinPagination.goToPage"
      @prev="checkinPagination.prevPage"
      @next="checkinPagination.nextPage"
    />
  </div>
</template>
