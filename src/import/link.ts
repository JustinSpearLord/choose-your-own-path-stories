// Import links: #/import?url=<encoded url> downloads a hosted story file.
import { MAX_ZIP_BYTES } from '../format/load';

export class LinkError extends Error {
  constructor(
    public kind: 'bad-url' | 'blocked' | 'http' | 'too-big',
    message: string,
  ) {
    super(message);
  }
}

export function parseStoryUrl(text: string): URL | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** The share-ready link that opens the app and imports the file at `storyUrl`. */
export function makeImportLink(appUrl: string, storyUrl: string): string {
  const base = appUrl.split('#')[0];
  return `${base}#/import?url=${encodeURIComponent(storyUrl.trim())}`;
}

export function fileNameFromUrl(url: URL): string {
  const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
  return last || 'story.quest.json';
}

/** Downloads the story file a link points to. This is the only network request the app makes. */
export async function fetchStoryFile(text: string): Promise<{ blob: Blob; name: string; url: string }> {
  const url = parseStoryUrl(text);
  if (!url) throw new LinkError('bad-url', 'That link is not a web address the app can open.');
  let res: Response;
  try {
    res = await fetch(url.toString(), { credentials: 'omit', redirect: 'follow', cache: 'no-store' });
  } catch {
    throw new LinkError(
      'blocked',
      `${url.host} blocks the app from downloading this file (or you are offline). Open the link in your browser, save the file, then import it with “Choose a story file”.`,
    );
  }
  if (!res.ok) {
    throw new LinkError(
      'http',
      `${url.host} answered with an error (${res.status}). Check the link, or save the file and import it instead.`,
    );
  }
  const blob = await res.blob();
  if (blob.size > MAX_ZIP_BYTES) throw new LinkError('too-big', 'That file is over 20 MB, too big for a story.');
  return { blob, name: fileNameFromUrl(url), url: url.toString() };
}
