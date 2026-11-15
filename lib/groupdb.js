'use strict'
// Ajustes y contadores por grupo (bienvenida, antilink, actividad). Se guarda en DATA_DIR/groups.json.
const fs = require('fs')
const path = require('path')
const { DATA_DIR } = require('./paths')

const FILE = path.join(DATA_DIR, 'groups.json')
let db = {}
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { db = {} }

let timer = null
function save() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      const tmp = FILE + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(db))
      fs.renameSync(tmp, FILE)
    } catch (error) {
      console.error('[groupdb] no se pudo guardar:', error.message)
    }
  }, 5000)
  timer.unref?.()
}

function group(jid) {
  if (!db[jid]) db[jid] = { welcome: false, antilink: false, counts: {}, names: {} }
  return db[jid]
}

function count(jid, sender, name) {
  const g = group(jid)
  g.counts[sender] = (g.counts[sender] || 0) + 1
  if (name) g.names[sender] = String(name).slice(0, 22)
  save()
}

module.exports = { group, count, save }
