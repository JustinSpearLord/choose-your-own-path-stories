# Quest Journal: build handoff

Quest Journal is an offline, installable web app for playing branching choose-your-own-adventure stories. A writer (by hand or with an AI) makes a story file, sends it to friends and playtesters, they play it on their phones, take notes on passages and decisions, and export the path they took to send back. The owner is a game developer using it to prototype and playtest narrative for a video game.

Everything in this folder was settled with the owner before handoff. This document is the brief; the files it points to are the details.

| File | What it is |
| --- | --- |
| `HANDOFF.md` | This brief: scope, stack, architecture, data model, screens, milestones |
| `CLAUDE.md` | Working rules for this repo |
| `docs/story-format.md` | The story file format (`quest/1`), import validation rules, and the exported path format. **The source of truth for anything about files** |
| `design/README.md` | How to read the screen designs, the app's colors and type, screen-by-screen notes |
| `design/screens/*.dc.html` | The 14 screen mockups (390 px wide phone screens) |
| `samples/` | Real story files to test with, including a package with bundled pixel art |
| `tests/fixtures/` | Broken story files and the exact problems each must produce |
| `tools/validate_quest.py` | Reference validator. The app's validator must agree with it on every fixture |
| `tools/make_package.py` | How the sample's pixel art and package were made (a pattern for built-in art) |

## Decisions already made

| Area | Decision |
| --- | --- |
| Audience | Friends and playtesters. Not a public app: no store listing, accounts, moderation or discovery |
| Platform | Installable web app (PWA): home screen on iPhone and Android, works fully offline after first load, also runs on desktop |
| Story files | Only `quest/1` files: `.quest.json`, or `.quest.zip` with bundled images. No Twine, Ink or other formats, ever |
| Getting stories | Import a file from the device, or open a link that imports a hosted file |
| Decisions | Every decision has 2 or 3 choices |
| Notes | On any passage, and on each decision |
| Story logic | Pure branching in v1. Variables/flags come later as `quest/1.1`; leave room for it, don't build it |
| Going back | Rewind to any past decision; the earlier run stays saved as its own path |
| Feedback to author | Players export their path (`.path.json` or `.md`) and send it themselves. No in-app sending |
| Look | Each story has an author theme; on import the player keeps it, picks a preset, or sets custom colors. Story screens use the story's look; library, import and settings use the app's own look |
| Extras in v1 | Endings tracker; story map after finishing a story |
| Data safety | All data on the device. Manual Backup / Restore file. No sync |
| Story updates | Importing a newer version keeps progress when the current scene still exists, else offers a restart |
| Cost | Free to run: static hosting, no server, no paid services |

## Out of scope for v1

Do not build these, even partially: accounts or sync, any server or database, analytics or tracking, in-app AI generation, a story editor or character creator, story variables/flags, sound, other story formats, an app-store build. If a task seems to need one, stop and ask the owner.

## Tech stack

Use current stable versions of everything when you start (check with `npm view <pkg> version`); don't copy version numbers from memory.

| Concern | Choice | Why |
| --- | --- | --- |
| Build | Vite + TypeScript (`strict`) | Fast, standard, static output |
| UI | React with function components and hooks | Common, well supported, fine for a menu-and-text app |
| Routing | React Router, hash routing (`createHashRouter`) | Works on any static host and offline with no server rewrites |
| Styling | Plain CSS with CSS Modules and CSS custom properties | Two theme layers (app and story) are just two sets of variables; no CSS framework needed |
| Fonts | `@fontsource` packages for Pixelify Sans, Literata, IBM Plex Sans | Self-hosted so they work offline; all are OFL |
| Storage | IndexedDB via Dexie | Stores stories, image Blobs and runs; handles schema versions |
| Zip | fflate | Small and fast; reads `.quest.zip`, writes backups |
| Validation | Zod for shapes, plus hand-written checks for graph, ids, images, theme | Messages must match `tools/validate_quest.py` |
| Offline + install | vite-plugin-pwa (Workbox, `generateSW`) with a web app manifest | Precaches the app shell, fonts and built-in art |
| Tests | Vitest (+ Testing Library) for logic and components; Playwright for end-to-end on phone viewports | Playwright: iPhone 13 and Pixel 7 device profiles |
| Lint/format | ESLint + Prettier | |
| Hosting | Any free static host with HTTPS: GitHub Pages, Cloudflare Pages or Netlify | PWAs need HTTPS. The owner picks the host (see Open questions) |

