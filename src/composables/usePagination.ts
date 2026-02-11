import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

export function usePagination<T>(items: ComputedRef<T[]> | Ref<T[]>, perPage = 50) {
  const currentPage = ref(1)
  const itemsPerPage = ref(perPage)

  const totalItems = computed(() => items.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value)))

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    return items.value.slice(start, start + itemsPerPage.value)
  })

  const startIndex = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
  const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value))

  // Reset to page 1 when items change (e.g. filter applied)
  watch(() => items.value.length, () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1
    }
  })

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  function nextPage() {
    if (currentPage.value < totalPages.value) currentPage.value++
  }

  function prevPage() {
    if (currentPage.value > 1) currentPage.value--
  }

  // Generate visible page numbers (max 5 pages shown)
  const visiblePages = computed(() => {
    const pages: number[] = []
    const total = totalPages.value
    const current = currentPage.value

    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, 5)
      } else if (current >= total - 2) {
        for (let i = total - 4; i <= total; i++) pages.push(i)
      } else {
        for (let i = current - 2; i <= current + 2; i++) pages.push(i)
      }
    }
    return pages
  })

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
    visiblePages,
    goToPage,
    nextPage,
    prevPage,
  }
}
