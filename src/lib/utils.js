let counter = 0

export function uniqueId() {
  return `id_${Date.now()}_${counter++}`
}

export function prefixPath(bookIndex, path) {
  return `book${bookIndex}/${path}`
}

export function prefixId(bookIndex, id) {
  return `book${bookIndex}_${id}`
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
