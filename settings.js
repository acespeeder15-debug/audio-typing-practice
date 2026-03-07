import {
  DEFAULT_SETTINGS,
  DIFFICULTY_PRESETS,
  applySettingsToDocument,
  buildExportPayload,
  downloadTextFile,
  loadSavedWordList,
  loadSettings,
  parseImportedSettingsPayload,
  saveSettings,
  saveWordList,
} from './shared.js';

const elements = {
  pageBgColor: document.getElementById('pageBgColor'),
  panelBgColor: document.getElementById('panelBgColor'),
  panelAltBgColor: document.getElementById('panelAltBgColor'),
  mainFontColor: document.getElementById('mainFontColor'),
  correctColor: document.getElementById('correctColor'),
  wrongColor: document.getElementById('wrongColor'),
  accentColor: document.getElementById('accentColor'),
  mutedColor: document.getElementById('mutedColor'),
  fontSize: document.getElementById('fontSize'),
  fontFamily: document.getElementById('fontFamily'),
  speedUnit: document.getElementById('speedUnit'),
  voiceSelect: document.getElementById('voiceSelect'),
  voiceRate: document.getElementById('voiceRate'),
  voiceRateValue: document.getElementById('voiceRateValue'),
  voicePitch: document.getElementById('voicePitch'),
  voicePitchValue: document.getElementById('voicePitchValue'),
  countdownSeconds: document.getElementById('countdownSeconds'),
  replayPenaltyMs: document.getElementById('replayPenaltyMs'),
  difficultyPreset: document.getElementById('difficultyPreset'),
  autoSpeakNext: document.getElementById('autoSpeakNext'),
  showBottomStats: document.getElementById('showBottomStats'),
  saveSettingsButton: document.getElementById('saveSettingsButton'),
  resetSettingsButton: document.getElementById('resetSettingsButton'),
  exportSettingsButton: document.getElementById('exportSettingsButton'),
  importSettingsInput: document.getElementById('importSettingsInput'),
  settingsPreview: document.getElementById('settingsPreview'),
};

let settings = { ...DEFAULT_SETTINGS, ...loadSettings() };

init();

function init() {
  fillForm(settings);
  applySettingsToDocument(settings);
  renderPreview();
  loadVoicesIntoSelect();
  bindEvents();
}

function bindEvents() {
  elements.voiceRate.addEventListener('input', updateRangeLabels);
  elements.voicePitch.addEventListener('input', updateRangeLabels);

  elements.difficultyPreset.addEventListener('change', () => {
    const preset = DIFFICULTY_PRESETS[elements.difficultyPreset.value];
    if (preset) {
      elements.voiceRate.value = preset.voiceRate;
      elements.countdownSeconds.value = preset.countdownSeconds;
      elements.replayPenaltyMs.value = preset.replayPenaltyMs;
      updateRangeLabels();
    }
  });

  elements.saveSettingsButton.addEventListener('click', () => {
    settings = readForm();
    saveSettings(settings);
    applySettingsToDocument(settings);
    renderPreview();
    alert('Settings saved.');
  });

  elements.resetSettingsButton.addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    fillForm(settings);
    saveSettings(settings);
    applySettingsToDocument(settings);
    renderPreview();
  });

  elements.exportSettingsButton.addEventListener('click', () => {
    const payload = buildExportPayload(readForm(), loadSavedWordList());
    downloadTextFile('audio-typing-settings.json', JSON.stringify(payload, null, 2));
  });

  elements.importSettingsInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const parsed = parseImportedSettingsPayload(imported);
      settings = parsed.settings;
      fillForm(settings);
      saveSettings(settings);
      if (parsed.wordList) saveWordList(parsed.wordList);
      applySettingsToDocument(settings);
      renderPreview();
      alert(parsed.wordList ? 'Settings and word list imported.' : 'Settings imported.');
    } catch {
      alert('Could not import settings file.');
    }
    event.target.value = '';
  });
}

function fillForm(current) {
  elements.pageBgColor.value = current.pageBgColor;
  elements.panelBgColor.value = current.panelBgColor;
  elements.panelAltBgColor.value = current.panelAltBgColor;
  elements.mainFontColor.value = current.mainFontColor;
  elements.correctColor.value = current.correctColor;
  elements.wrongColor.value = current.wrongColor;
  elements.accentColor.value = current.accentColor;
  elements.mutedColor.value = current.mutedColor;
  elements.fontSize.value = current.fontSize;
  elements.fontFamily.value = current.fontFamily;
  elements.speedUnit.value = current.speedUnit;
  elements.voiceRate.value = current.voiceRate;
  elements.voicePitch.value = current.voicePitch;
  elements.countdownSeconds.value = current.countdownSeconds;
  elements.replayPenaltyMs.value = current.replayPenaltyMs;
  elements.difficultyPreset.value = current.difficultyPreset;
  elements.autoSpeakNext.checked = current.autoSpeakNext;
  elements.showBottomStats.checked = current.showBottomStats;
  updateRangeLabels();
}

function readForm() {
  return {
    pageBgColor: elements.pageBgColor.value,
    panelBgColor: elements.panelBgColor.value,
    panelAltBgColor: elements.panelAltBgColor.value,
    mainFontColor: elements.mainFontColor.value,
    correctColor: elements.correctColor.value,
    wrongColor: elements.wrongColor.value,
    accentColor: elements.accentColor.value,
    mutedColor: elements.mutedColor.value,
    fontSize: Number(elements.fontSize.value),
    fontFamily: elements.fontFamily.value,
    speedUnit: elements.speedUnit.value,
    voiceName: elements.voiceSelect.value,
    voiceRate: Number(elements.voiceRate.value),
    voicePitch: Number(elements.voicePitch.value),
    countdownSeconds: Number(elements.countdownSeconds.value),
    replayPenaltyMs: Number(elements.replayPenaltyMs.value),
    difficultyPreset: elements.difficultyPreset.value,
    autoSpeakNext: elements.autoSpeakNext.checked,
    showBottomStats: elements.showBottomStats.checked,
  };
}

function renderPreview() {
  const current = readForm();
  elements.settingsPreview.innerHTML = `<span style="color:${current.correctColor}">exam</span><span style="color:${current.wrongColor}">p</span><span style="color:${current.mainFontColor}">le</span>`;
  elements.settingsPreview.style.fontSize = `${current.fontSize}px`;
  elements.settingsPreview.style.fontFamily = current.fontFamily;
}

function updateRangeLabels() {
  elements.voiceRateValue.textContent = `${Number(elements.voiceRate.value).toFixed(1)}x`;
  elements.voicePitchValue.textContent = Number(elements.voicePitch.value).toFixed(1);
}

function loadVoicesIntoSelect() {
  const load = () => {
    const voices = window.speechSynthesis.getVoices();
    elements.voiceSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default browser voice';
    elements.voiceSelect.appendChild(defaultOption);

    for (const voice of voices) {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === settings.voiceName) option.selected = true;
      elements.voiceSelect.appendChild(option);
    }
  };

  load();
  window.speechSynthesis.addEventListener('voiceschanged', load);
}
