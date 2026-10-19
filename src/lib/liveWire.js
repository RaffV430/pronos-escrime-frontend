export const LIVE_WIRE = 'gzip-base64-v1';
const MAX_BYTES = 8 * 1024 * 1024;

// Décompression bornée d’un message public, sans dépendre de Content-Encoding.
export function createLiveWireDecoder() {
  if (typeof DecompressionStream !== 'function' || typeof Blob !== 'function') return null;
  try {
    new DecompressionStream('gzip');
  } catch {
    return null;
  }
  return async (message) => {
    if (!message || Array.isArray(message) || !Object.hasOwn(message, 'wire')) return message;
    if (message.wire !== LIVE_WIRE || typeof message.data !== 'string' || message.data.length > MAX_BYTES * 2)
      throw new Error('Format du direct non reconnu');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(message.data))
      throw new Error('Message du direct invalide');
    const bytes = Uint8Array.from(atob(message.data), (char) => char.charCodeAt(0));
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) throw new Error('Message du direct trop volumineux');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const decoded = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      decoded.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded));
  };
}
