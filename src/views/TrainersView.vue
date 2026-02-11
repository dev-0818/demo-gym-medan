<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'
import { useUserStore } from '@/stores/users'
import { useMembershipStore } from '@/stores/memberships'
import { useActivityLogStore } from '@/stores/activityLog'
import type { User, Gender, BloodType } from '@/types'
import { formatDate, getGenderLabel, calculateAge } from '@/utils/helpers'
import { usePermissions } from '@/composables/usePermissions'

const userStore = useUserStore()
const membershipStore = useMembershipStore()
const logStore = useActivityLogStore()
const { canManageTrainers } = usePermissions()
const search = ref('')
const showMemberHistoryModal = ref(false)
const memberHistoryTrainer = ref<User | null>(null)
const showModal = ref(false)
const showPasswordModal = ref(false)
const showDetailModal = ref(false)
const editingUser = ref<User | null>(null)
const detailUser = ref<User | null>(null)
const generatedPassword = ref('')
const generatedUserName = ref('')
const visiblePasswords = ref<Set<string>>(new Set())

const showConfirm = ref(false)
const confirmMessage = ref('')
const pendingDeleteId = ref('')

const showResetConfirm = ref(false)
const resetConfirmMessage = ref('')
const pendingResetUser = ref<User | null>(null)

const photoPreview = ref('')

const form = reactive({
  name: '',
  email: '',
  phone: '',
  gender: 'male' as Gender,
  nik: '',
  birthDate: '',
  bloodType: '' as BloodType,
  emergencyContact: '',
  emergencyPhone: '',
  address: '',
  notes: '',
})

const filteredTrainers = computed(() => {
  const q = search.value.toLowerCase()
  return userStore.trainers.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.phone.includes(q) || (t.nik && t.nik.includes(q)))
})

/** Get active member count for a trainer */
function getActiveMembers(trainerId: string): number {
  return membershipStore.activeMemberships.filter((m) => m.trainerId === trainerId).length
}

