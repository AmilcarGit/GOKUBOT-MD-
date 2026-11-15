'use strict'
// Cliente de EvoGB API (https://api.evogb.org). La clave va en EVOGB_KEY, nunca en el código.
const cfg = require('../config')

const BASE = () => cfg.evogb.replace(/\/$/, '')
const hasKey = () => !!cfg.evogbKey

async function ai(text, role) {
  if (!hasKey()) throw new Error('NO_KEY')
  const u = new URL(BASE() + '/ai/free')
  u.searchParams.set('key', cfg.evogbKey)
  u.searchParams.set('text', text)
  u.searchParams.set('role', role)
  u.searchParams.set('model', cfg.ai.model)
  u.searchParams.set('json', 'true')
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) })
  const body = await r.json().catch(() => null)
  if (!r.ok || !body || body.status === false) {
    throw new Error((body && (body.message || body.error)) || 'HTTP ' + r.status)
  }
  const res = body.result
  const answer = typeof res === 'string' ? res : (res && (res.respuesta || res.response || res.answer || res.text)) || ''
  if (!answer) throw new Error('La IA no devolvió respuesta')
  return String(answer).trim()
}

module.exports = { hasKey, ai }
