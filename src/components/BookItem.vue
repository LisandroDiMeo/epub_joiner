<template>
  <div class="book-item">
    <span class="book-item__handle" title="Drag to reorder">
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </span>
    <span class="book-item__index">{{ index + 1 }}</span>
    <div class="book-item__info">
      <span class="book-item__title">{{ book.metadata?.title || book.file.name }}</span>
      <span class="book-item__meta">
        {{ book.metadata?.author }}
        <span class="book-item__size">{{ formatFileSize(book.file.size) }}</span>
      </span>
    </div>
    <button class="book-item__remove" @click="$emit('remove')" title="Remove">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { formatFileSize } from '../lib/utils.js'

defineProps({
  book: { type: Object, required: true },
  index: { type: Number, required: true },
})

defineEmits(['remove'])
</script>

<style scoped>
.book-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: box-shadow 0.15s ease;
}

.book-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.book-item__handle {
  cursor: grab;
  color: #94a3b8;
  display: flex;
  flex-shrink: 0;
}

.book-item__handle:active {
  cursor: grabbing;
}

.book-item__index {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.book-item__info {
  flex: 1;
  min-width: 0;
}

.book-item__title {
  display: block;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-item__meta {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 2px;
}

.book-item__size {
  margin-left: 0.5rem;
}

.book-item__remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  flex-shrink: 0;
  transition: all 0.15s;
}

.book-item__remove:hover {
  color: #ef4444;
  background: #fef2f2;
}
</style>
