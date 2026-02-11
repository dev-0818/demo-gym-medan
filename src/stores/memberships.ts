import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Membership, MembershipStatus } from '@/types'
import { seedMemberships } from '@/data/seed'
import { generateId, nowISO, addDays, daysRemaining } from '@/utils/helpers'

export const useMembershipStore = defineStore(
  'memberships',
  () => {
    const memberships = ref<Membership[]>([...seedMemberships])
    const initialized = ref(false)

    function init() {
      if (!initialized.value) {
        memberships.value = [...seedMemberships]
        initialized.value = true
      }
    }

    const activeMemberships = computed(() => memberships.value.filter((m) => m.status === 'active'))
    const expiredMemberships = computed(() => memberships.value.filter((m) => m.status === 'expired'))
    const expiringMemberships = computed(() =>
      activeMemberships.value.filter((m) => {
        const days = daysRemaining(m.endDate)
        return days >= 0 && days <= 7
      })
    )

    function getMembershipById(id: string): Membership | undefined {
      return memberships.value.find((m) => m.id === id)
    }

    function getMembershipsByMember(memberId: string): Membership[] {
      return memberships.value.filter((m) => m.memberId === memberId)
    }

    function getActiveMembershipByMember(memberId: string): Membership | undefined {
      return memberships.value.find((m) => m.memberId === memberId && m.status === 'active')
    }

    function addMembership(data: Omit<Membership, 'id' | 'createdAt'>): Membership {
      const membership: Membership = {
        ...data,
        id: generateId(),
        createdAt: nowISO(),
      }
      memberships.value.push(membership)
      return membership
    }

    function updateMembership(id: string, data: Partial<Membership>) {
      const idx = memberships.value.findIndex((m) => m.id === id)
      if (idx !== -1) {
        memberships.value[idx] = { ...memberships.value[idx], ...data }
      }
    }

    function updateStatus(id: string, status: MembershipStatus) {
      updateMembership(id, { status })
    }

    function deleteMembership(id: string) {
      memberships.value = memberships.value.filter((m) => m.id !== id)
    }

    return {
      memberships,
      activeMemberships,
      expiredMemberships,
      expiringMemberships,
      init,
      getMembershipById,
      getMembershipsByMember,
      getActiveMembershipByMember,
      addMembership,
      updateMembership,
      updateStatus,
      deleteMembership,
    }
  },
  {
    persist: true,
  }
)
