<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useDarkMode } from '@/composables/useDarkMode'

// Initialize dark mode on app load
useDarkMode()
</script>

<template>
  <RouterView />
</template>
