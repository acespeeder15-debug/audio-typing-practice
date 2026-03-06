# Audio Typing Practice

A static GitHub Pages-ready audio dictation trainer built with plain HTML, CSS, and JavaScript.

## Included now

- 1 word mode starter
- structure ready for sentence mode later
- user-entered word list
- randomize toggle
- session length or whole-list mode
- voice selector
- voice speed slider
- voice pitch slider
- countdown before session start
- replay button and `;` hotkey
- replay penalty system
- `Tab` quick start / restart
- `Enter` auto-fill current word and exclude it from speed
- `Escape` quick end session
- live character-by-character colored feedback with unwritten letters hidden
- end-of-session stats screen
- common misspelling tracking per session
- import/export settings
- local settings + word list persistence
- WPM or CPM
- TTS speaking time removed from timing

## Files

- `index.html` - practice page
- `settings.html` - settings page
- `styles.css` - styling
- `shared.js` - shared config/helpers/storage
- `app.js` - practice/session logic
- `settings.js` - settings page logic

## Notes

- This uses the browser Web Speech API, so available voices depend on device/browser.
- GitHub Pages can host this because it is fully static.
- Global leaderboards still need an external backend.

## Deploy

1. Create a GitHub repo.
2. Upload these files to the repo root.
3. In GitHub Pages settings, publish from your main branch root.

## Easy next expansions

- sentence mode
- saved named word packs
- accuracy heatmap by letter
- local history page
- backend leaderboard
