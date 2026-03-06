import {
  DEFAULT_SETTINGS,
  DIFFICULTY_PRESETS,
  SAMPLE_WORD_LIST as SAMPLE_LIST,
  applySettingsToDocument,
  downloadTextFile,
  escapeHtml,
  formatSpeed,
  loadSavedWordList,
  loadSettings,
  loadStats,
  parseWordListFlexible,
  saveSettings,
  saveStats,
  saveWordList,
  shuffleArray,
} from './shared.js';

const elements = {
  wordList: document.getElementById('wordList'),
  sessionLength: document.getElementById('sessionLength'),
  useWholeList: document.getElementById('useWholeList'),
  randomizeOrder: document.getElementById('randomizeOrder'),
  autoReplayOnWrong: document.getElementById('autoReplayOnWrong'),
  modeSelect: document.getElementById('modeSelect'),
  difficultyPreset: document.getElementById('difficultyPreset'),
  startButton: document.getElementById('startButton'),
  restartButton: document.getElementById('restartButton'),
  repeatButton: document.getElementById('repeatButton'),
  pasteSampleButton: document.getElementById('pasteSampleButton'),
  exportSettingsButton: document.getElementById('exportSettingsButton'),
  importSettingsInput: document.getElementById('importSettingsInput'),
  typedWord: document.getElementById('typedWord'),
  targetHint: document.getElementById('targetHint'),
  metaHint: document.getElementById('metaHint'),
  sessionStatus: document.getElementById('sessionStatus'),
  progressText: document.getElementById('progressText'),
  speedText: document.getElementById('speedText'),
  timerText: document.getElementById('timerText'),
  countdownText: document.getElementById('countdownText'),
  countedWordsText: document.getElementById('countedWordsText'),
  skippedWordsText: document.getElementById('skippedWordsText'),
  ttsRemovedText: document.getElementById('ttsRemovedText'),
  replayPenaltyText: document.getElementById('replayPenaltyText'),
  accuracyText: document.getElementById('accuracyText'),
  commonMissText: document.getElementById('commonMissText'),
  bottomPanel: document.getElementById('bottomPanel'),
  resultsOverlay: document.getElementById('resultsOverlay'),
  resultsSummary: document.getElementById('resultsSummary'),
  playAgainButton: document.getElementById('playAgainButton'),
  closeResultsButton: document.getElementById('closeResultsButton'),
};

const state = {
  settings: { ...DEFAULT_SETTINGS, ...loadSettings() },
  allTimeStats: loadStats(),
  sessionWords: [],
  currentIndex: 0,
  typedValue: '',
  autoFilledCurrentWord: false,
  countedWords: 0,
  skippedWords: 0,
  countedCharacters: 0,
  totalCharactersAttempted: 0,
  totalCorrectCharacters: 0,
  ttsDurationMs: 0,
  replayPenaltyMsAccumulated: 0,
  timerId: null,
  countdownTimer: null,
  sessionRunning: false,
  countdownActive: false,
  sessionStartMs: 0,
  sessionEndMs: 0,
  speechStartMs: 0,
  currentUtterance: null,
  availableVoices: [],
  repeatCount: 0,
  restartCount: 0,
  misspellings: new Map(),
  currentSpeechCountsTowardTts: false,
  primarySpeechCountedForCurrentWord: false,
};

init();

function init() {
  applySettingsToDocument(state.settings);
  elements.wordList.value = loadSavedWordList();
  elements.difficultyPreset.value = state.settings.difficultyPreset;
  syncSettingsUIState();
  setupVoiceLoading();
  bindEvents();
  renderIdle();
}

function bindEvents() {
  elements.wordList.addEventListener('input', () => saveWordList(elements.wordList.value));
  elements.useWholeList.addEventListener('change', () => {
    elements.sessionLength.disabled = elements.useWholeList.checked;
  });
  elements.difficultyPreset.addEventListener('change', applyDifficultyPresetFromPracticePage);
  elements.startButton.addEventListener('click', startSession);
  elements.restartButton.addEventListener('click', restartSession);
  elements.repeatButton.addEventListener('click', replayCurrentWord);
  elements.playAgainButton.addEventListener('click', restartSession);
  elements.closeResultsButton.addEventListener('click', () => elements.resultsOverlay.classList.add('hidden'));
  elements.pasteSampleButton.addEventListener('click', () => {
    elements.wordList.value = SAMPLE_LIST;
    saveWordList(elements.wordList.value);
  });
  elements.exportSettingsButton.addEventListener('click', () => {
    downloadTextFile('audio-typing-settings.json', JSON.stringify(state.settings, null, 2));
  });
  elements.importSettingsInput.addEventListener('change', handleSettingsImport);
  document.addEventListener('keydown', handleGlobalKeydown);
}

