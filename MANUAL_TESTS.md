# Quest Journal: tests to do by hand

The automated tests cover the logic and the main flows in emulated phones. This list is for what only a real phone and a real person can judge. Tick a box when it passes; write down anything odd with the test number.

## Getting the app onto a phone

**Quick look, same Wi-Fi (no install, no offline):**

1. On the computer: `npm run build`, then `npm run preview -- --host`.
2. It prints a "Network" address such as `http://192.168.1.20:4173/`. Open that on the phone.

Everything works this way except installing to the home screen and offline use, because phones only allow those on `https://` addresses.

**Full test (install and offline):** the app has to be on an HTTPS host. Any free static host works: upload the `dist/` folder to Netlify or Cloudflare Pages, or push the repo to GitHub and run `npm run deploy:gh-pages`, then turn on Pages for the `gh-pages` branch. Run sections A and J from that address.

Test files are in `samples/` and `tests/fixtures/`. Send them to the phone (email, AirDrop, cloud drive) before starting.

## A. Install and offline (HTTPS address only)

- [ ] A1. iPhone, Safari: Share > Add to Home Screen. The icon is a lantern on a dark square, named "Quest Journal".
- [ ] A2. Android, Chrome: menu > Install app (or Add to Home screen). Same icon and name.
- [ ] A3. Open from the home screen: no browser address bar, dark background right up to the status bar, nothing hidden under the notch or the home indicator.
- [ ] A4. Turn on airplane mode, close the app fully, open it again: the library appears, fonts look the same as before (pixel title, not a fallback font).
- [ ] A5. Still in airplane mode: import a story from the phone's files, play a scene, write a note, close and reopen. Everything is still there.

## B. First launch and library

- [ ] B1. A new install shows "No stories yet." with a short welcome, and Import story / Make a story buttons.
- [ ] B2. The gear opens Settings; Back returns to the library.
- [ ] B3. After importing three stories, each row shows its cover, "by <author> · N scenes" and a tag: NEW, PLAYING or FINISHED.
- [ ] B4. The Continue card shows the story you played most recently, with scene number, choices made and notes, and Continue resumes it.
- [ ] B5. Rotate the phone, and try a small phone if you have one: nothing is cut off, no sideways scrolling.
- [ ] B6. On a desktop browser the app sits in a centered column about 480 px wide.

## C. Import from a file

- [ ] C1. Import `samples/the_well.quest.json`. Preview shows "The Well", by Your name, 4 scenes / 2 decisions / 2 endings, one generated portrait, and two green OK lines.
- [ ] C2. Import `samples/lantern_road.quest.zip`. Preview shows the cover picture (road with a lit lantern), three bundled portraits, 17 scenes / 11 decisions / 6 endings / 7 images, three OK lines.
- [ ] C3. The phone's file picker lets you choose both `.json` and `.zip` files (on iPhone, from Files; on Android, from Downloads or Drive).
- [ ] C4. Import `tests/fixtures/missing-target.quest.json`: a red "Fix" line names scene 'ferry' and 'jetty-typo'; the Next button is disabled.
- [ ] C5. Import `tests/fixtures/warnings-only.quest.json`: three yellow "Note" lines; Next is enabled and the story imports.
- [ ] C6. Import `tests/fixtures/broken-package.quest.zip`: two Fix lines (unsafe path, unreadable image); cannot import.
- [ ] C7. Import `tests/fixtures/not-json.quest.json` and any photo or PDF renamed to `.json`: a plain "not valid JSON" message, no crash.
- [ ] C8. "How do I make a story file?" opens the Make a story screen.

## D. Choose a look

