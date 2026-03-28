import { prefixId, prefixPath } from './utils.js'
import { parseToc } from './epub-parser.js'
import { log } from './log.js'

export async function mergeEpubs(parsedBooks, { title, author }) {
  const mergedManifest = new Map()
  const mergedSpine = []
  const mergedToc = []
  const mergedFiles = new Map()

  for (let i = 0; i < parsedBooks.length; i++) {
    const book = parsedBooks[i]
    const { zip, basePath, manifest, spine, metadata } = book

    log.info('merger', `Processing book ${i}: "${metadata.title}" (basePath="${basePath}", ${manifest.size} manifest items)`)

    const tocEntries = await parseToc(book)
    log.info('merger', `Book ${i} TOC: ${tocEntries.length} top-level entries`)

    const idMap = new Map()

    for (const [id, item] of manifest) {
      const newId = prefixId(i, id)
      const originalFullPath = basePath + item.href
      const newPath = prefixPath(i, originalFullPath)
      idMap.set(id, newId)

      // Skip NCX/NAV from source books — we build our own
      if (item.mediaType === 'application/x-dtbncx+xml') {
        log.info('merger', `Skipping NCX: ${id} -> ${originalFullPath}`)
        continue
      }
      if (item.properties.includes('nav')) {
        log.info('merger', `Skipping NAV: ${id} -> ${originalFullPath}`)
        continue
      }

      mergedManifest.set(newId, {
        href: newPath,
        mediaType: item.mediaType,
        properties: item.properties.replace(/\bnav\b/g, '').trim(),
      })

      // Read file content — NO path rewriting needed!
      // Since we preserve the internal directory structure under book{i}/,
      // relative paths within XHTML and CSS still resolve correctly.
      const zipFile = zip.file(originalFullPath)
      if (!zipFile) {
        log.warn('merger', `File not found in ZIP: "${originalFullPath}" (manifest id="${id}")`)
        continue
      }

      if (item.mediaType === 'application/xhtml+xml' || item.mediaType === 'text/html' || item.mediaType === 'text/css') {
        const content = await zipFile.async('string')
        mergedFiles.set(newPath, { content })
      } else {
        const data = await zipFile.async('uint8array')
        mergedFiles.set(newPath, { data })
      }
    }

    // Process spine (skip NCX/NAV refs)
    for (const idref of spine) {
      const newId = idMap.get(idref)
      if (newId && mergedManifest.has(newId)) {
        mergedSpine.push(newId)
      }
    }

    // Process TOC entries — prefix src paths relative to basePath
    const prefixedTocEntries = prefixTocEntries(tocEntries, i, basePath)
    mergedToc.push({
      label: metadata.title || `Book ${i + 1}`,
      children: prefixedTocEntries,
    })
  }

  log.info('merger', `Merged result: ${mergedManifest.size} manifest items, ${mergedSpine.length} spine items, ${mergedFiles.size} files`)

  // Log a sample of manifest entries for debugging
  const sampleManifest = [...mergedManifest.entries()].slice(0, 10)
  log.info('merger', 'Sample manifest entries:', sampleManifest.map(([id, item]) => `${id} -> ${item.href}`))

  // Log a sample of actual file paths in mergedFiles
  const sampleFiles = [...mergedFiles.keys()].slice(0, 10)
  log.info('merger', 'Sample file paths:', sampleFiles)

  const language = parsedBooks[0]?.metadata?.language || 'en'

  return {
    metadata: { title, author, language },
    manifest: mergedManifest,
    spine: mergedSpine,
    toc: mergedToc,
    files: mergedFiles,
  }
}

function prefixTocEntries(entries, bookIndex, basePath) {
  return entries.map(entry => ({
    label: entry.label,
    src: entry.src ? prefixPath(bookIndex, basePath + entry.src) : '',
    children: prefixTocEntries(entry.children || [], bookIndex, basePath),
  }))
}
