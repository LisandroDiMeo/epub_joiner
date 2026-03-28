import JSZip from 'jszip'
import { log } from './log.js'

export async function buildEpub(mergedData, onProgress) {
  const { metadata, manifest, spine, toc, files } = mergedData
  const zip = new JSZip()

  log.info('builder', `Building EPUB: "${metadata.title}" by ${metadata.author}`)
  log.info('builder', `Manifest: ${manifest.size} items, Spine: ${spine.length} items, Files: ${files.size}`)

  // 1. mimetype (must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // 2. META-INF/container.xml
  zip.file('META-INF/container.xml', buildContainerXml())

  // 3. content.opf
  const opfContent = buildOpf(metadata, manifest, spine)
  zip.file('content.opf', opfContent)
  log.info('builder', 'Generated content.opf')

  // 4. toc.ncx (EPUB2 compatibility)
  zip.file('toc.ncx', buildNcx(metadata, toc))

  // 5. nav.xhtml (EPUB3)
  zip.file('nav.xhtml', buildNav(metadata, toc))

  // 6. Copy all content files
  let fileCount = 0
  for (const [path, fileData] of files) {
    if (fileData.content !== undefined) {
      zip.file(path, fileData.content)
    } else if (fileData.data) {
      zip.file(path, fileData.data)
    }
    fileCount++
  }
  log.info('builder', `Added ${fileCount} content files to ZIP`)

  // Verify: check that every spine item has a corresponding file
  for (const idref of spine) {
    const item = manifest.get(idref)
    if (item && !files.has(item.href)) {
      log.warn('builder', `Spine item "${idref}" references "${item.href}" but file is missing from ZIP`)
    }
  }

  // Generate the EPUB blob
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (meta) => {
      if (onProgress) onProgress(meta.percent)
    }
  )

  log.info('builder', `EPUB generated: ${(blob.size / 1024).toFixed(1)} KB`)
  return blob
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildContainerXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
}

function buildOpf(metadata, manifest, spine) {
  const manifestEntries = []
  const spineEntries = []

  // Add nav document to manifest
  manifestEntries.push(`    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`)
  manifestEntries.push(`    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`)

  for (const [id, item] of manifest) {
    const props = item.properties ? ` properties="${escapeXml(item.properties)}"` : ''
    manifestEntries.push(`    <item id="${escapeXml(id)}" href="${escapeXml(item.href)}" media-type="${escapeXml(item.mediaType)}"${props}/>`)
  }

  for (const idref of spine) {
    spineEntries.push(`    <itemref idref="${escapeXml(idref)}"/>`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:language>${escapeXml(metadata.language)}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
${manifestEntries.join('\n')}
  </manifest>
  <spine toc="ncx">
${spineEntries.join('\n')}
  </spine>
</package>`
}

function buildNcx(metadata, toc) {
  let playOrder = 1

  function renderNavPoints(entries, depth = 0) {
    const indent = '    '.repeat(depth + 2)
    return entries.map(entry => {
      const order = playOrder++
      const src = entry.src || (entry.children?.[0]?.src || '')
      const childrenXml = entry.children?.length
        ? '\n' + renderNavPoints(entry.children, depth + 1)
        : ''
      return `${indent}<navPoint id="navPoint-${order}" playOrder="${order}">
${indent}  <navLabel><text>${escapeXml(entry.label)}</text></navLabel>
${indent}  <content src="${escapeXml(src)}"/>${childrenXml}
${indent}</navPoint>`
    }).join('\n')
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="merged-epub"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(metadata.title)}</text></docTitle>
  <navMap>
${renderNavPoints(toc)}
  </navMap>
</ncx>`
}

function buildNav(metadata, toc) {
  function renderOl(entries, depth = 0) {
    const indent = '      '.repeat(depth + 1)
    const items = entries.map(entry => {
      const src = entry.src || (entry.children?.[0]?.src || '')
      const childrenHtml = entry.children?.length
        ? `\n${indent}  ${renderOl(entry.children, depth + 1)}\n${indent}`
        : ''
      return `${indent}<li><a href="${escapeXml(src)}">${escapeXml(entry.label)}</a>${childrenHtml}</li>`
    }).join('\n')
    return `<ol>\n${items}\n${'      '.repeat(depth + 1)}</ol>`
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(metadata.title)}</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    ${renderOl(toc)}
  </nav>
</body>
</html>`
}

function escapeXml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
