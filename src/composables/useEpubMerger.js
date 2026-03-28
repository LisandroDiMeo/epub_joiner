import { ref } from 'vue'
import { parseEpub } from '../lib/epub-parser.js'
import { mergeEpubs } from '../lib/epub-merger.js'
import { buildEpub, downloadBlob } from '../lib/epub-builder.js'
import { log } from '../lib/log.js'

export function useEpubMerger() {
  const merging = ref(false)
  const progress = ref(0)
  const error = ref(null)

  async function merge(books, { title, author }) {
    log.clear()
    merging.value = true
    progress.value = 0
    error.value = null

    log.info('merge', `Starting merge of ${books.length} books: title="${title}", author="${author}"`)

    try {
      // Parse all EPUBs
      const parsedBooks = []
      for (let i = 0; i < books.length; i++) {
        log.info('merge', `Parsing book ${i + 1}/${books.length}: "${books[i].file.name}"`)
        const parsed = await parseEpub(books[i].file)
        parsedBooks.push(parsed)
        progress.value = ((i + 1) / books.length) * 30
      }

      // Merge
      log.info('merge', 'Starting merge phase')
      progress.value = 35
      const merged = await mergeEpubs(parsedBooks, { title, author })

      // Build EPUB
      log.info('merge', 'Starting build phase')
      const blob = await buildEpub(merged, (percent) => {
        progress.value = 35 + (percent * 0.65)
      })

      // Download
      const filename = `${title || 'merged'}.epub`.replace(/[/\\?%*:|"<>]/g, '_')
      log.info('merge', `Downloading as "${filename}"`)
      downloadBlob(blob, filename)

      progress.value = 100
      log.info('merge', 'Merge completed successfully')
    } catch (err) {
      log.error('merge', `Merge failed: ${err.message}`, err.stack)
      error.value = err.message || 'An error occurred during merge'
      throw err
    } finally {
      merging.value = false
      // Dump full log to console for debugging
      console.log('=== EPUB Merger Full Log ===')
      console.log(log.dump())
      console.log('=== End Log ===')
    }
  }

  return { merging, progress, error, merge, log }
}
