import JSZip from 'jszip'
import { log } from './log.js'

const OPF_NS = 'http://www.idpf.org/2007/opf'
const DC_NS = 'http://purl.org/dc/elements/1.1/'
const CONTAINER_NS = 'urn:oasis:names:tc:opendocument:xmlns:container'
const NCX_NS = 'http://www.daisy.org/z3986/2005/ncx/'

export async function parseEpub(file) {
  log.info('parser', `Parsing "${file.name}" (${file.size} bytes)`)
  const zip = await JSZip.loadAsync(file)

  // Log all files in the ZIP for debugging
  const zipFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir)
  log.info('parser', `ZIP contains ${zipFiles.length} files`, zipFiles.slice(0, 20))

  // Find OPF path from container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error(`"${file.name}" is not a valid EPUB: missing META-INF/container.xml`)

  const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml')
  const rootfile = containerDoc.getElementsByTagNameNS(CONTAINER_NS, 'rootfile')[0]
    || containerDoc.querySelector('rootfile')
  if (!rootfile) throw new Error(`"${file.name}": cannot find rootfile in container.xml`)

  const opfPath = rootfile.getAttribute('full-path')
  const basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
  log.info('parser', `OPF path: "${opfPath}", basePath: "${basePath}"`)

  // Parse OPF
  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error(`"${file.name}": OPF file not found at ${opfPath}`)

  const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml')

  const metadata = extractMetadata(opfDoc)
  log.info('parser', `Metadata:`, metadata)

  const manifest = extractManifest(opfDoc)
  log.info('parser', `Manifest: ${manifest.size} items`, [...manifest.entries()].slice(0, 10).map(([id, item]) => `${id} -> ${item.href} (${item.mediaType})`))

  const spine = extractSpine(opfDoc)
  log.info('parser', `Spine: ${spine.length} items`, spine)

  const tocInfo = findToc(opfDoc, manifest, basePath, zip)
  log.info('parser', `TOC: type=${tocInfo.tocType}, path="${tocInfo.tocPath}"`)

  return {
    zip,
    basePath,
    metadata,
    manifest,
    spine,
    tocPath: tocInfo.tocPath,
    tocType: tocInfo.tocType,
    fileName: file.name,
  }
}

function extractMetadata(opfDoc) {
  const getTextNS = (ns, tag) => {
    const el = opfDoc.getElementsByTagNameNS(ns, tag)[0]
    return el?.textContent?.trim() || ''
  }
  const getText = (tag) => {
    const el = opfDoc.querySelector(tag)
    return el?.textContent?.trim() || ''
  }

  return {
    title: getTextNS(DC_NS, 'title') || getText('title') || 'Untitled',
    author: getTextNS(DC_NS, 'creator') || getText('creator') || '',
    language: getTextNS(DC_NS, 'language') || getText('language') || 'en',
  }
}

function extractManifest(opfDoc) {
  const manifest = new Map()
  const items = opfDoc.getElementsByTagNameNS(OPF_NS, 'item')
  const fallbackItems = items.length === 0 ? opfDoc.querySelectorAll('manifest > item') : items

  for (const item of fallbackItems) {
    const id = item.getAttribute('id')
    const href = decodeURIComponent(item.getAttribute('href') || '')
    const mediaType = item.getAttribute('media-type')
    const properties = item.getAttribute('properties') || ''
    if (id && href) {
      manifest.set(id, { href, mediaType, properties })
    }
  }
  return manifest
}

function extractSpine(opfDoc) {
  const spine = []
  const itemrefs = opfDoc.getElementsByTagNameNS(OPF_NS, 'itemref')
  const fallbackItemrefs = itemrefs.length === 0 ? opfDoc.querySelectorAll('spine > itemref') : itemrefs

  for (const ref of fallbackItemrefs) {
    const idref = ref.getAttribute('idref')
    if (idref) spine.push(idref)
  }
  return spine
}

function findToc(opfDoc, manifest, basePath, zip) {
  // Check for EPUB3 NAV document
  for (const [id, item] of manifest) {
    if (item.properties.includes('nav')) {
      return { tocPath: basePath + item.href, tocType: 'nav' }
    }
  }

  // Check for EPUB2 NCX via spine toc attribute
  const spineEl = opfDoc.getElementsByTagNameNS(OPF_NS, 'spine')[0]
    || opfDoc.querySelector('spine')
  if (spineEl) {
    const tocId = spineEl.getAttribute('toc')
    if (tocId && manifest.has(tocId)) {
      return { tocPath: basePath + manifest.get(tocId).href, tocType: 'ncx' }
    }
  }

  // Fallback: look for toc.ncx in manifest
  for (const [id, item] of manifest) {
    if (item.mediaType === 'application/x-dtbncx+xml') {
      return { tocPath: basePath + item.href, tocType: 'ncx' }
    }
  }

  return { tocPath: null, tocType: null }
}

export async function parseToc(parsedEpub) {
  const { zip, tocPath, tocType } = parsedEpub
  if (!tocPath) return []

  const tocXml = await zip.file(tocPath)?.async('string')
  if (!tocXml) {
    log.warn('parser', `TOC file not found in ZIP: "${tocPath}"`)
    return []
  }

  const doc = new DOMParser().parseFromString(tocXml, 'application/xml')

  if (tocType === 'ncx') {
    return parseNcxNavPoints(doc.getElementsByTagNameNS(NCX_NS, 'navMap')[0] || doc.querySelector('navMap'))
  }

  if (tocType === 'nav') {
    const nav = doc.querySelector('nav[*|type="toc"], nav[epub\\:type="toc"], nav')
    if (!nav) return []
    return parseNavOl(nav.querySelector('ol'))
  }

  return []
}

function parseNcxNavPoints(navMap) {
  if (!navMap) return []
  const entries = []
  const NCX_NS_URI = 'http://www.daisy.org/z3986/2005/ncx/'
  const points = navMap.children
  for (const point of points) {
    if (point.localName !== 'navPoint') continue
    const label = (point.getElementsByTagNameNS(NCX_NS_URI, 'text')[0] || point.querySelector('text'))?.textContent?.trim() || ''
    const content = point.getElementsByTagNameNS(NCX_NS_URI, 'content')[0] || point.querySelector('content')
    const src = content?.getAttribute('src') || ''
    const children = parseNcxNavPoints(point)
    entries.push({ label, src, children })
  }
  return entries
}

function parseNavOl(ol) {
  if (!ol) return []
  const entries = []
  for (const li of ol.children) {
    if (li.localName !== 'li') continue
    const a = li.querySelector('a')
    const label = a?.textContent?.trim() || ''
    const src = a?.getAttribute('href') || ''
    const childOl = li.querySelector('ol')
    const children = childOl ? parseNavOl(childOl) : []
    entries.push({ label, src, children })
  }
  return entries
}
