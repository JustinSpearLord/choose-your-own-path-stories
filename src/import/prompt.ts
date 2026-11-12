// The prompt behind "Copy prompt" on the Make a story screen.
// It must stay word-for-word the same as the one in docs/story-format.md (a unit test checks this).
export const AI_PROMPT = `Write a branching choose-your-own-adventure story as a Quest Journal
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
My idea: [YOUR STORY IDEA]`;

export const FORMAT_SNIPPET = `{
  "format": "quest/1",
  "id": "lantern-road",
  "title": "The Lantern Road",
  "author": "Your name",
  "start": "ferry",
  "characters": [
    { "id": "wren", "name": "Wren" }
  ],
  "scenes": {
    "ferry": {
      "art": "river_dusk",
      "text": [
        "The ferry groans…",
        { "speaker": "wren",
          "line": "Someone put it out." }
      ],
      "choices": [
        { "text": "Land the ferry", "to": "bank" },
        { "text": "Drift in silent", "to": "home" }
      ]
    },
    "home": {
      "text": ["…"],
      "ending": { "title": "Home before dawn" }
    },
    "bank": {
      "text": ["…"],
      "ending": { "title": "The dark bank",
                  "tone": "bad" }
    }
  }
}`;

export const PACKAGE_TREE = `my_story.quest.zip
├─ story.json
└─ images/
   ├─ cover.png
   ├─ ferry.png
   └─ portraits/
      └─ wren.png`;
