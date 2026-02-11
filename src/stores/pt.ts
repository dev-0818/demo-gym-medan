import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PTPackage, PTSubscription, PTSubscriptionStatus } from '@/types'
import { generateId, nowISO } from '@/utils/helpers'

const defaultPTPackages: PTPackage[] = [
  {
    id: 'pt-pkg-001',
    name: '4 Sesi PT',
    sessions: 4,
    pricePerSession: 150000,
    totalPrice: 600000,
    description: 'Paket personal trainer 4 sesi, cocok untuk pemula',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'pt-pkg-002',
    name: '8 Sesi PT',
    sessions: 8,
    pricePerSession: 140000,
    totalPrice: 1120000,
    description: 'Paket personal trainer 8 sesi, paling populer',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'pt-pkg-003',
    name: '12 Sesi PT',
    sessions: 12,
    pricePerSession: 125000,
    totalPrice: 1500000,
    description: 'Paket personal trainer 12 sesi, hemat 17%',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'pt-pkg-004',
    name: '16 Sesi PT',
    sessions: 16,
    pricePerSession: 115000,
    totalPrice: 1840000,
    description: 'Paket personal trainer 16 sesi, hemat 23%',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'pt-pkg-005',
    name: '24 Sesi PT',
    sessions: 24,
    pricePerSession: 100000,
    totalPrice: 2400000,
    description: 'Paket personal trainer 24 sesi, harga terbaik!',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
]

const defaultPTSubscriptions: PTSubscription[] = [
  {
    id: 'pt-sub-001',
    memberId: 'u-member-002',
    trainerId: 'u-trainer-001',
    ptPackageId: 'pt-pkg-002',
    totalSessions: 8,
    usedSessions: 3,
    status: 'active',
    startDate: '2026-01-20',
    endDate: '2026-03-20',
    notes: 'Program diet & fitness',
    createdAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: 'pt-sub-002',
    memberId: 'u-member-005',
    trainerId: 'u-trainer-001',
    ptPackageId: 'pt-pkg-002',
    totalSessions: 8,
    usedSessions: 2,
    status: 'active',
    startDate: '2026-02-01',
    endDate: '2026-04-01',
    notes: 'Program bulking',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'pt-sub-003',
    memberId: 'u-member-006',
    trainerId: 'u-trainer-003',
    ptPackageId: 'pt-pkg-003',
    totalSessions: 12,
    usedSessions: 8,
    status: 'active',
    startDate: '2025-12-01',
    endDate: '2026-04-01',
    notes: 'Member VIP tahunan',
    createdAt: '2025-12-01T00:00:00.000Z',
  },
  {
    id: 'pt-sub-004',
    memberId: 'u-member-004',
    trainerId: 'u-trainer-002',
    ptPackageId: 'pt-pkg-001',
    totalSessions: 4,
    usedSessions: 4,
    status: 'completed',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

export const usePTStore = defineStore(
  'pt',
  () => {
    const ptPackages = ref<PTPackage[]>([...defaultPTPackages])
    const ptSubscriptions = ref<PTSubscription[]>([...defaultPTSubscriptions])
    const initialized = ref(false)

    function init() {
      if (!initialized.value) {
        ptPackages.value = [...defaultPTPackages]
        ptSubscriptions.value = [...defaultPTSubscriptions]
        initialized.value = true
      }
    }

    // --- PT Packages (Master) ---
    const activePTPackages = computed(() => ptPackages.value.filter((p) => p.isActive))

    function getPTPackageById(id: string): PTPackage | undefined {
      return ptPackages.value.find((p) => p.id === id)
    }

    function addPTPackage(data: Omit<PTPackage, 'id' | 'createdAt'>): PTPackage {
      const pkg: PTPackage = { ...data, id: generateId(), createdAt: nowISO() }
      ptPackages.value.push(pkg)
      return pkg
    }

    function updatePTPackage(id: string, data: Partial<PTPackage>) {
      const idx = ptPackages.value.findIndex((p) => p.id === id)
      if (idx !== -1) {
        ptPackages.value[idx] = { ...ptPackages.value[idx], ...data }
      }
    }

    function deletePTPackage(id: string) {
      ptPackages.value = ptPackages.value.filter((p) => p.id !== id)
    }

    // --- PT Subscriptions ---
    const activeSubscriptions = computed(() => ptSubscriptions.value.filter((s) => s.status === 'active'))

    function getSubscriptionById(id: string): PTSubscription | undefined {
      return ptSubscriptions.value.find((s) => s.id === id)
    }

    function getSubscriptionsByMember(memberId: string): PTSubscription[] {
      return ptSubscriptions.value.filter((s) => s.memberId === memberId)
    }

    function getActiveSubscriptionByMember(memberId: string): PTSubscription | undefined {
      return ptSubscriptions.value.find((s) => s.memberId === memberId && s.status === 'active')
    }

    function getSubscriptionsByTrainer(trainerId: string): PTSubscription[] {
      return ptSubscriptions.value.filter((s) => s.trainerId === trainerId)
    }

    function addSubscription(data: Omit<PTSubscription, 'id' | 'createdAt'>): PTSubscription {
      const sub: PTSubscription = { ...data, id: generateId(), createdAt: nowISO() }
      ptSubscriptions.value.push(sub)
      return sub
    }

    function updateSubscription(id: string, data: Partial<PTSubscription>) {
      const idx = ptSubscriptions.value.findIndex((s) => s.id === id)
      if (idx !== -1) {
        ptSubscriptions.value[idx] = { ...ptSubscriptions.value[idx], ...data }
      }
    }

    function addSession(id: string) {
      const sub = getSubscriptionById(id)
      if (sub && sub.usedSessions < sub.totalSessions) {
        sub.usedSessions++
        if (sub.usedSessions >= sub.totalSessions) {
          sub.status = 'completed'
        }
      }
    }

    function updateStatus(id: string, status: PTSubscriptionStatus) {
      updateSubscription(id, { status })
    }

    function deleteSubscription(id: string) {
      ptSubscriptions.value = ptSubscriptions.value.filter((s) => s.id !== id)
    }

    return {
      ptPackages,
      ptSubscriptions,
      activePTPackages,
      activeSubscriptions,
      init,
      getPTPackageById,
      addPTPackage,
      updatePTPackage,
      deletePTPackage,
      getSubscriptionById,
      getSubscriptionsByMember,
      getActiveSubscriptionByMember,
      getSubscriptionsByTrainer,
      addSubscription,
      updateSubscription,
      addSession,
      updateStatus,
      deleteSubscription,
    }
  },
  {
    persist: true,
  }
)
