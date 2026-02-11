<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'
import { useUserStore } from '@/stores/users'
import { useActivityLogStore } from '@/stores/activityLog'
import type { User, Gender, BloodType } from '@/types'
import { formatDate, getGenderLabel, calculateAge } from '@/utils/helpers'
import { usePermissions } from '@/composables/usePermissions'

const userStore = useUserStore()
const logStore = useActivityLogStore()
const { isAdmin, canDelete, canResetPassword, canToggleActive, canViewPassword } = usePermissions()

const search = ref('')
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

const filteredMembers = computed(() => {
  const q = search.value.toLowerCase()
  return userStore.members.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.nik && m.nik.includes(q))
  )
})

function togglePasswordVisibility(userId: string) {
  if (visiblePasswords.value.has(userId)) {
    visiblePasswords.value.delete(userId)
  } else {
    visiblePasswords.value.add(userId)
  }
  visiblePasswords.value = new Set(visiblePasswords.value)
}

function openAdd() {
  editingUser.value = null
  form.name = ''
  form.email = ''
  form.phone = ''
  form.gender = 'male'
  form.nik = ''
  form.birthDate = ''
  form.bloodType = ''
  form.emergencyContact = ''
  form.emergencyPhone = ''
  form.address = ''
  form.notes = ''
  photoPreview.value = ''
  showModal.value = true
}

function openEdit(user: User) {
  editingUser.value = user
  form.name = user.name
  form.email = user.email
  form.phone = user.phone
  form.gender = user.gender
  form.nik = user.nik || ''
  form.birthDate = user.birthDate || ''
  form.bloodType = (user.bloodType || '') as BloodType
  form.emergencyContact = user.emergencyContact || ''
  form.emergencyPhone = user.emergencyPhone || ''
  form.address = user.address
  form.notes = user.notes || ''
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
    userStore.updateUser(editingUser.value.id, {
      ...form,
      photo: photoData,
      avatar: photoData || editingUser.value.avatar,
    })
    logStore.addLog({
      action: 'update',
      targetType: 'member',
      targetId: editingUser.value.id,
      targetName: form.name,
      details: `Mengupdate data member "${form.name}"`,
    })
  } else {
    const result = userStore.addUser({
      ...form,
      photo: photoData,
      avatar: photoData,
      role: 'member',
      isActive: true,
    })
    generatedPassword.value = result.password
    generatedUserName.value = result.user.name
    showPasswordModal.value = true
    logStore.addLog({
      action: 'create',
      targetType: 'member',
      targetId: result.user.id,
      targetName: result.user.name,
      details: `Membuat akun member baru "${result.user.name}"`,
    })
  }
  showModal.value = false
}

function resetPassword(user: User) {
  resetConfirmMessage.value = `Yakin ingin reset password member "${user.name}"? Password lama akan diganti dengan password baru.`
  pendingResetUser.value = user
  showResetConfirm.value = true
}

function confirmResetPassword() {
  if (!pendingResetUser.value) return
  const user = pendingResetUser.value
  const newPassword = userStore.resetPassword(user.id)
  generatedPassword.value = newPassword
  generatedUserName.value = user.name
  showPasswordModal.value = true
  logStore.addLog({
    action: 'reset_password',
    targetType: 'member',
    targetId: user.id,
    targetName: user.name,
    details: `Reset password member "${user.name}"`,
  })
  pendingResetUser.value = null
}

function toggleActive(user: User) {
  userStore.toggleActive(user.id)
  logStore.addLog({
    action: 'toggle_active',
    targetType: 'member',
    targetId: user.id,
    targetName: user.name,
    details: `${user.isActive ? 'Menonaktifkan' : 'Mengaktifkan'} member "${user.name}"`,
  })
}

function deleteUser(user: User) {
  confirmMessage.value = `Yakin hapus member "${user.name}"? Data yang sudah dihapus tidak bisa dikembalikan.`
  pendingDeleteId.value = user.id
  showConfirm.value = true
}

function confirmDelete() {
  const user = userStore.getUserById(pendingDeleteId.value)
  userStore.deleteUser(pendingDeleteId.value)
  if (user) {
    logStore.addLog({
      action: 'delete',
      targetType: 'member',
      targetId: pendingDeleteId.value,
      targetName: user.name,
      details: `Menghapus member "${user.name}"`,
    })
  }
}

function copyPassword() {
  navigator.clipboard.writeText(generatedPassword.value)
}

