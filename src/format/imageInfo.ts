// Reads the type and pixel size of a PNG or WebP from its header bytes, with no browser APIs.

export interface ImageInfo {
  format: 'png' | 'webp';
  width: number;
  height: number;
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function ascii(bytes: Uint8Array, at: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[at + i]);
  return s;
}

function u32be(b: Uint8Array, at: number): number {
  return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
}

function u24le(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);
}

function readPng(b: Uint8Array): ImageInfo | null {
  if (b.length < 33) return null;
  for (let i = 0; i < 8; i++) if (b[i] !== PNG_SIG[i]) return null;
  if (u32be(b, 8) !== 13 || ascii(b, 12, 4) !== 'IHDR') return null;
  const width = u32be(b, 16);
  const height = u32be(b, 20);
  if (!width || !height) return null;
  // A complete PNG ends with an IEND chunk.
  if (ascii(b, b.length - 8, 4) !== 'IEND') return null;
  return { format: 'png', width, height };
}

function readWebp(b: Uint8Array): ImageInfo | null {
  if (b.length < 30 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') return null;
  const chunk = ascii(b, 12, 4);
  let width = 0;
  let height = 0;
  if (chunk === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    width = (b[26] | (b[27] << 8)) & 0x3fff;
    height = (b[28] | (b[29] << 8)) & 0x3fff;
  } else if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) return null;
    const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else if (chunk === 'VP8X') {
    width = u24le(b, 24) + 1;
    height = u24le(b, 27) + 1;
  } else {
    return null;
  }
  if (!width || !height) return null;
  return { format: 'webp', width, height };
}

/** Returns null when the bytes are not a readable PNG or WebP. */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  return readPng(bytes) ?? readWebp(bytes);
}

export function imageMime(path: string): string {
  return path.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png';
}
