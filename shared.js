export const STORAGE_KEYS = {
  settings: 'audioTypingSettings',
  wordList: 'audioTypingWordList',
  stats: 'audioTypingStats',
};

export const DEFAULT_SETTINGS = {
  pageBgColor: '#d9d9d9',
  panelBgColor: '#2b2b2b',
  panelAltBgColor: '#222222',
  mainFontColor: '#ffffff',
  correctColor: '#72e38e',
  wrongColor: '#ff6b6b',
  accentColor: '#8aa0ff',
  mutedColor: '#c8c8c8',
  fontSize: 64,
  fontFamily: 'Arial, sans-serif',
  speedUnit: 'wpm',
  voiceName: '',
  voiceRate: 1,
  voicePitch: 1,
  autoSpeakNext: true,
  showBottomStats: true,
  countdownSeconds: 3,
  replayPenaltyMs: 0,
  difficultyPreset: 'normal',
};

export const DIFFICULTY_PRESETS = {
  easy: { voiceRate: 0.8, countdownSeconds: 3, replayPenaltyMs: 0 },
  normal: { voiceRate: 1.0, countdownSeconds: 3, replayPenaltyMs: 0 },
  challenge: { voiceRate: 1.25, countdownSeconds: 2, replayPenaltyMs: 800 },
  speedrun: { voiceRate: 1.5, countdownSeconds: 1, replayPenaltyMs: 1500 },
  custom: null,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

export function applySettingsToDocument(settings) {
  const root = document.documentElement;
  root.style.setProperty('--page-bg', settings.pageBgColor);
  root.style.setProperty('--panel-bg', settings.panelBgColor);
  root.style.setProperty('--panel-alt-bg', settings.panelAltBgColor);
  root.style.setProperty('--font-color', settings.mainFontColor);
  root.style.setProperty('--correct-color', settings.correctColor);
  root.style.setProperty('--wrong-color', settings.wrongColor);
  root.style.setProperty('--accent-color', settings.accentColor);
  root.style.setProperty('--muted-color', settings.mutedColor);
  root.style.setProperty('--center-font-size', `${settings.fontSize}px`);
  root.style.setProperty('--font-family', settings.fontFamily);
}

export function loadSavedWordList() {
  return localStorage.getItem(STORAGE_KEYS.wordList) ?? SAMPLE_WORD_LIST;
}

export function saveWordList(value) {
  localStorage.setItem(STORAGE_KEYS.wordList, value);
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stats);
    return raw ? JSON.parse(raw) : { bestWpm: 0, bestCpm: 0, sessionsPlayed: 0, totalWordsTyped: 0 };
  } catch {
    return { bestWpm: 0, bestCpm: 0, sessionsPlayed: 0, totalWordsTyped: 0 };
  }
}

export function saveStats(stats) {
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

export function parseWordList(raw) {
  return raw
    .split(/[\n,]+/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((word) => word.trim())
    .filter(Boolean);
}

export function parseWordListFlexible(raw, mode = 'word') {
  const text = raw.trim();
  if (!text) return [];

  if (mode === 'sentence') {
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const monkeyTypeWords = extractMonkeytypeWords(text);
  if (monkeyTypeWords.length > 0) return monkeyTypeWords;

  return parseWordList(raw);
}

function extractMonkeytypeWords(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.words)) {
      return parsed.words
        .map((word) => String(word).trim())
        .filter(Boolean);
    }
  } catch {}

  const wordsMatch = raw.match(/"words"\s*:\s*\[([\s\S]*?)\]/);
  if (!wordsMatch) return [];
  return Array.from(wordsMatch[1].matchAll(/"([^"]+)"/g), (match) => match[1].trim()).filter(Boolean);
}

export function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function formatSpeed(value, unit) {
  return `${value.toFixed(2)} ${unit.toUpperCase()}`;
}

export function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function downloadTextFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const SAMPLE_WORD_LIST = `apple
banana
orange
dragon
window
thunder
keyboard
planet
forest
rocket
silver
coffee
music
pencil
summer
winter
castle
coding
monitor
grape`;
