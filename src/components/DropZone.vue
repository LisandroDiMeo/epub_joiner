<template>
  <div
    class="drop-zone"
    :class="{ 'drop-zone--active': isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    @click="$refs.fileInput.click()"
  >
    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".epub"
      class="drop-zone__input"
      @change="onFileInput"
    />
    <div class="drop-zone__content">
      <svg class="drop-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p class="drop-zone__text">Drop EPUB files here or click to browse</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['files-added'])
const isDragging = ref(false)

function onDrop(e) {
  isDragging.value = false
  const files = filterEpubs(e.dataTransfer.files)
  if (files.length) emit('files-added', files)
}

function onFileInput(e) {
  const files = filterEpubs(e.target.files)
  if (files.length) emit('files-added', files)
  e.target.value = '' // allow re-selecting same files
}

function filterEpubs(fileList) {
  return Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.epub'))
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 2.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8fafc;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: #6366f1;
  background: #eef2ff;
}

.drop-zone__input {
  display: none;
}

.drop-zone__icon {
  width: 48px;
  height: 48px;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.drop-zone--active .drop-zone__icon,
.drop-zone:hover .drop-zone__icon {
  color: #6366f1;
}

.drop-zone__text {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0;
}
</style>