function setupVoiceLoading() {
  const loadVoices = () => {
    state.availableVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

function syncSettingsUIState() {
  elements.bottomPanel.classList.toggle('hidden', !state.settings.showBottomStats);
}

function applyDifficultyPresetFromPracticePage() {
  const presetName = elements.difficultyPreset.value;
  const preset = DIFFICULTY_PRESETS[presetName];
  state.settings.difficultyPreset = presetName;
  if (preset) {
    state.settings.voiceRate = preset.voiceRate;
    state.settings.countdownSeconds = preset.countdownSeconds;
    state.settings.replayPenaltyMs = preset.replayPenaltyMs;
  }
  saveSettings(state.settings);
}

function handleGlobalKeydown(event) {
  if (event.key === 'Tab') {
    event.preventDefault();
    if (state.sessionRunning || state.countdownActive) {
      state.restartCount += 1;
    }
    restartSession();
    return;
  }

  if (event.key === 'Escape') {
    if (state.sessionRunning || state.countdownActive) {
      event.preventDefault();
      endSessionEarly();
    }
    return;
  }

  if (!state.sessionRunning) return;

  if (event.key === 'Enter') {
    event.preventDefault();
    autoFillCurrentWord();
    return;
  }
  if (event.key === ';') {
    event.preventDefault();
    replayCurrentWord();
    return;
  }
  if (event.key === 'Backspace') {
    event.preventDefault();
    state.typedValue = state.typedValue.slice(0, -1);
    renderTypedValue();
    return;
  }
  if (event.key === ' ') {
    event.preventDefault();
    if (state.typedValue === currentWord()) {
      advanceWord();
    } else if (elements.autoReplayOnWrong.checked) {
      replayCurrentWord();
    }
    return;
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    recordCharacterAttempt(event.key);
    state.typedValue += event.key;
    renderTypedValue();
  }
}

function recordCharacterAttempt(char) {
  const target = currentWord();
  const targetIndex = state.typedValue.length;
  state.totalCharactersAttempted += 1;
  if (targetIndex < target.length && char === target[targetIndex]) {
    state.totalCorrectCharacters += 1;
  }
  updateStaticStats();
}

function startSession() {
  const mode = elements.modeSelect.value;
  const inputWords = parseWordListFlexible(elements.wordList.value, mode);
  if (inputWords.length === 0) {
    alert('Please enter at least one word in the word list.');
    return;
  }
  saveWordList(elements.wordList.value);
  applyDifficultyPresetFromPracticePage();

  const requestedWords = buildSessionWords(inputWords);
  if (requestedWords.length === 0) {
    alert('Session length must be at least 1.');
    return;
  }

  resetStateForNewSession();
  state.sessionWords = requestedWords;
  elements.resultsOverlay.classList.add('hidden');
  startCountdownThenRun();
}

function buildSessionWords(inputWords) {
  let pool = [...inputWords];
  if (elements.randomizeOrder.checked) pool = shuffleArray(pool);
  if (elements.useWholeList.checked) return pool;
  const requestedLength = Number.parseInt(elements.sessionLength.value, 10);
  if (!Number.isFinite(requestedLength) || requestedLength < 1) return [];
  return pool.slice(0, Math.min(requestedLength, pool.length));
}

function resetStateForNewSession() {
  stopSpeech();
  if (state.timerId) cancelAnimationFrame(state.timerId);
  clearInterval(state.countdownTimer);
  Object.assign(state, {
    sessionWords: [],
    currentIndex: 0,
    typedValue: '',
    autoFilledCurrentWord: false,
    countedWords: 0,
    skippedWords: 0,
    countedCharacters: 0,
    totalCharactersAttempted: 0,
    totalCorrectCharacters: 0,
    ttsDurationMs: 0,
    replayPenaltyMsAccumulated: 0,
    timerId: null,
    countdownTimer: null,
    sessionRunning: false,
    countdownActive: false,
    sessionStartMs: 0,
    sessionEndMs: 0,
    speechStartMs: 0,
    currentUtterance: null,
    repeatCount: 0,
    misspellings: new Map(),
    currentSpeechCountsTowardTts: false,
    primarySpeechCountedForCurrentWord: false,
  });
}

function restartSession() {
  if (!elements.wordList.value.trim()) {
    renderIdle();
    return;
  }
  startSession();
}

function currentWord() {
  return state.sessionWords[state.currentIndex] ?? '';
}

function renderIdle() {
  resetStateForNewSession();
  setStatus('Idle');
  elements.typedWord.textContent = 'Press start';
  elements.typedWord.className = 'typed-word neutral';
  elements.targetHint.textContent = 'The spoken word is not shown here.';
  elements.progressText.textContent = '0 / 0';
  elements.speedText.textContent = `0 ${state.settings.speedUnit.toUpperCase()}`;
  elements.timerText.textContent = '0.00s';
  elements.countdownText.classList.add('hidden');
  updateStaticStats();
}

function startCountdownThenRun() {
  const countdown = Math.max(0, Number(state.settings.countdownSeconds) || 0);
  if (countdown === 0) {
    beginSessionNow();
    return;
  }

  state.countdownActive = true;
  let remaining = countdown;
  elements.countdownText.textContent = String(remaining);
  elements.countdownText.classList.remove('hidden');
  setStatus('Get ready');
  elements.typedWord.textContent = String(remaining);
  elements.typedWord.className = 'typed-word neutral';
  elements.targetHint.textContent = 'Session starting...';

  state.countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(state.countdownTimer);
      elements.countdownText.textContent = 'Start';
      beginSessionNow();
      return;
    }
    elements.countdownText.textContent = String(remaining);
    elements.typedWord.textContent = String(remaining);
  }, 1000);
}

