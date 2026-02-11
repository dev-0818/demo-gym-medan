import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GymClass, ClassSchedule, ClassCategory, DayOfWeek } from '@/types'
import { generateId, nowISO } from '@/utils/helpers'

const defaultClasses: GymClass[] = [
  // Cardio
  { id: 'cls-zumba', name: 'Zumba', category: 'cardio', description: 'Olahraga kardio berbasis tarian Latin yang menyenangkan', isActive: true },
  { id: 'cls-spinning', name: 'Spinning', category: 'cardio', description: 'Latihan sepeda statis intensitas tinggi', isActive: true },
  { id: 'cls-aerobik', name: 'Aerobik', category: 'cardio', description: 'Gerakan aerobik untuk meningkatkan stamina dan kebugaran', isActive: true },
  // Strength Training
  { id: 'cls-bodypump', name: 'Body Pump', category: 'strength', description: 'Latihan beban dengan barbel untuk seluruh tubuh', isActive: true },
  { id: 'cls-crossfit', name: 'CrossFit', category: 'strength', description: 'Program latihan fungsional intensitas tinggi', isActive: true },
  { id: 'cls-kettlebell', name: 'Kettlebell', category: 'strength', description: 'Latihan kekuatan menggunakan kettlebell', isActive: true },
  // Functional/HIIT
  { id: 'cls-trx', name: 'TRX', category: 'functional', description: 'Suspension training untuk kekuatan dan stabilitas', isActive: true },
  { id: 'cls-bootcamp', name: 'Bootcamp', category: 'functional', description: 'Latihan HIIT gabungan kardio dan kekuatan', isActive: true },
  // Mind & Body
  { id: 'cls-yoga', name: 'Yoga', category: 'mind-body', description: 'Latihan fleksibilitas, kekuatan, dan ketenangan pikiran', isActive: true },
  { id: 'cls-pilates', name: 'Pilates', category: 'mind-body', description: 'Latihan core, postur, dan fleksibilitas', isActive: true },
  { id: 'cls-bodybalance', name: 'Body Balance', category: 'mind-body', description: 'Kombinasi Yoga, Tai Chi, dan Pilates', isActive: true },
]

export const useClassScheduleStore = defineStore(
  'classSchedules',
  () => {
    const gymClasses = ref<GymClass[]>([...defaultClasses])
    const schedules = ref<ClassSchedule[]>([])

    // Getters
    const activeClasses = computed(() => gymClasses.value.filter((c) => c.isActive))

    const activeSchedules = computed(() => schedules.value.filter((s) => s.isActive))

    const classesByCategory = computed(() => {
      const map: Record<ClassCategory, GymClass[]> = {
        'cardio': [],
        'strength': [],
        'functional': [],
        'mind-body': [],
      }
      for (const c of activeClasses.value) {
        map[c.category].push(c)
      }
      return map
    })

    function getSchedulesByDay(day: DayOfWeek): ClassSchedule[] {
      return activeSchedules.value
        .filter((s) => s.day === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }

    function getSchedulesByClass(classId: string): ClassSchedule[] {
      return activeSchedules.value.filter((s) => s.classId === classId)
    }

    function getClassById(id: string): GymClass | undefined {
      return gymClasses.value.find((c) => c.id === id)
    }

    function getScheduleById(id: string): ClassSchedule | undefined {
      return schedules.value.find((s) => s.id === id)
    }

    // Actions
    function addClass(data: Omit<GymClass, 'id'>): GymClass {
      const gymClass: GymClass = { id: generateId(), ...data }
      gymClasses.value.push(gymClass)
      return gymClass
    }

    function updateClass(id: string, data: Partial<GymClass>) {
      const idx = gymClasses.value.findIndex((c) => c.id === id)
      if (idx !== -1) {
        gymClasses.value[idx] = { ...gymClasses.value[idx], ...data }
      }
    }

    function deleteClass(id: string) {
      gymClasses.value = gymClasses.value.filter((c) => c.id !== id)
      // Also remove related schedules
      schedules.value = schedules.value.filter((s) => s.classId !== id)
    }

    function addSchedule(data: Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'>): ClassSchedule {
      const schedule: ClassSchedule = {
        id: generateId(),
        ...data,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      schedules.value.push(schedule)
      return schedule
    }

    function updateSchedule(id: string, data: Partial<ClassSchedule>) {
      const idx = schedules.value.findIndex((s) => s.id === id)
      if (idx !== -1) {
        schedules.value[idx] = { ...schedules.value[idx], ...data, updatedAt: nowISO() }
      }
    }

    function deleteSchedule(id: string) {
      schedules.value = schedules.value.filter((s) => s.id !== id)
    }

    // Initialize default classes if empty
    function ensureDefaults() {
      if (gymClasses.value.length === 0) {
        gymClasses.value = [...defaultClasses]
      }
    }

    ensureDefaults()

    return {
      gymClasses,
      schedules,
      activeClasses,
      activeSchedules,
      classesByCategory,
      getSchedulesByDay,
      getSchedulesByClass,
      getClassById,
      getScheduleById,
      addClass,
      updateClass,
      deleteClass,
      addSchedule,
      updateSchedule,
      deleteSchedule,
    }
  },
  { persist: true }
)
