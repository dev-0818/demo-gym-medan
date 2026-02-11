<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useClassScheduleStore } from '@/stores/classSchedules'
import { useUserStore } from '@/stores/users'
import { useActivityLogStore } from '@/stores/activityLog'
import { usePermissions } from '@/composables/usePermissions'
import type { ClassSchedule, ClassCategory, DayOfWeek, GymClass } from '@/types'

const classStore = useClassScheduleStore()
const userStore = useUserStore()
const logStore = useActivityLogStore()
const { canManageClasses, canDelete } = usePermissions()

// View mode: 'weekly' or 'classes'
const viewMode = ref<'weekly' | 'classes'>('weekly')
const selectedDay = ref<DayOfWeek>('monday')
const selectedCategory = ref<ClassCategory | 'all'>('all')

// Schedule modal
const showScheduleModal = ref(false)
const editingSchedule = ref<ClassSchedule | null>(null)
const scheduleForm = reactive({
  classId: '',
  trainerId: '',
  day: 'monday' as DayOfWeek,
  startTime: '08:00',
  endTime: '09:00',
  maxParticipants: 20,
  room: '',
})

// Class modal
const showClassModal = ref(false)
const editingClass = ref<GymClass | null>(null)
const classForm = reactive({
  name: '',
  category: 'cardio' as ClassCategory,
  description: '',
})

// Confirm
const showConfirm = ref(false)
const confirmMessage = ref('')
const pendingDeleteType = ref<'schedule' | 'class'>('schedule')
const pendingDeleteId = ref('')

const days: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Senin', short: 'Sen' },
  { key: 'tuesday', label: 'Selasa', short: 'Sel' },
  { key: 'wednesday', label: 'Rabu', short: 'Rab' },
  { key: 'thursday', label: 'Kamis', short: 'Kam' },
  { key: 'friday', label: 'Jumat', short: 'Jum' },
  { key: 'saturday', label: 'Sabtu', short: 'Sab' },
  { key: 'sunday', label: 'Minggu', short: 'Min' },
]

