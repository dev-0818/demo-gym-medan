<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import ModalDialog from '@/components/ModalDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useUserStore } from '@/stores/users'
import { useMembershipStore } from '@/stores/memberships'
import { usePaymentStore } from '@/stores/payments'
import { useActivityLogStore } from '@/stores/activityLog'
import type { Payment, PaymentMethod, PaymentStatus } from '@/types'
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getPaymentMethodLabel, nowISO } from '@/utils/helpers'
import { usePermissions } from '@/composables/usePermissions'

const userStore = useUserStore()
const logStore = useActivityLogStore()
const membershipStore = useMembershipStore()
const paymentStore = usePaymentStore()
const { canDelete } = usePermissions()

const search = ref('')
const filterStatus = ref<string>('all')
const filterMethod = ref<string>('all')
const showModal = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const pendingDeleteId = ref('')
const editingPayment = ref<Payment | null>(null)
const showDetail = ref(false)
const selectedPayment = ref<Payment | null>(null)

const form = reactive({
  memberId: '',
  membershipId: '',
  amount: 0,
  method: 'cash' as PaymentMethod,
  status: 'paid' as PaymentStatus,
  notes: '',
  paidAt: nowISO().slice(0, 16),
})

const filteredPayments = computed(() => {
  let result = [...paymentStore.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (filterStatus.value !== 'all') result = result.filter((p) => p.status === filterStatus.value)
  if (filterMethod.value !== 'all') result = result.filter((p) => p.method === filterMethod.value)
  const q = search.value.toLowerCase()
  if (q) {
    result = result.filter((p) => {
      const member = userStore.getUserById(p.memberId)
      return member?.name.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q)
    })
  }
  return result
})

const memberMemberships = computed(() => {
  if (!form.memberId) return []
  return membershipStore.getMembershipsByMember(form.memberId)
})

function getMemberName(id: string) { return userStore.getUserById(id)?.name || '-' }

function openAdd() {
  editingPayment.value = null
  Object.assign(form, { memberId: '', membershipId: '', amount: 0, method: 'cash', status: 'paid', notes: '', paidAt: nowISO().slice(0, 16) })
  showModal.value = true
}

function openDetail(payment: Payment) {
  selectedPayment.value = payment
  showDetail.value = true
}

function save() {
  const memberName = userStore.getUserById(form.memberId)?.name || 'member'
  if (editingPayment.value) {
    paymentStore.updatePayment(editingPayment.value.id, { ...form, paidAt: new Date(form.paidAt).toISOString() })
    logStore.addLog({ action: 'update', targetType: 'payment', targetId: editingPayment.value.id, targetName: memberName, details: `Mengupdate pembayaran ${editingPayment.value.invoiceNumber} (${memberName})` })
  } else {
    const newPayment = paymentStore.addPayment({ ...form, paidAt: new Date(form.paidAt).toISOString() })
    logStore.addLog({ action: 'create', targetType: 'payment', targetId: newPayment.id, targetName: memberName, details: `Menambahkan pembayaran baru untuk "${memberName}"` })
  }
  showModal.value = false
}

function deletePayment(payment: Payment) {
  const memberName = userStore.getUserById(payment.memberId)?.name || 'member'
  confirmMessage.value = `Yakin hapus pembayaran ${payment.invoiceNumber} (${memberName})? Data yang sudah dihapus tidak bisa dikembalikan.`
  pendingDeleteId.value = payment.id
  showConfirm.value = true
}

function confirmDelete() {
  const payment = paymentStore.payments.find((p) => p.id === pendingDeleteId.value)
  const memberName = payment ? (userStore.getUserById(payment.memberId)?.name || 'member') : 'member'
  logStore.addLog({ action: 'delete', targetType: 'payment', targetId: pendingDeleteId.value, targetName: memberName, details: `Menghapus pembayaran ${payment?.invoiceNumber || ''} (${memberName})` })
  paymentStore.deletePayment(pendingDeleteId.value)
}

