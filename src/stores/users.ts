import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@/types'
import { seedUsers } from '@/data/seed'
import { generateId, generatePassword, nowISO } from '@/utils/helpers'

export const useUserStore = defineStore(
  'users',
  () => {
    const users = ref<User[]>([...seedUsers])
    const initialized = ref(false)

    function init() {
      if (!initialized.value) {
        users.value = [...seedUsers]
        initialized.value = true
      } else {
        // Sync avatar from seed data for existing users that don't have one
        const seedMap = new Map(seedUsers.map((u) => [u.id, u]))
        users.value = users.value.map((u) => {
          const seed = seedMap.get(u.id)
          if (seed && !u.avatar && seed.avatar) {
            return { ...u, avatar: seed.avatar }
          }
          return u
        })
      }
    }

    const members = computed(() => users.value.filter((u) => u.role === 'member'))
    const staff = computed(() => users.value.filter((u) => u.role === 'staff'))
    const trainers = computed(() => users.value.filter((u) => u.role === 'trainer'))
    const admins = computed(() => users.value.filter((u) => u.role === 'admin'))
    const activeMembers = computed(() => members.value.filter((u) => u.isActive))

    function getUserById(id: string): User | undefined {
      return users.value.find((u) => u.id === id)
    }

    function getUsersByRole(role: UserRole): User[] {
      return users.value.filter((u) => u.role === role)
    }

    function addUser(data: Omit<User, 'id' | 'password' | 'createdAt' | 'updatedAt'>): { user: User; password: string } {
      const password = generatePassword()
      const user: User = {
        ...data,
        id: generateId(),
        password,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      users.value.push(user)
      return { user, password }
    }

    function updateUser(id: string, data: Partial<User>) {
      const idx = users.value.findIndex((u) => u.id === id)
      if (idx !== -1) {
        users.value[idx] = { ...users.value[idx], ...data, updatedAt: nowISO() }
      }
    }

    function deleteUser(id: string) {
      users.value = users.value.filter((u) => u.id !== id)
    }

    function resetPassword(id: string): string {
      const newPassword = generatePassword()
      updateUser(id, { password: newPassword })
      return newPassword
    }

    function changePassword(id: string, oldPassword: string, newPassword: string): { success: boolean; message: string } {
      const user = getUserById(id)
      if (!user) return { success: false, message: 'User tidak ditemukan' }
      if (user.password !== oldPassword) return { success: false, message: 'Password lama salah' }
      if (newPassword.length < 4) return { success: false, message: 'Password baru minimal 4 karakter' }
      updateUser(id, { password: newPassword })
      return { success: true, message: 'Password berhasil diubah' }
    }

    function toggleActive(id: string) {
      const user = getUserById(id)
      if (user) {
        updateUser(id, { isActive: !user.isActive })
      }
    }

    return {
      users,
      members,
      staff,
      trainers,
      admins,
      activeMembers,
      init,
      getUserById,
      getUsersByRole,
      addUser,
      updateUser,
      deleteUser,
      resetPassword,
      changePassword,
      toggleActive,
    }
  },
  {
    persist: true,
  }
)
