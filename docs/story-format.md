# Quest Journal Story Format (quest/1)

A Quest Journal story is either a single UTF-8 JSON file ending in `.quest.json`, or a `.quest.zip` package holding that JSON plus the story's own images. Either way it holds a set of scenes, each with passages of text and either 2–3 choices or an ending, and the app plays it as a choose-your-own-adventure.

## Overview

- **Who writes it:** anyone, by hand in a text editor or by asking an AI to produce it. The format is plain enough for both.
- **How it travels:** the file is sent any way a file can be (message, email, cloud drive), or hosted at a link. The player opens it in Quest Journal or picks it from the Import screen.
- **What the app does with it:** checks it against the rules below, shows a preview, adds it to the library, and plays it fully offline.
- **What comes back out:** after a playthrough, the player can export their path (choices taken, choices skipped, and notes) as `.json` or as readable text (`.md`).

This spec is version `quest/1`. A file that declares a format the app does not know is rejected, so future versions can change the rules safely.

## File structure

The file is a single JSON object. Field names are case-sensitive; unknown fields are ignored, so writers can keep their own extra data (for example `"_notes"`).

| Field | Type | Required | What it is |
| --- | --- | --- | --- |
| `format` | string | Yes | Always `"quest/1"` for this version |
| `id` | string | Yes | Short unique id for the story, e.g. `"lantern-road"`. Saved paths, notes and the player's chosen look attach to it |
| `title` | string | Yes | Shown in the library and on the Import preview |
| `author` | string | Yes | A name, a handle, or `"AI-generated"` |
| `version` | string | No | e.g. `"1.2"`. Shown on Import; bump it when you revise a story |
| `summary` | string | No | One or two sentences for the Import preview |
| `cover` | string | No | Built-in art name or bundled image path for the library card. Default: the start scene's art |
| `theme` | object | No | The story's colors and text style, see Theme. Default: the `dusk` preset |
| `imageStyle` | string | No | `"pixel"` (default) or `"smooth"`, how bundled images are scaled, see Story packages and images |
| `start` | string | Yes | Id of the first scene |
| `characters` | array | No | Speakers, see Characters |
| `scenes` | object | Yes | Every scene, keyed by scene id, see Scenes |

**Ids** (story, scene and character ids) use lowercase letters, digits, `_` and `-` only, start with a letter, and are at most 40 characters: `ferry`, `dark_bank`, `end-home`.

**Limits:** 500 scenes, 30 characters, 2 MB per `.quest.json` file.

## Story packages and images

A story with its own images ships as a `.quest.zip`: an ordinary zip archive with `story.json` at the top and the images in an `images/` folder. Any field that takes art (`cover`, a scene's `art`, a character's `portrait`) accepts either a built-in art name or a path into that folder. Built-in and bundled art can be mixed freely in one story.

```text
lantern_road.quest.zip
├── story.json          the story, exactly as in a .quest.json file
└── images/
    ├── cover.png
    ├── ferry.png
    └── portraits/
        └── wren.png
```

```json
"cover": "images/cover.png",
"art": "images/ferry.png",
{ "id": "wren", "name": "Wren", "portrait": "images/portraits/wren.png" }
```

| Image | Shape | Recommended size | Shown |
| --- | --- | --- | --- |
| Scene art and cover | 16:9 | 160×90 or 320×180 px | Full width above the text, cropped to fit |
| Portrait | Square | 32×32 or 48×48 px | Beside the speaker's name, and on Import |

**Files:** PNG or WebP only; up to 1 MB each, 200 images and 20 MB per package. Paths use forward slashes, start with `images/`, and match the file name exactly, including case (`Ferry.png` and `ferry.png` are different files).

**Scaling:** with `"imageStyle": "pixel"` (the default) images are scaled up in whole steps with no smoothing, so a 160×90 scene stays crisp on any phone. Set `"imageStyle": "smooth"` at the top level for painted or photographic art.

**Safety:** the app only reads `story.json` and image files from a package. Anything else in the zip is ignored, and a path that tries to leave the package (`../`, a leading `/`) blocks the import.

A plain `.quest.json` cannot carry images. Its art fields must use built-in names, and a path there is treated as an unknown name.

## Theme: colors and tone

Each story can set its own look with an optional `theme`, so a marsh ghost story and a court drama don't feel the same. The author's theme is only a starting point: on Import the player sees it in a live preview and can keep it, switch to a preset, or set their own colors.

```json
"theme": {
  "preset": "tide",
  "colors": { "accent": "#6FD6C2" },
  "font": "serif"
}
```

