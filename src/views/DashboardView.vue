<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from 'chart.js'
import StatsCard from '@/components/StatsCard.vue'
import { useUserStore } from '@/stores/users'
import { useMembershipStore } from '@/stores/memberships'
import { usePaymentStore } from '@/stores/payments'
import { useCheckInStore } from '@/stores/checkins'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDate, daysRemaining } from '@/utils/helpers'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const userStore = useUserStore()
const membershipStore = useMembershipStore()
const paymentStore = usePaymentStore()
const checkInStore = useCheckInStore()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.currentUser?.role === 'admin')

// Stats
const totalMembers = computed(() => userStore.members.length)
const activeMembers = computed(() => membershipStore.activeMemberships.length)
const totalTrainers = computed(() => userStore.trainers.length)
const monthlyRevenue = computed(() => paymentStore.monthlyRevenue)
const expiringCount = computed(() => membershipStore.expiringMemberships.length)
const pendingCount = computed(() => paymentStore.pendingPayments.length)
const todayCheckIns = computed(() => checkInStore.todayCheckins.length)
const activeCheckIns = computed(() => checkInStore.activeCheckins.length)

// Revenue chart
const revenueData = computed(() => {
  const data = paymentStore.getRevenueByMonth()
  return {
    labels: data.labels,
    datasets: [
      {
        label: 'Pendapatan',
        data: data.values,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }
})

const revenueOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => formatCurrency(ctx.raw),
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (v: any) => formatCurrency(v),
      },
      grid: { color: '#f3f4f6' },
    },
    x: {
      grid: { display: false },
    },
  },
}

// Membership status chart
const membershipChartData = computed(() => ({
  labels: ['Aktif', 'Expired', 'Pending', 'Frozen'],
  datasets: [
    {
      data: [
        membershipStore.activeMemberships.length,
        membershipStore.expiredMemberships.length,
        membershipStore.memberships.filter((m) => m.status === 'pending').length,
        membershipStore.memberships.filter((m) => m.status === 'frozen').length,
      ],
      backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'],
      borderWidth: 0,
    },
  ],
}))

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' },
    },
  },
}

// Recent payments
const recentPayments = computed(() =>
  [...paymentStore.payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
)

// Expiring soon
const expiringSoon = computed(() =>
  membershipStore.expiringMemberships.slice(0, 5)
)

function getMemberName(memberId: string): string {
  return userStore.getUserById(memberId)?.name || '-'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Stats grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        title="Total Member"
        :value="totalMembers"
        icon="users"
        color="bg-primary-100 text-primary-600"
      />
      <StatsCard
        title="Member Aktif"
        :value="activeMembers"
        icon="user-check"
        color="bg-emerald-100 text-emerald-600"
        :subtitle="`dari ${totalMembers} member`"
      />
      <StatsCard
        v-if="isAdmin"
        title="Pendapatan Bulan Ini"
        :value="formatCurrency(monthlyRevenue)"
        icon="money"
        color="bg-amber-100 text-amber-600"
      />
      <StatsCard
        v-if="!isAdmin"
        title="Check-in Hari Ini"
        :value="todayCheckIns"
        icon="checkin"
        color="bg-amber-100 text-amber-600"
        :subtitle="`${activeCheckIns} masih aktif`"
      />
      <StatsCard
        title="Segera Expired"
        :value="expiringCount"
        icon="warning"
        color="bg-red-100 text-red-600"
        subtitle="dalam 7 hari ke depan"
      />
    </div>

    <!-- Admin: Charts -->
    <div v-if="isAdmin" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Revenue chart -->
      <div class="card p-5 lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Pendapatan 6 Bulan Terakhir</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Overview revenue bulanan</p>
          </div>
        </div>
        <div class="h-72">
          <Bar :data="revenueData" :options="revenueOptions" />
        </div>
      </div>

      <!-- Membership status -->
      <div class="card p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Status Membership</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Distribusi status saat ini</p>
        </div>
        <div class="h-72">
          <Doughnut :data="membershipChartData" :options="doughnutOptions" />
        </div>
      </div>
    </div>

    <!-- Staff: Membership chart only -->
    <div v-if="!isAdmin" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="card p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Status Membership</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Distribusi status saat ini</p>
        </div>
        <div class="h-72">
          <Doughnut :data="membershipChartData" :options="doughnutOptions" />
        </div>
      </div>
      <div class="card p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Ringkasan Info</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Statistik harian</p>
        </div>
        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h2m12 0h2M6 8v8m12-8v8M8 6h8M8 18h8M8 6v12m8-12v12" /></svg>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Personal Trainer</span>
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ totalTrainers }}</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Pending Bayar</span>
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ pendingCount }}</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Segera Expired</span>
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ expiringCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tables -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Recent payments (admin only) -->
      <div v-if="isAdmin" class="card">
        <div class="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Pembayaran Terbaru</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-700 text-left">
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Member</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Jumlah</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Metode</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
              <tr v-for="payment in recentPayments" :key="payment.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{{ getMemberName(payment.memberId) }}</td>
                <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ formatCurrency(payment.amount) }}</td>
                <td class="px-5 py-3">
                  <span class="capitalize text-gray-600 dark:text-gray-400">{{ payment.method }}</span>
                </td>
                <td class="px-5 py-3">
                  <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700']">
                    {{ payment.status === 'paid' ? 'Lunas' : 'Pending' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Expiring soon -->
      <div class="card">
        <div class="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">⚠️ Membership Segera Berakhir</h3>
        </div>
        <div v-if="expiringSoon.length === 0" class="p-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada membership yang akan berakhir dalam 7 hari</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-700 text-left">
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Member</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Berakhir</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Sisa Hari</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
              <tr v-for="ms in expiringSoon" :key="ms.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{{ getMemberName(ms.memberId) }}</td>
                <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(ms.endDate) }}</td>
                <td class="px-5 py-3">
                  <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {{ daysRemaining(ms.endDate) }} hari
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Staff: Today's check-ins -->
      <div v-if="!isAdmin" class="card">
        <div class="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">✅ Check-in Hari Ini</h3>
        </div>
        <div v-if="checkInStore.todayCheckins.length === 0" class="p-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada check-in hari ini</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-700 text-left">
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Member</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Waktu</th>
                <th class="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
              <tr v-for="ci in checkInStore.todayCheckins.slice(0, 8)" :key="ci.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{{ ci.memberName }}</td>
                <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ new Date(ci.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}</td>
                <td class="px-5 py-3">
                  <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', ci.checkOutTime ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700']">
                    {{ ci.checkOutTime ? 'Selesai' : 'Aktif' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Quick info (admin only) -->
    <div v-if="isAdmin" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="card p-5 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h2m12 0h2M6 8v8m12-8v8M8 6h8M8 18h8M8 6v12m8-12v12" /></svg>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ totalTrainers }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Personal Trainer</p>
      </div>
      <div class="card p-5 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ userStore.staff.length }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Staff</p>
      </div>
      <div class="card p-5 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ formatCurrency(paymentStore.totalRevenue) }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Pendapatan</p>
      </div>
    </div>
  </div>
</template>