const categories: { key: ClassCategory; label: string; color: string; bg: string }[] = [
  { key: 'cardio', label: 'Cardio', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  { key: 'strength', label: 'Strength Training', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { key: 'functional', label: 'Functional / HIIT', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { key: 'mind-body', label: 'Mind & Body', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
]

const filteredClasses = computed(() => {
  if (selectedCategory.value === 'all') return classStore.activeClasses
  return classStore.activeClasses.filter((c) => c.category === selectedCategory.value)
})

const daySchedules = computed(() => classStore.getSchedulesByDay(selectedDay.value))

function getCategoryInfo(cat: ClassCategory) {
  return categories.find((c) => c.key === cat) || categories[0]
}

function getCategoryLabel(cat: ClassCategory) {
  return getCategoryInfo(cat).label
}

function getCategoryColor(cat: ClassCategory) {
  const info = getCategoryInfo(cat)
  return `${info.bg} ${info.color}`
}

function getClassName(classId: string): string {
  return classStore.getClassById(classId)?.name || '-'
}

function getClassCategory(classId: string): ClassCategory {
  return classStore.getClassById(classId)?.category || 'cardio'
}

function getTrainerName(trainerId?: string): string {
  if (!trainerId) return '-'
  return userStore.getUserById(trainerId)?.name || '-'
}

function getDayLabel(day: DayOfWeek): string {
  return days.find((d) => d.key === day)?.label || day
}

// Schedule CRUD
function openAddSchedule() {
  editingSchedule.value = null
  Object.assign(scheduleForm, {
    classId: classStore.activeClasses[0]?.id || '',
    trainerId: '',
    day: selectedDay.value,
    startTime: '08:00',
    endTime: '09:00',
    maxParticipants: 20,
    room: '',
  })
  showScheduleModal.value = true
}

function openEditSchedule(schedule: ClassSchedule) {
  editingSchedule.value = schedule
  Object.assign(scheduleForm, {
    classId: schedule.classId,
    trainerId: schedule.trainerId || '',
    day: schedule.day,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    maxParticipants: schedule.maxParticipants,
    room: schedule.room,
  })
  showScheduleModal.value = true
}

function saveSchedule() {
  if (editingSchedule.value) {
    classStore.updateSchedule(editingSchedule.value.id, { ...scheduleForm, trainerId: scheduleForm.trainerId || undefined })
    logStore.addLog({ action: 'update', targetType: 'class_schedule', targetId: editingSchedule.value.id, targetName: getClassName(scheduleForm.classId), details: `Mengupdate jadwal ${getClassName(scheduleForm.classId)} hari ${getDayLabel(scheduleForm.day)}` })
  } else {
    const result = classStore.addSchedule({ ...scheduleForm, trainerId: scheduleForm.trainerId || undefined, isActive: true })
    logStore.addLog({ action: 'create', targetType: 'class_schedule', targetId: result.id, targetName: getClassName(scheduleForm.classId), details: `Menambahkan jadwal ${getClassName(scheduleForm.classId)} hari ${getDayLabel(scheduleForm.day)} ${scheduleForm.startTime}-${scheduleForm.endTime}` })
  }
  showScheduleModal.value = false
}

function deleteSchedule(schedule: ClassSchedule) {
  confirmMessage.value = `Yakin hapus jadwal "${getClassName(schedule.classId)}" hari ${getDayLabel(schedule.day)} ${schedule.startTime}-${schedule.endTime}?`
  pendingDeleteType.value = 'schedule'
  pendingDeleteId.value = schedule.id
  showConfirm.value = true
}

// Class CRUD
function openAddClass() {
  editingClass.value = null
  Object.assign(classForm, { name: '', category: 'cardio', description: '' })
  showClassModal.value = true
}

function openEditClass(gymClass: GymClass) {
  editingClass.value = gymClass
  Object.assign(classForm, { name: gymClass.name, category: gymClass.category, description: gymClass.description })
  showClassModal.value = true
}

function saveClass() {
  if (editingClass.value) {
    classStore.updateClass(editingClass.value.id, { ...classForm })
    logStore.addLog({ action: 'update', targetType: 'gym_class', targetId: editingClass.value.id, targetName: classForm.name, details: `Mengupdate kelas "${classForm.name}"` })
  } else {
    const result = classStore.addClass({ ...classForm, isActive: true })
    logStore.addLog({ action: 'create', targetType: 'gym_class', targetId: result.id, targetName: classForm.name, details: `Menambahkan kelas baru "${classForm.name}" (${getCategoryLabel(classForm.category)})` })
  }
  showClassModal.value = false
}

function deleteClass(gymClass: GymClass) {
  confirmMessage.value = `Yakin hapus kelas "${gymClass.name}"? Semua jadwal terkait juga akan dihapus.`
  pendingDeleteType.value = 'class'
  pendingDeleteId.value = gymClass.id
  showConfirm.value = true
}

function confirmDeleteAction() {
  if (pendingDeleteType.value === 'schedule') {
    const schedule = classStore.getScheduleById(pendingDeleteId.value)
    classStore.deleteSchedule(pendingDeleteId.value)
    if (schedule) {
      logStore.addLog({ action: 'delete', targetType: 'class_schedule', targetId: pendingDeleteId.value, targetName: getClassName(schedule.classId), details: `Menghapus jadwal ${getClassName(schedule.classId)}` })
    }
  } else {
    const gymClass = classStore.getClassById(pendingDeleteId.value)
    classStore.deleteClass(pendingDeleteId.value)
    if (gymClass) {
      logStore.addLog({ action: 'delete', targetType: 'gym_class', targetId: pendingDeleteId.value, targetName: gymClass.name, details: `Menghapus kelas "${gymClass.name}" dan semua jadwalnya` })
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Jadwal Kelas</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Kelola jadwal kelas gym mingguan</p>
      </div>
      <div class="flex gap-2">
        <button v-if="canManageClasses" @click="openAddClass" class="btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          Kelas Baru
        </button>
        <button v-if="canManageClasses" @click="openAddSchedule" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          Tambah Jadwal
        </button>
      </div>
    </div>

    <!-- View mode toggle -->
    <div class="card p-2 flex gap-1">
      <button @click="viewMode = 'weekly'" :class="['flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors', viewMode === 'weekly' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700']">
        <svg xmlns="http://www.w3.org/2000/svg" class="inline h-4 w-4 mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Jadwal Mingguan
      </button>
      <button @click="viewMode = 'classes'" :class="['flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors', viewMode === 'classes' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700']">
        <svg xmlns="http://www.w3.org/2000/svg" class="inline h-4 w-4 mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        Daftar Kelas
      </button>
    </div>

    <!-- WEEKLY VIEW -->
    <div v-if="viewMode === 'weekly'" class="space-y-4">
      <!-- Day tabs -->
      <div class="flex gap-1 overflow-x-auto pb-1">
        <button v-for="d in days" :key="d.key" @click="selectedDay = d.key"
          :class="['shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all', selectedDay === d.key ? 'bg-primary-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700']">
          <span class="hidden sm:inline">{{ d.label }}</span>
          <span class="sm:hidden">{{ d.short }}</span>
        </button>
      </div>

      <!-- Schedule cards for selected day -->
      <div v-if="daySchedules.length > 0" class="space-y-3">
        <div v-for="schedule in daySchedules" :key="schedule.id"
          class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start gap-4">
            <!-- Time column -->
            <div class="shrink-0 text-center w-20">
              <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ schedule.startTime }}</p>
              <p class="text-xs text-gray-400">sampai</p>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ schedule.endTime }}</p>
            </div>

            <div class="h-16 w-px bg-gray-200 dark:bg-gray-700 shrink-0"></div>

            <!-- Class info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ getClassName(schedule.classId) }}</h3>
                  <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide mt-1', getCategoryColor(getClassCategory(schedule.classId))]">
                    {{ getCategoryLabel(getClassCategory(schedule.classId)) }}
                  </span>
                </div>
                <div v-if="canManageClasses" class="flex gap-1 shrink-0">
                  <button @click="openEditSchedule(schedule)" class="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button v-if="canDelete" @click="deleteSchedule(schedule)" class="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                <span class="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {{ getTrainerName(schedule.trainerId) }}
                </span>
                <span v-if="schedule.room" class="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  {{ schedule.room }}
                </span>
                <span class="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Max {{ schedule.maxParticipants }} orang
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="card p-12 text-center">
        <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Belum ada jadwal untuk hari {{ getDayLabel(selectedDay) }}</p>
        <button v-if="canManageClasses" @click="openAddSchedule" class="btn-primary mt-4">Tambah Jadwal</button>
      </div>
    </div>

    <!-- CLASSES VIEW -->
    <div v-if="viewMode === 'classes'" class="space-y-4">
      <!-- Category filter -->
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button @click="selectedCategory = 'all'"
          :class="['shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border', selectedCategory === 'all' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700']">
          Semua
        </button>
        <button v-for="cat in categories" :key="cat.key" @click="selectedCategory = cat.key"
          :class="['shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border', selectedCategory === cat.key ? `${cat.bg} ${cat.color} border-transparent font-semibold` : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700']">
          {{ cat.label }}
        </button>
      </div>

      <!-- Class cards grouped by category -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="gymClass in filteredClasses" :key="gymClass.id" class="card p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ gymClass.name }}</h3>
              <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide mt-1', getCategoryColor(gymClass.category)]">
                {{ getCategoryLabel(gymClass.category) }}
              </span>
            </div>
            <div v-if="canManageClasses" class="flex gap-1">
              <button @click="openEditClass(gymClass)" class="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button v-if="canDelete" @click="deleteClass(gymClass)" class="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="Hapus">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ gymClass.description }}</p>

          <!-- Related schedules -->
          <div class="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Jadwal</p>
            <div v-if="classStore.getSchedulesByClass(gymClass.id).length > 0" class="space-y-1.5">
              <div v-for="s in classStore.getSchedulesByClass(gymClass.id)" :key="s.id"
                class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-xs">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ getDayLabel(s.day) }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ s.startTime }} - {{ s.endTime }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400 italic">Belum ada jadwal</p>
          </div>
        </div>
      </div>

      <div v-if="filteredClasses.length === 0" class="card p-12 text-center text-gray-500 dark:text-gray-400">
        Tidak ada kelas ditemukan.
      </div>
    </div>

    <!-- Schedule Modal -->
    <ModalDialog v-model="showScheduleModal" :title="editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal Baru'">
      <form @submit.prevent="saveSchedule" class="space-y-4">
        <div>
          <label class="label">Kelas <span class="text-red-500">*</span></label>
          <select v-model="scheduleForm.classId" class="select" required>
            <option value="" disabled>Pilih kelas...</option>
            <optgroup v-for="cat in categories" :key="cat.key" :label="cat.label">
              <option v-for="cls in classStore.activeClasses.filter(c => c.category === cat.key)" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </option>
            </optgroup>
          </select>
        </div>
        <div>
          <label class="label">Hari <span class="text-red-500">*</span></label>
          <select v-model="scheduleForm.day" class="select" required>
            <option v-for="d in days" :key="d.key" :value="d.key">{{ d.label }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Jam Mulai <span class="text-red-500">*</span></label>
            <input v-model="scheduleForm.startTime" type="time" class="input" required />
          </div>
          <div>
            <label class="label">Jam Selesai <span class="text-red-500">*</span></label>
            <input v-model="scheduleForm.endTime" type="time" class="input" required />
          </div>
        </div>
        <div>
          <label class="label">Trainer</label>
          <select v-model="scheduleForm.trainerId" class="select">
            <option value="">Tanpa trainer</option>
            <option v-for="t in userStore.trainers.filter(t => t.isActive)" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Ruangan</label>
            <input v-model="scheduleForm.room" type="text" class="input" placeholder="Misal: Studio A" />
          </div>
          <div>
            <label class="label">Maks. Peserta</label>
            <input v-model.number="scheduleForm.maxParticipants" type="number" class="input" min="1" max="100" />
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showScheduleModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingSchedule ? 'Simpan' : 'Tambah' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Class Modal -->
    <ModalDialog v-model="showClassModal" :title="editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'">
      <form @submit.prevent="saveClass" class="space-y-4">
        <div>
          <label class="label">Nama Kelas <span class="text-red-500">*</span></label>
          <input v-model="classForm.name" type="text" class="input" placeholder="Misal: Zumba, CrossFit..." required />
        </div>
        <div>
          <label class="label">Kategori <span class="text-red-500">*</span></label>
          <select v-model="classForm.category" class="select" required>
            <option v-for="cat in categories" :key="cat.key" :value="cat.key">{{ cat.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">Deskripsi</label>
          <textarea v-model="classForm.description" class="input" rows="3" placeholder="Deskripsi singkat kelas..."></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showClassModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">{{ editingClass ? 'Simpan' : 'Tambah' }}</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Confirm -->
    <ConfirmDialog v-model="showConfirm" :message="confirmMessage" @confirm="confirmDeleteAction" />
  </div>
</template>
