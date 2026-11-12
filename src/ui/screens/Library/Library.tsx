import ui from '../../app-theme/ui.module.css';
import css from './Library.module.css';

export function Library() {
  return (
    <main className={ui.page}>
      <div className={ui.header}>
        <div className={ui.headerText}>
          <h1 className={css.appTitle}>QUEST JOURNAL</h1>
          <p className={css.tagline}>Play stories, choose your path, keep notes</p>
        </div>
      </div>
      <div className={ui.empty}>
        <strong>No stories yet.</strong>
        <span>Import a story file someone sent you, or make your own.</span>
      </div>
    </main>
  );
}