Ask for persistent storage once there is data worth keeping: `navigator.storage.persist()`. iPhone may still clear data for an app not opened in weeks, which is why Backup exists; the Settings screen says so.

## Architecture

Keep the story logic free of React and the browser so it can be unit-tested directly.

```text
src/
  format/        types for quest/1 and quest-path/1, parse (json + zip), validate, theme resolution, contrast
  engine/        runs: start, choose, notes, rewind, finish; endings found; story map graph
  storage/       Dexie schema and repositories; backup and restore
  import/        file picker, link import, version comparison and update planning
  export/        path → .path.json and .md
  art/           built-in scene art and generated portraits
  ui/
    app-theme/   app tokens (Dusk) and shared components: buttons, sheets, headers
    story-theme/ applies a resolved story look as CSS variables on story screens
    screens/     one folder per screen (see Screens)
  main.tsx, routes.tsx
tests/
  fixtures/      from this kit
  e2e/           Playwright specs
```

### Story format module

- `parseStoryFile(file: File | Blob, name)` returns `{ story, images: Map<path, Blob>, isPackage }` or errors. Zip reading uses fflate, ignores everything except `story.json` and `images/**.png|webp`, and rejects unsafe paths.
- `validateStory(story, images)` returns `{ errors: Issue[], warnings: Issue[], stats }`, implementing every row of the validation table in `docs/story-format.md`. Image size checks use `createImageBitmap`.
- `resolveTheme(storyTheme, playerLook)` returns concrete colors and font. It applies the 4.5:1 text rule by stepping the text color toward white or black, and picks dark or white text for the accent.
- Parity: add a test that runs `python3 tools/validate_quest.py` over `samples/` and `tests/fixtures/` and asserts the TypeScript validator finds the same number of errors and warnings for each file. `tests/fixtures/expected.json` lists the expected counts and key messages.

### Engine

A **run** is one playthrough. Exactly one run per story is *current* (the one Continue resumes).

- `startRun(story)`: a new run at `start`.
- `choose(run, story, index)`: records the choice, the skipped choices and any decision note, then moves on. Reaching an ending finishes the run and records the ending found.
- `setPassageNote(run, stepIndex, passage, text)` / `setChoiceNote(run, stepIndex, text)`: an empty text deletes the note.
- `rewind(run, stepIndex)`: creates a **new** run with steps `0..stepIndex` copied (notes included), the choice at `stepIndex` cleared, and `parentRunId` set. The original run is left exactly as it was. The new run becomes current.
- `endingsFound(storyId)`: ending scene ids reached by any finished run, with the first date found.
- `storyMap(storyId)`: from all runs of the story, the visited scenes, the edges taken, and every choice of a visited scene that no run has taken. Unvisited scenes are never named. The map is locked until at least one ending is found.

Each step stores a **snapshot** of the scene as played (title, passages, choices). Saved paths then stay readable after the story is updated, as the New version screen promises.

## Data model (IndexedDB)

| Table | Key | Fields |
| --- | --- | --- |
| `stories` | `id` | `version`, `title`, `author`, `summary`, `story` (parsed JSON), `isPackage`, `importedAt`, `updatedAt`, `sizeBytes`, `sourceUrl?` |
| `images` | `[storyId+path]` | `blob`, `width`, `height` |
| `looks` | `storyId` | `mode` (`author` \| a preset name \| `custom`), `colors?`, `font` |
| `runs` | `runId` (uuid) | `storyId`, `storyVersion`, `name`, `status` (`active` \| `finished` \| `left`), `isCurrent`, `startedAt`, `finishedAt?`, `endingSceneId?`, `parentRunId?`, `steps[]` |
| `meta` | `key` | `lastBackupAt`, schema info |