- [ ] D1. Tapping each of the six presets changes the preview at once (colors of background, text, choice boxes, button).
- [ ] D2. Book / Clean / Pixel changes the preview's story text font.
- [ ] D3. Tap a color swatch under Your colors: the phone's color picker opens; picking a color updates the preview and the header says "Custom look".
- [ ] D4. Set Text almost the same as Background: the status box turns red, "Hard to read", yet the preview text is still readable (the app adjusted it).
- [ ] D5. "Use it" on the author's look row restores the author's colors and font.
- [ ] D6. Add to library, play the story: story screens use the look you picked; library, import and settings stay in the app's own dark look.
- [ ] D7. Story menu > Change look: change it, Save look, and the story screens follow. Saved paths and notes are untouched.
- [ ] D8. Try Parchment or Frost (light themes) through a whole scene, decision, ending and review: all text is readable, nothing is dark-on-dark or light-on-light.

## E. Play

- [ ] E1. Start The Lantern Road (package). Scene art fills the width and looks crisp, not blurry. Speaker names have their portrait and color.
- [ ] E2. Tap a passage: it highlights, a note box opens below it and the keyboard comes up without covering the box. Save note: the passage gets a yellow mark and shows the note; the header count goes up.
- [ ] E3. Tap the same passage, clear the text, tap "Delete note": the note and mark are gone.
- [ ] E4. Continue: the decision shows 2 or 3 choices labeled A, B, C. Confirm is disabled until one is picked, then reads "Confirm choice B".
- [ ] E5. Type a decision note, do not confirm, close the app completely, reopen, Continue: you are back at that scene and the decision note is still typed in.
- [ ] E6. Long passages and long choice labels wrap; nothing overflows.
- [ ] E7. The Back arrow on a scene goes to the library; on a decision it goes back to the scene.
- [ ] E8. The phone's own Back gesture never loses progress or lands on a broken page.
- [ ] E9. Play a story that uses built-in art only (`lantern_road.quest.json`, `the_well.quest.json`): every scene shows a fitting pixel scene. Judge the art: this is v1 placeholder art (see Open questions).
- [ ] E10. Reach all 6 endings of The Lantern Road over several runs. (Fast routes: A-A-A-B ash; A-A-B-A silent; A-C-B current; B-B village; A-C-A-A bell; A-C-A-B light.)

## F. Ending, review, export

