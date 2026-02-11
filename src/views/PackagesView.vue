<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { usePackageStore } from '@/stores/packages'
import { useActivityLogStore } from '@/stores/activityLog'
import type { GymPackage } from '@/types'
import { formatCurrency } from '@/utils/helpers'
import { usePermissions } from '@/composables/usePermissions'

const packageStore = usePackageStore()
const logStore = useActivityLogStore()
const { canManagePackages, canDelete } = usePermissions()
const showModal = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const pendingDeleteId = ref('')
const editingPkg = ref<GymPackage | null>(null)

const form = reactive({
  name: '',
  description: '',
  durationDays: 30,
  price: 0,
  features: '',
  isActive: true,
})

function openAdd() {
  editingPkg.value = null
  Object.assign(form, { name: '', description: '', durationDays: 30, price: 0, features: '', isActive: true })
  showModal.value = true
}

function openEdit(pkg: GymPackage) {
  editingPkg.value = pkg
  Object.assign(form, {
    name: pkg.name,
    description: pkg.description,
    durationDays: pkg.durationDays,
    price: pkg.price,
    features: pkg.features.join(', '),
    isActive: pkg.isActive,
  })
  showModal.value = true
}

function save() {
  const features = form.features.split(',').map((f) => f.trim()).filter(Boolean)
  if (editingPkg.value) {
    packageStore.updatePackage(editingPkg.value.id, { ...form, features })
    logStore.addLog({ action: 'update', targetType: 'package', targetId: editingPkg.value.id, targetName: form.name, details: `Mengupdate paket "${form.name}"` })
  } else {
    const newPkg = packageStore.addPackage({ ...form, features })
    logStore.addLog({ action: 'create', targetType: 'package', targetId: newPkg.id, targetName: form.name, details: `Menambahkan paket baru "${form.name}"` })
  }
  showModal.value = false
}

function deletePkg(pkg: GymPackage) {
  confirmMessage.value = `Yakin hapus paket "${pkg.name}"? Data yang sudah dihapus tidak bisa dikembalikan.`
  pendingDeleteId.value = pkg.id
  showConfirm.value = true
}

function confirmDelete() {
  const pkg = packageStore.packages.find((p) => p.id === pendingDeleteId.value)
  logStore.addLog({ action: 'delete', targetType: 'package', targetId: pendingDeleteId.value, targetName: pkg?.name || '', details: `Menghapus paket "${pkg?.name || ''}"` })
  packageStore.deletePackage(pendingDeleteId.value)
}

function getDurationLabel(days: number): string {
  if (days === 1) return '1 Hari'
  if (days === 7) return '1 Minggu'
  if (days === 30) return '1 Bulan'
  if (days === 90) return '3 Bulan'
  if (days === 365) return '1 Tahun'
  return `${days} Hari`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Paket GYM</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Kelola paket membership</p>
      </div>
      <button v-if="canManagePackages" @click="openAdd" class="btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Tambah Paket
      </button>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="pkg in packageStore.packages" :key="pkg.id"
        :class="['card overflow-hidden transition-shadow hover:shadow-md', !pkg.isActive && 'opacity-60']">
        <div class="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 text-white">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">{{ pkg.name }}</h3>
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', pkg.isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white']">
              {{ pkg.isActive ? getDurationLabel(pkg.durationDays) : 'Nonaktif' }}
            </span>
          </div>
          <p class="mt-1 text-2xl font-bold">{{ formatCurrency(pkg.price) }}</p>
        </div>
        <div class="p-5">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{{ pkg.description }}</p>
          <ul class="space-y-1.5">
            <li v-for="feature in pkg.features" :key="feature" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              {{ feature }}
            </li>
          </ul>
          <div v-if="canManagePackages" class="mt-4 flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button @click="openEdit(pkg)" class="btn-secondary btn-sm flex-1 gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button @click="deletePkg(pkg)" class="btn-ghost btn-sm text-red-500 hover:text-red-700" title="Hapus">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <ModalDialog v-model="showModal" :title="editingPkg ? 'Edit Paket' : 'Tambah Paket Baru'">
      <form @submit.prevent="save" class="space-y-4">
        <div><label class="label">Nama Paket</label><input v-model="form.name" type="text" class="input" required /></div>
        <div><label class="label">Deskripsi</label><textarea v-model="form.description" class="input" rows="2"></textarea></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="label">Durasi (hari)</label><input v-model.number="form.durationDays" type="number" class="input" min="1" required /></div>
          <div><label class="label">Harga (Rp)</label><input v-model.number="form.price" type="number" class="input" min="0" required /></div>
        </div>
        <div>
          <label class="label">Fitur (pisahkan dengan koma)</label>
          <textarea v-model="form.features" class="input" rows="3" placeholder="Akses semua alat, Locker, Handuk, dll"></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.isActive" id="pkg-active" class="rounded border-gray-300 text-primary-600" />
          <label for="pkg-active" class="text-sm text-gray-700 dark:text-gray-300">Paket Aktif</label>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingPkg ? 'Simpan' : 'Tambah Paket' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Confirm Delete -->
    <ConfirmDialog v-model="showConfirm" :message="confirmMessage" @confirm="confirmDelete" />
  </div>
</template>
