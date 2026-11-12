import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const ROOT = process.cwd();
const LANTERN_JSON = join(ROOT, 'samples/lantern_road.quest.json');
const LANTERN_ZIP = join(ROOT, 'samples/lantern_road.quest.zip');
const WELL = join(ROOT, 'samples/the_well.quest.json');

interface StoryJson {
  start: string;
  version?: string;
  scenes: Record<string, { title?: string; text: unknown[]; choices?: { text: string; to: string }[]; ending?: { title: string } }>;
}
const packageFiles = unzipSync(new Uint8Array(readFileSync(LANTERN_ZIP)));
const lantern = JSON.parse(strFromU8(packageFiles['story.json'])) as StoryJson;

/** Choice indexes that reach each ending. */
function pathsToEndings(s: StoryJson): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const queue: { id: string; path: number[] }[] = [{ id: s.start, path: [] }];
  const seen = new Set<string>();
  while (queue.length) {
    const { id, path } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (s.scenes[id].ending) out.set(id, path);
    (s.scenes[id].choices ?? []).forEach((c, i) => queue.push({ id: c.to, path: [...path, i] }));
  }
  return out;
}

test.beforeEach(async ({ page }) => {
  // Exports go through a plain download in tests, not the system share sheet.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await page.goto('./');
});

async function pickFile(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  if (!page.url().includes('#/import')) await page.getByRole('link', { name: 'Import story' }).click();
  await page.getByTestId('story-file').setInputFiles(file);
  await expect(page.getByRole('heading', { name: 'File check' })).toBeVisible();
}

async function importNew(page: Page, file: string) {
  await pickFile(page, file);
  await page.getByRole('button', { name: 'Next: choose a look' }).click();
  await page.getByRole('button', { name: 'Add to library with this look' }).click();
  await expect(page.getByRole('heading', { name: 'Stories' })).toBeVisible();
}

async function startStory(page: Page, title: string) {
  await page.getByRole('link', { name: new RegExp(title) }).first().click();
  await page.getByRole('button', { name: /from the start/ }).click();
  await expect(page.getByTestId('passage').first()).toBeVisible();
}

async function decide(page: Page, index: number, note?: string) {
  await page.getByRole('link', { name: 'Continue', exact: true }).click();
  await page.getByTestId('choice').nth(index).click();
  if (note) await page.getByLabel('Note on this decision').fill(note);
  await page.getByRole('button', { name: /Confirm choice/ }).click();
  await expect(page.getByRole('button', { name: /Confirm choice/ })).toHaveCount(0);
}

async function playPath(page: Page, path: number[]) {
  for (const index of path) await decide(page, index);
}

test('import: both Lantern Road files and The Well, with previews, checks and covers', async ({ page }) => {
  await pickFile(page, LANTERN_JSON);
  const preview = page.getByRole('region', { name: 'Story preview' });
  await expect(preview.getByRole('heading', { name: 'The Lantern Road' })).toBeVisible();
  await expect(preview).toContainText('by Quest Journal sample');
  await expect(preview).toContainText('lantern_road.quest.json');
  await expect(preview).toContainText('17scenes');
  await expect(preview).toContainText('11decisions');
  await expect(preview).toContainText('6endings');
  await expect(preview.locator('[data-portrait="generated"]')).toHaveCount(3);
  await expect(page.locator('li[data-kind="ok"]')).toHaveCount(2);
  await expect(page.locator('li[data-kind="fix"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next: choose a look' }).click();

  // Choose a look: the preview follows presets, colors and text style.
  const look = page.getByTestId('look-preview');
  await expect(look).toHaveAttribute('data-bg', '#15131C');
  await page.getByRole('radio', { name: /Tide/ }).click();
  await expect(look).toHaveAttribute('data-bg', '#0F1E24');
  await page.getByRole('radio', { name: 'Pixel' }).click();
  await expect(look).toHaveAttribute('data-font', 'pixel');
  await page.getByLabel('Text color').fill('#10242a');
  await expect(page.getByRole('status')).toContainText('Hard to read.');
  await page.getByRole('button', { name: 'Use it' }).click();
  await expect(look).toHaveAttribute('data-bg', '#15131C');
  await expect(page.getByRole('status')).toContainText('Easy to read.');
  await page.getByRole('radio', { name: /Moss/ }).click();
  await page.getByRole('button', { name: 'Add to library with this look' }).click();

  const row = page.locator('a[data-story="lantern-road"]');
  await expect(row).toContainText('The Lantern Road');
  await expect(row).toContainText('17 scenes');
  await expect(row).toContainText('NEW');
  await expect(row.locator('[data-art="road_dusk"] svg')).toBeVisible();

  // The package has the same story id: it is a new version, with bundled art.
  await pickFile(page, LANTERN_ZIP);
  await expect(page.getByRole('region', { name: 'Story preview' })).toContainText('7images');
  await expect(page.getByRole('region', { name: 'Story preview' }).locator('[data-portrait="bundled"]')).toHaveCount(3);
  await expect(page.locator('li[data-kind="ok"]').last()).toContainText('7 bundled images, all readable and found');
  await page.getByRole('button', { name: 'Next: choose a look' }).click();
  await expect(page.getByRole('heading', { name: 'New version' })).toBeVisible();
  await expect(page.getByText('v1.0', { exact: true })).toBeVisible();
  await expect(page.getByText('v1.1', { exact: true })).toBeVisible();
  await expect(page.getByTestId('update-effects')).toContainText('Your look stays Moss.');
  await page.getByRole('button', { name: 'Update the story' }).click();
  await expect(row.locator('[data-art="images/cover.png"] img')).toBeVisible();

  await importNew(page, WELL);
  await expect(page.locator('a[data-story="the-well"]')).toContainText('by Your name · 4 scenes');
  await expect(page.getByText('2 imported')).toBeVisible();

  // The story menu shows the kept look, and the look applies to story screens.
  await row.click();
  const menu = page.getByRole('dialog');
  await expect(menu).toContainText('version 1.1');
  await expect(menu).toContainText('Look: Moss');
  await expect(menu.getByRole('button', { name: /Story map/ })).toBeDisabled();
  await menu.getByRole('button', { name: 'Play from the start' }).click();
  await expect(page.locator('[data-story-theme="#141A12"]')).toBeVisible();
});

