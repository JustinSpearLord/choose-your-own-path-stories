# Design reference

`screens/` holds the 14 approved phone mockups, drawn at 390 px wide. Use them for layout, sizes, colors, copy and interaction. They are not code to reuse.

## Reading the mockup files

The mockups are written in a design-tool component format, not plain HTML. They do not render on their own (the `./support.js` they load is not included), so read them as source:

- Everything inside `<x-dc>` is the screen. Inline `style="…"` attributes carry the exact sizes, spacing and colors.
- `{{name}}` is a value filled in from the `renderVals()` function in the `<script type="text/x-dc">` block at the bottom. That function holds the **placeholder data** (story titles, counts, notes) and any demo state, such as which choice is selected or which tab is open.
- `<sc-for list="{{items}}" as="item">` repeats its contents for each item; `<sc-if value="{{flag}}">` shows its contents only when the value is true.
- `<helmet>` holds font links and page-level CSS.
- `<a href="Other.dc.html">` marks navigation between screens. Map it to the routes in `HANDOFF.md`.
- Pixel art is drawn as SVG rectangles with `shape-rendering="crispEdges"`. Build the real art the same way, or as PNGs with `image-rendering: pixelated`.

Placeholder content (Lantern Road, Saltmarsh Wake, counts, dates, notes) is illustrative. Real screens show real data.

## App look (Dusk)

The library, import, make, story menu, update and settings screens always use these values. Story screens use the story's resolved theme instead (see `docs/story-format.md`, Theme), mapping `background`, `panel`, `text` and `accent` onto the same roles.

| Token | Value | Used for |
| --- | --- | --- |
| `--bg` | `#15131C` | Page background |
| `--panel` | `#201D29` | Cards, segmented controls, secondary buttons |
| `--panel-2` | `#1C1925` | List rows, inputs, sheets |
| `--border` | `#2E2A3A` | Card and row borders (2 px) |
| `--border-strong` | `#3A3548` | Input and secondary-button borders |
| `--text` | `#EDE8F5` | Main text |
| `--text-2` | `#C9C2D8` | Secondary text |
| `--muted` | `#A79FB8` | Meta text and hints (passes 4.5:1 on all the backgrounds above) |
| `--accent` | `#E8B44C` | Primary buttons, links, selection, notes |
| `--accent-shadow` | `#8A6420` | 4 px bottom shadow under primary buttons |
| `--on-accent` | `#15131C` | Text on the accent |
| `--info` | `#5CC8B4` | OK checks, AI help |
| `--danger` | `#E2725B` / text `#F0A08F` | Errors, Remove |

**Type.** Pixelify Sans for the app title, screen titles and small section labels (uppercase, 1–2 px letter spacing). IBM Plex Sans for interface text. Literata for story text, dialogue, ending titles and notes in Review. Story text is 15–17 px with 1.55 line height.

**Shape.** Corner radius 2 px (chips, small buttons), 4 px (buttons, rows, inputs), 6 px (cards), 12 px (top of bottom sheets). Borders 2 px. Primary buttons are 48–52 px tall with a solid 4 px bottom shadow in `--accent-shadow`, a "pressed pixel" look; keep it. Side padding is 20 px; gaps between blocks are 14–18 px.

**Sizes.** Every touch target is at least 44×44 px. Mockups taller than 844 px are scrolling screens.

## Screen notes

| File | Notes beyond what the mockup shows |
| --- | --- |
| `Main.dc.html` | Continue card shows the current run of the most recently played story. Tapping a story opens its menu. The gear goes to Settings. Needs an empty state for a first launch: a short welcome, Import and Make a story |
| `StoryMenu.dc.html` | Bottom sheet over the library. "Story map" is disabled with "Finish the story to unlock" until an ending is found. Remove asks for confirmation |
| `Import.dc.html` | Shows the file check results live. With errors, the main button is disabled and each error names its scene |
| `ImportStyle.dc.html` | Interactive in the mockup: presets, color pickers, text style and the contrast check all work. The contrast math in its script matches the spec. Reused for Change look, where the button reads "Save look" |
| `Update.dc.html` | The bullet list is computed from the real comparison (see `HANDOFF.md`, New version) |
| `Make.dc.html` | Add a small "Make an import link" field: paste a URL to a hosted story file, get `<app url>/#/import?url=…` to copy or share. Copy prompt copies the exact prompt from `docs/story-format.md` |
| `Story.dc.html` | Passages are buttons; tapping one opens the note box for it. Header shows the story title, scene title and note count |
| `Choice.dc.html` | 2 or 3 choices. Confirm is disabled until one is picked |
| `Ending.dc.html` | Tone tints the ending art and header: good, bad, neutral |
| `Review.dc.html` | Tabs filter the timeline; Export uses the current tab for `.md`. Each decision has "Rewind to this decision" |
| `Rewind.dc.html` | Bottom sheet over Review (or the map). Rewind goes straight to that decision in Play |
| `Endings.dc.html` | Story-themed (Tide shown). Locked endings never show their titles |
| `Map.dc.html` | Story-themed. The real map is laid out from data, pans and pinch-zooms, and scenes are tappable |
| `Settings.dc.html` | Shows real counts and storage size, and "Last backup" |
