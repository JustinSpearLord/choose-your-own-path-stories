// Publishes dist/ to the gh-pages branch of this repo's "origin" remote.
// Usage: npm run build && npm run deploy:gh-pages
// The build uses relative paths, so it also works as-is on Cloudflare Pages or Netlify
// (build command "npm run build", output folder "dist").
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const dist = join(process.cwd(), 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run "npm run build" first.');
  process.exit(1);
}
let remote;
try {
  remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
} catch {
  console.error('No "origin" remote. Create a GitHub repo and run: git remote add origin <url>');
  process.exit(1);
}

// GitHub Pages must not run Jekyll over the build.
writeFileSync(join(dist, '.nojekyll'), '');
rmSync(join(dist, '.git'), { recursive: true, force: true });
run('git init -q -b gh-pages', dist);
run('git config core.autocrlf false', dist);
run('git add -A', dist);
run('git -c user.name="deploy" -c user.email="deploy@localhost" commit -q -m "Deploy"', dist);
run(`git push -f "${remote}" gh-pages`, dist);
rmSync(join(dist, '.git'), { recursive: true, force: true });
console.log('Published to the gh-pages branch. Turn on Pages for that branch in the repo settings.');