A step is `{ sceneId, snapshot, notes: [{ passage, text, at }], choice?: { index, text, to }, skipped: string[], choiceNote?, enteredAt }`. A passage-level note whose passage no longer matches after an update is moved to the scene (`passage: null`) and shown as a scene note.

Only one version of a story is installed at a time ("Keep v1.0, don't update" discards the new file).

## Behaviors in detail

**Import from a file.** The Import screen accepts `.quest.json` and `.quest.zip` (also accept `.json` and `.zip`; judge by content, not extension). Show the preview and the file check. Errors block with the scene named; warnings list but allow. Then go to *Choose a look*, then add to the library. If the story `id` already exists, go to *New version* instead.

**Import from a link.** `#/import?url=<encoded url>` fetches the file and runs the same flow. The host must allow cross-origin downloads (GitHub raw files and Gists do). If the fetch fails, say plainly that this host blocks the app from downloading it and suggest saving the file and importing it. Make a share-ready link from any URL on the Make a story screen ("Make an import link").

**New version.** Compare `version` strings numerically by dot-separated parts (`1.10` > `1.9`); a missing version counts as `0`. Same version and same content means "You already have this version". Otherwise show what happens:
- if the current run's scene exists in the new version, it continues there; if not, the run is set to `left` and the player starts over;
- saved paths stay readable (snapshots);
- a note on a passage whose scene text changed moves to the scene;
- the player's look stays.

**Choose a look.** The live preview, presets and color pickers are shown in `design/screens/ImportStyle.dc.html`. It is reused from the story menu's Change look item. Save the look per story id.

**Play.** Passages show in order. Tapping a passage selects it and opens a note box for it; passages with notes show a mark. Continue goes to the decision. The decision shows the prompt, 2–3 choices and an optional decision note; Confirm records it. Save after every action, so closing the app mid-scene loses nothing.

**Ending.** Show the ending title and tone, stats (scenes, choices, notes, time played), the path so far, a name field (default `"<story title> run <n>"`), Save & review, Export path, Play again.

**Review.** A timeline of the run with tabs Full story / Choices / Notes. Each decision shows the chosen choice and the skipped ones, with "Rewind to this decision". Notes can be edited here. Export as `.md` (respecting the current tab) or `.path.json`, using the formats in `docs/story-format.md`.

**Export.** Build a Blob. On phones, use `navigator.share({ files })` when `navigator.canShare` allows it, otherwise download. File names: `<story-id>_<run-name-slug>.path.json` and `.md`.

**Endings and map.** Endings: found count, a card per found ending (title, tone, date found, link to its path), and locked cards that hide titles. Map: top-down layered layout by depth from `start`, latest run highlighted, other runs muted, `?` for untaken choices, pan and pinch-zoom. Tapping a scene shows its choices, its notes and "Rewind to this decision".

**Backup and restore.** Backup writes one zip: `backup.json` (`"format": "quest-backup/1"`, stories metadata, looks, runs, endings) plus `stories/<id>/story.json` and its images. Restore only adds: a story present in both keeps the newer version, runs merge by `runId`, looks on the device win. Record `lastBackupAt`.

**Built-in art.** The 28 names in `docs/story-format.md` must all resolve to a pixel scene. For v1, draw each as a 64×36 grid of rectangles in code (the same approach as `tools/make_package.py`), rendered as SVG with `shape-rendering: crispEdges`, in the same palette as the samples. Allow a real PNG at `public/art/<name>.png` to replace any of them later. Unknown names render `default`.

**Generated portraits.** 12×12 pixel faces from the character's `color` plus a hash of their id choosing hair, face and clothing variants, so the same character always looks the same.

**Image scaling.** `imageStyle: "pixel"` uses `image-rendering: pixelated` and integer scale factors; `"smooth"` uses normal scaling.

## Screens

Design files are in `design/screens/`. Read `design/README.md` before building any screen.

