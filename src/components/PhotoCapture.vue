<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showCamera = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stream = ref<MediaStream | null>(null)
const cameraError = ref('')

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      emit('update:modelValue', ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
  // reset input so same file can be re-selected
  input.value = ''
}

async function openCamera() {
  cameraError.value = ''
  showCamera.value = true
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    })
    stream.value = mediaStream
    // wait for the DOM to update
    await new Promise((r) => setTimeout(r, 100))
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      videoRef.value.play()
    }
  } catch {
    cameraError.value = 'Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.'
    showCamera.value = false
  }
}

function capturePhoto() {
  if (!videoRef.value || !canvasRef.value) return
  const video = videoRef.value
  const canvas = canvasRef.value
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(video, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  emit('update:modelValue', dataUrl)
  closeCamera()
}

function closeCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop())
    stream.value = null
  }
  showCamera.value = false
}

function removePhoto() {
  emit('update:modelValue', '')
}

watch(() => props.modelValue, () => {
  // if photo cleared externally, cleanup
})

onBeforeUnmount(() => {
  closeCamera()
})
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Camera View -->
    <div v-if="showCamera" class="w-full max-w-sm space-y-3">
      <div class="relative overflow-hidden rounded-xl bg-black">
        <video ref="videoRef" autoplay playsinline muted class="w-full rounded-xl" style="transform: scaleX(-1)"></video>
        <canvas ref="canvasRef" class="hidden"></canvas>
      </div>
      <div class="flex justify-center gap-3">
        <button type="button" @click="capturePhoto" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Ambil Foto
        </button>
        <button type="button" @click="closeCamera" class="inline-flex items-center gap-2 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          Batal
        </button>
      </div>
    </div>

    <!-- Photo Preview / Upload -->
    <template v-else>
      <div class="relative group">
        <!-- Has Photo -->
        <div v-if="modelValue" class="relative">
          <img :src="modelValue" alt="Preview" class="h-28 w-28 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/30" />
          <button type="button" @click="removePhoto" class="absolute -top-1 -right-1 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <!-- No Photo -->
        <div v-else class="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="mt-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">Foto</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {{ modelValue ? 'Ganti' : 'Upload' }} Foto
          <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
        </label>
        <button type="button" @click="openCamera" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Ambil dari Kamera
        </button>
      </div>
      <p class="text-[11px] text-gray-400">JPG, PNG max 2MB</p>
    </template>

    <!-- Camera Error -->
    <p v-if="cameraError" class="text-xs text-red-500">{{ cameraError }}</p>
  </div>
</template>
