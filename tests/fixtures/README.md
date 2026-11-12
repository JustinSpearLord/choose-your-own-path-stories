# Validator fixtures

Each file here is broken on purpose (or, for `warnings-only` and `bad-theme`, imports with warnings only). `expected.json` holds what `tools/validate_quest.py` reports for every fixture and every file in `samples/`.

The app's TypeScript validator must, for every file in `expected.json`:

- report the **same number** of errors and of warnings;
- name the **same scene, character, image or field** in each message.

Exact wording may differ, with one exception: the JSON parse error (`not-json.quest.json`) will naturally read differently in a browser.

| Fixture | What it breaks | Result |
| --- | --- | --- |
| `missing-target` | A choice leads to a scene that doesn't exist | 1 error |
| `four-choices` | A decision with 4 choices | 1 error |
| `one-choice` | A decision with 1 choice (also makes two scenes unreachable) | 1 error, 2 warnings |
| `unknown-speaker` | Dialogue from a character that isn't defined | 1 error |
| `choices-and-ending` | A scene with both choices and an ending | 1 error |
| `bad-ending` | An ending with no title, and one with an invalid tone | 2 errors |
| `bad-scene-id` | A scene id with capitals and a space | 3 errors, 3 warnings |
| `bad-header` | Wrong format, missing author, start scene missing | 3 errors, 17 warnings |
| `no-ending` | Scenes that loop forever with no ending | 1 error, 2 warnings |
| `not-json` | Invalid JSON | 1 error |
| `warnings-only` | Unreachable scene, unknown art name, passage over 600 characters | 3 warnings |
| `bad-theme` | Unknown preset, font and color key, bad hex, unreadable text color | 5 warnings |
| `image-path-in-json` | An image path in a plain `.quest.json` | 1 warning |
| `broken-package` (zip) | `../` path, fake PNG, wrong-case path, missing image, unused images, portrait used as scene art. Also has a `readme.txt` that must be ignored | 2 errors, 6 warnings |
| `no-story-json` (zip) | `story.json` is not at the top of the zip | 1 error |

Regenerate `expected.json` only when the format rules change, together with `docs/story-format.md` and both validators.
