// Reads a story file's bytes: a plain .quest.json, or a .quest.zip package.
// Only story.json and images/**.png|webp are ever read from a package.
import { unzipSync } from 'fflate';
import { readImageInfo } from './imageInfo';
import type { ImageMeta } from './types';

export const MB = 1024 * 1024;
export const MAX_JSON_BYTES = 2 * MB;
export const MAX_ZIP_BYTES = 20 * MB;
export const MAX_IMAGE_BYTES = MB;
export const MAX_IMAGES = 200;

export interface LoadedFile {
  isPackage: boolean;
  /** The story JSON as bytes, or null when a package has no story.json. */
  storyBytes: Uint8Array | null;
  /** Bundled images that are small enough to keep, by path. */
  images: Map<string, Uint8Array>;
  /** Every bundled image found, including oversized and unreadable ones. */
  imageMeta: Map<string, ImageMeta>;
  errors: string[];
}

export function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06))
  );
}

/** Python-style repr for strings, so messages read the same as the reference validator's. */
export function repr(value: unknown): string {
  if (typeof value === 'string') {
    const q = value.includes("'") && !value.includes('"') ? '"' : "'";
    return q + value.replace(/\\/g, '\\\\').replace(q === "'" ? /'/g : /"/g, '\\' + q) + q;
  }
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function normPath(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..' && out.length && out[out.length - 1] !== '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

export function isUnsafePath(name: string): boolean {
  return (
    name.startsWith('/') || name.startsWith('\\') || normPath(name).startsWith('..') || name.split('/')[0].includes(':')
  );
}

function isImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return name.startsWith('images/') && (lower.endsWith('.png') || lower.endsWith('.webp'));
}

export function loadStoryBytes(bytes: Uint8Array): LoadedFile {
  const errors: string[] = [];
  const images = new Map<string, Uint8Array>();
  const imageMeta = new Map<string, ImageMeta>();

  if (!isZip(bytes)) {
    if (bytes.length > MAX_JSON_BYTES) errors.push('a .quest.json must be under 2 MB');
    return { isPackage: false, storyBytes: bytes, images, imageMeta, errors };
  }

  if (bytes.length > MAX_ZIP_BYTES) errors.push('a .quest.zip must be under 20 MB');
  let storyBytes: Uint8Array | null = null;
  let imageCount = 0;
  let files: Record<string, Uint8Array> = {};
  try {
    files = unzipSync(bytes, {
      filter(file) {
        const name = file.name;
        if (isUnsafePath(name)) {
          errors.push(`unsafe path in package: ${repr(name)}`);
          return false;
        }
        if (name.endsWith('/')) return false;
        if (name === 'story.json') {
          if (file.originalSize > MAX_ZIP_BYTES) {
            errors.push('story.json in the package is too large');
            return false;
          }
          return true;
        }
        if (isImageName(name)) {
          imageCount += 1;
          if (file.originalSize > MAX_IMAGE_BYTES) {
            // Never unpacked: recorded so the import can name it.
            imageMeta.set(name, { size: file.originalSize, readable: false });
            return false;
          }
          return imageCount <= MAX_IMAGES;
        }
        return false; // anything else in the zip is ignored
      },
    });
  } catch {
    errors.push("package can't be read as a zip file");
    return { isPackage: true, storyBytes: null, images, imageMeta, errors };
  }

  for (const [name, data] of Object.entries(files)) {
    if (name === 'story.json') {
      storyBytes = data;
    } else {
      images.set(name, data);
      const info = readImageInfo(data);
      imageMeta.set(
        name,
        info ? { size: data.length, readable: true, width: info.width, height: info.height } : { size: data.length, readable: false },
      );
    }
  }
  if (storyBytes === null && !errors.includes('story.json in the package is too large')) {
    errors.push('package has no story.json at the top level');
  }
  if (imageCount > MAX_IMAGES) errors.push(`package has ${imageCount} images, the limit is 200`);
  return { isPackage: true, storyBytes, images, imageMeta, errors };
}