function maskPassword(password: string): string {
  return '•'.repeat(password.length)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Kelola Member</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Generate akun & password untuk member baru</p>
      </div>
      <button @click="openAdd" class="btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Tambah Member
      </button>
    </div>

    <!-- Search -->
    <div class="card p-4">
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          v-model="search"
          type="text"
          class="input pl-10"
          placeholder="Cari nama, email, telepon, atau No KTP..."
        />
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left">
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Member</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">No KTP</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Telepon</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Umur</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Darah</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Password</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Status</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="member in filteredMembers" :key="member.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" @click="openDetail(member)">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <img
                    v-if="member.photo || member.avatar"
                    :src="member.photo || member.avatar"
                    :alt="member.name"
                    class="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                  />
                  <div v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
                    {{ member.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{{ member.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400 font-mono text-xs">{{ member.nik || '-' }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">{{ member.phone }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                <span v-if="member.birthDate">{{ calculateAge(member.birthDate) }} th</span>
                <span v-else>-</span>
              </td>
              <td class="px-5 py-3.5">
                <span v-if="member.bloodType" class="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">{{ member.bloodType }}</span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-5 py-3.5" @click.stop>
                <div class="flex items-center gap-1">
                  <code class="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{{ visiblePasswords.has(member.id) ? member.password : maskPassword(member.password) }}</code>
                  <button @click="togglePasswordVisibility(member.id)" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" :title="visiblePasswords.has(member.id) ? 'Sembunyikan' : 'Lihat password'">
                    <svg v-if="visiblePasswords.has(member.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                </div>
              </td>
              <td class="px-5 py-3.5" @click.stop>
                <button v-if="canToggleActive" @click="toggleActive(member)" :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors',
                  member.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200']">
                  {{ member.isActive ? 'Aktif' : 'Nonaktif' }}
                </button>
                <span v-else :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  member.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
                  {{ member.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-5 py-3.5" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <button v-if="canResetPassword" @click="resetPassword(member)" class="btn-ghost btn-xs" title="Reset Password">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  </button>
                  <button @click="openEdit(member)" class="btn-ghost btn-xs" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button v-if="canDelete" @click="deleteUser(member)" class="btn-ghost btn-xs text-red-500 hover:text-red-700" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredMembers.length === 0">
              <td colspan="8" class="px-5 py-12 text-center text-gray-500 dark:text-gray-400">
                Tidak ada member ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700 px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
        Total: {{ filteredMembers.length }} member
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <ModalDialog v-model="showModal" :title="editingUser ? 'Edit Member' : 'Tambah Member Baru'" size="lg">
      <form @submit.prevent="save" class="space-y-5">
        <!-- Photo Upload / Camera Section -->
        <div class="pb-4 border-b border-gray-200 dark:border-gray-700">
          <PhotoCapture v-model="photoPreview" />
        </div>

        <!-- Data Pribadi -->
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
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

        <!-- Darurat & Catatan -->
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Kontak Darurat & Catatan Kesehatan
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
              <label class="label">Catatan Kesehatan / Medis</label>
              <textarea v-model="form.notes" class="input" rows="2" placeholder="Riwayat cedera, alergi, kondisi medis, dll."></textarea>
            </div>
          </div>
        </div>

        <div v-if="!editingUser" class="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            💡 Password akan di-generate otomatis setelah akun dibuat.
          </p>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingUser ? 'Simpan' : 'Buat Akun' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Member Detail Modal -->
    <ModalDialog v-model="showDetailModal" title="Detail Member" size="lg">
      <div v-if="detailUser" class="space-y-5">
        <!-- Profile Header -->
        <div class="flex items-center gap-5">
          <img
            v-if="detailUser.photo || detailUser.avatar"
            :src="detailUser.photo || detailUser.avatar"
            :alt="detailUser.name"
            class="h-20 w-20 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/30"
          />
          <div v-else class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-2xl font-bold">
            {{ detailUser.name.charAt(0) }}
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ detailUser.name }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ detailUser.email }}</p>
            <div class="mt-1.5 flex items-center gap-2">
              <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                detailUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
                {{ detailUser.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
              <span v-if="detailUser.bloodType" class="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">Gol. {{ detailUser.bloodType }}</span>
            </div>
          </div>
        </div>

        <!-- Info Grid -->
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

        <!-- Emergency Contact -->
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

        <!-- Health Notes -->
        <div v-if="detailUser.notes" class="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h4 class="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Catatan Kesehatan
          </h4>
          <p class="text-sm text-blue-900 dark:text-blue-300">{{ detailUser.notes }}</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <button v-if="detailUser" @click="showDetailModal = false; openEdit(detailUser)" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button @click="showDetailModal = false" class="btn-primary">Tutup</button>
        </div>
      </template>
    </ModalDialog>

    <!-- Password Modal -->
    <ModalDialog v-model="showPasswordModal" title="🔑 Akun Berhasil Dibuat" size="sm">
      <div class="text-center space-y-4">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Password untuk <strong>{{ generatedUserName }}</strong>:</p>
          <div class="mt-2 flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
            <code class="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">{{ generatedPassword }}</code>
            <button @click="copyPassword" class="rounded-lg p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Copy">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>
          <p class="mt-3 text-xs text-amber-600">⚠️ Simpan password ini, tidak bisa dilihat lagi!</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-center">
          <button @click="showPasswordModal = false" class="btn-primary">Tutup</button>
        </div>
      </template>
    </ModalDialog>

    <!-- Confirm Delete -->
    <ConfirmDialog v-model="showConfirm" :message="confirmMessage" @confirm="confirmDelete" />

    <!-- Confirm Reset Password -->
    <ConfirmDialog v-model="showResetConfirm" :message="resetConfirmMessage" variant="warning" confirm-text="Ya, Reset" @confirm="confirmResetPassword" />
  </div>
</template>
