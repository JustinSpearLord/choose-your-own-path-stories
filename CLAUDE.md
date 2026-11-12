# Quest Journal

An offline, installable web app (PWA) for playing branching stories in the `quest/1` format, taking notes, and exporting the path taken. Built with Vite, React and TypeScript; no backend.

## Read first

1. `HANDOFF.md`: scope, decisions, stack, architecture, milestones. Work through the milestones in order.
2. `docs/story-format.md`: the file format, validation rules and export format. It is the source of truth for anything about files.
3. `design/README.md` before building or changing any screen.

## Commands

Fill these in during milestone 1 and keep them current:

- `npm install`, then once `npx playwright install chromium webkit`: setup

- `npm run dev`: local dev server
- `npm test`: unit tests (Vitest), including validator parity with `tools/validate_quest.py`
- `npm run test:e2e`: Playwright on iPhone 13 and Pixel 7 profiles, against the production build. It reuses a preview server on port 4173 if one is running, so run `npm run build` first in that case
- `npm run lint`: ESLint; `npm run format`: Prettier
- `npm run preview`: serve the production build on port 4173 (add `-- --host` to open it from a phone on the same Wi-Fi)
- `npm run deploy:gh-pages`: publish `dist/` to the `gh-pages` branch of `origin`
- `npm run build`: production build, including the service worker
- `python3 tools/validate_quest.py <files>`: reference validator (`python` on Windows)
- `python tools/make_icons.py`: redraw the app icons
- `MANUAL_TESTS.md`: the by-hand test list for phones

## Rules

- Stay inside v1 scope (`HANDOFF.md`, "Out of scope"). If something seems to need an out-of-scope feature, stop and ask.
- Never change the story or path format silently. A format change means updating `docs/story-format.md`, `tools/validate_quest.py`, the TypeScript validator, and the fixtures together, and telling the owner.
- Keep `src/format` and `src/engine` free of React and browser globals so they stay unit-testable.
- The TypeScript validator must agree with the Python one on every file in `samples/` and `tests/fixtures/`.
- Story content is untrusted: render text as text, never `dangerouslySetInnerHTML`. Read only `story.json` and images from zips; reject unsafe paths.
- No network requests except fetching a story link the player opened. No analytics, no third-party scripts, no CDNs (fonts are self-hosted).
- Mobile first at 390 px; 44 px touch targets; text contrast at least 4.5:1, including custom themes.
- Write tests with each feature. A milestone isn't done until its "Done when" in `HANDOFF.md` is shown by tests.
- At the end of each milestone, commit and tell the owner in plain words what they can now try on their phone.
