import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Payment, PaymentMethod, PaymentStatus } from '@/types'
import { seedPayments } from '@/data/seed'
import { generateId, generateInvoiceNumber, nowISO } from '@/utils/helpers'

export const usePaymentStore = defineStore(
  'payments',
  () => {
    const payments = ref<Payment[]>([...seedPayments])
    const initialized = ref(false)

    function init() {
      if (!initialized.value) {
        payments.value = [...seedPayments]
        initialized.value = true
      }
    }

    const paidPayments = computed(() => payments.value.filter((p) => p.status === 'paid'))
    const pendingPayments = computed(() => payments.value.filter((p) => p.status === 'pending'))
    const overduePayments = computed(() => payments.value.filter((p) => p.status === 'overdue'))

    const totalRevenue = computed(() =>
      paidPayments.value.reduce((sum, p) => sum + p.amount, 0)
    )

    const monthlyRevenue = computed(() => {
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      return paidPayments.value
        .filter((p) => {
          const d = new Date(p.paidAt)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((sum, p) => sum + p.amount, 0)
    })

    function getRevenueByMonth(): { labels: string[]; values: number[] } {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
      const now = new Date()
      const labels: string[] = []
      const values: number[] = []

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = d.getMonth()
        const year = d.getFullYear()
        labels.push(`${monthNames[month]} ${year.toString().slice(-2)}`)

        const total = paidPayments.value
          .filter((p) => {
            const pd = new Date(p.paidAt)
            return pd.getMonth() === month && pd.getFullYear() === year
          })
          .reduce((sum, p) => sum + p.amount, 0)
        values.push(total)
      }

      return { labels, values }
    }

    function getPaymentById(id: string): Payment | undefined {
      return payments.value.find((p) => p.id === id)
    }

    function getPaymentsByMember(memberId: string): Payment[] {
      return payments.value.filter((p) => p.memberId === memberId)
    }

    function getPaymentsByMembership(membershipId: string): Payment[] {
      return payments.value.filter((p) => p.membershipId === membershipId)
    }

    function addPayment(data: Omit<Payment, 'id' | 'invoiceNumber' | 'createdAt'>): Payment {
      const payment: Payment = {
        ...data,
        id: generateId(),
        invoiceNumber: generateInvoiceNumber(),
        createdAt: nowISO(),
      }
      payments.value.push(payment)
      return payment
    }

    function updatePayment(id: string, data: Partial<Payment>) {
      const idx = payments.value.findIndex((p) => p.id === id)
      if (idx !== -1) {
        payments.value[idx] = { ...payments.value[idx], ...data }
      }
    }

    function deletePayment(id: string) {
      payments.value = payments.value.filter((p) => p.id !== id)
    }

    return {
      payments,
      paidPayments,
      pendingPayments,
      overduePayments,
      totalRevenue,
      monthlyRevenue,
      init,
      getRevenueByMonth,
      getPaymentById,
      getPaymentsByMember,
      getPaymentsByMembership,
      addPayment,
      updatePayment,
      deletePayment,
    }
  },
  {
    persist: true,
  }
)
