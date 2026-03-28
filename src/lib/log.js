const entries = []
let enabled = true

export const log = {
  enable() { enabled = true },
  disable() { enabled = false },

  info(category, message, data) {
    if (!enabled) return
    const entry = { level: 'info', category, message, data, time: Date.now() }
    entries.push(entry)
    console.log(`[${category}]`, message, data ?? '')
  },

  warn(category, message, data) {
    if (!enabled) return
    const entry = { level: 'warn', category, message, data, time: Date.now() }
    entries.push(entry)
    console.warn(`[${category}]`, message, data ?? '')
  },

  error(category, message, data) {
    const entry = { level: 'error', category, message, data, time: Date.now() }
    entries.push(entry)
    console.error(`[${category}]`, message, data ?? '')
  },

  getEntries() { return entries },

  clear() { entries.length = 0 },

  dump() {
    return entries.map(e => {
      const lvl = e.level.toUpperCase().padEnd(5)
      const dataStr = e.data !== undefined ? ' ' + JSON.stringify(e.data, null, 2) : ''
      return `[${lvl}] [${e.category}] ${e.message}${dataStr}`
    }).join('\n')
  },
}
