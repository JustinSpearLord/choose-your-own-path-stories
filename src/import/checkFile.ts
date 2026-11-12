// Reads a picked or downloaded file in the browser and runs the import checks on it.
import { imageMime } from '../format/imageInfo';
import { loadStoryBytes } from '../format/load';
import { checkLoaded, type ParsedFile } from '../format/parse';

/**
 * Like `parseStoryFile`, plus a real decode of every bundled image where the browser can do it,
 * so an image with a valid header but broken data is still caught.
 */
export async function checkFile(file: Blob, name: string): Promise<ParsedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loaded = loadStoryBytes(bytes);
  if (typeof createImageBitmap === 'function') {
    for (const [path, meta] of loaded.imageMeta) {
      const data = loaded.images.get(path);
      if (!meta.readable || !data) continue;
      try {
        const bitmap = await createImageBitmap(new Blob([data as BlobPart], { type: imageMime(path) }));
        meta.width = bitmap.width;
        meta.height = bitmap.height;
        bitmap.close();
      } catch {
        meta.readable = false;
      }
    }
  }
  return { ...checkLoaded(loaded, bytes.length), name };
}