| Field | Type | What it is |
| --- | --- | --- |
| `preset` | string | One of the six presets below. Default: `"dusk"` |
| `colors` | object | Any of `background`, `panel`, `text`, `accent` as `#RRGGBB`. Each one given replaces that color from the preset |
| `font` | string | Story text style: `"serif"` (book), `"sans"` (clean) or `"pixel"`. Default: `"serif"` |

| Preset | Tone | Background | Panel | Text | Accent |
| --- | --- | --- | --- | --- | --- |
| `dusk` | Quiet, eerie | `#15131C` | `#201D29` | `#EDE8F5` | `#E8B44C` |
| `tide` | Cold, watery | `#0F1E24` | `#17303A` | `#E3F1F0` | `#5CC8B4` |
| `ember` | Tense, violent | `#1E1110` | `#2E1A17` | `#F5E6DC` | `#E2725B` |
| `moss` | Old, wild | `#141A12` | `#1F2A1C` | `#E6EEDC` | `#A8C66C` |
| `parchment` | Warm, storybook (light) | `#F2E8D5` | `#E6D8BC` | `#2B2118` | `#8A4B2A` |
| `frost` | Clear, bright (light) | `#EEF2F6` | `#DCE4EC` | `#1B2430` | `#3D6FB0` |

**What each color does:** `background` is behind the story; `panel` is choice buttons and note boxes; `text` is the story and choices; `accent` is speaker names, the selected choice, and main buttons. Button text on the accent is drawn dark (`#15131C`) or white, whichever has higher contrast against the accent.

**Readability is kept automatically.** If text against the background falls under 4.5:1 contrast (WCAG formula), the app shifts the text color toward white or black until it reaches 4.5:1, and the Import preview says so. Every preset passes (text 13:1 or better, accent 4.6:1 or better). Scene art and portraits are never recolored.

**The player's choice stays on their device.** It is saved per story `id`, survives updates to the story, and can be changed or reset to the author's look from the story's menu in the library. It is never written into the story file or into exported paths.

## Characters

Characters are optional and exist only so the player can show who is speaking: a name label in the character's color and a small pixel portrait, either bundled or generated from that color.

| Field | Type | Required | What it is |
| --- | --- | --- | --- |
| `id` | string | Yes | Used in passages, e.g. `"wren"` |
| `name` | string | Yes | Shown above their lines, e.g. `"Wren"` |
| `color` | string | No | Hex color like `"#3F7D5C"` for the name label, and for the generated portrait when there is no `portrait`. Default: a color picked from the id |
| `portrait` | string | No | Bundled image path, e.g. `"images/portraits/wren.png"`. Packages only. Default: a pixel face generated from `color` |
| `about` | string | No | One line for the writer or AI. The player does not show it |

```json
"characters": [
  { "id": "wren", "name": "Wren", "color": "#3F7D5C", "about": "Ranger, terse, keeps the lanterns lit" },
  { "id": "maddox", "name": "Maddox", "color": "#8A8494" }
]
```

## Scenes

Every scene is either a **decision scene** (2 or 3 choices) or an **ending scene** (an `ending`, no choices). Nothing in between: a scene that just leads on to the next one is written as part of that next scene, or given 2 choices.

| Field | Type | Required | What it is |
| --- | --- | --- | --- |
| `title` | string | No | Shown in the header and the review, e.g. `"Ferry crossing"`. Default: the scene id |
| `art` | string | No | Built-in art name or bundled image path. Default: the previous scene's art |
| `text` | array | Yes | One or more passages, read top to bottom |
| `prompt` | string | No | The decision question. Default: `"What do you do?"` |
| `choices` | array | Decision scenes | 2 or 3 choices |
| `ending` | object | Ending scenes | Marks the scene as an ending |

### Passages

Each item in `text` is one passage: the unit a player can tap to attach a note. Keep one beat or one line of dialogue per passage.

- A plain string is narration: `"The ferry groans against its rope."`
- An object is dialogue: `{ "speaker": "wren", "line": "Someone put it out." }`. The speaker must be a character id. Write the line without quote marks; the app adds them.

### Choices

| Field | Type | Required | What it is |
| --- | --- | --- | --- |
| `text` | string | Yes | The button label, an action in the player's voice: `"Douse your lantern and drift in"` |
| `to` | string | Yes | Id of the scene this choice leads to |

Two choices may lead to the same scene. Choices show in the order written, labeled A, B, C.

### Endings

| Field | Type | Required | What it is |
| --- | --- | --- | --- |
| `title` | string | Yes | Shown under THE END, e.g. `"The Silent Landing"` |
| `tone` | string | No | `"good"`, `"bad"` or `"neutral"`. Tints the ending screen. Default: `"neutral"` |

The Endings screen counts how many of the story's endings this player has found, so give each ending its own scene.

## Built-in art

