<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useUserStore } from '@/stores/users'
import { usePTStore } from '@/stores/pt'
import { useMembershipStore } from '@/stores/memberships'
import { useActivityLogStore } from '@/stores/activityLog'
import type { PTPackage, PTSubscription, PTSubscriptionStatus } from '@/types'
import { formatDate, formatCurrency, todayISO, addDays } from '@/utils/helpers'
import { usePermissions } from '@/composables/usePermissions'

const userStore = useUserStore()
const ptStore = usePTStore()
const membershipStore = useMembershipStore()
const logStore = useActivityLogStore()
const { canDelete, canManagePackages } = usePermissions()

// Only members with active membership can buy PT sessions
const membersWithActiveMembership = computed(() => {
  return userStore.members.filter((m) => {
    return membershipStore.getMembershipsByMember(m.id).some((ms) => ms.status === 'active')
  })
})

// --- Tab state ---
const activeTab = ref<'packages' | 'subscriptions'>('subscriptions')

// =========================
// MASTER PAKET PT
// =========================
const pkgSearch = ref('')
const showPkgModal = ref(false)
const editingPkg = ref<PTPackage | null>(null)
const showPkgConfirm = ref(false)
const pkgConfirmMessage = ref('')
const pendingDeletePkgId = ref('')

const pkgForm = reactive({
  name: '',
  sessions: 4,
  pricePerSession: 150000,
  totalPrice: 600000,
  description: '',
  isActive: true,
})

const filteredPTPackages = computed(() => {
  const q = pkgSearch.value.toLowerCase()
  return ptStore.ptPackages.filter((p) => p.name.toLowerCase().includes(q))
})

function recalcTotal() {
  pkgForm.totalPrice = pkgForm.sessions * pkgForm.pricePerSession
}

function openAddPkg() {
  editingPkg.value = null
  Object.assign(pkgForm, { name: '', sessions: 4, pricePerSession: 150000, totalPrice: 600000, description: '', isActive: true })
  showPkgModal.value = true
}

function openEditPkg(pkg: PTPackage) {
  editingPkg.value = pkg
  Object.assign(pkgForm, { name: pkg.name, sessions: pkg.sessions, pricePerSession: pkg.pricePerSession, totalPrice: pkg.totalPrice, description: pkg.description, isActive: pkg.isActive })
  showPkgModal.value = true
}

function savePkg() {
  if (editingPkg.value) {
    ptStore.updatePTPackage(editingPkg.value.id, { ...pkgForm })
    logStore.addLog({ action: 'update', targetType: 'pt-package', targetId: editingPkg.value.id, targetName: pkgForm.name, details: `Mengupdate paket PT "${pkgForm.name}"` })
  } else {
    const pkg = ptStore.addPTPackage({ ...pkgForm })
    logStore.addLog({ action: 'create', targetType: 'pt-package', targetId: pkg.id, targetName: pkg.name, details: `Membuat paket PT baru "${pkg.name}"` })
  }
  showPkgModal.value = false
}

function deletePkg(pkg: PTPackage) {
  pkgConfirmMessage.value = `Yakin hapus paket PT "${pkg.name}"?`
  pendingDeletePkgId.value = pkg.id
  showPkgConfirm.value = true
}

function confirmDeletePkg() {
  const pkg = ptStore.getPTPackageById(pendingDeletePkgId.value)
  if (pkg) logStore.addLog({ action: 'delete', targetType: 'pt-package', targetId: pkg.id, targetName: pkg.name, details: `Menghapus paket PT "${pkg.name}"` })
  ptStore.deletePTPackage(pendingDeletePkgId.value)
}

// =========================
// LANGGANAN PT MEMBER
// =========================
const subSearch = ref('')
const filterSubStatus = ref<string>('all')
const showSubModal = ref(false)
const editingSub = ref<PTSubscription | null>(null)
const showSubConfirm = ref(false)
const subConfirmMessage = ref('')
const pendingDeleteSubId = ref('')

const subForm = reactive({
  memberId: '',
  trainerId: '',
  ptPackageId: '',
  totalSessions: 0,
  usedSessions: 0,
  status: 'active' as PTSubscriptionStatus,
  startDate: todayISO(),
  endDate: '',
  notes: '',
})

const filteredSubscriptions = computed(() => {
  let result = ptStore.ptSubscriptions
  if (filterSubStatus.value !== 'all') {
    result = result.filter((s) => s.status === filterSubStatus.value)
  }
  const q = subSearch.value.toLowerCase()
  if (q) {
    result = result.filter((s) => {
      const member = userStore.getUserById(s.memberId)
      const trainer = userStore.getUserById(s.trainerId)
      return member?.name.toLowerCase().includes(q) || trainer?.name.toLowerCase().includes(q)
    })
  }
  return result
})