- [ ] F1. The last scene's text is shown before "The end". The ending screen shows the ending title, "ending N of 6 found", four stats, your last three choices, and a name field with "<story> run <n>".
- [ ] F2. Good, bad and neutral endings look different (green, red, or the story's accent tint). Compare The Bell Rings (good), The Cold Current (bad), The Silent Landing (neutral).
- [ ] F3. "played" time is believable (it counts time on the play screens while the app is visible).
- [ ] F4. Rename the path, Save & review: the review title is the new name.
- [ ] F5. Review tabs: Full story shows all text; Choices shows only decisions with CHOSEN and the skipped ones; Notes shows only scenes with notes.
- [ ] F6. Edit a note in Review, save; clear a note to delete it.
- [ ] F7. Export as text on a phone: the share sheet opens with a `.md` file; send it to yourself (mail, Messages, Files) and open it: title line, "Ending: … · N choices · N notes · date", numbered scenes, **Chose**, *Skipped*, notes as quotes.
- [ ] F8. Export as text while on the Notes tab: the file only has the noted scenes.
- [ ] F9. Export .json: you receive `<story-id>_<run-name>.path.json`; it opens as readable JSON starting with `"format": "quest-path/1"`.
- [ ] F10. Cancel the share sheet: the app says the export was cancelled, nothing breaks.
- [ ] F11. On a desktop browser, both exports download as files instead.

## G. Rewind

- [ ] G1. In Review, "Rewind to this decision" on an early scene: the sheet names the scene, marks what you chose last time, and says the old path stays saved.
- [ ] G2. Rewind: you land on that decision. Notes from the scenes before it came along.
- [ ] G3. Pick a different choice and play to another ending. The library now lists both paths under Saved paths; the first one is exactly as it was (same choices, notes, ending).
- [ ] G4. Open an unfinished saved path in Review: "Continue this path" resumes it.

## H. Endings and story map

- [ ] H1. Story menu before finishing: Story map is greyed out with "Finish the story to unlock".
- [ ] H2. After one ending: Endings shows "1 / 6", one card with picture, title, tone, date and Review path; five "Not found yet" cards with no titles.
- [ ] H3. After two different endings, open the map: both paths are drawn, the latest in the accent color, the other muted; "?" boxes for choices not taken.
- [ ] H4. No scene you have not visited is named anywhere on the map screen.
- [ ] H5. Drag with one finger to move the map; pinch with two to zoom; − / Fit / + buttons work; the page itself does not scroll or zoom while you do it.
- [ ] H6. Tap a numbered scene: its choices (CHOSEN / not explored), your notes there, and "Rewind to this decision", which works like G2.
- [ ] H7. Tap an ending star: "Review the path that ended here" opens that path.

## I. Story updates and import links

- [ ] I1. With The Lantern Road (`.quest.json`, v1.0) in progress mid-story, import `lantern_road.quest.zip` (v1.1): the New version screen shows v1.0 → v1.1 and a list of what happens. "Update and keep my progress": you continue in the same scene, now with the bundled pictures.
- [ ] I2. Import the same file twice: "You already have this version."
- [ ] I3. "Keep v1.x, don't update" leaves everything as it was.
- [ ] I4. Edit a copy of the story on a computer: bump `version`, delete the scene you are standing in, import it. The screen warns "You start over"; after updating, the old run is under Saved paths (marked left) and still readable.
- [ ] I5. Make a story > Make an import link: paste the address of a story file hosted on GitHub (raw file) or a Gist; copy the link; open it on another phone or browser: the import screen opens with that story checked and ready.
- [ ] I6. Paste a link to a site that does not allow downloads (any normal web page address): a plain message says the host blocks the download and to save the file and import it.

## J. Backup and restore (do on the HTTPS address if possible)

- [ ] J1. Settings shows real counts (stories, paths, notes, MB) and "Last backup: never".
- [ ] J2. Save backup file: the share sheet (phone) or a download (desktop) gives `quest-journal-backup-YYYY-MM-DD.zip`; "Last backup" now shows today.
- [ ] J3. On a second device or browser (or after removing every story): Settings > Choose backup file. Stories, saved paths, notes, endings found and looks are back; the message lists what was added.
- [ ] J4. Restore the same backup again: "already on this phone", nothing duplicated.
- [ ] J5. Choose a non-backup file (a story zip, a photo): a plain message, nothing changed.
- [ ] J6. iPhone only: leave the installed app unopened for a few weeks, then open it. If the data is gone, restore from the backup. (This is the case Backup exists for.)

## K. Make a story

- [ ] K1. Download template gives `my_story.quest.json`; importing it unchanged works (it is The Well).
- [ ] K2. Copy prompt, paste into an AI chat with an idea, save the reply as `something.quest.json`, import it. If Import reports a problem, the message is clear enough to paste back to the AI and get a fixed file.
- [ ] K3. Build your own `.quest.zip` (story.json + images/ folder) following the screen's instructions; it imports and shows your images.

## L. Removing

- [ ] L1. Story menu > Remove from library asks first and says how many paths and notes go. "Keep it" cancels.
- [ ] L2. Remove: the story, its saved paths and its Continue card are gone; other stories are untouched.

## M. Comfort and accessibility

- [ ] M1. Every button is easy to hit with a thumb; nothing needs a precise tap.
- [ ] M2. iPhone VoiceOver or Android TalkBack: swipe through the library, a scene and a decision. Buttons, choices ("radio button, 2 of 3"), passages and notes are announced sensibly; sheets can be closed.
- [ ] M3. With the phone's "Reduce motion" setting on, sheets appear without sliding.
- [ ] M4. With a larger system text size, text grows or at least stays readable and nothing overlaps.
- [ ] M5. With a hardware keyboard or on desktop: Tab reaches everything, focus is visible, Escape closes sheets.

## Known limits to keep in mind

- Lighthouse was not run. The install manifest, icons and service worker are checked by the automated tests; A1–A5 are the real proof.
- Sharing a file from the app depends on the phone's browser. Where it cannot share files, the app downloads the file instead.
- The 28 built-in scenes are simple coded pixel art, meant as placeholders until the owner decides on final art.
