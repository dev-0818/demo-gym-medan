import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CheckIn } from '@/types'
import { generateId, nowISO } from '@/utils/helpers'

export const useCheckInStore = defineStore(
  'checkins',
  () => {
    const checkins = ref<CheckIn[]>([])

    const todayCheckins = computed(() => {
      const today = new Date().toISOString().slice(0, 10)
      return checkins.value.filter((c) => c.checkInTime.slice(0, 10) === today)
    })

    const activeCheckins = computed(() => {
      const today = new Date().toISOString().slice(0, 10)
      return checkins.value.filter(
        (c) => c.checkInTime.slice(0, 10) === today && !c.checkOutTime
      )
    })

    function checkIn(data: { memberId: string; memberName: string; notes?: string }): CheckIn {
      // Check if already checked in today without checkout
      const existing = activeCheckins.value.find((c) => c.memberId === data.memberId)
      if (existing) {
        throw new Error('Member sudah check-in hari ini')
      }

      const checkin: CheckIn = {
        id: generateId(),
        memberId: data.memberId,
        memberName: data.memberName,
        checkInTime: nowISO(),
        notes: data.notes || '',
      }
      checkins.value.unshift(checkin)
      return checkin
    }

    function checkOut(checkinId: string) {
      const idx = checkins.value.findIndex((c) => c.id === checkinId)
      if (idx !== -1) {
        checkins.value[idx] = { ...checkins.value[idx], checkOutTime: nowISO() }
      }
    }

    function getCheckinsByDate(date: string): CheckIn[] {
      return checkins.value.filter((c) => c.checkInTime.slice(0, 10) === date)
    }

    function getCheckinsByMember(memberId: string): CheckIn[] {
      return checkins.value.filter((c) => c.memberId === memberId)
    }

    function isCheckedInToday(memberId: string): boolean {
      return activeCheckins.value.some((c) => c.memberId === memberId)
    }

    return {
      checkins,
      todayCheckins,
      activeCheckins,
      checkIn,
      checkOut,
      getCheckinsByDate,
      getCheckinsByMember,
      isCheckedInToday,
    }
  },
  {
    persist: true,
  }
)