These pixel scenes ship with the app, so any story can use them without carrying images, and a plain `.quest.json` can use nothing else. An unknown name shows `default` and is flagged on Import.

| Group | Art names |
| --- | --- |
| Outdoors | `forest`, `forest_night`, `road`, `road_dusk`, `mountain_pass`, `field`, `camp` |
| Water | `river`, `river_dusk`, `marsh`, `harbor`, `sea_storm` |
| Settlements | `village`, `village_night`, `market`, `tavern`, `house_interior` |
| Old places | `ruins`, `abbey`, `bell_tower`, `crypt`, `cave`, `dungeon` |
| Grand places | `castle_gate`, `castle_hall`, `library`, `throne_room` |
| Fallback | `default` (a plain night sky) |

The `_dusk` and `_night` variants are the same place in different light, useful for showing time passing.

## Validation on Import

The Import screen runs these checks before a story enters the library. **Errors** block the import and name the scene to fix. **Warnings** let the import go ahead and are listed on the preview.

| Check | Result |
| --- | --- |
| File is valid JSON (or a zip with `story.json` at the top) | Error |
| `.quest.json` under 2 MB; `.quest.zip` under 20 MB with at most 200 images | Error |
| No path in a package leaves it (`../`, a leading `/`) | Error |
| `format` is `"quest/1"` | Error |
| `id`, `title`, `author`, `start`, `scenes` are present | Error |
| `start` names a scene that exists | Error |
| Every scene has at least one passage | Error |
| Every scene has either 2–3 `choices` or an `ending`, never both, never neither | Error |
| Every choice's `to` names a scene that exists | Error |
| Every `speaker` names a character | Error |
| Ids use only `a–z`, `0–9`, `_`, `-` and are ≤ 40 characters | Error |
| At least one ending scene exists | Error |
| Every ending has a `title`, and its `tone`, if given, is `good`, `bad` or `neutral` | Error |
| Every bundled image is a readable PNG or WebP of at most 1 MB | Error |
| Every image path names a file in the package, with matching case | Warning (shows `default`, or the generated portrait) |
| Every `art` name is built in | Warning (shows `default`) |
| Scene art is roughly 16:9 and portraits are square | Warning (they are cropped to fit) |
| Every image in the package is used | Warning (unused images only make the file bigger) |
| Every scene can be reached from `start` | Warning (unused scenes are kept but never shown) |
| Every scene can reach at least one ending | Warning (the player could loop forever) |
| No passage is longer than 600 characters | Warning (split long text so notes stay precise) |
| Importing a story whose `id` is already in the library | Goes to the New version screen (see HANDOFF.md) |

Theme checks are all warnings, because a bad theme never stops a story from playing: an unknown `preset` or `font` falls back to the default, a color that isn't `#RRGGBB` is ignored, text under 4.5:1 against the background is adjusted, and an accent under 3:1 against the background is flagged on the preview.

When a revised story replaces an older one, saved paths and notes stay attached by scene id and passage position. Renaming a scene id or reordering its passages detaches the notes on that scene, so prefer adding new scenes over renaming old ones.

`tools/validate_quest.py` implements every check in this section and is the reference for the app's TypeScript validator.

## Minimal example

The smallest useful story: one decision scene with two choices, a second decision with three, and two endings. It passes every check above. It is also in `samples/the_well.quest.json`. The full sample story, *The Lantern Road*, is in `samples/` both as `lantern_road.quest.json` and as the package `lantern_road.quest.zip` with its own scene art and portraits.

```json
{
  "format": "quest/1",
  "id": "the-well",
  "title": "The Well",
  "author": "Your name",
  "start": "well",
  "characters": [
    { "id": "voice", "name": "The Voice", "color": "#7A6FB0" }
  ],
  "scenes": {
    "well": {
      "title": "The old well",
      "art": "village_night",
      "text": [
        "Something is calling your name from the bottom of the village well.",
        { "speaker": "voice", "line": "Come down. I have been waiting." }
      ],
      "choices": [
        { "text": "Climb down the rope", "to": "bottom" },
        { "text": "Walk away and do not look back", "to": "end-home" }
      ]
    },
    "bottom": {
      "title": "The bottom",
      "art": "cave",
      "text": ["The water is shallow and warm. A small door is set into the stone."],
      "prompt": "The door has no handle. What do you do?",
      "choices": [
        { "text": "Knock", "to": "end-door" },
        { "text": "Answer the voice", "to": "end-door" },
        { "text": "Climb back up", "to": "end-home" }
      ]
    },
    "end-door": {
      "art": "cave",
      "text": ["The door opens inward, onto daylight that should not be there."],
      "ending": { "title": "The Other Side", "tone": "good" }
    },
    "end-home": {
      "art": "village_night",
      "text": ["You sleep badly. In the morning the well has been filled in."],
      "ending": { "title": "Never Knowing", "tone": "neutral" }
    }
  }
}
```