/** Get all memberships (history) for a trainer */
function getMemberHistory(trainerId: string) {
  return membershipStore.memberships
    .filter((m) => m.trainerId === trainerId)
    .map((m) => {
      const member = userStore.getUserById(m.memberId)
      const pkg = m.packageId
      return {
        membershipId: m.id,
        memberId: m.memberId,
        memberName: member?.name || 'Unknown',
        memberPhoto: member?.photo || member?.avatar || '',
        memberPhone: member?.phone || '-',
        packageId: pkg,
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
        notes: m.notes,
      }
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
}

/** Get total unique members ever assigned to this trainer */
function getTotalMemberHistory(trainerId: string): number {
  const memberIds = new Set(
    membershipStore.memberships.filter((m) => m.trainerId === trainerId).map((m) => m.memberId)
  )
  return memberIds.size
}

function openMemberHistory(trainer: User) {
  memberHistoryTrainer.value = trainer
  showMemberHistoryModal.value = true
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active': return { label: 'Aktif', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
    case 'expired': return { label: 'Expired', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    case 'frozen': return { label: 'Frozen', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    default: return { label: status, class: 'bg-gray-100 text-gray-700' }
  }
}

function togglePasswordVisibility(userId: string) {
  if (visiblePasswords.value.has(userId)) {
    visiblePasswords.value.delete(userId)
  } else {
    visiblePasswords.value.add(userId)
  }
  visiblePasswords.value = new Set(visiblePasswords.value)
}

function maskPassword(password: string): string {
  return '•'.repeat(password.length)
}

function openAdd() {
  editingUser.value = null
  Object.assign(form, { name: '', email: '', phone: '', gender: 'male', nik: '', birthDate: '', bloodType: '', emergencyContact: '', emergencyPhone: '', address: '', notes: '' })
  photoPreview.value = ''
  showModal.value = true
}

function openEdit(user: User) {
  editingUser.value = user
  Object.assign(form, {
    name: user.name, email: user.email, phone: user.phone, gender: user.gender,
    nik: user.nik || '', birthDate: user.birthDate || '', bloodType: (user.bloodType || '') as BloodType,
    emergencyContact: user.emergencyContact || '', emergencyPhone: user.emergencyPhone || '',
    address: user.address, notes: user.notes || '',
  })
  photoPreview.value = user.photo || user.avatar || ''
  showModal.value = true
}

function openDetail(user: User) {
  detailUser.value = user
  showDetailModal.value = true
}

function save() {
  const photoData = photoPreview.value || ''
  if (editingUser.value) {
    userStore.updateUser(editingUser.value.id, { ...form, photo: photoData, avatar: photoData || editingUser.value.avatar })
    logStore.addLog({ action: 'update', targetType: 'trainer', targetId: editingUser.value.id, targetName: form.name, details: `Mengupdate data trainer "${form.name}"` })
  } else {
    const result = userStore.addUser({ ...form, photo: photoData, avatar: photoData, role: 'trainer', isActive: true })
    generatedPassword.value = result.password
    generatedUserName.value = result.user.name
    showPasswordModal.value = true
    logStore.addLog({ action: 'create', targetType: 'trainer', targetId: result.user.id, targetName: result.user.name, details: `Membuat akun trainer baru "${result.user.name}"` })
  }
  showModal.value = false
}

function resetPassword(user: User) {
  resetConfirmMessage.value = `Yakin ingin reset password trainer "${user.name}"? Password lama akan diganti dengan password baru.`
  pendingResetUser.value = user
  showResetConfirm.value = true
}

function confirmResetPassword() {
  if (!pendingResetUser.value) return
  const user = pendingResetUser.value
  generatedPassword.value = userStore.resetPassword(user.id)
  generatedUserName.value = user.name
  showPasswordModal.value = true
  logStore.addLog({ action: 'reset_password', targetType: 'trainer', targetId: user.id, targetName: user.name, details: `Reset password trainer "${user.name}"` })
  pendingResetUser.value = null
}

function deleteUser(user: User) {
  confirmMessage.value = `Yakin hapus trainer "${user.name}"? Data yang sudah dihapus tidak bisa dikembalikan.`
  pendingDeleteId.value = user.id
  showConfirm.value = true
}

function confirmDelete() {
  const user = userStore.getUserById(pendingDeleteId.value)
  userStore.deleteUser(pendingDeleteId.value)
  if (user) {
    logStore.addLog({ action: 'delete', targetType: 'trainer', targetId: pendingDeleteId.value, targetName: user.name, details: `Menghapus trainer "${user.name}"` })
  }
}

function copyPassword() {
  window.navigator.clipboard.writeText(generatedPassword.value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Personal Trainer</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Generate akun & password untuk personal trainer</p>
      </div>
      <button v-if="canManageTrainers" @click="openAdd" class="btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Tambah Trainer
      </button>
    </div>

    <div class="card p-4">
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input v-model="search" type="text" class="input pl-10" placeholder="Cari nama, email, telepon, atau No KTP..." />
      </div>
    </div>

    <!-- Trainer cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="t in filteredTrainers" :key="t.id" class="card p-5 hover:shadow-md transition-shadow cursor-pointer" @click="openDetail(t)">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <img v-if="t.photo || t.avatar" :src="t.photo || t.avatar" :alt="t.name" class="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700" />
            <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-lg font-bold">{{ t.name.charAt(0) }}</div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ t.name }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t.email }}</p>
            </div>
          </div>
          <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
            {{ t.isActive ? 'Aktif' : 'Nonaktif' }}
          </span>
        </div>

        <div class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
            <span class="font-mono text-xs">{{ t.nik || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            {{ t.phone }}
          </div>
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {{ getGenderLabel(t.gender) }}
            <template v-if="t.birthDate"> · {{ calculateAge(t.birthDate) }} th</template>
            <span v-if="t.bloodType" class="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400 ml-auto">{{ t.bloodType }}</span>
          </div>

          <!-- Member Stats -->
          <div class="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <span class="font-semibold text-orange-600 dark:text-orange-400">{{ getActiveMembers(t.id) }}</span>
            <span>member aktif</span>
            <span class="text-gray-400 mx-1">·</span>
            <span class="text-gray-500">{{ getTotalMemberHistory(t.id) }} total history</span>
          </div>
          <div @click.stop>
            <button @click="openMemberHistory(t)" class="w-full text-xs text-center py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-medium">
              📋 Lihat History Member
            </button>
          </div>

          <div v-if="canManageTrainers" class="flex items-center gap-2" @click.stop>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            <code class="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{{ visiblePasswords.has(t.id) ? t.password : maskPassword(t.password) }}</code>
            <button @click.stop="togglePasswordVisibility(t.id)" class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg v-if="visiblePasswords.has(t.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </div>
        </div>

        <div v-if="canManageTrainers" class="mt-4 flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-4" @click.stop>
          <button @click="resetPassword(t)" class="btn-ghost btn-xs flex-1 gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Reset
          </button>
          <button @click="openEdit(t)" class="btn-ghost btn-xs flex-1 gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button @click="deleteUser(t)" class="btn-ghost btn-xs text-red-500 hover:text-red-700" title="Hapus">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      <div v-if="filteredTrainers.length === 0" class="col-span-full card p-12 text-center text-gray-500 dark:text-gray-400">
        Tidak ada trainer ditemukan.
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <ModalDialog v-model="showModal" :title="editingUser ? 'Edit Trainer' : 'Tambah Trainer Baru'" size="lg">
      <form @submit.prevent="save" class="space-y-5">
        <div class="pb-4 border-b border-gray-200 dark:border-gray-700">
          <PhotoCapture v-model="photoPreview" />
        </div>

        <!-- Data Pribadi -->
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Data Pribadi
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="label">Nama Lengkap <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" class="input" placeholder="Nama sesuai KTP" required />
            </div>
            <div>
              <label class="label">No KTP (NIK) <span class="text-red-500">*</span></label>
              <input v-model="form.nik" type="text" class="input" placeholder="16 digit NIK" maxlength="16" required />
            </div>
            <div>
              <label class="label">Tanggal Lahir <span class="text-red-500">*</span></label>
              <input v-model="form.birthDate" type="date" class="input" required />
            </div>
            <div>
              <label class="label">Gender <span class="text-red-500">*</span></label>
              <select v-model="form.gender" class="select">
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
            <div>
              <label class="label">Golongan Darah</label>
              <select v-model="form.bloodType" class="select">
                <option value="">Tidak diketahui</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Kontak -->
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            Kontak
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Email <span class="text-red-500">*</span></label>
              <input v-model="form.email" type="email" class="input" placeholder="email@contoh.com" required />
            </div>
            <div>
              <label class="label">No. Telepon <span class="text-red-500">*</span></label>
              <input v-model="form.phone" type="tel" class="input" placeholder="08xxxxxxxxxx" required />
            </div>
            <div class="sm:col-span-2">
              <label class="label">Alamat</label>
              <textarea v-model="form.address" class="input" rows="2" placeholder="Alamat lengkap"></textarea>
            </div>
          </div>
        </div>

        <!-- Kontak Darurat & Catatan -->
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Kontak Darurat & Catatan
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Nama Kontak Darurat</label>
              <input v-model="form.emergencyContact" type="text" class="input" placeholder="Nama (Hubungan)" />
            </div>
            <div>
              <label class="label">No. Telp Darurat</label>
              <input v-model="form.emergencyPhone" type="tel" class="input" placeholder="08xxxxxxxxxx" />
            </div>
            <div class="sm:col-span-2">
              <label class="label">Catatan</label>
              <textarea v-model="form.notes" class="input" rows="2" placeholder="Sertifikasi, spesialisasi, kondisi medis, dll."></textarea>
            </div>
          </div>
        </div>

        <div v-if="!editingUser" class="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3">
          <p class="text-sm text-blue-700 dark:text-blue-300">💡 Password akan di-generate otomatis setelah akun dibuat.</p>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingUser ? 'Simpan' : 'Buat Akun' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Detail Modal -->
    <ModalDialog v-model="showDetailModal" title="Detail Trainer" size="lg">
      <div v-if="detailUser" class="space-y-5">
        <div class="flex items-center gap-5">
          <img v-if="detailUser.photo || detailUser.avatar" :src="detailUser.photo || detailUser.avatar" :alt="detailUser.name" class="h-20 w-20 rounded-full object-cover ring-4 ring-orange-100 dark:ring-orange-900/30" />
          <div v-else class="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-2xl font-bold">{{ detailUser.name.charAt(0) }}</div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ detailUser.name }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ detailUser.email }}</p>
            <div class="mt-1.5 flex items-center gap-2">
              <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', detailUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">{{ detailUser.isActive ? 'Aktif' : 'Nonaktif' }}</span>
              <span v-if="detailUser.bloodType" class="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">Gol. {{ detailUser.bloodType }}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">No KTP (NIK)</p>
            <p class="mt-0.5 text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{{ detailUser.nik || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal Lahir</p>
            <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {{ detailUser.birthDate ? formatDate(detailUser.birthDate) : '-' }}
              <span v-if="detailUser.birthDate" class="text-gray-500 dark:text-gray-400">({{ calculateAge(detailUser.birthDate) }} tahun)</span>
            </p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gender</p>
            <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{{ getGenderLabel(detailUser.gender) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Golongan Darah</p>
            <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{{ detailUser.bloodType || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">No. Telepon</p>
            <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{{ detailUser.phone }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Terdaftar</p>
            <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{{ formatDate(detailUser.createdAt) }}</p>
          </div>
          <div class="sm:col-span-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alamat</p>
            <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{{ detailUser.address || '-' }}</p>
          </div>
        </div>

        <div v-if="detailUser.emergencyContact || detailUser.emergencyPhone" class="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <h4 class="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Kontak Darurat
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-amber-700 dark:text-amber-400">Nama</p>
              <p class="text-sm font-medium text-amber-900 dark:text-amber-300">{{ detailUser.emergencyContact || '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-amber-700 dark:text-amber-400">Telepon</p>
              <p class="text-sm font-medium text-amber-900 dark:text-amber-300">{{ detailUser.emergencyPhone || '-' }}</p>
            </div>
          </div>
        </div>

        <div v-if="detailUser.notes" class="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h4 class="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Catatan
          </h4>
          <p class="text-sm text-blue-900 dark:text-blue-300">{{ detailUser.notes }}</p>
        </div>

        <!-- Member Stats in Detail Modal -->
        <div class="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-4">
          <h4 class="text-xs font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Member
          </h4>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="text-center">
              <p class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ getActiveMembers(detailUser.id) }}</p>
              <p class="text-xs text-orange-700 dark:text-orange-400">Aktif</p>
            </div>
            <div class="text-center">
              <p class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ getTotalMemberHistory(detailUser.id) }}</p>
              <p class="text-xs text-orange-700 dark:text-orange-400">Total History</p>
            </div>
          </div>
          <button @click="showDetailModal = false; openMemberHistory(detailUser)" class="w-full text-xs text-center py-2 rounded-lg bg-orange-100 dark:bg-orange-800/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/60 transition-colors font-medium">
            📋 Lihat Detail History Member
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <button v-if="detailUser && canManageTrainers" @click="showDetailModal = false; openEdit(detailUser)" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button @click="showDetailModal = false" class="btn-primary">Tutup</button>
        </div>
      </template>
    </ModalDialog>

    <ModalDialog v-model="showPasswordModal" title="🔑 Password Trainer" size="sm">
      <div class="text-center space-y-4">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">Password untuk <strong>{{ generatedUserName }}</strong>:</p>
        <div class="flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
          <code class="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">{{ generatedPassword }}</code>
          <button @click="copyPassword()" class="rounded-lg p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600" title="Copy">📋</button>
        </div>
        <p class="text-xs text-amber-600">⚠️ Simpan password ini!</p>
      </div>
      <template #footer><div class="flex justify-center"><button @click="showPasswordModal = false" class="btn-primary">Tutup</button></div></template>
    </ModalDialog>

    <ConfirmDialog v-model="showConfirm" :message="confirmMessage" @confirm="confirmDelete" />
    <ConfirmDialog v-model="showResetConfirm" :message="resetConfirmMessage" variant="warning" confirm-text="Ya, Reset" @confirm="confirmResetPassword" />

    <!-- Member History Modal -->
    <ModalDialog v-model="showMemberHistoryModal" :title="memberHistoryTrainer ? `History Member — ${memberHistoryTrainer.name}` : 'History Member'" size="lg">
      <div v-if="memberHistoryTrainer" class="space-y-4">
        <!-- Summary Stats -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 text-center">
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">{{ getActiveMembers(memberHistoryTrainer.id) }}</p>
            <p class="text-xs text-orange-700 dark:text-orange-400 mt-1">Member Aktif Saat Ini</p>
          </div>
          <div class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-center">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ getTotalMemberHistory(memberHistoryTrainer.id) }}</p>
            <p class="text-xs text-blue-700 dark:text-blue-400 mt-1">Total Member (Semua Waktu)</p>
          </div>
        </div>

        <!-- Member History List -->
        <div v-if="getMemberHistory(memberHistoryTrainer.id).length > 0" class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Riwayat Member</h4>
          <div v-for="h in getMemberHistory(memberHistoryTrainer.id)" :key="h.membershipId" class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <img v-if="h.memberPhoto" :src="h.memberPhoto" :alt="h.memberName" class="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600" />
            <div v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold text-sm">{{ h.memberName.charAt(0) }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{{ h.memberName }}</p>
                <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusBadge(h.status).class]">{{ getStatusBadge(h.status).label }}</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ formatDate(h.startDate) }} — {{ formatDate(h.endDate) }}
              </p>
              <p v-if="h.notes" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{{ h.notes }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ h.memberPhone }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <p class="text-sm">Belum ada member yang ditangani trainer ini.</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <button @click="showMemberHistoryModal = false" class="btn-primary">Tutup</button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
