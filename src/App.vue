<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">EPUB Joiner</h1>
      <p class="app__subtitle">Merge multiple EPUB files into one. Everything runs in your browser — your files never leave your machine.</p>
    </header>

    <main class="app__main">
      <DropZone @files-added="onFilesAdded" />

      <BookList
        v-model="books"
        @remove="removeBook"
      />

      <p v-if="estimatedSize" class="app__estimate">
        Estimated output size: ~{{ estimatedSize }}
      </p>

      <div v-if="error" class="app__error">
        {{ error }}
        <button class="app__error-dismiss" @click="error = null">&times;</button>
      </div>

      <ProgressBar :percent="progress" :visible="merging" />

      <MergeForm
        v-if="books.length >= 2"
        v-model:title="title"
        v-model:author="author"
        :can-merge="books.length >= 2"
        :merging="merging"
        @merge="onMerge"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DropZone from './components/DropZone.vue'
import BookList from './components/BookList.vue'
import MergeForm from './components/MergeForm.vue'
import ProgressBar from './components/ProgressBar.vue'
import { parseEpub } from './lib/epub-parser.js'
import { useEpubMerger } from './composables/useEpubMerger.js'
import { formatFileSize } from './lib/utils.js'

const books = ref([])
const title = ref('')
const author = ref('')

const { merging, progress, error, merge } = useEpubMerger()

const estimatedSize = computed(() => {
  if (books.value.length < 2) return null
  const totalBytes = books.value.reduce((sum, b) => sum + b.file.size, 0)
  return formatFileSize(totalBytes)
})

let nextId = 0

async function onFilesAdded(files) {
  for (const file of files) {
    const id = nextId++
    const entry = { id, file, metadata: null }
    books.value.push(entry)

    try {
      const parsed = await parseEpub(file)
      entry.metadata = parsed.metadata

      // Auto-populate author from first book
      if (books.value.length === 1 || !author.value) {
        author.value = parsed.metadata.author || ''
      }
    } catch (err) {
      books.value = books.value.filter(b => b.id !== id)
      error.value = err.message
    }
  }
}

function removeBook(index) {
  books.value.splice(index, 1)
}

async function onMerge() {
  try {
    await merge(books.value, {
      title: title.value || 'Merged Book',
      author: author.value,
    })
  } catch {
    // error is already set by the composable
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
  min-height: 100vh;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.app__header {
  text-align: center;
  margin-bottom: 2rem;
}

.app__title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
}

.app__subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.app__main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app__estimate {
  font-size: 0.85rem;
  color: #64748b;
  text-align: center;
  margin: -0.5rem 0;
}

.app__error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app__error-dismiss {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.25rem;
}
</style>
