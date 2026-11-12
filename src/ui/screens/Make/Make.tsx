import { useState } from 'react';
import template from '../../../../samples/the_well.quest.json';
import { copyText, downloadBlob } from '../../../export/share';
import { makeImportLink, parseStoryUrl } from '../../../import/link';
import { AI_PROMPT, FORMAT_SNIPPET, PACKAGE_TREE } from '../../../import/prompt';
import { Header } from '../../app-theme/Header';
import { ImageIcon, LinkIcon, PenIcon, SparkIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { useTitle } from '../../hooks';
import css from './Make.module.css';

const STEPS = [
  { n: '1', title: 'Write', sub: 'by hand or AI' },
  { n: '2', title: 'Share', sub: 'send the file' },
  { n: '3', title: 'Play', sub: 'import it here' },
];

const RULES = [
  'Each scene has 2 or 3 choices, or is an ending',
  'Each choice’s "to" points to a scene id',
  'Text is a list of passages, one note spot each',
  '"art" is a built-in scene (forest, river_dusk, tavern…) or, in a .quest.zip, an image like images/ferry.png',
];

export function Make() {
  useTitle('Make a story');
  const [copied, setCopied] = useState('');
  const [url, setUrl] = useState('');
  const [linkStatus, setLinkStatus] = useState('');
  const valid = parseStoryUrl(url);
  const link = valid ? makeImportLink(window.location.href, valid.toString()) : '';

  const copyPrompt = async () => {
    setCopied((await copyText(AI_PROMPT)) ? 'Prompt copied. Paste it into any AI chat.' : 'Copy didn’t work here. Select the text above and copy it by hand.');
  };
  const copyLink = async () => {
    setLinkStatus((await copyText(link)) ? 'Link copied.' : 'Copy didn’t work here. Select the link and copy it by hand.');
  };
  const shareLink = async () => {
    try {
      await navigator.share({ title: 'A story for Quest Journal', url: link });
    } catch {
      /* closed the share sheet */
    }
  };

  return (
    <main className={ui.page} style={{ gap: 16 }}>
      <Header title="Make a story" backTo="/" backLabel="Back to library" />

      <p className={ui.body} style={{ fontSize: 14 }}>
        Every story is a <strong className={css.strong}>.quest.json</strong> file, or a{' '}
        <strong className={css.strong}>.quest.zip</strong> that also carries your own images. Write it yourself or
        have an AI write it, then send it to anyone who has the app.
      </p>

      <ol className={css.steps} aria-label="Write or generate, then share, then import and play">
        {STEPS.map((s) => (
          <li key={s.n} className={css.step}>
            <span className={css.stepNum} aria-hidden="true">
              {s.n}
            </span>
            <span className={css.stepTitle}>{s.title}</span>
            <span className={ui.muted} style={{ fontSize: 11 }}>
              {s.sub}
            </span>
          </li>
        ))}
      </ol>

      <section className={ui.cardPad}>
        <div className={css.cardHead}>
          <span className={css.gold}>
            <PenIcon size={22} />
          </span>
          <h2 className={ui.cardTitle}>Write it yourself</h2>
        </div>
        <p className={ui.body}>
          Start from the template. It has a start scene, two decisions and two endings to copy from.
        </p>
        <button
          type="button"
          className={ui.secondary}
          style={{ background: 'var(--panel-2)', fontSize: 14 }}
          onClick={() =>
            downloadBlob(
              new Blob([JSON.stringify(template, null, 2) + '\n'], { type: 'application/json' }),
              'my_story.quest.json',
            )
          }
        >
          Download template
        </button>
      </section>

      <section className={css.ai}>
        <div className={css.cardHead}>
          <span style={{ color: '#8FE0D0', display: 'flex' }}>
            <SparkIcon />
          </span>
          <h2 className={ui.cardTitle}>Generate with AI</h2>
        </div>
        <p className={css.aiText}>
          Copy this prompt into any AI chat, replace the parts in [brackets] with your idea, and save the reply as
          a .quest.json file.
        </p>
        <pre className={css.prompt} tabIndex={0} aria-label="The prompt">
          {AI_PROMPT}
        </pre>
        <button type="button" className={css.aiBtn} onClick={() => void copyPrompt()}>
          Copy prompt
        </button>
        <p className={css.aiText} role="status" aria-live="polite">
          {copied}
        </p>
        <p className={css.aiText} style={{ fontSize: 12 }}>
          If Import reports a problem, paste the error back into the chat and ask for a corrected file.
        </p>
      </section>

      <section className={ui.cardPad}>
        <div className={css.cardHead}>
          <span className={css.gold}>
            <ImageIcon />
          </span>
          <h2 className={ui.cardTitle}>Add your own images</h2>
        </div>
        <p className={ui.body}>
          Put the story and an images folder in one zip and name it .quest.zip. Point any scene, cover or portrait
          at an image path. Scenes you leave on built-in art still work.
        </p>
        <pre className={ui.code} style={{ background: 'var(--bg)' }}>
          {PACKAGE_TREE}
        </pre>
        <div className={ui.twoCol} style={{ gap: 8 }}>
          <div className={css.size}>
            <span
              aria-hidden="true"
              style={{ width: 64, height: 36, background: '#22304A', boxShadow: 'inset 0 -14px 0 #1B1726, inset 0 12px 0 #3A2E55' }}
            />
            <span className={css.stepTitle}>Scene art</span>
            <span className={ui.muted} style={{ fontSize: 11 }}>
              16:9 · 160×90 or 320×180
            </span>
          </div>
          <div className={css.size}>
            <span
              aria-hidden="true"
              style={{ width: 36, height: 36, background: '#E7B98F', boxShadow: 'inset 0 10px 0 #3F7D5C, inset 0 -10px 0 #2F5E45' }}
            />
            <span className={css.stepTitle}>Portraits</span>
            <span className={ui.muted} style={{ fontSize: 11 }}>
              square · 32×32 or 48×48
            </span>
          </div>
        </div>
        <p className={ui.muted} style={{ lineHeight: 1.5 }}>
          PNG or WebP, up to 1 MB each. Small pixel images are scaled up crisp, with no blur.
        </p>
      </section>

      <section className={ui.cardPad}>
        <div className={css.cardHead}>
          <span className={css.gold}>
            <LinkIcon />
          </span>
          <h2 className={ui.cardTitle}>Make an import link</h2>
        </div>
        <p className={ui.body}>
          Host the story file somewhere public (a GitHub file or Gist works), paste its address here, and send
          friends the link below. Opening it starts the import.
        </p>
        <label htmlFor="story-url" className={ui.fieldLabel}>
          Address of the hosted story file
        </label>
        <input
          id="story-url"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={ui.field}
          placeholder="https://…/my_story.quest.json"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setLinkStatus('');
          }}
        />
        {url.trim() && !valid ? (
          <p className={ui.body} role="alert">
            That doesn’t look like a web address. It should start with https://
          </p>
        ) : null}
        {link ? (
          <>
            <output htmlFor="story-url" className={ui.code} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} data-testid="import-link">
              {link}
            </output>
            <div className={ui.twoCol}>
              <button type="button" className={ui.secondary} onClick={() => void copyLink()}>
                Copy link
              </button>
              {typeof navigator.share === 'function' ? (
                <button type="button" className={ui.secondary} onClick={() => void shareLink()}>
                  Share link
                </button>
              ) : (
                <a className={ui.secondary} href={link}>
                  Try it
                </a>
              )}
            </div>
          </>
        ) : null}
        <p className={ui.muted} role="status" aria-live="polite">
          {linkStatus}
        </p>
      </section>

      <section className={ui.section}>
        <h2 className={ui.sectionLabel}>The format</h2>
        <pre className={ui.code} tabIndex={0} aria-label="Example story file">
          {FORMAT_SNIPPET}
        </pre>
        <ul className={css.rules}>
          {RULES.map((r) => (
            <li key={r}>
              <span aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
