// Extrae el texto (o el id de botón/lista) de un mensaje entrante de WhatsApp.
function getBody(m) {
  const msg = m.message?.ephemeralMessage?.message || m.message?.viewOnceMessage?.message || m.message
  if (!msg) return ''
  let id = msg.buttonsResponseMessage?.selectedButtonId
    || msg.templateButtonReplyMessage?.selectedId
    || msg.listResponseMessage?.singleSelectReply?.selectedRowId
  if (!id && msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try { id = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id } catch {}
  }
  return id || msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || ''
}

module.exports = { getBody }
