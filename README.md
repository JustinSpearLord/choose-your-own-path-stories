# Quest Journal

An offline, installable web app for playing branching choose-your-own-adventure stories in the `quest/1` format, taking notes on passages and decisions, and exporting the path you took. No accounts, no server, no tracking: everything stays on your device.

- File format: [docs/story-format.md](docs/story-format.md)
- Testing by hand on a phone: [MANUAL_TESTS.md](MANUAL_TESTS.md)

## Develop

```bash
npm install
npx playwright install chromium webkit
npm run dev          # local dev server
npm test             # unit tests
npm run test:e2e     # end-to-end on iPhone 13 and Pixel 7 profiles
npm run build        # production build with service worker
npm run deploy:gh-pages   # publish dist/ to the gh-pages branch
```

## Test stories

`public/stories/` holds two fan-made test stories, published with the app:

- `korriban_academy.quest.json`: *The Miner of Korriban*, 40 scenes
- `ash_and_ambition.quest.json`: *Ash and Ambition*, 12 scenes

These are unofficial fan fiction for testing, not affiliated with Lucasfilm.

## Live test build

https://justinspearlord.github.io/choose-your-own-path-stories/ (update it with `npm run build`, then `npm run deploy:gh-pages`)

One-tap imports:

- [The Miner of Korriban](https://justinspearlord.github.io/choose-your-own-path-stories/#/import?url=https%3A%2F%2Fjustinspearlord.github.io%2Fchoose-your-own-path-stories%2Fstories%2Fkorriban_academy.quest.json)
- [Ash and Ambition](https://justinspearlord.github.io/choose-your-own-path-stories/#/import?url=https%3A%2F%2Fjustinspearlord.github.io%2Fchoose-your-own-path-stories%2Fstories%2Fash_and_ambition.quest.json)