Two choices in `bottom` lead to the same scene. That is allowed, and handy when a choice changes how the player feels about a moment rather than where the story goes.

## Generating a story with AI

This is the prompt behind the app's Copy prompt button on the Make a story screen. Paste it into any AI chat, replace the bracketed parts, and save the reply as `<something>.quest.json`. Attaching this spec or the sample story to the chat improves results noticeably.

```text
Write a branching choose-your-own-adventure story as a Quest Journal
story file. Reply with only the JSON, no explanation.

Rules (format "quest/1"):
- Top level: format "quest/1", id, title, author "AI-generated",
  summary, start, characters, scenes.
- Ids: lowercase a-z, 0-9, _ and -, start with a letter, max 40 chars.
- characters: [{ id, name, color (hex) }].
- scenes: an object keyed by scene id. Each scene has title, art, text.
- text: a list of short passages. Narration is a string. Dialogue is
  { "speaker": "<character id>", "line": "..." } without quote marks.
- Every scene has EITHER 2 or 3 choices [{ text, to }] OR an ending
  { title, tone: good | bad | neutral }. Never both, never neither.
- Every "to" must be an existing scene id. Every scene must be
  reachable from start, and every path must reach an ending.
- art must be one of: forest, forest_night, road, road_dusk,
  mountain_pass, field, camp, river, river_dusk, marsh, harbor,
  sea_storm, village, village_night, market, tavern, house_interior,
  ruins, abbey, bell_tower, crypt, cave, dungeon, castle_gate,
  castle_hall, library, throne_room.
- Passages under 600 characters. Choices are actions in second person.
- theme: { preset, font } that fits the mood. preset is one of dusk,
  tide, ember, moss, parchment, frost; font is serif, sans or pixel.

Story size: [12-40] scenes, [3] endings, [2-4] characters.
Tone: [e.g. eerie folk tale, light comedy, grim political drama].
Characters: [names and one line each, or "invent them"].
My idea: [YOUR STORY IDEA]
```

AI output sometimes breaks a rule (usually a choice pointing to a scene it forgot to write). Import names the exact scene, so the fix is either editing the file or pasting the error back into the chat and asking for a corrected file.

To give an AI-written story its own images: generate or draw them separately at the sizes above, put them in an `images/` folder beside the JSON renamed to `story.json`, set the `art`, `cover` and `portrait` fields to their paths, and zip the two together as `<something>.quest.zip`. Any scene left on a built-in name keeps working.

## Exported paths

A saved playthrough exports in two forms. `.json` is for tools: it can be re-opened in the app's Review screen or read by a script. `.md` is for people: it reads like a script with the notes in place. Playtesters send these files to the author by hand.

### Path file (`.path.json`)

```json
{
  "format": "quest-path/1",
  "story": { "id": "lantern-road", "title": "The Lantern Road", "version": "1.0" },
  "name": "Stealth run",
  "started": "2026-11-08T13:02:00Z",
  "finished": "2026-11-08T13:43:00Z",
  "ending": { "scene": "end-silent", "title": "The Silent Landing" },
  "steps": [
    {
      "scene": "ferry",
      "notes": [ { "passage": 0, "text": "Light as a resource?" } ],
      "choice": { "index": 1, "text": "Douse your lantern and drift in", "to": "reeds" },
      "skipped": ["Land the ferry at the jetty", "Make Maddox tell you what he knows"],
      "choiceNote": "Silent path felt best."
    },
    { "scene": "end-silent", "notes": [] }
  ]
}
```

`steps` runs in play order, one per scene visited, ending with the ending scene (no `choice`). An unfinished run omits `finished` and `ending`, and its last step has no `choice`. `notes[].passage` is the position in that scene's `text`, counting from 0. A note that belongs to the whole scene rather than one passage (this happens when a story update rewrites the passage it was on) has `"passage": null`. `skipped` copies the choices not taken, so the file still makes sense without the story beside it.

### Text file (`.md`)

```markdown
# The Lantern Road: Stealth run
Ending: The Silent Landing · 7 choices · 5 notes · Nov 8, 2026

## 3. Ferry crossing
The ferry groans against its rope as Maddox poles you out into the fog.
> Note: Light as a resource?

**Chose:** Douse your lantern and drift in
*Skipped:* Land the ferry at the jetty · Make Maddox tell you what he knows
> Note on this decision: Silent path felt best.
```

The Review screen's Full story / Choices / Notes tabs control how much of each scene's text goes into the `.md` export.