| Route | Screen | Design file | Look |
| --- | --- | --- | --- |
| `#/` | Library | `Main.dc.html` | App |
| `#/story/:id` | Story menu (bottom sheet over library) | `StoryMenu.dc.html` | App |
| `#/import` | Import a story (file check) | `Import.dc.html` | App |
| `#/import/look` | Choose a look | `ImportStyle.dc.html` | App, story preview |
| `#/import/update` | New version | `Update.dc.html` | App |
| `#/make` | Make a story (format help, AI prompt, link maker) | `Make.dc.html` | App |
| `#/play/:runId` | Play: passages and notes | `Story.dc.html` | Story |
| `#/play/:runId/decide` | Decision | `Choice.dc.html` | Story |
| `#/run/:runId/end` | Ending | `Ending.dc.html` | Story |
| `#/run/:runId` | Review, with the rewind sheet | `Review.dc.html`, `Rewind.dc.html` | Story |
| `#/story/:id/endings` | Endings found | `Endings.dc.html` | Story |
| `#/story/:id/map` | Story map | `Map.dc.html` | Story |
| `#/story/:id/look` | Change look | `ImportStyle.dc.html` | App, story preview |
| `#/settings` | Settings, backup and restore | `Settings.dc.html` | App |

Mockups contain placeholder stories and numbers. Real screens show real data and must handle empty states (no stories yet, no notes, no saved paths), long titles, and 2 vs 3 choices.

## Milestones

Work in this order. Each milestone ends with its tests passing and a short note to the owner on what they can try.

1. **Scaffold.** Vite + React + TS, routing, app theme tokens and fonts, PWA manifest and service worker, ESLint/Prettier, Vitest and Playwright set up, deploy script for a static host. *Done when:* an empty library shell installs to a phone home screen and opens offline.
2. **Format.** Types, zip/json parsing, validator, theme resolution and contrast. *Done when:* every file in `samples/` passes and every fixture in `tests/fixtures/` produces exactly what `expected.json` says, matching the Python validator.
3. **Import and library.** Storage, Import screen, Choose a look, library list and story menu. *Done when:* both Lantern Road files and The Well import, show the right preview and checks, and appear in the library with their covers.
4. **Play.** Engine, Play and Decision screens with passage and decision notes, autosave, built-in art and generated portraits, story theming. *Done when:* the Lantern Road package can be played to every one of its 6 endings, and closing and reopening mid-scene resumes in place.
5. **Ending, review, export, rewind.** *Done when:* exported `.path.json` matches the format in the spec, `.md` matches the example's structure, and rewinding creates a new run while the old one stays unchanged.
6. **Endings and map.** *Done when:* after two different finished runs, the map shows both paths, the `?` choices, no unvisited scene names, and rewinding from a map node works.
7. **Updates, link import, backup.** New version flow, `#/import?url=`, Backup/Restore, Settings. *Done when:* importing an edited Lantern Road with `version` bumped keeps progress, and a backup restored into a fresh browser profile brings back stories, runs, notes and looks.
8. **Polish.** All 28 built-in scenes drawn, accessibility pass, empty states, offline end-to-end test, deploy. *Done when:* the Playwright suite passes on both phone profiles with the network off after first load, and Lighthouse reports the app as installable.

## Quality bar

- Mobile first at 390 px wide; works from 320 px up and on desktop (centered, max 480 px column).
- Touch targets at least 44×44 px. Real `<button>`, `<a>`, `<input>` and `<label>`; nothing clickable built from a `div`.
- Text contrast at least 4.5:1 everywhere, including custom themes (enforced by `resolveTheme`).
- Respect `prefers-reduced-motion`.
- No network requests except fetching a story link the player opened. No third-party scripts.
- Story text is untrusted: render it as text, never as HTML.

## Open questions for the owner

Ask these when you reach them; don't guess.

1. The app's final name and icon (the mockups use "Quest Journal").
2. Which static host to deploy to, and whether to use a custom domain.
3. Whether the owner will supply finished art for the 28 built-in scenes, or the coded placeholder scenes are the v1 art.
