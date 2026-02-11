import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ActivityLog, ActivityAction, UserRole } from '@/types'
import { generateId, nowISO } from '@/utils/helpers'
import { useAuthStore } from '@/stores/auth'

export const useActivityLogStore = defineStore(
  'activityLog',
  () => {
    const logs = ref<ActivityLog[]>([])

    function addLog(data: {
      action: ActivityAction
      targetType: string
      targetId: string
      targetName: string
      details: string
    }) {
      const authStore = useAuthStore()
      const log: ActivityLog = {
        id: generateId(),
        userId: authStore.currentUser?.id || '',
        userName: authStore.currentUser?.name || 'System',
        userRole: (authStore.currentUser?.role as UserRole) || 'admin',
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName,
        details: data.details,
        timestamp: nowISO(),
      }
      logs.value.unshift(log) // newest first
    }

    const recentLogs = computed(() => logs.value.slice(0, 50))

    const todayLogs = computed(() => {
      const today = new Date().toISOString().slice(0, 10)
      return logs.value.filter((l) => l.timestamp.slice(0, 10) === today)
    })

    function getLogsByDate(date: string): ActivityLog[] {
      return logs.value.filter((l) => l.timestamp.slice(0, 10) === date)
    }

    function getLogsByUser(userId: string): ActivityLog[] {
      return logs.value.filter((l) => l.userId === userId)
    }

    function getLogsByAction(action: ActivityAction): ActivityLog[] {
      return logs.value.filter((l) => l.action === action)
    }

    function clearLogs() {
      logs.value = []
    }

    return {
      logs,
      recentLogs,
      todayLogs,
      addLog,
      getLogsByDate,
      getLogsByUser,
      getLogsByAction,
      clearLogs,
    }
  },
  {
    persist: true,
  }
)
