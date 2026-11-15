'use strict'
// Ajustes que cambia el dueño en caliente (IA on/off, baneados). Se guardan en DATA_DIR/settings.json.
const fs = require('fs')
const path = require('path')
const { DATA_DIR } = require('./paths')

const FILE = path.join(DATA_DIR, 'settings.json')
let data = { aiPrivate: null, banned: [] }
try { data = { ...data, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) } } catch { /* primera vez */ }

function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(data, null, 2))
    fs.renameSync(FILE + '.tmp', FILE)
  } catch (error) {
    console.error('[settings] no se pudo guardar:', error.message)
  }
}

const digits = value => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '')

module.exports = {
  data,
  save,
  digits,
  isBannedId: id => !!id && data.banned.includes(digits(id)),
  ban: id => { const d = digits(id); if (d && !data.banned.includes(d)) { data.banned.push(d); save() } return d },
  unban: id => { const d = digits(id); const had = data.banned.includes(d); data.banned = data.banned.filter(x => x !== d); save(); return had }
}
