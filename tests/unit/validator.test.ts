import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkStoryBytes } from '../../src/format/parse';

const ROOT = join(__dirname, '..', '..');
const expected = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/expected.json'), 'utf8')) as Record<
  string,
  { errors: string[]; warnings: string[] }
>;
const files = Object.keys(expected);

function check(file: string) {
  const result = checkStoryBytes(new Uint8Array(readFileSync(join(ROOT, file))));
  return { errors: result.errors.map((e) => e.message), warnings: result.warnings.map((w) => w.message), result };
}

describe('validator matches tests/fixtures/expected.json', () => {
  for (const file of files) {
    it(file, () => {
      const got = check(file);
      if (file.endsWith('not-json.quest.json')) {
        // The JSON parser's own wording differs between Python and JavaScript.
        expect(got.errors).toHaveLength(1);
        expect(got.errors[0]).toMatch(/^not valid JSON: /);
        expect(got.warnings).toEqual([]);
        return;
      }
      expect(got.errors).toEqual(expected[file].errors);
      expect(got.warnings).toEqual(expected[file].warnings);
    });
  }

  it('every sample passes with a story', () => {
    for (const file of files.filter((f) => f.startsWith('samples/'))) {
      expect(check(file).result.story, file).not.toBeNull();
    }
  });

  it('errors name the scene to fix', () => {
    const { result } = check('tests/fixtures/missing-target.quest.json');
    expect(result.errors[0].scene).toBe('ferry');
    expect(result.story).toBeNull();
  });

  it('reads stats and bundled images from the package', () => {
    const { result } = check('samples/lantern_road.quest.zip');
    expect(result.isPackage).toBe(true);
    expect(result.stats).toEqual({ scenes: 17, endings: 6, decisions: 11, images: 7 });
    expect([...result.images.keys()]).toContain('images/portraits/wren.png');
    expect(result.imageMeta.get('images/ferry.png')).toMatchObject({ readable: true, width: 320, height: 180 });
  });

  it('never reads anything but story.json and images from a package', () => {
    const { result } = check('tests/fixtures/broken-package.quest.zip');
    expect([...result.images.keys()].every((k) => k.startsWith('images/'))).toBe(true);
    expect([...result.images.keys()].some((k) => k.includes('evil') || k.includes('readme'))).toBe(false);
  });
});

function findPython(): string | null {
  for (const cmd of ['python3', 'python', 'py']) {
    const r = spawnSync(cmd, ['-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() === '3') return cmd;
  }
  return null;
}

describe('parity with tools/validate_quest.py', () => {
  const python = findPython();
  it.skipIf(!python)('finds the same number of errors and warnings for every file', () => {
    let out = '';
    try {
      out = execFileSync(python!, ['tools/validate_quest.py', ...files], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      // The script exits 1 when any file has errors; its report is still on stdout.
      out = (e as { stdout?: string }).stdout ?? '';
    }
    const counts = new Map<string, [number, number]>();
    for (const line of out.split(/\r?\n/)) {
      const m = /^(.+?): (\d+) errors, (\d+) warnings/.exec(line);
      if (m) counts.set(m[1], [Number(m[2]), Number(m[3])]);
    }
    expect(counts.size).toBe(files.length);
    for (const file of files) {
      const got = check(file);
      expect([got.errors.length, got.warnings.length], file).toEqual(counts.get(file));
    }
  });
});