function beginSessionNow() {
  state.countdownActive = false;
  elements.countdownText.classList.add('hidden');
  state.sessionRunning = true;
  state.sessionStartMs = performance.now();
  startTimerLoop();
  updateStaticStats();
  updateProgress();
  setStatus('Listening');
  elements.targetHint.textContent = 'Listen to the word, type it, then press Space. Press ; to repeat or Escape to end.';
  renderTypedValue();
  speakCurrentWord({ countTowardTts: true });
}

function renderTypedValue() {
  if (!state.sessionRunning) return;
  const typed = state.typedValue;
  const target = currentWord();

  if (!typed) {
    elements.typedWord.innerHTML = `<span class="typed-hidden">${escapeHtml(target || '\u00A0')}</span>`;
    elements.typedWord.className = 'typed-word';
    setStatus('Listening');
    return;
  }

  let correctPrefixLength = 0;
  while (
    correctPrefixLength < typed.length &&
    correctPrefixLength < target.length &&
    typed[correctPrefixLength] === target[correctPrefixLength]
  ) {
    correctPrefixLength += 1;
  }

  const correctPart = escapeHtml(target.slice(0, correctPrefixLength));
  const wrongTypedPart = escapeHtml(typed.slice(correctPrefixLength));
  const hiddenPart = escapeHtml(target.slice(Math.min(typed.length, target.length)));
  const exact = typed === target;

  elements.typedWord.innerHTML = [
    correctPart ? `<span class="typed-correct">${correctPart}</span>` : '',
    wrongTypedPart ? `<span class="typed-wrong">${wrongTypedPart}</span>` : '',
    hiddenPart ? `<span class="typed-hidden">${hiddenPart}</span>` : '',
  ].join('') || `<span class="typed-hidden">${escapeHtml(target || '\u00A0')}</span>`;

  if (exact) {
    elements.typedWord.className = 'typed-word success-outline';
    setStatus('Correct - press Space');
  } else if (target.startsWith(typed)) {
    elements.typedWord.className = 'typed-word';
    setStatus('Typing');
  } else {
    elements.typedWord.className = 'typed-word error-outline';
    setStatus('Wrong');
    if (elements.autoReplayOnWrong.checked) replayCurrentWord();
  }
}

function autoFillCurrentWord() {
  state.typedValue = currentWord();
  state.autoFilledCurrentWord = true;
  renderTypedValue();
  setStatus('Auto-filled - press Space');
}

