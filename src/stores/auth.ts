import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { useUserStore } from '@/stores/users'
import { seedUsers } from '@/data/seed'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const currentUser = ref<User | null>(null)
    const isAuthenticated = computed(() => !!currentUser.value)

    function login(email: string, password: string): boolean {
      // Check from users store first (has latest passwords), fallback to seed
      const userStore = useUserStore()
      const storeUser = userStore.users.find(
        (u) => u.email === email && u.password === password && (u.role === 'admin' || u.role === 'staff')
      )
      if (storeUser) {
        currentUser.value = { ...storeUser }
        return true
      }
      // Fallback to seed data for first-time load
      const seedUser = seedUsers.find(
        (u) => u.email === email && u.password === password && (u.role === 'admin' || u.role === 'staff')
      )
      if (seedUser) {
        currentUser.value = { ...seedUser }
        return true
      }
      return false
    }

    function updateCurrentUser(data: Partial<User>) {
      if (currentUser.value) {
        currentUser.value = { ...currentUser.value, ...data }
      }
    }

    function logout() {
      currentUser.value = null
    }

    return {
      currentUser,
      isAuthenticated,
      login,
      updateCurrentUser,
      logout,
    }
  },
  {
    persist: true,
  }
)
