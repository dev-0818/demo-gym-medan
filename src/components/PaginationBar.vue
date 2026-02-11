<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  visiblePages: number[]
  label?: string
}>()

const emit = defineEmits<{
  goToPage: [page: number]
  prev: []
  next: []
}>()
</script>

<template>
  <div v-if="totalPages > 1" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 dark:border-gray-700 px-5 py-3">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Menampilkan <span class="font-medium text-gray-700 dark:text-gray-300">{{ startIndex }}-{{ endIndex }}</span>
      dari <span class="font-medium text-gray-700 dark:text-gray-300">{{ totalItems }}</span> {{ label || 'data' }}
    </p>
    <div class="flex items-center gap-1">
      <button
        @click="emit('prev')"
        :disabled="currentPage <= 1"
        class="rounded-md px-2 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        v-for="page in visiblePages"
        :key="page"
        @click="emit('goToPage', page)"
        :class="[
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          page === currentPage
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
      >
        {{ page }}
      </button>
      <button
        @click="emit('next')"
        :disabled="currentPage >= totalPages"
        class="rounded-md px-2 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>
  <div v-else class="border-t border-gray-200 dark:border-gray-700 px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
    Total: {{ totalItems }} {{ label || 'data' }}
  </div>
</template>
