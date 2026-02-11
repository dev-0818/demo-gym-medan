import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GymPackage } from '@/types'
import { seedPackages } from '@/data/seed'
import { generateId, nowISO } from '@/utils/helpers'

export const usePackageStore = defineStore(
  'packages',
  () => {
    const packages = ref<GymPackage[]>([...seedPackages])
    const initialized = ref(false)

    function init() {
      if (!initialized.value) {
        packages.value = [...seedPackages]
        initialized.value = true
      }
    }

    const activePackages = computed(() => packages.value.filter((p) => p.isActive))

    function getPackageById(id: string): GymPackage | undefined {
      return packages.value.find((p) => p.id === id)
    }

    function addPackage(data: Omit<GymPackage, 'id' | 'createdAt'>): GymPackage {
      const pkg: GymPackage = {
        ...data,
        id: generateId(),
        createdAt: nowISO(),
      }
      packages.value.push(pkg)
      return pkg
    }

    function updatePackage(id: string, data: Partial<GymPackage>) {
      const idx = packages.value.findIndex((p) => p.id === id)
      if (idx !== -1) {
        packages.value[idx] = { ...packages.value[idx], ...data }
      }
    }

    function deletePackage(id: string) {
      packages.value = packages.value.filter((p) => p.id !== id)
    }

    return {
      packages,
      activePackages,
      init,
      getPackageById,
      addPackage,
      updatePackage,
      deletePackage,
    }
  },
  {
    persist: true,
  }
)
