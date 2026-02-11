<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  collapsed: boolean
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  closeMobile: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.currentUser?.role === 'admin')

interface MenuItem {
  name: string
  label: string
  icon: string
  path: string
  adminOnly?: boolean
}

interface MenuGroup {
  category: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    category: 'Menu Utama',
    items: [
      { name: 'dashboard', label: 'Dashboard', icon: 'home', path: '/' },
    ],
  },
  {
    category: 'Master Data',
    items: [
      { name: 'members', label: 'Member', icon: 'users', path: '/members' },
      { name: 'staff', label: 'Staff', icon: 'briefcase', path: '/staff', adminOnly: true },
      { name: 'trainers', label: 'Personal Trainer', icon: 'dumbbell', path: '/trainers' },
      { name: 'packages', label: 'Paket GYM', icon: 'package', path: '/packages' },
    ],
  },
  {
    category: 'Transaksi',
    items: [
      { name: 'memberships', label: 'Membership', icon: 'card', path: '/memberships' },
      { name: 'payments', label: 'Pembayaran', icon: 'wallet', path: '/payments' },
      { name: 'checkins', label: 'Check-in', icon: 'checkin', path: '/checkins' },
      { name: 'class-schedules', label: 'Jadwal Kelas', icon: 'class-schedule', path: '/class-schedules' },
      { name: 'pt', label: 'Sesi PT', icon: 'pt-session', path: '/pt' },
    ],
  },
  {
    category: 'Laporan',
    items: [
      { name: 'reports', label: 'Laporan', icon: 'chart', path: '/reports', adminOnly: true },
      { name: 'activity-log', label: 'Activity Log', icon: 'log', path: '/activity-log', adminOnly: true },
    ],
  },
]

const filteredMenuGroups = computed(() => {
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin.value),
    }))
    .filter((group) => group.items.length > 0)
})

function navigate(path: string) {
  router.push(path)
  emit('closeMobile')
}

function isActive(name: string): boolean {
  return route.name === name
}
</script>

<template>
  <!-- Desktop sidebar -->
  <aside
    :class="[
      'hidden lg:flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 z-30',
      collapsed ? 'w-[72px]' : 'w-64',
    ]"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center border-b border-gray-200 dark:border-gray-700 px-4">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
          G
        </div>
        <transition name="fade">
          <div v-if="!collapsed" class="flex flex-col">
            <span class="text-sm font-bold text-gray-900 dark:text-gray-100">GYM MEDAN</span>
            <span class="text-[10px] text-gray-400 font-medium">Admin Dashboard</span>
          </div>
        </transition>
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto p-3 space-y-4">
      <div v-for="(group, gIndex) in filteredMenuGroups" :key="group.category">
        <!-- Category separator -->
        <div v-if="!collapsed" class="flex items-center gap-2 px-3 mb-2" :class="gIndex > 0 ? 'mt-2 pt-3 border-t border-gray-200 dark:border-gray-700' : ''">
          <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ group.category }}</span>
        </div>
        <div v-else-if="gIndex > 0" class="mx-3 mb-2 mt-2 border-t border-gray-200 dark:border-gray-700"></div>

        <!-- Menu items -->
        <div class="space-y-1">
          <button
            v-for="item in group.items"
            :key="item.name"
            @click="navigate(item.path)"
            :class="[
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive(item.name)
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200',
            ]"
            :title="collapsed ? item.label : ''"
          >
            <!-- Icons -->
            <svg v-if="item.icon === 'home'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
            <svg v-else-if="item.icon === 'users'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <svg v-else-if="item.icon === 'briefcase'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <svg v-else-if="item.icon === 'dumbbell'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h2m12 0h2M6 8v8m12-8v8M8 6h8M8 18h8M8 6v12m8-12v12" /></svg>
            <svg v-else-if="item.icon === 'package'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <svg v-else-if="item.icon === 'card'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
            <svg v-else-if="item.icon === 'wallet'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <svg v-else-if="item.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <svg v-else-if="item.icon === 'checkin'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <svg v-else-if="item.icon === 'class-schedule'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v4l2 2" /></svg>
            <svg v-else-if="item.icon === 'pt-session'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path stroke-linecap="round" stroke-linejoin="round" d="M17 11l2 2 4-4" /></svg>
            <svg v-else-if="item.icon === 'log'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>

            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div class="border-t border-gray-200 dark:border-gray-700 p-3">
      <div v-if="!collapsed" class="rounded-lg bg-primary-50 dark:bg-primary-900/30 p-3 text-center">
        <p class="text-xs font-semibold text-primary-700 dark:text-primary-400">GYM MEDAN</p>
        <p class="text-[10px] text-primary-500 dark:text-primary-500">v1.0.0 — Demo Mode</p>
      </div>
    </div>
  </aside>

  <!-- Mobile sidebar -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 lg:hidden',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
          G
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-bold text-gray-900 dark:text-gray-100">GYM MEDAN</span>
          <span class="text-[10px] text-gray-400 font-medium">Admin Dashboard</span>
        </div>
      </div>
      <button @click="$emit('closeMobile')" class="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <nav class="flex-1 overflow-y-auto p-3 space-y-4">
      <div v-for="(group, gIndex) in filteredMenuGroups" :key="group.category">
        <!-- Category separator -->
        <div class="flex items-center gap-2 px-3 mb-2" :class="gIndex > 0 ? 'mt-2 pt-3 border-t border-gray-200 dark:border-gray-700' : ''">
          <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ group.category }}</span>
        </div>

        <!-- Menu items -->
        <div class="space-y-1">
          <button
            v-for="item in group.items"
            :key="item.name"
            @click="navigate(item.path)"
            :class="[
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item.name)
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200',
            ]"
          >
            <svg v-if="item.icon === 'home'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
            <svg v-else-if="item.icon === 'users'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <svg v-else-if="item.icon === 'briefcase'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <svg v-else-if="item.icon === 'dumbbell'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h2m12 0h2M6 8v8m12-8v8M8 6h8M8 18h8M8 6v12m8-12v12" /></svg>
            <svg v-else-if="item.icon === 'package'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <svg v-else-if="item.icon === 'card'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
            <svg v-else-if="item.icon === 'wallet'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <svg v-else-if="item.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <svg v-else-if="item.icon === 'checkin'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <svg v-else-if="item.icon === 'class-schedule'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v4l2 2" /></svg>
            <svg v-else-if="item.icon === 'pt-session'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path stroke-linecap="round" stroke-linejoin="round" d="M17 11l2 2 4-4" /></svg>
            <svg v-else-if="item.icon === 'log'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>

            <span class="truncate">{{ item.label }}</span>
          </button>
        </div>
      </div>
    </nav>
  </aside>
</template>