function advanceWord() {
  const word = currentWord();
  if (!word) return;

  if (state.typedValue !== word) {
    recordMisspelling(word, state.typedValue);
  }

  if (state.autoFilledCurrentWord) {
    state.skippedWords += 1;
  } else {
    state.countedWords += 1;
    state.countedCharacters += word.length;
  }

  state.currentIndex += 1;
  state.typedValue = '';
  state.autoFilledCurrentWord = false;
  state.primarySpeechCountedForCurrentWord = false;
  updateStaticStats();

  if (state.currentIndex >= state.sessionWords.length) {
    finishSession();
    return;
  }

  updateProgress();
  renderTypedValue();
  if (state.settings.autoSpeakNext) {
    speakCurrentWord({ countTowardTts: true });
  }
}

function endSessionEarly() {
  if (!(state.sessionRunning || state.countdownActive)) return;

  stopSpeech();
  if (state.timerId) cancelAnimationFrame(state.timerId);
  clearInterval(state.countdownTimer);

  state.countdownActive = false;
  state.sessionRunning = false;
  state.sessionWords = [];
  state.currentIndex = 0;
  state.typedValue = '';
  elements.resultsOverlay.classList.add('hidden');
  elements.countdownText.classList.add('hidden');
  setStatus('Ended');
  elements.typedWord.textContent = 'Session ended';
  elements.typedWord.className = 'typed-word neutral';
  elements.targetHint.textContent = 'Press Tab to start or restart a new session.';
  elements.progressText.textContent = '0 / 0';
  elements.speedText.textContent = `0 ${state.settings.speedUnit.toUpperCase()}`;
  elements.timerText.textContent = '0.00s';
  updateStaticStats();
}

function finishSession() {
  stopSpeech();
  state.sessionRunning = false;
  state.sessionEndMs = performance.now();
  if (state.timerId) cancelAnimationFrame(state.timerId);

  const grossMs = state.sessionEndMs - state.sessionStartMs;
  const netMs = Math.max(1, grossMs - state.ttsDurationMs - state.replayPenaltyMsAccumulated);
  const speed = calculateSpeed(netMs);
  const accuracy = calculateAccuracy();

  updateAllTimeStats(speed);
  elements.typedWord.textContent = `${speed.toFixed(2)} ${state.settings.speedUnit.toUpperCase()}`;
  elements.typedWord.className = 'typed-word neutral';
  elements.targetHint.textContent = `Finished. Gross ${(grossMs / 1000).toFixed(2)}s · first-play TTS removed ${(state.ttsDurationMs / 1000).toFixed(2)}s · replay penalty ${(state.replayPenaltyMsAccumulated / 1000).toFixed(2)}s. Press Tab to start again.`;
  elements.speedText.textContent = `${speed.toFixed(2)} ${state.settings.speedUnit.toUpperCase()}`;
  elements.timerText.textContent = `${(netMs / 1000).toFixed(2)}s`;
  setStatus('Finished');
  updateProgress();
  updateStaticStats();
  renderResults(speed, accuracy, grossMs, netMs);
}

function calculateSpeed(netMs) {
  const minutes = netMs / 60000;
  if (minutes <= 0) return 0;
  return state.settings.speedUnit === 'cpm'
    ? state.countedCharacters / minutes
    : (state.countedCharacters / 5) / minutes;
}

function calculateAccuracy() {
  if (state.totalCharactersAttempted <= 0) return 100;
  return (state.totalCorrectCharacters / state.totalCharactersAttempted) * 100;
}

function startTimerLoop() {
  const loop = () => {
    if (!state.sessionRunning) return;
    const elapsedMs = performance.now() - state.sessionStartMs;
    const netMs = Math.max(0, elapsedMs - state.ttsDurationMs - state.replayPenaltyMsAccumulated);
    elements.speedText.textContent = formatSpeed(calculateSpeed(Math.max(netMs, 1)), state.settings.speedUnit);
    elements.timerText.textContent = `${(netMs / 1000).toFixed(2)}s`;
    state.timerId = requestAnimationFrame(loop);
  };
  state.timerId = requestAnimationFrame(loop);
}

function updateProgress() {
  elements.progressText.textContent = `${Math.min(state.currentIndex, state.sessionWords.length)} / ${state.sessionWords.length}`;
}

function updateStaticStats() {
  elements.countedWordsText.textContent = String(state.countedWords);
  elements.skippedWordsText.textContent = String(state.skippedWords);
  elements.ttsRemovedText.textContent = `${(state.ttsDurationMs / 1000).toFixed(2)}s`;
  elements.replayPenaltyText.textContent = `${(state.replayPenaltyMsAccumulated / 1000).toFixed(2)}s`;
  elements.accuracyText.textContent = `${calculateAccuracy().toFixed(2)}%`;
  elements.commonMissText.textContent = getMostCommonMisspellingLabel();
}

