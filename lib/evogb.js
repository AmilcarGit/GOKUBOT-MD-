'use strict'
// Cliente de EvoGB API (https://api.evogb.org). La clave va en EVOGB_KEY, nunca en el código.
const cfg = require('../config')

const BASE = () => cfg.evogb.replace(/\/$/, '')
const hasKey = () => !!cfg.evogbKey

// Busca el texto de la respuesta: acepta string, JSON dentro de un string, o un objeto con cualquier clave de texto.
function extract(v, depth = 0) {
  if (v == null || depth > 4) return ''
  if (typeof v === 'string') {
    const t = v.trim()
    if (/^[\[{]/.test(t)) { try { return extract(JSON.parse(t), depth + 1) || t } catch { /* texto normal */ } }
    return t
  }
  if (Array.isArray(v)) return v.map(x => extract(x, depth + 1)).filter(Boolean).join('\n')
  if (typeof v === 'object') {
    for (const k of ['respuesta', 'response', 'answer', 'text', 'message', 'content', 'result', 'output']) {
      const r = extract(v[k], depth + 1)
      if (r) return r
    }
    return Object.values(v).map(x => extract(x, depth + 1)).filter(Boolean).join('\n')
  }
  return String(v)
}

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
  const answer = extract(body.result) || extract(body.response) || extract(body.message) || extract(body.data)
  if (!answer) throw new Error('La IA no devolvió respuesta: ' + JSON.stringify(body).slice(0, 300))
  return String(answer).trim()
}

module.exports = { hasKey, ai }
