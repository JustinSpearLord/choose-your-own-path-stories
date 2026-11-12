// Object URLs for bundled images, from the library (IndexedDB) or from a file being imported.
import { useEffect, useState } from 'react';
import { imageMime } from '../format/imageInfo';
import { getImage } from '../storage/repo';

/** Where a story's bundled images come from. */
export type ImageSource = { storyId: string } | { images: ReadonlyMap<string, Uint8Array> } | null | undefined;

const stored = new Map<string, Promise<string | null>>();
const pending = new WeakMap<object, Map<string, string>>();

function toUrl(data: Uint8Array, type: string): string {
  return URL.createObjectURL(new Blob([data as BlobPart], { type }));
}

function storedUrl(storyId: string, path: string): Promise<string | null> {
  const key = `${storyId}\n${path}`;
  let hit = stored.get(key);
  if (!hit) {
    hit = getImage(storyId, path).then(
      (rec) => (rec ? toUrl(rec.data, rec.type) : null),
      () => null,
    );
    stored.set(key, hit);
  }
  return hit;
}

function pendingUrl(images: ReadonlyMap<string, Uint8Array>, path: string): string | null {
  const data = images.get(path);
  if (!data) return null;
  let urls = pending.get(images);
  if (!urls) pending.set(images, (urls = new Map()));
  let url = urls.get(path);
  if (!url) urls.set(path, (url = toUrl(data, imageMime(path))));
  return url;
}

/** Forgets cached URLs for a story, after it is updated or removed. */
export function forgetStoryImages(storyId: string): void {
  for (const [key, hit] of stored) {
    if (key.startsWith(`${storyId}\n`)) {
      stored.delete(key);
      void hit.then((url) => url && URL.revokeObjectURL(url));
    }
  }
}

/** The URL for a bundled image path, `null` if it is missing, `undefined` while loading. */
export function useImageUrl(source: ImageSource, path: string | null): string | null | undefined {
  const storyId = source && 'storyId' in source ? source.storyId : null;
  const images = source && 'images' in source ? source.images : null;
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);
  const key = `${storyId}\n${path}`;

  useEffect(() => {
    if (!storyId || !path) return;
    let live = true;
    void storedUrl(storyId, path).then((url) => live && setLoaded({ key: `${storyId}\n${path}`, url }));
    return () => {
      live = false;
    };
  }, [storyId, path]);

  if (!path) return null;
  if (images) return pendingUrl(images, path);
  if (!storyId) return null;
  return loaded && loaded.key === key ? loaded.url : undefined;
}