function onPTPackageChange() {
  const pkg = ptStore.getPTPackageById(subForm.ptPackageId)
  if (pkg) {
    subForm.totalSessions = pkg.sessions
    // Default end date = start + 60 days
    if (subForm.startDate) {
      subForm.endDate = addDays(subForm.startDate, 60)
    }
  }
}

function openAddSub() {
  editingSub.value = null
  Object.assign(subForm, { memberId: '', trainerId: '', ptPackageId: '', totalSessions: 0, usedSessions: 0, status: 'active', startDate: todayISO(), endDate: '', notes: '' })
  showSubModal.value = true
}

function openEditSub(sub: PTSubscription) {
  editingSub.value = sub
  Object.assign(subForm, {
    memberId: sub.memberId, trainerId: sub.trainerId, ptPackageId: sub.ptPackageId,
    totalSessions: sub.totalSessions, usedSessions: sub.usedSessions, status: sub.status,
    startDate: sub.startDate, endDate: sub.endDate, notes: sub.notes,
  })
  showSubModal.value = true
}

function saveSub() {
  const memberName = userStore.getUserById(subForm.memberId)?.name || 'member'
  if (editingSub.value) {
    ptStore.updateSubscription(editingSub.value.id, { ...subForm })
    logStore.addLog({ action: 'update', targetType: 'pt-subscription', targetId: editingSub.value.id, targetName: memberName, details: `Mengupdate langganan PT "${memberName}"` })
  } else {
    const sub = ptStore.addSubscription({ ...subForm })
    logStore.addLog({ action: 'create', targetType: 'pt-subscription', targetId: sub.id, targetName: memberName, details: `Menambahkan langganan PT baru untuk "${memberName}"` })
  }
  showSubModal.value = false
}

function addSessionClick(sub: PTSubscription) {
  ptStore.addSession(sub.id)
  const memberName = userStore.getUserById(sub.memberId)?.name || 'member'
  logStore.addLog({ action: 'update', targetType: 'pt-subscription', targetId: sub.id, targetName: memberName, details: `Menambah 1 sesi PT untuk "${memberName}" (${sub.usedSessions}/${sub.totalSessions})` })
}

function deleteSub(sub: PTSubscription) {
  const memberName = userStore.getUserById(sub.memberId)?.name || 'member'
  subConfirmMessage.value = `Yakin hapus langganan PT "${memberName}"?`
  pendingDeleteSubId.value = sub.id
  showSubConfirm.value = true
}

function confirmDeleteSub() {
  const sub = ptStore.getSubscriptionById(pendingDeleteSubId.value)
  if (sub) {
    const memberName = userStore.getUserById(sub.memberId)?.name || 'member'
    logStore.addLog({ action: 'delete', targetType: 'pt-subscription', targetId: sub.id, targetName: memberName, details: `Menghapus langganan PT "${memberName}"` })
  }
  ptStore.deleteSubscription(pendingDeleteSubId.value)
}

function getMemberName(id: string) { return userStore.getUserById(id)?.name || '-' }
function getTrainerName(id: string) { return userStore.getUserById(id)?.name || '-' }
function getMemberPhoto(id: string) { const u = userStore.getUserById(id); return u?.photo || u?.avatar || '' }
function getPTPackageName(id: string) { return ptStore.getPTPackageById(id)?.name || '-' }

