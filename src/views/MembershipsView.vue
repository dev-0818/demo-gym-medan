<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useUserStore } from '@/stores/users'
import { usePackageStore } from '@/stores/packages'
import { useMembershipStore } from '@/stores/memberships'
import { useActivityLogStore } from '@/stores/activityLog'
import type { Membership, MembershipStatus } from '@/types'
import { formatDate, formatCurrency, daysRemaining, getStatusColor, addDays, todayISO } from '@/utils/helpers'
import { usePermissions } from '@/composables/usePermissions'

const userStore = useUserStore()
const logStore = useActivityLogStore()
const packageStore = usePackageStore()
const membershipStore = useMembershipStore()
const { canDelete } = usePermissions()

const search = ref('')
const filterStatus = ref<string>('all')
const showModal = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const pendingDeleteId = ref('')
const editingMs = ref<Membership | null>(null)

const form = reactive({
  memberId: '',
  packageId: '',
  trainerId: '',
  startDate: todayISO(),
  endDate: '',
  status: 'active' as MembershipStatus,
  notes: '',
})

const filteredMemberships = computed(() => {
  let result = membershipStore.memberships
  if (filterStatus.value !== 'all') {
    result = result.filter((m) => m.status === filterStatus.value)
  }
  const q = search.value.toLowerCase()
  if (q) {
    result = result.filter((m) => {
      const member = userStore.getUserById(m.memberId)
      return member?.name.toLowerCase().includes(q) || member?.email.toLowerCase().includes(q)
    })
  }
  return result
})

function getMemberName(id: string) { return userStore.getUserById(id)?.name || '-' }
function getPackageName(id: string) { return packageStore.getPackageById(id)?.name || '-' }
function getTrainerName(id?: string) { return id ? userStore.getUserById(id)?.name || '-' : '-' }

function onPackageChange() {
  const pkg = packageStore.getPackageById(form.packageId)
  if (pkg && form.startDate) {
    form.endDate = addDays(form.startDate, pkg.durationDays)
  }
}

function openAdd() {
  editingMs.value = null
  Object.assign(form, { memberId: '', packageId: '', trainerId: '', startDate: todayISO(), endDate: '', status: 'active', notes: '' })
  showModal.value = true
}

function openEdit(ms: Membership) {
  editingMs.value = ms
  Object.assign(form, {
    memberId: ms.memberId,
    packageId: ms.packageId,
    trainerId: ms.trainerId || '',
    startDate: ms.startDate,
    endDate: ms.endDate,
    status: ms.status,
    notes: ms.notes,
  })
  showModal.value = true
}

function save() {
  const data = {
    memberId: form.memberId,
    packageId: form.packageId,
    trainerId: form.trainerId || undefined,
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
    notes: form.notes,
  }
  const memberName = userStore.getUserById(data.memberId)?.name || 'member'
  if (editingMs.value) {
    membershipStore.updateMembership(editingMs.value.id, data)
    logStore.addLog({ action: 'update', targetType: 'membership', targetId: editingMs.value.id, targetName: memberName, details: `Mengupdate membership "${memberName}"` })
  } else {
    membershipStore.addMembership(data)
    logStore.addLog({ action: 'create', targetType: 'membership', targetId: '', targetName: memberName, details: `Menambahkan membership baru untuk "${memberName}"` })
  }
  showModal.value = false
}

function deleteMembership(ms: Membership) {
  const memberName = userStore.getUserById(ms.memberId)?.name || 'member'
  confirmMessage.value = `Yakin hapus membership "${memberName}"? Data yang sudah dihapus tidak bisa dikembalikan.`
  pendingDeleteId.value = ms.id
  showConfirm.value = true
}

function confirmDelete() {
  const ms = membershipStore.memberships.find((m) => m.id === pendingDeleteId.value)
  const memberName = ms ? (userStore.getUserById(ms.memberId)?.name || 'member') : 'member'
  logStore.addLog({ action: 'delete', targetType: 'membership', targetId: pendingDeleteId.value, targetName: memberName, details: `Menghapus membership "${memberName}"` })
  membershipStore.deleteMembership(pendingDeleteId.value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Membership</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Kelola membership member dengan tanggal mulai & berakhir</p>
      </div>
      <button @click="openAdd" class="btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Tambah Membership
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="flex flex-col gap-3 sm:flex-row">
        <input v-model="search" type="text" class="input flex-1" placeholder="🔍 Cari member..." />
        <select v-model="filterStatus" class="select w-full sm:w-48">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
          <option value="frozen">Frozen</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left">
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Member</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Paket</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Trainer</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Mulai</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Berakhir</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Sisa</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Status</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="ms in filteredMemberships" :key="ms.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td class="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">{{ getMemberName(ms.memberId) }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">{{ getPackageName(ms.packageId) }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">{{ getTrainerName(ms.trainerId) }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">{{ formatDate(ms.startDate) }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">{{ formatDate(ms.endDate) }}</td>
              <td class="px-5 py-3.5">
                <span v-if="ms.status === 'active'" :class="['text-sm font-medium', daysRemaining(ms.endDate) <= 7 ? 'text-red-600' : 'text-emerald-600']">
                  {{ daysRemaining(ms.endDate) > 0 ? `${daysRemaining(ms.endDate)} hari` : 'Habis' }}
                </span>
                <span v-else class="text-sm text-gray-400">-</span>
              </td>
              <td class="px-5 py-3.5">
                <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', getStatusColor(ms.status)]">
                  {{ ms.status }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1">
                  <button @click="openEdit(ms)" class="btn-ghost btn-xs" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button v-if="canDelete" @click="deleteMembership(ms)" class="btn-ghost btn-xs text-red-500 hover:text-red-700" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredMemberships.length === 0">
              <td colspan="8" class="px-5 py-12 text-center text-gray-500 dark:text-gray-400">Tidak ada membership ditemukan.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700 px-5 py-3 text-sm text-gray-500 dark:text-gray-400">Total: {{ filteredMemberships.length }} membership</div>
    </div>

    <!-- Modal -->
    <ModalDialog v-model="showModal" :title="editingMs ? 'Edit Membership' : 'Tambah Membership'" size="lg">
      <form @submit.prevent="save" class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Member</label>
            <select v-model="form.memberId" class="select" required :disabled="!!editingMs">
              <option value="">Pilih member</option>
              <option v-for="m in userStore.members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div>
            <label class="label">Paket</label>
            <select v-model="form.packageId" class="select" required @change="onPackageChange">
              <option value="">Pilih paket</option>
              <option v-for="p in packageStore.activePackages" :key="p.id" :value="p.id">{{ p.name }} - {{ formatCurrency(p.price) }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Personal Trainer (opsional)</label>
          <select v-model="form.trainerId" class="select">
            <option value="">Tanpa trainer</option>
            <option v-for="t in userStore.trainers" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Tanggal Mulai</label>
            <input v-model="form.startDate" type="date" class="input" required @change="onPackageChange" />
          </div>
          <div>
            <label class="label">Tanggal Berakhir</label>
            <input v-model="form.endDate" type="date" class="input" required />
          </div>
        </div>

        <div>
          <label class="label">Status</label>
          <select v-model="form.status" class="select">
            <option value="active">Aktif</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="frozen">Frozen</option>
          </select>
        </div>

        <div>
          <label class="label">Catatan</label>
          <textarea v-model="form.notes" class="input" rows="2" placeholder="Catatan tambahan..."></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingMs ? 'Simpan' : 'Tambah' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Confirm Delete -->
    <ConfirmDialog v-model="showConfirm" :message="confirmMessage" @confirm="confirmDelete" />
  </div>
</template>