const totalFiltered = computed(() => filteredPayments.value.reduce((sum, p) => sum + p.amount, 0))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Pembayaran</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Kelola pembayaran dan riwayat transaksi</p>
      </div>
      <button @click="openAdd" class="btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Input Pembayaran
      </button>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="card p-4 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Transaksi</p>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ filteredPayments.length }}</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Nilai</p>
        <p class="text-xl font-bold text-emerald-600">{{ formatCurrency(totalFiltered) }}</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Pending</p>
        <p class="text-xl font-bold text-amber-600">{{ paymentStore.pendingPayments.length }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="flex flex-col gap-3 sm:flex-row">
        <input v-model="search" type="text" class="input flex-1" placeholder="🔍 Cari member / invoice..." />
        <select v-model="filterStatus" class="select w-full sm:w-40">
          <option value="all">Semua Status</option>
          <option value="paid">Lunas</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <select v-model="filterMethod" class="select w-full sm:w-40">
          <option value="all">Semua Metode</option>
          <option value="cash">Cash</option>
          <option value="transfer">Transfer</option>
          <option value="qris">QRIS</option>
          <option value="debit">Debit</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left">
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Invoice</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Member</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Jumlah</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Metode</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Status</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Tanggal</th>
              <th class="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="payment in filteredPayments" :key="payment.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" @click="openDetail(payment)">
              <td class="px-5 py-3.5 font-mono text-sm text-primary-600 font-medium">{{ payment.invoiceNumber }}</td>
              <td class="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">{{ getMemberName(payment.memberId) }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-900 dark:text-gray-100">{{ formatCurrency(payment.amount) }}</td>
              <td class="px-5 py-3.5 text-gray-600 dark:text-gray-400">{{ getPaymentMethodLabel(payment.method) }}</td>
              <td class="px-5 py-3.5">
                <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', getStatusColor(payment.status)]">
                  {{ payment.status === 'paid' ? 'Lunas' : payment.status }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-gray-500 dark:text-gray-400">{{ formatDate(payment.paidAt) }}</td>
              <td class="px-5 py-3.5">
                <div v-if="canDelete" class="flex items-center justify-end gap-1" @click.stop>
                  <button @click="deletePayment(payment)" class="btn-ghost btn-xs text-red-500 hover:text-red-700" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPayments.length === 0">
              <td colspan="7" class="px-5 py-12 text-center text-gray-500 dark:text-gray-400">Tidak ada pembayaran ditemukan.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Payment Modal -->
    <ModalDialog v-model="showModal" title="Input Pembayaran" size="lg">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="label">Member</label>
          <select v-model="form.memberId" class="select" required>
            <option value="">Pilih member</option>
            <option v-for="m in userStore.members" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>

        <div v-if="memberMemberships.length > 0">
          <label class="label">Membership</label>
          <select v-model="form.membershipId" class="select">
            <option value="">Pilih membership</option>
            <option v-for="ms in memberMemberships" :key="ms.id" :value="ms.id">
              {{ formatDate(ms.startDate) }} - {{ formatDate(ms.endDate) }} ({{ ms.status }})
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Jumlah (Rp)</label>
            <input v-model.number="form.amount" type="number" class="input" min="0" required />
          </div>
          <div>
            <label class="label">Metode Pembayaran</label>
            <select v-model="form.method" class="select">
              <option value="cash">Cash</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
              <option value="debit">Kartu Debit</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Status</label>
            <select v-model="form.status" class="select">
              <option value="paid">Lunas</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label class="label">Tanggal Bayar</label>
            <input v-model="form.paidAt" type="datetime-local" class="input" />
          </div>
        </div>

        <div>
          <label class="label">Catatan</label>
          <textarea v-model="form.notes" class="input" rows="2" placeholder="Catatan pembayaran..."></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showModal = false" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary">Simpan Pembayaran</button>
        </div>
      </form>
    </ModalDialog>

    <!-- Detail Modal -->
    <ModalDialog v-model="showDetail" title="Detail Pembayaran" size="sm">
      <div v-if="selectedPayment" class="space-y-4">
        <div class="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Pembayaran</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ formatCurrency(selectedPayment.amount) }}</p>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          <div class="flex justify-between py-2.5"><span class="text-sm text-gray-500 dark:text-gray-400">Invoice</span><span class="text-sm font-mono font-medium">{{ selectedPayment.invoiceNumber }}</span></div>
          <div class="flex justify-between py-2.5"><span class="text-sm text-gray-500 dark:text-gray-400">Member</span><span class="text-sm font-medium">{{ getMemberName(selectedPayment.memberId) }}</span></div>
          <div class="flex justify-between py-2.5"><span class="text-sm text-gray-500 dark:text-gray-400">Metode</span><span class="text-sm">{{ getPaymentMethodLabel(selectedPayment.method) }}</span></div>
          <div class="flex justify-between py-2.5"><span class="text-sm text-gray-500 dark:text-gray-400">Status</span><span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', getStatusColor(selectedPayment.status)]">{{ selectedPayment.status === 'paid' ? 'Lunas' : selectedPayment.status }}</span></div>
          <div class="flex justify-between py-2.5"><span class="text-sm text-gray-500 dark:text-gray-400">Tanggal</span><span class="text-sm">{{ formatDateTime(selectedPayment.paidAt) }}</span></div>
          <div v-if="selectedPayment.notes" class="py-2.5"><span class="text-sm text-gray-500 dark:text-gray-400">Catatan:</span><p class="mt-1 text-sm text-gray-700 dark:text-gray-300">{{ selectedPayment.notes }}</p></div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-center">
          <button @click="showDetail = false" class="btn-primary">Tutup</button>
        </div>
      </template>
    </ModalDialog>

    <!-- Confirm Delete -->
    <ConfirmDialog v-model="showConfirm" :message="confirmMessage" @confirm="confirmDelete" />
  </div>
</template>