function getSubStatusBadge(status: PTSubscriptionStatus) {
  switch (status) {
    case 'active': return { label: 'Aktif', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
    case 'completed': return { label: 'Selesai', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    case 'expired': return { label: 'Expired', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    case 'cancelled': return { label: 'Dibatalkan', class: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' }
    default: return { label: status, class: 'bg-gray-100 text-gray-700' }
  }
}

function getSessionProgress(sub: PTSubscription): number {
  return sub.totalSessions > 0 ? Math.round((sub.usedSessions / sub.totalSessions) * 100) : 0
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Personal Trainer</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Kelola paket sesi PT & langganan member</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 p-1">
      <button @click="activeTab = 'subscriptions'" :class="['flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors', activeTab === 'subscriptions' ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200']">
        🏋️ Langganan PT Member
      </button>
      <button @click="activeTab = 'packages'" :class="['flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors', activeTab === 'packages' ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200']">
        📦 Master Paket PT
      </button>
    </div>

    <!-- ===================== -->
    <!-- TAB: Master Paket PT  -->
    <!-- ===================== -->
    <template v-if="activeTab === 'packages'">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input v-model="pkgSearch" type="text" class="input flex-1" placeholder="🔍 Cari paket PT..." />
        <button v-if="canManagePackages" @click="openAddPkg" class="btn-primary shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          Tambah Paket PT
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="pkg in filteredPTPackages" :key="pkg.id" class="card p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-gray-100 text-lg">{{ pkg.name }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ pkg.description }}</p>
            </div>
            <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', pkg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
              {{ pkg.isActive ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500 dark:text-gray-400">Jumlah Sesi</span>
              <span class="font-bold text-orange-600 dark:text-orange-400 text-lg">{{ pkg.sessions }}x</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500 dark:text-gray-400">Harga/Sesi</span>
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ formatCurrency(pkg.pricePerSession) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
              <span class="text-gray-500 dark:text-gray-400 font-semibold">Total Harga</span>
              <span class="font-bold text-primary-600 dark:text-primary-400 text-lg">{{ formatCurrency(pkg.totalPrice) }}</span>
            </div>
          </div>

          <div v-if="canManagePackages" class="mt-4 flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button @click="openEditPkg(pkg)" class="btn-ghost btn-xs flex-1 gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button v-if="canDelete" @click="deletePkg(pkg)" class="btn-ghost btn-xs text-red-500 hover:text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <div v-if="filteredPTPackages.length === 0" class="col-span-full card p-12 text-center text-gray-500 dark:text-gray-400">Tidak ada paket PT ditemukan.</div>
      </div>
    </template>

    <!-- ========================= -->
    <!-- TAB: Langganan PT Member  -->
    <!-- ========================= -->
    <template v-if="activeTab === 'subscriptions'">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input v-model="subSearch" type="text" class="input flex-1" placeholder="🔍 Cari member atau trainer..." />
        <select v-model="filterSubStatus" class="select w-full sm:w-44">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <button @click="openAddSub" class="btn-primary shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          Tambah Langganan PT
        </button>
      </div>

      <!-- Subscription Cards -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div v-for="sub in filteredSubscriptions" :key="sub.id" class="card p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start gap-3">
            <img v-if="getMemberPhoto(sub.memberId)" :src="getMemberPhoto(sub.memberId)" :alt="getMemberName(sub.memberId)" class="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 shrink-0" />
            <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-lg font-bold shrink-0">{{ getMemberName(sub.memberId).charAt(0) }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ getMemberName(sub.memberId) }}</h3>
                <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', getSubStatusBadge(sub.status).class]">{{ getSubStatusBadge(sub.status).label }}</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Trainer: <span class="font-medium text-gray-700 dark:text-gray-300">{{ getTrainerName(sub.trainerId) }}</span>
                · {{ getPTPackageName(sub.ptPackageId) }}
              </p>
            </div>
          </div>

          <!-- Session Progress -->
          <div class="mt-4">
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="text-gray-500 dark:text-gray-400">Sesi</span>
              <span class="font-bold text-gray-900 dark:text-gray-100">{{ sub.usedSessions }} / {{ sub.totalSessions }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div :class="['h-3 rounded-full transition-all duration-500', getSessionProgress(sub) >= 100 ? 'bg-blue-500' : getSessionProgress(sub) >= 75 ? 'bg-orange-500' : 'bg-emerald-500']" :style="{ width: `${Math.min(getSessionProgress(sub), 100)}%` }"></div>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>{{ formatDate(sub.startDate) }} — {{ formatDate(sub.endDate) }}</span>
              <span>{{ getSessionProgress(sub) }}%</span>
            </div>
          </div>

          <div v-if="sub.notes" class="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">📝 {{ sub.notes }}</div>

          <!-- Actions -->
          <div class="mt-4 flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
            <button v-if="sub.status === 'active' && sub.usedSessions < sub.totalSessions" @click="addSessionClick(sub)" class="btn-primary btn-xs flex-1 gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
              +1 Sesi
            </button>
            <button @click="openEditSub(sub)" class="btn-ghost btn-xs flex-1 gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button v-if="canDelete" @click="deleteSub(sub)" class="btn-ghost btn-xs text-red-500 hover:text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <div v-if="filteredSubscriptions.length === 0" class="col-span-full card p-12 text-center text-gray-500 dark:text-gray-400">Tidak ada langganan PT ditemukan.</div>
      </div>
    </template>

    <!-- ========================= -->
    <!-- MODALS                    -->
    <!-- ========================= -->

    <!-- Add/Edit PT Package Modal -->
    <ModalDialog v-model="showPkgModal" :title="editingPkg ? 'Edit Paket PT' : 'Tambah Paket PT'" size="md">
      <form @submit.prevent="savePkg" class="space-y-4">
        <div>
          <label class="label">Nama Paket <span class="text-red-500">*</span></label>
          <input v-model="pkgForm.name" type="text" class="input" placeholder="Contoh: 8 Sesi PT" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Jumlah Sesi <span class="text-red-500">*</span></label>
            <input v-model.number="pkgForm.sessions" type="number" min="1" class="input" required @input="recalcTotal" />
          </div>
          <div>
            <label class="label">Harga per Sesi <span class="text-red-500">*</span></label>
            <input v-model.number="pkgForm.pricePerSession" type="number" min="0" step="1000" class="input" required @input="recalcTotal" />
          </div>
        </div>
        <div class="rounded-lg bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-primary-700 dark:text-primary-400">Total Harga</span>
            <span class="text-lg font-bold text-primary-700 dark:text-primary-400">{{ formatCurrency(pkgForm.totalPrice) }}</span>
          </div>
          <p class="text-xs text-primary-600 dark:text-primary-500 mt-1">{{ pkgForm.sessions }} sesi × {{ formatCurrency(pkgForm.pricePerSession) }}</p>
        </div>
        <div>
          <label class="label">Deskripsi</label>
          <textarea v-model="pkgForm.description" class="input" rows="2" placeholder="Keterangan paket..."></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="pkgForm.isActive" type="checkbox" id="pkgActive" class="rounded border-gray-300" />
          <label for="pkgActive" class="text-sm text-gray-700 dark:text-gray-300">Paket aktif</label>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showPkgModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingPkg ? 'Simpan' : 'Tambah' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Add/Edit PT Subscription Modal -->
    <ModalDialog v-model="showSubModal" :title="editingSub ? 'Edit Langganan PT' : 'Tambah Langganan PT'" size="lg">
      <form @submit.prevent="saveSub" class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Member <span class="text-red-500">*</span></label>
            <select v-model="subForm.memberId" class="select" required :disabled="!!editingSub">
              <option value="">Pilih member</option>
              <option v-for="m in membersWithActiveMembership" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Hanya member dengan membership aktif</p>
          </div>
          <div>
            <label class="label">Trainer <span class="text-red-500">*</span></label>
            <select v-model="subForm.trainerId" class="select" required>
              <option value="">Pilih trainer</option>
              <option v-for="t in userStore.trainers.filter(t => t.isActive)" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Paket PT <span class="text-red-500">*</span></label>
          <select v-model="subForm.ptPackageId" class="select" required @change="onPTPackageChange">
            <option value="">Pilih paket PT</option>
            <option v-for="p in ptStore.activePTPackages" :key="p.id" :value="p.id">
              {{ p.name }} — {{ p.sessions }} sesi — {{ formatCurrency(p.totalPrice) }}
            </option>
          </select>
        </div>

        <div v-if="subForm.ptPackageId" class="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-orange-700 dark:text-orange-400">Total Sesi</span>
            <span class="font-bold text-orange-700 dark:text-orange-400">{{ subForm.totalSessions }}x sesi</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Tanggal Mulai</label>
            <input v-model="subForm.startDate" type="date" class="input" required />
          </div>
          <div>
            <label class="label">Tanggal Berakhir</label>
            <input v-model="subForm.endDate" type="date" class="input" required />
          </div>
        </div>

        <div v-if="editingSub" class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Sesi Terpakai</label>
            <input v-model.number="subForm.usedSessions" type="number" min="0" :max="subForm.totalSessions" class="input" />
          </div>
          <div>
            <label class="label">Status</label>
            <select v-model="subForm.status" class="select">
              <option value="active">Aktif</option>
              <option value="completed">Selesai</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Catatan</label>
          <textarea v-model="subForm.notes" class="input" rows="2" placeholder="Catatan tambahan..."></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showSubModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingSub ? 'Simpan' : 'Tambah' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Confirm Dialogs -->
    <ConfirmDialog v-model="showPkgConfirm" :message="pkgConfirmMessage" @confirm="confirmDeletePkg" />
    <ConfirmDialog v-model="showSubConfirm" :message="subConfirmMessage" @confirm="confirmDeleteSub" />
  </div>
</template>
