import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArtView, Portrait } from '../../../art/ArtView';
import { characterColor, isImagePath, storyCover } from '../../../format/art';
import type { ParsedFile } from '../../../format/parse';
import type { Story } from '../../../format/types';
import { checkFile } from '../../../import/checkFile';
import { fetchStoryFile } from '../../../import/link';
import { setPending, usePending } from '../../../import/pending';
import { getStory } from '../../../storage/repo';
import { Header } from '../../app-theme/Header';
import { FileIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { formatBytes, plural } from '../../format';
import { useTitle } from '../../hooks';
import css from './Import.module.css';

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

interface Check {
  kind: 'ok' | 'note' | 'fix';
  text: string;
}

const KIND = {
  ok: { label: 'OK', color: 'var(--info)' },
  note: { label: 'Note', color: 'var(--accent-text)' },
  fix: { label: 'Fix', color: 'var(--danger-text)' },
};

export function fileChecks(file: ParsedFile): Check[] {
  const checks: Check[] = [];
  for (const e of file.errors) checks.push({ kind: 'fix', text: e.message });
  if (file.errors.length === 0) {
    checks.push({ kind: 'ok', text: `Valid Quest Journal ${file.isPackage ? 'package' : 'story'} (quest/1)` });
    const loops = file.warnings.some((w) => w.message.includes('can never reach an ending'));
    checks.push({
      kind: 'ok',
      text: loops
        ? 'Every decision has 2–3 choices'
        : 'Every decision has 2–3 choices and every path reaches an ending',
    });
    if (file.isPackage && file.stats.images > 0) {
      const missing = file.warnings.some((w) => w.message.includes('is not in the package'));
      checks.push({
        kind: 'ok',
        text: `${plural(file.stats.images, 'bundled image')}, all readable${missing ? '' : ' and found'}`,
      });
    }
  }
  for (const w of file.warnings) checks.push({ kind: 'note', text: w.message });
  return checks;
}

function Preview({ file }: { file: ParsedFile }) {
  const raw = isDict(file.raw) ? file.raw : null;
  if (!raw) return null;
  const story = file.story;
  const title = str(raw.title) || 'Untitled story';
  const author = str(raw.author);
  const source = { images: file.images };
  const cast = story?.characters ?? [];
  const bundled = cast.some((c) => isImagePath(c.portrait) && file.images.has(c.portrait));
  const facts = [
    { value: file.stats.scenes, label: 'scenes' },
    { value: file.stats.decisions, label: 'decisions' },
    { value: file.stats.endings, label: 'endings' },
    file.isPackage ? { value: file.stats.images, label: 'images' } : { value: cast.length, label: 'characters' },
  ];
  return (
    <section className={ui.card} aria-label="Story preview">
      {story ? (
        <ArtView art={storyCover(story)} source={source} pixel={story.imageStyle !== 'smooth'} className={css.cover} />
      ) : null}
      <div className={css.previewBody}>
        <div className={css.previewHead}>
          <h2 className={css.previewTitle}>{title}</h2>
          <span className={css.previewMeta}>
            {author ? `by ${author} · ` : ''}
            {str(raw.version) ? `v${str(raw.version)} · ` : ''}
            {file.name} · {formatBytes(file.sizeBytes)}
          </span>
        </div>
        {str(raw.summary) ? <p className={css.summary}>{str(raw.summary)}</p> : null}
        {cast.length > 0 ? (
          <div className={css.cast}>
            <span className={ui.muted}>Cast</span>
            {cast.slice(0, 6).map((c) => (
              <span key={c.id} className={css.face}>
                <Portrait
                  id={c.id}
                  name={c.name}
                  color={characterColor(c.id, c.color)}
                  portrait={c.portrait}
                  source={source}
                  pixel={story?.imageStyle !== 'smooth'}
                  size={32}
                />
              </span>
            ))}
            <span className={ui.muted}>
              {cast.length > 6 ? `+${cast.length - 6} more · ` : ''}
              {bundled ? 'bundled portraits' : 'generated portraits'}
            </span>
          </div>
        ) : null}
        <div className={css.facts}>
          {facts.map((f) => (
            <div key={f.label} className={css.fact}>
              <span className={css.factValue}>{f.value}</span>
              <span className={ui.muted}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Import() {
  useTitle('Import a story');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkUrl = params.get('url');
  const pending = usePending();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fetched = useRef<string | null>(null);

  const read = async (blob: Blob, name: string, sourceUrl?: string) => {
    setBusy('Checking the file…');
    setProblem(null);
    try {
      const file = await checkFile(blob, name);
      setPending({ file, ...(sourceUrl ? { sourceUrl } : {}) });
    } catch {
      setPending(null);
      setProblem('That file could not be read. Try choosing it again.');
    } finally {
      setBusy(null);
    }
  };

  // An import link: download the file it names, then run the same checks.
  useEffect(() => {
    if (!linkUrl || fetched.current === linkUrl) return;
    fetched.current = linkUrl;
    setPending(null);
    setBusy('Downloading the story…');
    setProblem(null);
    fetchStoryFile(linkUrl).then(
      ({ blob, name, url }) => read(blob, name, url),
      (e: unknown) => {
        setBusy(null);
        setProblem(e instanceof Error ? e.message : 'The story could not be downloaded.');
      },
    );
  }, [linkUrl]);

  const file = pending?.file ?? null;
  const story: Story | null = file?.story ?? null;
  const checks = file ? fileChecks(file) : [];
  const errorCount = file?.errors.length ?? 0;

  const next = async () => {
    if (!story) return;
    const existing = await getStory(story.id);
    navigate(existing ? '/import/update' : '/import/look');
  };

  return (
    <main className={ui.page}>
      <Header title="Import a story" backTo="/" backLabel="Back to library" />

      <input
        ref={input}
        type="file"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="story-file"
        accept=".json,.zip,.quest.json,.quest.zip,application/json,application/zip"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = '';
          if (picked) void read(picked, picked.name);
        }}
      />
      <button type="button" className={css.drop} onClick={() => input.current?.click()}>
        <span className={css.dropIcon}>
          <FileIcon />
        </span>
        <span className={css.dropTitle}>{file ? 'Choose a different file' : 'Choose a story file'}</span>
        <span className={ui.muted}>.quest.zip (story + images) or .quest.json</span>
      </button>

      <div role="status" aria-live="polite">
        {busy ? <p className={ui.body}>{busy}</p> : null}
      </div>
      {problem ? (
        <div className={ui.notice} role="alert" style={{ borderColor: 'var(--danger-border)' }}>
          <span className={ui.checkDot} style={{ background: 'var(--danger)' }} aria-hidden="true" />
          <span>{problem}</span>
        </div>
      ) : null}

      {file ? <Preview file={file} /> : null}

      {file ? (
        <section className={ui.section} aria-label="File check">
          <h2 className={ui.sectionLabel}>File check</h2>
          {errorCount > 0 ? (
            <p className={ui.body}>
              This file can’t be imported yet: {plural(errorCount, 'thing')} to fix. Each line names where.
            </p>
          ) : null}
          <ul className={ui.checkList}>
            {checks.map((c, i) => (
              <li key={i} className={ui.checkItem} data-kind={c.kind}>
                <span className={ui.checkDot} style={{ background: KIND[c.kind].color }} aria-hidden="true" />
                <span>
                  <strong style={{ fontWeight: 600, color: KIND[c.kind].color }}>{KIND[c.kind].label}</strong> {c.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className={ui.empty}>
          <span>
            Pick a story file someone sent you. The app checks it, shows a preview, and lets you choose how it
            looks before it joins your library.
          </span>
        </div>
      )}

      <div className={ui.bottom}>
        <button type="button" className={ui.primary} disabled={!story} onClick={() => void next()}>
          Next: choose a look
        </button>
        <Link to="/make" className={`${ui.linkBtn} ${css.help}`}>
          How do I make a story file?
        </Link>
      </div>
    </main>
  );
}
