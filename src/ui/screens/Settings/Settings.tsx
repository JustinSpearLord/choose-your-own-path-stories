import { useRef, useState } from 'react';
import { forgetStoryImages } from '../../../art/images';
import { shareOrDownload } from '../../../export/share';
import { backupFileName, buildBackup, markBackedUp, restoreBackup } from '../../../storage/backup';
import { getMeta, listStories, requestPersistence, totals } from '../../../storage/repo';
import { Header } from '../../app-theme/Header';
import { DownloadIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { formatBytes, formatDate, plural } from '../../format';
import { useLoad, useTitle } from '../../hooks';

export const APP_VERSION = '0.1';

export function Settings() {
  useTitle('Settings');
  const input = useRef<HTMLInputElement>(null);
  const { data, reload } = useLoad(
    async () => ({ totals: await totals(), lastBackupAt: await getMeta<string>('lastBackupAt') }),
    [],
  );
  const [backupStatus, setBackupStatus] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const t = data?.totals;
  const mb = t ? t.bytes / (1024 * 1024) : 0;

  const backup = async () => {
    setBusy(true);
    setBackupStatus('Packing your stories…');
    try {
      const file = await buildBackup();
      const result = await shareOrDownload(file.blob, file.name, 'Quest Journal backup');
      if (result === 'cancelled') {
        setBackupStatus('Backup cancelled. Nothing was saved.');
      } else {
        await markBackedUp();
        setBackupStatus(
          `${result === 'shared' ? 'Shared' : 'Saved'} ${file.name} (${formatBytes(file.bytes)}). Keep it somewhere safe, like your files or cloud drive.`,
        );
        void requestPersistence();
        reload();
      }
    } catch {
      setBackupStatus('The backup could not be made. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file: File) => {
    setBusy(true);
    setRestoreStatus('Reading the backup…');
    try {
      const s = await restoreBackup(new Uint8Array(await file.arrayBuffer()));
      for (const story of await listStories()) forgetStoryImages(story.id);
      const parts = [
        s.storiesAdded ? `${plural(s.storiesAdded, 'story', 'stories')} added` : '',
        s.storiesUpdated ? `${plural(s.storiesUpdated, 'story', 'stories')} updated to a newer version` : '',
        s.storiesKept ? `${plural(s.storiesKept, 'story', 'stories')} already here` : '',
        s.runsAdded ? `${plural(s.runsAdded, 'saved path')} added` : '',
        s.runsUpdated ? `${plural(s.runsUpdated, 'saved path')} refreshed` : '',
        s.looksAdded ? `${plural(s.looksAdded, 'look')} restored` : '',
        s.storiesSkipped ? `${plural(s.storiesSkipped, 'story', 'stories')} skipped because the file was damaged` : '',
      ].filter(Boolean);
      setRestoreStatus(parts.length ? `Restored: ${parts.join(', ')}.` : 'Everything in that backup is already on this phone.');
      reload();
    } catch (e) {
      setRestoreStatus(e instanceof Error ? e.message : 'That backup could not be restored.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={ui.page}>
      <Header title="Settings" backTo="/" backLabel="Back to library" />

      <section className={ui.section} style={{ gap: 10 }}>
        <h2 className={ui.sectionLabel}>On this phone</h2>
        <div className={ui.stats} data-testid="totals">
          {[
            { value: t ? String(t.stories) : '–', label: 'stories' },
            { value: t ? String(t.paths) : '–', label: 'paths' },
            { value: t ? String(t.notes) : '–', label: 'notes' },
            { value: t ? (mb >= 0.1 ? mb.toFixed(1) : mb > 0 ? '<0.1' : '0') : '–', label: 'MB' },
          ].map((s) => (
            <div key={s.label} className={ui.stat}>
              <span className={ui.statValue}>{s.value}</span>
              <span className={ui.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
        <p className={ui.body}>
          Everything is stored only on this phone. Browsers can clear app data, for example after weeks without
          use (iPhones do this), so keep a backup of anything you care about.
        </p>
      </section>

      <section className={ui.cardPad}>
        <h2 className={ui.cardTitle}>Backup</h2>
        <p className={ui.body}>
          Saves your stories, saved paths, notes, endings found and chosen looks into one file.
        </p>
        <span className={ui.muted} data-testid="last-backup">
          Last backup: {data?.lastBackupAt ? formatDate(data.lastBackupAt) : 'never'}
        </span>
        <button type="button" className={ui.primary} style={{ fontSize: 15 }} disabled={busy} onClick={() => void backup()}>
          <DownloadIcon size={16} />
          Save backup file
        </button>
        <span className={`${ui.muted} ${ui.center}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {backupFileName()}
          {t ? ` · about ${formatBytes(t.bytes)}` : ''}
        </span>
        <p className={ui.body} role="status" aria-live="polite">
          {backupStatus}
        </p>
      </section>

      <section className={ui.cardPad}>
        <h2 className={ui.cardTitle}>Restore</h2>
        <p className={ui.body}>
          Adds everything from a backup file. Nothing on this phone is deleted; if a story is in both, the newer
          version is kept.
        </p>
        <input
          ref={input}
          type="file"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="backup-file"
          accept=".zip,application/zip"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = '';
            if (picked) void restore(picked);
          }}
        />
        <button
          type="button"
          className={ui.secondary}
          style={{ background: 'var(--panel-2)' }}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Choose backup file
        </button>
        <p className={ui.body} role="status" aria-live="polite" data-testid="restore-status">
          {restoreStatus}
        </p>
      </section>

      <p className={`${ui.muted} ${ui.center}`} style={{ marginTop: 'auto' }}>
        Quest Journal {APP_VERSION} · story format quest/1 · no accounts, no tracking
      </p>
    </main>
  );
}
