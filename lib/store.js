'use strict'
// Almacén JSON mínimo en DATA_DIR (volumen de Railway): guarda con escritura atómica.
const fs = require('fs')
const path = require('path')
const { DATA_DIR } = require('./paths')

function open(name, fallback = {}) {
  const file = path.join(DATA_DIR, name)
  let data = fallback
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
  let queue = Promise.resolve()
  return {
    data,
    save() {
      queue = queue.then(() => {
        fs.mkdirSync(DATA_DIR, { recursive: true })
        fs.writeFileSync(file + '.tmp', JSON.stringify(data))
        fs.renameSync(file + '.tmp', file)
      }).catch(e => console.error('[store]', name, e.message))
      return queue
    }
  }
}

// Fecha de hoy en hora de Perú (UTC-5) para rachas y límites diarios.
const today = (offset = 0) => new Date(Date.now() - 5 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10)

module.exports = { open, today }