function setStatus(text) {
  elements.sessionStatus.textContent = text;
}

function replayCurrentWord() {
  if (!state.sessionRunning) return;
  state.repeatCount += 1;
  state.replayPenaltyMsAccumulated += Number(state.settings.replayPenaltyMs) || 0;
  updateStaticStats();
  speakCurrentWord({ countTowardTts: false });
}

function speakCurrentWord({ countTowardTts = false } = {}) {
  const word = currentWord();
  if (!word || !('speechSynthesis' in window)) return;
  stopSpeech();

  const shouldCountTts = countTowardTts && !state.primarySpeechCountedForCurrentWord;
  state.currentSpeechCountsTowardTts = shouldCountTts;

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = state.settings.voiceRate;
  utterance.pitch = state.settings.voicePitch;
  const chosenVoice = state.availableVoices.find((voice) => voice.name === state.settings.voiceName);
  if (chosenVoice) {
    utterance.voice = chosenVoice;
    utterance.lang = chosenVoice.lang;
  }

  utterance.onstart = () => {
    state.speechStartMs = performance.now();
    setStatus('Listening');
  };
  utterance.onend = () => {
    if (state.speechStartMs > 0) {
      const duration = performance.now() - state.speechStartMs;
      if (state.currentSpeechCountsTowardTts) {
        state.ttsDurationMs += duration;
        state.primarySpeechCountedForCurrentWord = true;
      }
      state.speechStartMs = 0;
      state.currentSpeechCountsTowardTts = false;
      updateStaticStats();
    }
    if (state.typedValue === '') setStatus('Type the word');
  };
  utterance.onerror = () => {
    state.speechStartMs = 0;
    state.currentSpeechCountsTowardTts = false;
    setStatus('Speech error');
  };

  state.currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.currentUtterance = null;
  state.speechStartMs = 0;
  state.currentSpeechCountsTowardTts = false;
}

function recordMisspelling(target, typed) {
  if (!typed || typed === target) return;
  const key = `${typed} → ${target}`;
  state.misspellings.set(key, (state.misspellings.get(key) ?? 0) + 1);
}

function getMostCommonMisspellingLabel() {
  let bestKey = '—';
  let bestCount = 0;
  for (const [key, count] of state.misspellings.entries()) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  return bestKey;
}

function renderResults(speed, accuracy, grossMs, netMs) {
  const unit = state.settings.speedUnit.toUpperCase();
  const summary = [
    ['Speed', `${speed.toFixed(2)} ${unit}`],
    ['Accuracy', `${accuracy.toFixed(2)}%`],
    ['Words completed', `${state.countedWords} / ${state.sessionWords.length}`],
    ['Auto-filled', String(state.skippedWords)],
    ['Repeat count', String(state.repeatCount)],
    ['Restart count', String(state.restartCount)],
    ['Gross time', `${(grossMs / 1000).toFixed(2)}s`],
    ['First-play TTS removed', `${(state.ttsDurationMs / 1000).toFixed(2)}s`],
    ['Replay penalties', `${(state.replayPenaltyMsAccumulated / 1000).toFixed(2)}s`],
    ['Adjusted time', `${(netMs / 1000).toFixed(2)}s`],
    ['Counted characters', String(state.countedCharacters)],
    ['Most common misspelling', getMostCommonMisspellingLabel()],
  ];

  elements.resultsSummary.innerHTML = summary
    .map(([label, value]) => `<div><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('');
  elements.resultsOverlay.classList.remove('hidden');
}

function updateAllTimeStats(speed) {
  state.allTimeStats.sessionsPlayed += 1;
  state.allTimeStats.totalWordsTyped += state.countedWords;
  if (state.settings.speedUnit === 'wpm') {
    state.allTimeStats.bestWpm = Math.max(state.allTimeStats.bestWpm ?? 0, speed);
  } else {
    state.allTimeStats.bestCpm = Math.max(state.allTimeStats.bestCpm ?? 0, speed);
  }
  saveStats(state.allTimeStats);
}

async function handleSettingsImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    state.settings = { ...DEFAULT_SETTINGS, ...imported };
    saveSettings(state.settings);
    applySettingsToDocument(state.settings);
    syncSettingsUIState();
    alert('Settings imported.');
  } catch {
    alert('Could not import settings file.');
  }
  event.target.value = '';
}