test('import: errors block and name the scene, warnings allow', async ({ page }) => {
  await pickFile(page, join(ROOT, 'tests/fixtures/missing-target.quest.json'));
  await expect(page.locator('li[data-kind="fix"]')).toContainText("scene 'ferry'");
  await expect(page.locator('li[data-kind="fix"]')).toContainText('jetty-typo');
  await expect(page.getByRole('button', { name: 'Next: choose a look' })).toBeDisabled();

  await page.getByTestId('story-file').setInputFiles(join(ROOT, 'tests/fixtures/broken-package.quest.zip'));
  await expect(page.locator('li[data-kind="fix"]')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Next: choose a look' })).toBeDisabled();

  await page.getByTestId('story-file').setInputFiles(join(ROOT, 'tests/fixtures/not-json.quest.json'));
  await expect(page.locator('li[data-kind="fix"]')).toContainText('not valid JSON');

  await page.getByTestId('story-file').setInputFiles(join(ROOT, 'tests/fixtures/warnings-only.quest.json'));
  await expect(page.locator('li[data-kind="note"]')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Next: choose a look' })).toBeEnabled();
});

test('play: the package reaches all 6 endings; notes, autosave and resume work', async ({ page }) => {
  test.setTimeout(180_000);
  await importNew(page, LANTERN_ZIP);
  const paths = pathsToEndings(lantern);
  expect(paths.size).toBe(6);

  let first = true;
  for (const [ending, path] of paths) {
    await startStory(page, 'The Lantern Road');
    if (first) {
      first = false;
      // bundled scene art and portraits show
      await expect(page.locator('[data-art="images/cover.png"] img')).toBeVisible();
      await expect(page.locator('[data-portrait="bundled"]').first()).toBeVisible();
      // a passage note
      await page.getByTestId('passage').first().click();
      await page.getByLabel('Note on this passage').fill('Light as a resource?');
      await page.getByRole('button', { name: 'Save note' }).click();
      await expect(page.getByTestId('note-count')).toHaveText(/1 note/);
      await expect(page.getByTestId('passage').first()).toContainText('Light as a resource?');
      // a decision note, typed but not confirmed, then the app is closed mid-scene
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await page.getByLabel('Note on this decision').fill('Not sure yet');
      await page.waitForTimeout(900);
      await page.reload();
      await expect(page.getByLabel('Note on this decision')).toHaveValue('Not sure yet');
      await page.goto('./');
      await expect(page.getByRole('region', { name: 'Continue your story' })).toContainText('Scene 1 · 0 choices made · 2 notes');
      await page.getByRole('link', { name: 'Continue story' }).click();
      await expect(page.getByTestId('passage').first()).toContainText('Light as a resource?');
    }
    await playPath(page, path);
    await expect(page.getByTestId('passage').first()).toBeVisible();
    await page.getByRole('link', { name: 'The end' }).click();
    await expect(page.getByText('THE END')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lantern.scenes[ending].ending!.title);
    await page.getByRole('link', { name: 'Back to the library' }).click();
  }

  await page.locator('a[data-story="lantern-road"]').click();
  await expect(page.getByRole('dialog')).toContainText('6 of 6');
  await page.getByRole('link', { name: /Endings found/ }).click();
  await expect(page.getByTestId('ending-found')).toHaveCount(6);
  await expect(page.getByTestId('ending-locked')).toHaveCount(0);
});

test('ending, review, export and rewind', async ({ page }) => {
  await importNew(page, LANTERN_JSON);
  await startStory(page, 'The Lantern Road');
  await playPath(page, [0, 0]);
  await page.getByTestId('passage').first().click();
  await page.getByLabel('Note on this passage').fill('Light as a resource?');
  await page.getByRole('button', { name: 'Save note' }).click();
  await decide(page, 1, 'Silent path felt best.');
  await decide(page, 0);
  await page.getByRole('link', { name: 'The end' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Silent Landing');
  await expect(page.getByText('ending 1 of 6 found')).toBeVisible();
  await expect(page.getByLabel('Name this path')).toHaveValue('The Lantern Road run 1');
  await page.getByLabel('Name this path').fill('Stealth run');
  await page.getByRole('button', { name: 'Save & review story' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stealth run');
  await expect(page.getByTestId('review-entry')).toHaveCount(5);
  await expect(page.getByTestId('note')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Notes' }).click();
  await expect(page.getByTestId('review-entry')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Choices' }).click();
  await expect(page.getByTestId('review-entry')).toHaveCount(4);
  await expect(page.getByTestId('note')).toHaveCount(0);

  // notes can be edited in review
  await page.getByRole('tab', { name: 'Notes' }).click();
  await page.getByRole('button', { name: 'Edit note' }).first().click();
  await page.getByLabel('Edit note').fill('Light as a resource? Yes.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByTestId('note').first()).toContainText('Light as a resource? Yes.');

  // exports
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export .json' }).click();
  let file = await download;
  expect(file.suggestedFilename()).toBe('lantern-road_stealth-run.path.json');
  const data = JSON.parse(readFileSync(await file.path(), 'utf8'));
  expect(data.format).toBe('quest-path/1');
  expect(data.story).toEqual({ id: 'lantern-road', title: 'The Lantern Road', version: '1.0' });
  expect(data.name).toBe('Stealth run');
  expect(data.ending).toEqual({ scene: 'end-silent', title: 'The Silent Landing' });
  expect(data.steps).toHaveLength(5);
  expect(data.steps[2]).toEqual({
    scene: 'ferry',
    notes: [{ passage: 0, text: 'Light as a resource? Yes.' }],
    choice: { index: 1, text: 'Douse your lantern and drift in', to: 'reeds' },
    skipped: ['Land the ferry at the jetty', 'Make Maddox tell you what he knows'],
    choiceNote: 'Silent path felt best.',
  });
  expect(data.steps[4]).toEqual({ scene: 'end-silent', notes: [] });

  download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export as text' }).click();
  file = await download;
  expect(file.suggestedFilename()).toBe('lantern-road_stealth-run.md');
  const md = readFileSync(await file.path(), 'utf8');
  expect(md.startsWith('# The Lantern Road: Stealth run\nEnding: The Silent Landing · 4 choices · 2 notes · ')).toBe(true);
  expect(md.match(/^## /gm)).toHaveLength(1); // the Notes tab is open
  expect(md).toContain('> Note on this decision: Silent path felt best.');

  // rewind: a new run at that decision; the old run stays as it was
  await page.getByRole('tab', { name: 'Full story' }).click();
  await page.getByRole('button', { name: 'Rewind to this decision' }).nth(2).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toContainText('Go back to Scene 3 · Ferry crossing?');
  await expect(sheet).toContainText('chosen last time');
  await expect(sheet).toContainText('“Stealth run” stays saved as it is, with its 2 notes');
  await sheet.getByRole('button', { name: 'Rewind' }).click();
  await expect(page.getByText('Scene 3 · Decision 3')).toBeVisible();
  await page.getByTestId('choice').nth(0).click();
  await page.getByRole('button', { name: 'Confirm choice A' }).click();
  await expect(page.getByText('Scene 4 ·')).toBeVisible();

  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Continue your story' })).toContainText('Scene 4 · 3 choices made · 1 note');
  const saved = page.getByRole('region', { name: 'Saved paths' });
  await expect(saved.getByRole('link')).toHaveCount(1);
  await saved.getByRole('link', { name: /Stealth run/ }).click();
  await expect(page.getByTestId('review-entry')).toHaveCount(5);
  await expect(page.getByTestId('note')).toHaveCount(2);
  await expect(page.getByText('ended at The Silent Landing')).toBeVisible();
});

test('endings and map: two paths, ? choices, no unvisited names, rewind from a node', async ({ page }) => {
  await importNew(page, LANTERN_JSON);
  await startStory(page, 'The Lantern Road');
  await playPath(page, [0, 0, 1, 0]); // end-silent
  await page.goto('./');
  await startStory(page, 'The Lantern Road');
  await playPath(page, [1, 1]); // end-village
  await page.goto('./');

  await page.locator('a[data-story="lantern-road"]').click();
  await page.getByRole('link', { name: /Endings found/ }).click();
  await expect(page.getByText('2 / 6')).toBeVisible();
  await expect(page.getByTestId('ending-found')).toHaveCount(2);
  await expect(page.getByTestId('ending-locked')).toHaveCount(4);
  const body = await page.locator('main').innerText();
  for (const title of ['The Cold Current', 'Ash on the Jetty', 'The Bell Rings', 'The Road Stays Lit']) {
    expect(body).not.toContain(title);
  }

  await page.getByRole('link', { name: 'See where the branches split' }).click();
  const map = page.getByTestId('story-map');
  await expect(map.locator('[data-node="scene"]')).toHaveCount(5);
  await expect(map.locator('[data-node="ending"]')).toHaveCount(2);
  await expect(map.locator('[data-node="unknown"]')).toHaveCount(6);
  await expect(map.locator('[data-edges="latest"] path')).toHaveCount(2);
  await expect(map.locator('[data-edges="other"] path')).toHaveCount(4);
  const text = await page.locator('main').innerText();
  for (const hidden of ['The ford', 'jetty', 'Abbess', 'The abbey', 'Maddox talks']) {
    expect(text).not.toContain(hidden);
  }
  await expect(page.getByText('7 of 17 scenes seen')).toBeVisible();

  await map.locator('[data-scene="ferry"]').click();
  const detail = page.getByTestId('map-detail');
  await expect(detail).toContainText('Ferry crossing');
  await expect(detail).toContainText('Douse your lantern and drift in');
  await expect(detail.getByText('CHOSEN')).toHaveCount(1);
  await expect(detail.getByText('not explored')).toHaveCount(2);
  await detail.getByRole('button', { name: 'Rewind to this decision' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rewind' }).click();
  await expect(page.getByText('Scene 3 · Decision 3')).toBeVisible();
  await expect(page.getByTestId('choice')).toHaveCount(3);
});

test('new version keeps progress; backup restores into a fresh browser profile', async ({ page, browser }) => {
  await importNew(page, LANTERN_JSON);
  await startStory(page, 'The Lantern Road');
  await playPath(page, [0, 0]);
  await page.getByTestId('passage').first().click();
  await page.getByLabel('Note on this passage').fill('note on a passage that changes');
  await page.getByRole('button', { name: 'Save note' }).click();
  await page.goto('./');

  // The same file again: nothing to update.
  await pickFile(page, LANTERN_JSON);
  await page.getByRole('button', { name: 'Next: choose a look' }).click();
  await expect(page.getByText('You already have this version.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the library' }).click();

  // An edited Lantern Road with the version bumped.
  const edited = JSON.parse(readFileSync(LANTERN_JSON, 'utf8'));
  edited.version = '1.2';
  edited.scenes.ferry.text[0] = 'The ferry creaks out into the fog. (rewritten)';
  await pickFile(page, { name: 'lantern_road_v2.quest.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(edited)) });
  await page.getByRole('button', { name: 'Next: choose a look' }).click();
  const effects = page.getByTestId('update-effects');
  await expect(effects).toContainText('You continue at Scene 3 · Ferry crossing.');
  await expect(effects).toContainText('1 note may have moved.');
  await page.getByRole('button', { name: 'Update and keep my progress' }).click();
  await expect(page.getByRole('region', { name: 'Continue your story' })).toContainText('Scene 3 · 2 choices made · 1 note');
  await page.getByRole('link', { name: 'Continue story' }).click();
  await expect(page.getByTestId('passage').first()).toContainText('(rewritten)');
  await expect(page.getByText('NOTE · ON THIS SCENE')).toBeVisible();
  await expect(page.getByText('note on a passage that changes')).toBeVisible();
  await decide(page, 1);
  await decide(page, 0);
  await page.goto('./');

  // A custom look, then a backup.
  await page.locator('a[data-story="lantern-road"]').click();
  await page.getByRole('link', { name: /Change look/ }).click();
  await page.getByRole('radio', { name: /Ember/ }).click();
  await page.getByRole('button', { name: 'Save look' }).click();
  await expect(page.getByRole('dialog')).toContainText('Look: Ember');
  await page.goto('./#/settings');
  await expect(page.getByTestId('totals')).toContainText('1stories');
  await expect(page.getByTestId('last-backup')).toHaveText('Last backup: never');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^quest-journal-backup-\d{4}-\d{2}-\d{2}\.zip$/);
  const backupPath = await file.path();
  await expect(page.getByTestId('last-backup')).not.toHaveText('Last backup: never');

  // A fresh profile: nothing there, then restore.
  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  await page2.goto('./');
  await expect(page2.getByText('No stories yet.')).toBeVisible();
  await page2.getByRole('link', { name: 'Settings and backup' }).click();
  await page2.getByTestId('backup-file').setInputFiles(backupPath);
  await expect(page2.getByTestId('restore-status')).toContainText('1 story added');
  await expect(page2.getByTestId('totals')).toContainText('1paths');
  await expect(page2.getByTestId('totals')).toContainText('1notes');
  await page2.getByRole('link', { name: 'Back to library' }).click();
  const row = page2.locator('a[data-story="lantern-road"]');
  await expect(row).toContainText('FINISHED');
  await page2.getByRole('region', { name: 'Saved paths' }).getByRole('link').first().click();
  await expect(page2.locator('[data-story-theme="#1E1110"]')).toBeVisible();
  await expect(page2.getByTestId('review-entry')).toHaveCount(5);
  await expect(page2.getByText('note on a passage that changes')).toBeVisible();
  await fresh.close();
});

test('import link: downloads a hosted file, and explains a blocked host', async ({ page }) => {
  // A real second origin that allows cross-origin downloads, like GitHub raw files do.
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(readFileSync(WELL));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const hosted = `http://127.0.0.1:${(server.address() as AddressInfo).port}/well.quest.json`;
  await page.route('https://blocked.example/**', (route) => route.abort());

  // Make an import link on the Make a story screen.
  await page.getByRole('link', { name: 'Make a story' }).click();
  await page.getByLabel('Address of the hosted story file').fill(hosted);
  const link = await page.getByTestId('import-link').innerText();
  expect(link).toContain('#/import?url=' + encodeURIComponent(hosted));

  await page.goto(link);
  await expect(page.getByRole('region', { name: 'Story preview' })).toContainText('The Well');
  await page.getByRole('button', { name: 'Next: choose a look' }).click();
  await page.getByRole('button', { name: 'Add to library with this look' }).click();
  await expect(page.locator('a[data-story="the-well"]')).toBeVisible();

  await page.goto('./#/import?url=' + encodeURIComponent('https://blocked.example/x.quest.json'));
  await expect(page.getByRole('alert')).toContainText('blocked.example blocks the app from downloading this file');
  await expect(page.getByRole('alert')).toContainText('save the file');
  server.close();
});

test('a package built by hand imports and plays offline', async ({ page, context }) => {
  // Build a small package the way an author would: story.json plus images/.
  const story = JSON.parse(readFileSync(WELL, 'utf8'));
  story.cover = 'images/cover.png';
  story.scenes.well.art = 'images/cover.png';
  const zip = zipSync({ 'story.json': strToU8(JSON.stringify(story)), 'images/cover.png': packageFiles['images/cover.png'] });

  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
    return !!navigator.serviceWorker.controller;
  });
  test.skip(!ready, 'this browser build does not run service workers under automation');
  await page.waitForTimeout(1500); // let precaching finish
  await context.setOffline(true);
  await page.reload();

  await pickFile(page, { name: 'well.quest.zip', mimeType: 'application/zip', buffer: Buffer.from(zip) });
  await page.getByRole('button', { name: 'Next: choose a look' }).click();
  await page.getByRole('button', { name: 'Add to library with this look' }).click();
  await startStory(page, 'The Well');
  await expect(page.locator('[data-art="images/cover.png"] img')).toBeVisible();
  await playPath(page, [0, 0]);
  await page.getByRole('link', { name: 'The end' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Other Side');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Other Side');
  for (const route of ['#/make', '#/settings', '#/']) {
    await page.goto('./' + route);
    await expect(page.locator('main')).toBeVisible();
  }
  await context.setOffline(false);
});
