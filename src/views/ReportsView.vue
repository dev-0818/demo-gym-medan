<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar, Pie } from 'vue-chartjs'
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
import { useUserStore } from '@/stores/users'
import { usePackageStore } from '@/stores/packages'
import { useMembershipStore } from '@/stores/memberships'
import { usePaymentStore } from '@/stores/payments'
import { formatCurrency, formatDate, getPaymentMethodLabel } from '@/utils/helpers'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const userStore = useUserStore()
const packageStore = usePackageStore()
const membershipStore = useMembershipStore()
const paymentStore = usePaymentStore()

const activeTab = ref<'overview' | 'revenue' | 'members' | 'packages'>('overview')

// Revenue by month
const revenueByMonth = computed(() => {
  const data = paymentStore.getRevenueByMonth()
  return {
    labels: data.labels,
    datasets: [{ label: 'Pendapatan', data: data.values, backgroundColor: '#3b82f6', borderRadius: 6, borderSkipped: false }],
  }
})

// Payment method distribution
const paymentMethodData = computed(() => {
  const methods = ['cash', 'transfer', 'qris', 'debit']
  const counts = methods.map((m) => paymentStore.paidPayments.filter((p) => p.method === m).length)
  return {
    labels: methods.map(getPaymentMethodLabel),
    datasets: [{ data: counts, backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'], borderWidth: 0 }],
  }
})

// Package popularity
const packagePopularity = computed(() => {
  const pkgs = packageStore.packages
  const counts = pkgs.map((pkg) => membershipStore.memberships.filter((m) => m.packageId === pkg.id).length)
  return {
    labels: pkgs.map((p) => p.name),
    datasets: [{ label: 'Jumlah Member', data: counts, backgroundColor: '#3b82f6', borderRadius: 6, borderSkipped: false }],
  }
})

// Summary data
const totalRevenue = computed(() => paymentStore.totalRevenue)
const totalMembers = computed(() => userStore.members.length)
const activeMembers = computed(() => membershipStore.activeMemberships.length)
const avgRevenuePerMember = computed(() => totalMembers.value > 0 ? Math.round(totalRevenue.value / totalMembers.value) : 0)

// Payment list for export view
const allPayments = computed(() =>
  [...paymentStore.payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
)

function getMemberName(id: string) { return userStore.getUserById(id)?.name || '-' }

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: { label: (ctx: any) => formatCurrency(ctx.raw) },
    },
  },
  scales: {
    y: { beginAtZero: true, ticks: { callback: (v: any) => formatCurrency(v) }, grid: { color: '#f3f4f6' } },
    x: { grid: { display: false } },
  },
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
    x: { grid: { display: false } },
  },
}

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
  },
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Laporan</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">Analisis data gym & performa bisnis</p>
    </div>

    <!-- Tabs -->
    <div class="card p-1 inline-flex gap-1">
      <button
        v-for="tab in [
          { key: 'overview', label: '📊 Overview' },
          { key: 'revenue', label: '💰 Pendapatan' },
          { key: 'members', label: '👥 Member' },
          { key: 'packages', label: '📦 Paket' },
        ]"
        :key="tab.key"
        @click="activeTab = tab.key as any"
        :class="['rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700']"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Overview -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Pendapatan</p>
          <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(totalRevenue) }}</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Member</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ totalMembers }}</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Member Aktif</p>
          <p class="text-2xl font-bold text-primary-600">{{ activeMembers }}</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Rata-rata / Member</p>
          <p class="text-2xl font-bold text-amber-600">{{ formatCurrency(avgRevenuePerMember) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="card p-5">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Pendapatan Bulanan</h3>
          <div class="h-64"><Bar :data="revenueByMonth" :options="chartOptions" /></div>
        </div>
        <div class="card p-5">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Metode Pembayaran</h3>
          <div class="h-64"><Pie :data="paymentMethodData" :options="pieOptions" /></div>
        </div>
      </div>
    </div>

    <!-- Revenue -->
    <div v-if="activeTab === 'revenue'" class="space-y-6">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Pendapatan 6 Bulan Terakhir</h3>
        <div class="h-80"><Bar :data="revenueByMonth" :options="chartOptions" /></div>
      </div>

      <div class="card overflow-hidden">
        <div class="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Riwayat Semua Transaksi</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left">
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Invoice</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Member</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Jumlah</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Metode</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Tanggal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="p in allPayments" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-5 py-3 font-mono text-primary-600">{{ p.invoiceNumber }}</td>
                <td class="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{{ getMemberName(p.memberId) }}</td>
                <td class="px-5 py-3 font-semibold">{{ formatCurrency(p.amount) }}</td>
                <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ getPaymentMethodLabel(p.method) }}</td>
                <td class="px-5 py-3 text-gray-500 dark:text-gray-400">{{ formatDate(p.paidAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Members -->
    <div v-if="activeTab === 'members'" class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Terdaftar</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ totalMembers }}</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Membership Aktif</p>
          <p class="text-3xl font-bold text-emerald-600">{{ activeMembers }}</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Membership Expired</p>
          <p class="text-3xl font-bold text-red-600">{{ membershipStore.expiredMemberships.length }}</p>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Daftar Semua Member</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left">
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Nama</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Email</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Telepon</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Status Akun</th>
                <th class="px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Terdaftar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="m in userStore.members" :key="m.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{{ m.name }}</td>
                <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ m.email }}</td>
                <td class="px-5 py-3 text-gray-600 dark:text-gray-400">{{ m.phone }}</td>
                <td class="px-5 py-3">
                  <span :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
                    {{ m.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-gray-500 dark:text-gray-400">{{ formatDate(m.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Packages -->
    <div v-if="activeTab === 'packages'" class="space-y-6">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Popularitas Paket</h3>
        <div class="h-72"><Bar :data="packagePopularity" :options="barOptions" /></div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="pkg in packageStore.packages" :key="pkg.id" class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ pkg.name }}</h3>
            <span class="text-lg font-bold text-primary-600">{{ formatCurrency(pkg.price) }}</span>
          </div>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex justify-between">
              <span>Durasi</span>
              <span class="font-medium">{{ pkg.durationDays }} hari</span>
            </div>
            <div class="flex justify-between">
              <span>Total Member</span>
              <span class="font-medium">{{ membershipStore.memberships.filter(m => m.packageId === pkg.id).length }}</span>
            </div>
            <div class="flex justify-between">
              <span>Revenue</span>
              <span class="font-medium text-emerald-600">
                {{ formatCurrency(paymentStore.paidPayments
                  .filter(p => membershipStore.getMembershipById(p.membershipId)?.packageId === pkg.id)
                  .reduce((sum, p) => sum + p.amount, 0)) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
