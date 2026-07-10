(() => {
  const engineRotor = document.getElementById("secondsHand");
  const tasksPanel = document.getElementById("tasks");
  const statusButton = document.getElementById("statusButton");
  const musicScreen = document.getElementById("musicScreen");
  const musicScreenShell = document.querySelector(".music-screen-shell");
  const musicMixer = document.querySelector(".media-deck-mixer");
  const musicMixerKnobs = Array.from(document.querySelectorAll(".media-deck-mixer-knob"));
  const musicEqResetButton = document.getElementById("musicEqResetButton");
  const musicEqValues = Array.from({ length: 7 }, (_, index) => document.getElementById(`musicEqValue${index}`));
  const musicEqBands = Array.from(document.querySelectorAll(".media-deck-eq-band"));
  const musicReturn = document.getElementById("musicReturn");
  const diagnostics = document.getElementById("diagnostics");
  const statusTime = document.getElementById("statusTime");
  const nowPlayingPanel = document.getElementById("nowPlayingPanel");
  const nowPlayingArtwork = document.getElementById("nowPlayingArtwork");
  const nowPlayingSource = document.getElementById("nowPlayingSource");
  const nowPlayingTitle = document.getElementById("nowPlayingTitle");
  const nowPlayingArtist = document.getElementById("nowPlayingArtist");
  const nowPlayingStatus = document.getElementById("nowPlayingStatus");
  const nowPlayingProgressFill = document.getElementById("nowPlayingProgressFill");
  const nowPlayingCurrentTime = document.getElementById("nowPlayingCurrentTime");
  const nowPlayingDuration = document.getElementById("nowPlayingDuration");
  const nowPlayingActionLabel = document.getElementById("nowPlayingActionLabel");
  const nowPlayingDeckHint = document.getElementById("nowPlayingDeckHint");
  const bridgeStatusChip = document.getElementById("bridgeStatusChip");
  const sessionStatusChip = document.getElementById("sessionStatusChip");
  const playbackStatusChip = document.getElementById("playbackStatusChip");
  const supportedCommandsLabel = document.getElementById("supportedCommandsLabel");
  const mediaDebugLog = document.getElementById("mediaDebugLog");
  const musicPreviousButton = document.getElementById("musicPreviousButton");
  const musicBackButton = document.getElementById("musicBackButton");
  const musicPlayPauseButton = document.getElementById("musicPlayPauseButton");
  const musicForwardButton = document.getElementById("musicForwardButton");
  const musicNextButton = document.getElementById("musicNextButton");
  const musicOutputSlider = document.getElementById("musicOutputSlider");
  const musicOutputReadout = document.getElementById("musicOutputReadout");
  const debugFetchStateButton = document.getElementById("debugFetchStateButton");
  const debugPlayPauseButton = document.getElementById("debugPlayPauseButton");
  const debugPreviousButton = document.getElementById("debugPreviousButton");
  const debugNextButton = document.getElementById("debugNextButton");
  const debugSeekBackButton = document.getElementById("debugSeekBackButton");
  const debugSeekForwardButton = document.getElementById("debugSeekForwardButton");
  const printerNote = document.getElementById("printerNote");
  const systemToastLayer = document.getElementById("systemToastLayer");
  const systemToast = document.getElementById("systemToast");
  const systemToastKind = document.getElementById("systemToastKind");
  const systemToastTitle = document.getElementById("systemToastTitle");
  const systemToastBody = document.getElementById("systemToastBody");
  const screen = document.querySelector(".screen");
  const noteTabs = Array.from(document.querySelectorAll(".note-tab"));
  const bookView = document.getElementById("bookView");
  const checklistReturn = document.getElementById("checklistReturn");
  const readingModeToggle = document.getElementById("readingModeToggle");
  const bookShell = document.querySelector(".book-shell");
  const bookScrollContainer = document.querySelector(".book-page-inner.single");
  const noteTitle = document.getElementById("noteTitle");
  const noteSubtitle = document.getElementById("noteSubtitle");
  const noteBody = document.getElementById("noteBody");
  const bookEditors = [noteTitle, noteSubtitle, noteBody];
  const NOTE_TRANSITION_MS = 360;
  const statuses = ["AVAILABLE", "REFINING", "WELLNESS", "ON BREAK", "AWAITING INPUT"];
  const diagnosticTemplates = [
    "CPU 43%",
    "CPU 38%",
    "TEMP NOMINAL",
    "BUFFER 07",
    "QUEUE 12",
    "MEMORY 61%",
    "RELAY READY",
    "LINE STABLE"
  ];
  const printerMessages = [
    "WELLNESS BULLETIN READY FOR COLLECTION",
    "REFINEMENT BATCH TRANSFERRED TO COLD STORAGE",
    "SHIFT AUDIT PRINTED FOR SUPERVISOR REVIEW",
    "PERPETUITY WING APPOINTMENT NOW AVAILABLE",
    "RELAY CALIBRATION CONFIRMED BY FLOOR SYSTEM"
  ];
  const notes = {
    "note-1": {
      title: "",
      subtitle: "",
      body: ""
    },
    "note-2": {
      title: "",
      subtitle: "",
      body: ""
    },
    "note-3": {
      title: "",
      subtitle: "",
      body: ""
    },
    "note-4": {
      title: "",
      subtitle: "",
      body: ""
    },
    "note-5": {
      title: "",
      subtitle: "",
      body: ""
    }
  };

  const bookUndoStacks = new Map();
  const BOOK_UNDO_LIMIT = 100;

  let statusIndex = 0;
  let musicControlsOpen = false;
  let activeNoteId = null;
  let draggedTask = null;
  let rotorAngle = 0;
  let rotorAnimationFrame = null;
  let rotorBurstStart = 0;
  let rotorBurstDuration = 0;
  let rotorStartAngle = 0;
  let rotorTargetAngle = 0;
  const SYSTEM_TOAST_MS = 2000;
  const NOTIFICATION_BRIDGE_URL = "http://127.0.0.1:17888/events";
  let systemToastQueue = [];
  let systemToastActive = false;
  let systemToastHideTimeout = null;
  let systemToastExitTimeout = null;
  let popdownOpenTimeout = null;
  let popdownCloseTimeout = null;
  let readingModeEnabled = false;
  let readingModeFrame = null;
  let readingModeLastTimestamp = 0;
  let readingModePausedUntil = 0;
  let readingModeScrollIgnoreUntil = 0;
  let mediaStatePollInterval = null;
  let mediaStateRequestInFlight = false;
  let lastMediaState = null;
  let musicOutputLevel = 5;
  const musicMixerBaseLevels = [118, 66, 96, 56, 84, 134, 154];
  const musicMixerDefaultLevels = [...musicMixerBaseLevels];
  let activeMixerBand = null;
  let activeMixerKnob = null;
  let bridgeConnected = false;
  let bridgeLastError = "";
  let mediaEventSource = null;
  let noteTransitionTimeout = null;
  const mediaDebugEntries = [];
  const markdownParser = window.marked?.parse ? window.marked : null;
  const READING_MODE_PIXELS_PER_SECOND = 44;
  const READING_MODE_RESUME_DELAY_MS = 2000;
  const emptyNowPlayingState = Object.freeze({
    available: false,
    source: "NO ACTIVE SESSION",
    app: "SYSTEM BRIDGE",
    title: "",
    artist: "",
    status: "paused",
    elapsedSeconds: 0,
    durationSeconds: 0,
    canPlay: false,
    canPause: false,
    canTogglePlayPause: false,
    canNext: false,
    canPrevious: false,
    canSeek: false
  });

  if (markdownParser?.setOptions) {
    markdownParser.setOptions({
      gfm: true,
      breaks: true
    });
  }

  function easeOutQuint(progress) {
    return 1 - Math.pow(1 - progress, 5);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatPlaybackTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${pad(seconds)}`;
  }

  function clampMusicOutputLevel(level) {
    return Math.max(0, Math.min(8, Math.round(Number(level) || 0)));
  }

  function renderMusicOutputLevel(level) {
    const safeLevel = clampMusicOutputLevel(level);
    if (musicOutputSlider) {
      musicOutputSlider.value = String(safeLevel);
    }
    if (musicOutputReadout) {
      musicOutputReadout.textContent = `LVL ${safeLevel}`;
    }
  }

  function commitMusicOutputLevel(nextLevel) {
    const safeLevel = clampMusicOutputLevel(nextLevel);
    const delta = safeLevel - musicOutputLevel;
    musicOutputLevel = safeLevel;
    renderMusicOutputLevel(safeLevel);

    if (delta !== 0) {
      sendMediaCommand("volume_step", delta * 2);
    }
  }

  function clampMusicMixerTop(top) {
    return Math.max(18, Math.min(162, Math.round(Number(top) || 0)));
  }

  function renderMusicMixer() {
    if (!musicMixerKnobs.length) return;
    musicMixerKnobs.forEach((knob, index) => {
      const top = clampMusicMixerTop(musicMixerBaseLevels[index]);
      knob.style.top = `${top}px`;
      if (musicEqValues[index]) {
        const normalized = ((90 - musicMixerBaseLevels[index]) / 6);
        const rounded = Math.max(-12, Math.min(12, Math.round(normalized)));
        const prefix = rounded > 0 ? "+" : "";
        musicEqValues[index].textContent = `${prefix}${rounded} dB`;
      }
    });
  }

  function updateMusicMixerBandFromPointer(clientY) {
    if (activeMixerBand === null || !musicMixer) return;

    const rect = musicMixer.getBoundingClientRect();
    const localTop = clientY - rect.top - 11;
    musicMixerBaseLevels[activeMixerBand] = clampMusicMixerTop(localTop);
    renderMusicMixer();
  }

  function resetMusicMixerBands() {
    musicMixerDefaultLevels.forEach((level, index) => {
      musicMixerBaseLevels[index] = level;
    });
    renderMusicMixer();
  }

  function setEqProximity(clientX, clientY) {
    if (!musicEqBands.length || !musicMixer) return;

    let nearestBand = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    musicEqBands.forEach((band) => {
      const track = band.querySelector(".media-deck-eq-track");
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      const distance = Math.hypot(clientX - centerX, clientY - centerY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestBand = band;
      }
    });

    musicEqBands.forEach((band) => {
      band.classList.remove("is-near", "is-nearest");
    });

    if (nearestBand && nearestDistance <= 170) {
      nearestBand.classList.add("is-nearest");
    }

    musicEqBands.forEach((band) => {
      if (band === nearestBand) return;
      const track = band.querySelector(".media-deck-eq-track");
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      const distance = Math.hypot(clientX - centerX, clientY - centerY);
      if (distance <= 120) {
        band.classList.add("is-near");
      }
    });
  }

  function clearEqProximity() {
    musicEqBands.forEach((band) => {
      band.classList.remove("is-near", "is-nearest");
    });
  }

  function setMusicCardTilt(clientX, clientY) {
    if (!musicScreenShell) return;

    const rect = musicScreenShell.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 18;
    const rotateX = (0.5 - y) * 14;
    const shiftX = (x - 0.5) * 18;
    const shiftY = (y - 0.5) * 14;

    musicScreenShell.style.setProperty("--music-card-tilt-x", `${rotateX.toFixed(2)}deg`);
    musicScreenShell.style.setProperty("--music-card-tilt-y", `${rotateY.toFixed(2)}deg`);
    musicScreenShell.style.setProperty("--music-card-shift-x", `${shiftX.toFixed(2)}px`);
    musicScreenShell.style.setProperty("--music-card-shift-y", `${shiftY.toFixed(2)}px`);
  }

  function resetMusicCardTilt() {
    if (!musicScreenShell) return;
    musicScreenShell.style.setProperty("--music-card-tilt-x", "0deg");
    musicScreenShell.style.setProperty("--music-card-tilt-y", "0deg");
    musicScreenShell.style.setProperty("--music-card-shift-x", "0px");
    musicScreenShell.style.setProperty("--music-card-shift-y", "0px");
  }

  function getNoteTab(noteId) {
    return noteTabs.find((tab) => tab.dataset.note === noteId) ?? null;
  }

  function getTabPreviewTitle(noteId) {
    const raw = notes[noteId]?.title?.replace(/\s+/g, " ").trim() ?? "";
    if (!raw) {
      return "";
    }

    return raw.length > 24 ? `${raw.slice(0, 24).trimEnd()}...` : raw;
  }

  function updateNoteTabPreview(noteId) {
    const tab = getNoteTab(noteId);
    if (!tab) return;

    const previewTitle = getTabPreviewTitle(noteId);
    tab.dataset.noteTitle = previewTitle;
    tab.setAttribute(
      "aria-label",
      previewTitle ? `Open note: ${previewTitle}` : `Open ${tab.textContent.trim()}`
    );
  }

  function updateAllNoteTabPreviews() {
    Object.keys(notes).forEach(updateNoteTabPreview);
  }

  function setNoteTransitionOrigin(noteId) {
    const tab = getNoteTab(noteId);
    if (!tab) return;

    const screenRect = screen.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const originY = Math.round(tabRect.top - screenRect.top + (tabRect.height / 2));
    screen.style.setProperty("--note-tab-origin-y", `${originY}px`);
  }

  function clearNoteTransitionState() {
    screen.classList.remove("note-opening", "note-closing");
    if (noteTransitionTimeout !== null) {
      window.clearTimeout(noteTransitionTimeout);
      noteTransitionTimeout = null;
    }
  }

  function startNoteOpenTransition(noteId) {
    clearNoteTransitionState();
    setNoteTransitionOrigin(noteId);
    void bookShell.offsetWidth;
    screen.classList.add("note-opening");
    noteTransitionTimeout = window.setTimeout(() => {
      screen.classList.remove("note-opening");
      noteTransitionTimeout = null;
    }, NOTE_TRANSITION_MS);
  }

  function getArtworkGlyph(payload) {
    const seed = String(payload?.source || payload?.app || payload?.title || "QUTE")
      .replace(/[^A-Za-z0-9]+/g, "")
      .toUpperCase();
    return (seed.slice(0, 2) || "QT");
  }

  function appendMediaDebugEntry(kind, message, detail = "") {
    const timestamp = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    mediaDebugEntries.unshift({
      kind,
      message,
      detail,
      timestamp
    });
    mediaDebugEntries.splice(18);

    if (!mediaDebugLog) return;
    mediaDebugLog.innerHTML = mediaDebugEntries.map((entry) => `
      <div class="media-debug-entry media-debug-entry-${entry.kind}">
        <span class="media-debug-time">${entry.timestamp}</span>
        <span class="media-debug-message">${entry.message}</span>
        ${entry.detail ? `<span class="media-debug-detail">${entry.detail}</span>` : ""}
      </div>
    `).join("");
  }

  function setBridgeConnected(nextConnected, errorMessage = "") {
    bridgeConnected = nextConnected;
    bridgeLastError = nextConnected ? "" : errorMessage;

    if (bridgeStatusChip) {
      bridgeStatusChip.textContent = nextConnected ? "BRIDGE CONNECTED" : "BRIDGE DISCONNECTED";
      bridgeStatusChip.dataset.state = nextConnected ? "ok" : "error";
      if (errorMessage) {
        bridgeStatusChip.title = errorMessage;
      } else {
        bridgeStatusChip.removeAttribute("title");
      }
    }
  }

  function getSupportedCommandLabels(state) {
    if (!state?.available) return [];

    const commands = [];
    if (state.canPrevious) commands.push("PREV");
    if (state.canSeek) commands.push("-10", "+10");
    if (state.canTogglePlayPause || state.canPlay || state.canPause) commands.push("PLAY/PAUSE");
    if (state.canNext) commands.push("NEXT");
    return commands;
  }

  function setTransportButtonState(button, enabled) {
    if (!button) return;
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", String(!enabled));
    if (!enabled) {
      button.title = "Unsupported for current media session";
    } else {
      button.removeAttribute("title");
    }
  }

  function renderNowPlayingPanel(payload) {
    if (!nowPlayingPanel) return;

    const state = {
      ...emptyNowPlayingState,
      ...(payload ?? {})
    };
    lastMediaState = state;
    const status = String(state.status ?? "paused").toLowerCase();
    const durationSeconds = Math.max(0, Number(state.durationSeconds) || 0);
    const boundedDuration = Math.max(1, durationSeconds);
    const elapsedSeconds = Math.max(0, Math.min(boundedDuration, Number(state.elapsedSeconds) || 0));
    const progressPercent = durationSeconds > 0 ? (elapsedSeconds / boundedDuration) * 100 : 0;
    const supportedCommands = getSupportedCommandLabels(state);

    nowPlayingPanel.dataset.status = status;
    nowPlayingPanel.dataset.available = String(Boolean(state.available));
    nowPlayingSource.textContent = state.available ? (state.source || "ACTIVE SOURCE") : "NO SESSION";
    nowPlayingTitle.textContent = state.title || "TITLE OF THE TRACK";
    nowPlayingArtist.textContent = state.artist || "ARTIST";
    nowPlayingStatus.textContent = state.available ? (status === "playing" ? "PLAYING" : "PAUSED") : "NO SESSION";
    if (nowPlayingDeckHint) {
      nowPlayingDeckHint.textContent = state.available ? (state.app || state.source || "SYSTEM BRIDGE") : "SYSTEM BRIDGE";
    }
    nowPlayingProgressFill.style.width = `${progressPercent}%`;
    nowPlayingCurrentTime.textContent = formatPlaybackTime(elapsedSeconds);
    nowPlayingDuration.textContent = formatPlaybackTime(durationSeconds);
    nowPlayingActionLabel.textContent = state.available && status === "playing" ? "PAUSE" : "PLAY";

    setTransportButtonState(musicPreviousButton, state.available && state.canPrevious);
    setTransportButtonState(musicBackButton, state.available && state.canSeek);
    setTransportButtonState(musicPlayPauseButton, state.available && (state.canTogglePlayPause || state.canPause || state.canPlay));
    setTransportButtonState(musicForwardButton, state.available && state.canSeek);
    setTransportButtonState(musicNextButton, state.available && state.canNext);
    setTransportButtonState(debugPlayPauseButton, state.available && (state.canTogglePlayPause || state.canPause || state.canPlay));
    setTransportButtonState(debugPreviousButton, state.available && state.canPrevious);
    setTransportButtonState(debugNextButton, state.available && state.canNext);
    setTransportButtonState(debugSeekBackButton, state.available && state.canSeek);
    setTransportButtonState(debugSeekForwardButton, state.available && state.canSeek);

    if (nowPlayingArtwork) {
      const glyph = getArtworkGlyph(state);
      const glyphElement = nowPlayingArtwork.querySelector(".media-deck-thumb-glyph");
      if (glyphElement) {
        glyphElement.textContent = glyph;
      }
    }

    if (sessionStatusChip) {
      sessionStatusChip.textContent = state.available ? "SESSION ACTIVE" : "NO SESSION";
      sessionStatusChip.dataset.state = state.available ? "ok" : "idle";
    }

    if (playbackStatusChip) {
      playbackStatusChip.textContent = state.available ? (status === "playing" ? "PLAYBACK PLAYING" : "PLAYBACK PAUSED") : "PLAYBACK IDLE";
      playbackStatusChip.dataset.state = state.available && status === "playing" ? "ok" : "idle";
    }

    if (supportedCommandsLabel) {
      supportedCommandsLabel.textContent = `SUPPORTED: ${supportedCommands.length ? supportedCommands.join(" / ") : "NONE"}`;
    }
  }

  async function fetchBridgeJson(path, options = {}) {
    try {
      const response = await fetch(`${NOTIFICATION_BRIDGE_URL.replace(/\/events$/, "")}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {})
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = payload?.error || `Bridge request failed (${response.status})`;
        setBridgeConnected(false, error);
        throw new Error(error);
      }

      setBridgeConnected(true);
      return payload;
    } catch (error) {
      setBridgeConnected(false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function refreshMediaState({ logSuccess = false } = {}) {
    if (mediaStateRequestInFlight) return;
    mediaStateRequestInFlight = true;

    try {
      const payload = await fetchBridgeJson("/media-state", { method: "GET" });
      renderNowPlayingPanel(payload);
      if (logSuccess) {
        appendMediaDebugEntry("state", "Fetched /media-state", JSON.stringify({
          available: payload?.available,
          source: payload?.source,
          status: payload?.status
        }));
      }
    } catch {
      renderNowPlayingPanel(emptyNowPlayingState);
      appendMediaDebugEntry("error", "Failed to fetch /media-state", bridgeLastError || "Unknown bridge error");
    } finally {
      mediaStateRequestInFlight = false;
    }
  }

  function startMediaStatePolling() {
    if (mediaStatePollInterval !== null) return;
    refreshMediaState();
    mediaStatePollInterval = window.setInterval(refreshMediaState, 1000);
  }

  function stopMediaStatePolling() {
    if (mediaStatePollInterval === null) return;
    window.clearInterval(mediaStatePollInterval);
    mediaStatePollInterval = null;
  }

  async function sendMediaCommand(action, value = null) {
    appendMediaDebugEntry("command", `Command: ${action}`, value === null ? "" : `value=${value}`);

    try {
      const result = await fetchBridgeJson("/media-control", {
        method: "POST",
        body: JSON.stringify(value === null ? { action } : { action, value })
      });
      appendMediaDebugEntry(result?.ok ? "response" : "error", `Bridge response: ${action}`, JSON.stringify(result));
    } catch {
      appendMediaDebugEntry("error", `Command failed: ${action}`, bridgeLastError || "Unknown bridge error");
    }

    window.setTimeout(refreshMediaState, 120);
  }

  function syncMusicControlsToggle() {
    if (!statusButton) return;

    statusButton.setAttribute("aria-expanded", String(musicControlsOpen));
    statusButton.textContent = "MUSIC CNTRL";
  }

  function setMusicControlsOpen(nextOpen) {
    musicControlsOpen = Boolean(nextOpen);
    screen.classList.toggle("music-mode", musicControlsOpen);
    musicScreen?.setAttribute("aria-hidden", String(!musicControlsOpen));
    syncMusicControlsToggle();

    if (musicControlsOpen) {
      startMediaStatePolling();
    } else {
      stopMediaStatePolling();
    }
  }

  function applyRotorAngle(angle) {
    if (engineRotor) {
      engineRotor.style.transform = `translate(-10%, -50%) rotate(${angle}deg)`;
    }
  }

  function renderSystemToast(payload) {
    const type = payload.type ?? "notification";

    if (type === "music") {
      const status = String(payload.status ?? "playing").toLowerCase();
      systemToastKind.textContent = status === "playing" ? "NOW PLAYING" : status.toUpperCase();
      systemToastTitle.textContent = payload.title || "Unknown track";
      const detail = [payload.artist, payload.app].filter(Boolean).join(" · ");
      systemToastBody.textContent = detail;
      return;
    }

    systemToastKind.textContent = String(payload.app || "NOTIFICATION").toUpperCase();
    systemToastTitle.textContent = payload.title || payload.body || "New notification";
    systemToastBody.textContent = payload.title && payload.body ? payload.body : "";
  }

  function setReadingModePausedUntil(timestamp = window.performance.now()) {
    readingModePausedUntil = timestamp + READING_MODE_RESUME_DELAY_MS;
  }

  function syncReadingModeButton() {
    if (!readingModeToggle) return;
    readingModeToggle.classList.toggle("is-active", readingModeEnabled);
    readingModeToggle.setAttribute("aria-pressed", String(readingModeEnabled));
    readingModeToggle.textContent = readingModeEnabled ? "READ ON" : "READ";
  }

  function stopReadingModeLoop() {
    if (readingModeFrame !== null) {
      window.cancelAnimationFrame(readingModeFrame);
      readingModeFrame = null;
    }
    readingModeLastTimestamp = 0;
  }

  function stepReadingMode(timestamp) {
    if (!readingModeEnabled || !bookScrollContainer || activeNoteId === null) {
      stopReadingModeLoop();
      return;
    }

    if (readingModeLastTimestamp === 0) {
      readingModeLastTimestamp = timestamp;
    }

    const deltaMs = timestamp - readingModeLastTimestamp;
    readingModeLastTimestamp = timestamp;

    if (timestamp >= readingModePausedUntil) {
      const maxScrollTop = Math.max(0, bookScrollContainer.scrollHeight - bookScrollContainer.clientHeight);

      if (bookScrollContainer.scrollTop >= maxScrollTop - 1) {
        readingModeEnabled = false;
        syncReadingModeButton();
        stopReadingModeLoop();
        return;
      }

      readingModeScrollIgnoreUntil = window.performance.now() + 180;
      bookScrollContainer.scrollTop = Math.min(
        maxScrollTop,
        bookScrollContainer.scrollTop + (READING_MODE_PIXELS_PER_SECOND * deltaMs) / 1000
      );
    }

    readingModeFrame = window.requestAnimationFrame(stepReadingMode);
  }

  function startReadingModeLoop() {
    if (readingModeFrame !== null || !readingModeEnabled) {
      return;
    }

    readingModeLastTimestamp = 0;
    readingModeFrame = window.requestAnimationFrame(stepReadingMode);
  }

  function setReadingModeEnabled(nextEnabled) {
    readingModeEnabled = nextEnabled;
    syncReadingModeButton();

    if (!nextEnabled) {
      stopReadingModeLoop();
      return;
    }

    readingModePausedUntil = 0;
    startReadingModeLoop();
  }

  function pauseReadingModeForUserInput() {
    if (!readingModeEnabled) return;
    setReadingModePausedUntil(window.performance.now());
    startReadingModeLoop();
  }

  function dequeueSystemToast() {
    if (!systemToastQueue.length) {
      systemToastActive = false;
      return;
    }

    systemToastActive = true;
    const payload = systemToastQueue.shift();
    renderSystemToast(payload);

    window.clearTimeout(systemToastHideTimeout);
    window.clearTimeout(systemToastExitTimeout);

    systemToast.classList.remove("is-leaving");
    systemToast.classList.add("is-visible");
    systemToastLayer.hidden = false;

    systemToastHideTimeout = window.setTimeout(() => {
      systemToast.classList.remove("is-visible");
      systemToast.classList.add("is-leaving");

      systemToastExitTimeout = window.setTimeout(() => {
        systemToast.classList.remove("is-leaving");
        systemToastLayer.hidden = true;
        dequeueSystemToast();
      }, 260);
    }, SYSTEM_TOAST_MS);
  }

  function showSystemToast(payload) {
    if (!payload || payload.type === "bridge") return;
    systemToastQueue.push(payload);
    if (!systemToastActive) {
      dequeueSystemToast();
    }
  }

  function connectNotificationBridge() {
    mediaEventSource?.close();
    const source = new EventSource(NOTIFICATION_BRIDGE_URL);
    mediaEventSource = source;

    source.onopen = () => {
      setBridgeConnected(true);
      appendMediaDebugEntry("state", "SSE connected", "/events");
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "music") {
          refreshMediaState();
        }
        showSystemToast(payload);
      } catch {
        // Ignore malformed bridge messages.
      }
    };

    source.onerror = () => {
      setBridgeConnected(false, "SSE connection lost");
      appendMediaDebugEntry("error", "SSE disconnected", "/events");
      source.close();
      window.setTimeout(connectNotificationBridge, 5000);
    };
  }

  function scheduleRotorBurst(now = window.performance.now()) {
    rotorBurstStart = now;
    rotorBurstDuration = randomBetween(1060, 5020);
    rotorStartAngle = rotorAngle;
    const reversalKick = Math.random() < 0.12 ? randomBetween(-40, -12) : 0;
    const fullTurns = randomBetween(0.7, 1.35);
    const overshoot = randomBetween(16, 58);
    rotorTargetAngle = rotorStartAngle + fullTurns * 360 + overshoot + reversalKick;
  }

  function animateEngineRotor(now) {
    if (!engineRotor) return;

    const elapsed = now - rotorBurstStart;
    const progress = Math.min(elapsed / rotorBurstDuration, 1);
    const eased = easeOutQuint(progress);
    const shimmer = Math.sin(now * 0.032) * 0.65 + Math.cos(now * 0.019) * 0.35;
    rotorAngle = rotorStartAngle + (rotorTargetAngle - rotorStartAngle) * eased + shimmer;
    applyRotorAngle(rotorAngle);

    if (progress >= 1) {
      rotorAngle = rotorTargetAngle;
      applyRotorAngle(rotorAngle);
      scheduleRotorBurst(now);
    }

    rotorAnimationFrame = window.requestAnimationFrame(animateEngineRotor);
  }

  function startEngineRotor() {
    if (!engineRotor || rotorAnimationFrame !== null) return;
    scheduleRotorBurst();
    rotorAnimationFrame = window.requestAnimationFrame(animateEngineRotor);
  }

  function updateStatusTime() {
    const now = new Date();

    if (statusTime) {
      statusTime.textContent = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }
  }

  function isMarkdownPreviewEnabled() {
    return true;
  }

  function isNoteHighlightEnabled() {
    return false;
  }

  function getNoteBodyMarkdown() {
    return noteBody.dataset.notePlain ?? "";
  }

  function syncNoteBodyEmptyState(markdown = getNoteBodyMarkdown()) {
    noteBody.dataset.empty = markdown.trim() === "" ? "true" : "false";
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderMarkdownToSafeHtml(markdown) {
    const source = markdown.trim();
    if (!source) {
      return "";
    }

    if (!markdownParser) {
      return `<p>${escapeHtml(markdown).replace(/\n/g, "<br>")}</p>`;
    }

    const unsafeHtml = markdownParser.parse(markdown);
    const purifier = window.DOMPurify;

    if (!purifier?.sanitize) {
      return unsafeHtml;
    }

    return purifier.sanitize(unsafeHtml, {
      USE_PROFILES: { html: true },
      ALLOWED_ATTR: ["href", "title", "target", "rel", "class"]
    });
  }

  function renderNoteBodyPreview(markdown = getNoteBodyMarkdown()) {
    noteBody.dataset.notePlain = markdown;
    syncNoteBodyEmptyState(markdown);
    noteBody.classList.add("markdown-preview");
    noteBody.classList.remove("markdown-source");
    noteBody.removeAttribute("contenteditable");

    if (markdown.trim() === "") {
      noteBody.innerHTML = "";
      return;
    }

    noteBody.innerHTML = renderMarkdownToSafeHtml(markdown);

    noteBody.querySelectorAll("a[href]").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer noopener");
    });
  }

  function enterNoteBodyEditMode({ placeCaret = "end" } = {}) {
    const markdown = getNoteBodyMarkdown();
    noteBody.classList.add("markdown-source");
    noteBody.classList.remove("markdown-preview");
    noteBody.contentEditable = "true";
    syncNoteBodyEmptyState(markdown);
    if (markdown.length === 0) {
      noteBody.textContent = "";
    } else {
      paintBookContent(noteBody, true, markdown, bookEditorUsesHighlight(noteBody));
    }
    noteBody.focus({ preventScroll: true });

    if (placeCaret === "start") {
      setCaretOffsetInNote(noteBody, 0);
    } else {
      setCaretOffsetInNote(noteBody, markdown.length);
    }

    queueBookCaretUpdate();
  }

  function refreshNoteBodyPresentation({ keepFocus = false } = {}) {
    const markdown = getNoteBodyMarkdown();

    if (isMarkdownPreviewEnabled() && document.activeElement !== noteBody) {
      renderNoteBodyPreview(markdown);
      return;
    }

    noteBody.classList.add("markdown-source");
    noteBody.classList.remove("markdown-preview");
    noteBody.contentEditable = "true";
    syncNoteBodyEmptyState(markdown);
    if (markdown.length === 0) {
      noteBody.textContent = "";
    } else {
      paintBookContent(noteBody, true, markdown, bookEditorUsesHighlight(noteBody));
    }

    if (keepFocus) {
      noteBody.focus({ preventScroll: true });
      setCaretOffsetInNote(noteBody, markdown.length);
      queueBookCaretUpdate();
    }
  }

  function getCaretCharacterOffset(element) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer)) return null;

    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  }

  function setCaretCharacterOffset(element, offset) {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let remaining = Math.max(0, offset);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode) {
      const length = textNode.textContent.length;
      if (remaining <= length) {
        range.setStart(textNode, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }

      remaining -= length;
      textNode = walker.nextNode();
    }

    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function getSelectionOffsets(element) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
      return null;
    }

    const startRange = range.cloneRange();
    startRange.selectNodeContents(element);
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;

    const endRange = range.cloneRange();
    endRange.selectNodeContents(element);
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;

    return { start, end };
  }

  function getEditablePlainText(element, multiline = false) {
    const raw = element.innerText.replace(/\r\n?/g, "\n");
    return multiline ? raw : raw.replace(/\n/g, " ");
  }

  function setEditablePlainText(element, text, caretOffset = null) {
    element.textContent = text;

    if (caretOffset !== null) {
      setCaretCharacterOffset(element, Math.min(caretOffset, text.length));
    }
  }

  function insertTextAtCaret(element, text, multiline = false) {
    if (element.classList.contains("book-editable")) {
      const offsets = getRangeOffsetsInNote(element);
      if (!offsets) return;

      const current = getEditablePlainText(element, multiline);
      const insert = multiline
        ? text.replace(/\r\n?/g, "\n")
        : text.replace(/\r\n?/g, " ").replace(/\n/g, " ");
      const next = current.slice(0, offsets.start) + insert + current.slice(offsets.end);
      paintBookHighlights(element, multiline, next);
      setCaretOffsetInNote(element, offsets.start + insert.length);
      return;
    }

    const offsets = getSelectionOffsets(element);
    if (!offsets) return;

    const current = getEditablePlainText(element, multiline);
    const insert = multiline
      ? text.replace(/\r\n?/g, "\n")
      : text.replace(/\r\n?/g, " ").replace(/\n/g, " ");
    const next = current.slice(0, offsets.start) + insert + current.slice(offsets.end);
    setEditablePlainText(element, next, offsets.start + insert.length);
  }

  function fragmentTextLength(fragment) {
    let length = 0;

    fragment.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        length += node.textContent.replace(/\u200b/g, "").length;
        return;
      }

      if (node.nodeName === "BR") {
        length += 1;
        return;
      }

      if (node.nodeName === "SPAN") {
        length += node.textContent.replace(/\u200b/g, "").length;
      }
    });

    return length;
  }

  function getRangeOffsetsInNote(element) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
      return null;
    }

    const startRange = range.cloneRange();
    startRange.selectNodeContents(element);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange = range.cloneRange();
    endRange.selectNodeContents(element);
    endRange.setEnd(range.endContainer, range.endOffset);

    return {
      start: fragmentTextLength(startRange.cloneContents()),
      end: fragmentTextLength(endRange.cloneContents())
    };
  }

  function getCaretOffsetInNote(element) {
    const offsets = getRangeOffsetsInNote(element);
    return offsets?.start ?? null;
  }

  function setCaretOffsetInNote(element, targetOffset) {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let offset = 0;
    const nodes = element.childNodes;

    for (let index = 0; index < nodes.length; index += 1) {
      const child = nodes[index];

      if (child.nodeType === Node.TEXT_NODE) {
        const raw = child.textContent;
        const visibleLength = raw === "\u200b" ? 0 : raw.replace(/\u200b/g, "").length;

        if (targetOffset <= offset + visibleLength) {
          const localOffset = Math.max(0, Math.min(targetOffset - offset, raw.length));
          range.setStart(child, localOffset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }

        offset += visibleLength;
        continue;
      }

      if (child.nodeName === "SPAN") {
        const textNode = child.firstChild;
        const raw = textNode?.textContent ?? "";
        const visibleLength = raw === "\u200b" ? 0 : raw.length;

        if (targetOffset <= offset + visibleLength) {
          const localOffset = Math.max(0, Math.min(targetOffset - offset, raw.length));
          range.setStart(textNode, localOffset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }

        offset += visibleLength;
        continue;
      }

      if (child.nodeName === "BR") {
        if (targetOffset <= offset) {
          range.setStartBefore(child);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }

        if (targetOffset === offset + 1) {
          const next = nodes[index + 1];
          if (next?.nodeName === "SPAN" && next.firstChild) {
            range.setStart(next.firstChild, 0);
          } else {
            range.setStartAfter(child);
          }
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }

        offset += 1;
      }
    }

    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function bookEditorUsesHighlight() {
    return isNoteHighlightEnabled();
  }

  function getBookUndoKey(element) {
    return `${activeNoteId || "none"}:${element.id}`;
  }

  function getBookUndoStack(element) {
    const key = getBookUndoKey(element);
    if (!bookUndoStacks.has(key)) {
      bookUndoStacks.set(key, { undo: [], redo: [] });
    }
    return bookUndoStacks.get(key);
  }

  function restoreBookEditorText(element, multiline, text, caretOffset = null) {
    if (element === noteBody) {
      noteBody.dataset.notePlain = text;
      syncNoteBodyEmptyState(text);
      const keepEditable = document.activeElement === noteBody || caretOffset !== null;

      if (!keepEditable && isMarkdownPreviewEnabled()) {
        renderNoteBodyPreview(text);
        return;
      }

      noteBody.classList.add("markdown-source");
      noteBody.classList.remove("markdown-preview");
      noteBody.contentEditable = "true";

      if (text.length === 0) {
        noteBody.textContent = "";
      } else {
        paintBookContent(noteBody, true, text, bookEditorUsesHighlight(noteBody));
        if (caretOffset !== null) {
          setCaretOffsetInNote(noteBody, Math.min(caretOffset, text.length));
        }
      }

      return;
    }

    const useHighlight = bookEditorUsesHighlight(element);

    if (text.length === 0) {
      element.textContent = "";
      element.dataset.notePlain = "";
      syncEmptyState(element);
      return;
    }

    paintBookContent(element, multiline, text, useHighlight);
    element.dataset.notePlain = text;
    element.dataset.empty = "false";

    if (caretOffset !== null) {
      setCaretOffsetInNote(element, caretOffset);
    }
  }

  function pushBookUndoState(element, previousText) {
    const stack = getBookUndoStack(element);
    if (stack.undo.length > 0 && stack.undo[stack.undo.length - 1] === previousText) {
      return;
    }

    stack.undo.push(previousText);
    if (stack.undo.length > BOOK_UNDO_LIMIT) {
      stack.undo.shift();
    }
    stack.redo = [];
  }

  function undoBookEditor(element, multiline, onUpdate) {
    const stack = getBookUndoStack(element);
    if (!stack.undo.length) {
      return false;
    }

    const current = element.dataset.notePlain ?? "";
    const previous = stack.undo.pop();
    stack.redo.push(current);
    restoreBookEditorText(element, multiline, previous, previous.length);
    onUpdate?.();
    queueBookCaretUpdate();
    return true;
  }

  function redoBookEditor(element, multiline, onUpdate) {
    const stack = getBookUndoStack(element);
    if (!stack.redo.length) {
      return false;
    }

    const current = element.dataset.notePlain ?? "";
    const next = stack.redo.pop();
    stack.undo.push(current);
    restoreBookEditorText(element, multiline, next, next.length);
    onUpdate?.();
    queueBookCaretUpdate();
    return true;
  }

  function prepareEmptyBookEditor(element) {
    if (element.childNodes.length > 0) {
      return;
    }

    if (bookEditorUsesHighlight(element)) {
      const span = document.createElement("span");
      span.className = "note-highlight-run note-highlight-empty";
      span.appendChild(document.createTextNode("\u200b"));
      element.appendChild(span);
    } else {
      element.appendChild(document.createTextNode("\u200b"));
    }

    element.dataset.empty = "false";
  }

  function paintTitleWords(element, text) {
    element.classList.add("is-word-highlighted");
    const words = text.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      const empty = document.createElement("span");
      empty.className = "note-highlight-run note-highlight-title note-highlight-empty";
      empty.appendChild(document.createTextNode("\u200b"));
      element.appendChild(empty);
      return;
    }

    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "note-highlight-run note-highlight-title note-title-word";
      span.appendChild(document.createTextNode(word));
      element.appendChild(span);

      if (index < words.length - 1) {
        const spacer = document.createElement("span");
        spacer.className = "note-title-space";
        spacer.appendChild(document.createTextNode(" "));
        element.appendChild(spacer);
      }
    });
  }

  function paintBookContent(element, multiline, text, useHighlight = true) {
    element.textContent = "";
    if (element === noteTitle) {
      element.classList.toggle("is-word-highlighted", useHighlight);
    }

    if (element === noteTitle && useHighlight) {
      paintTitleWords(element, text);
      return;
    }

    const lines = multiline ? text.split("\n") : [text];
    const highlightClass = element === noteTitle
      ? "note-highlight-run note-highlight-title"
      : "note-highlight-run";
    const emptyHighlightClass = `${highlightClass} note-highlight-empty`;
    let inFencedCodeBlock = false;

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trimStart();
      const isFenceLine = multiline && (trimmed.startsWith("```") || trimmed.startsWith("~~~"));
      const shouldHighlightLine = useHighlight && !(element === noteBody && (inFencedCodeBlock || isFenceLine));

      if (shouldHighlightLine) {
        const span = document.createElement("span");
        span.className = line.length > 0 ? highlightClass : emptyHighlightClass;
        span.appendChild(document.createTextNode(line.length > 0 ? line : "\u200b"));
        element.appendChild(span);
      } else if (line.length > 0) {
        element.appendChild(document.createTextNode(line));
      } else {
        element.appendChild(document.createTextNode("\u200b"));
      }

      if (multiline && lineIndex < lines.length - 1) {
        element.appendChild(document.createElement("br"));
      }

      if (element === noteBody && isFenceLine) {
        inFencedCodeBlock = !inFencedCodeBlock;
      }
    });
  }

  function paintBookHighlights(element, multiline, text) {
    paintBookContent(element, multiline, text, bookEditorUsesHighlight(element));
  }

  function finalizeBookEditor(element, multiline) {
    if (element === noteBody) {
      const text = getEditablePlainText(element, true).replace(/\u200b/g, "");
      noteBody.dataset.notePlain = text;
      syncNoteBodyEmptyState(text);

      if (text.length === 0) {
        element.textContent = "";
        return;
      }

      paintBookContent(element, true, text, bookEditorUsesHighlight(element));
      return;
    }

    const isFocused = document.activeElement === element;
    const offset = isFocused
      ? (getCaretOffsetInNote(element) ?? getCaretCharacterOffset(element))
      : null;
    const text = getEditablePlainText(element, multiline).replace(/\u200b/g, "");

    if (text.length === 0) {
      element.textContent = "";
      element.dataset.notePlain = "";
      syncEmptyState(element);
      return;
    }

    const previous = element.dataset.notePlain ?? "";
    const shouldRepaint = text !== previous || !element.hasChildNodes();

    element.dataset.empty = "false";
    element.dataset.notePlain = text;

    if (shouldRepaint) {
      paintBookContent(element, multiline, text, bookEditorUsesHighlight(element));
    }

    // Only restore the caret if the element is actually focused — restoring a
    // selection into a blurred off-screen element leaves a stale global selection
    // that can pollute keepEditorInView and the book-caret position.
    if (isFocused && offset !== null) {
      setCaretOffsetInNote(element, Math.min(offset, text.length));
    }
  }

  function getLineColAtOffset(text, offset) {
    const before = text.slice(0, offset);
    const lines = before.split("\n");
    return {
      line: lines.length - 1,
      col: lines[lines.length - 1].length
    };
  }

  function offsetAtLineCol(text, line, col) {
    const lines = text.split("\n");
    let offset = 0;

    for (let index = 0; index < line; index += 1) {
      offset += lines[index].length + 1;
    }

    offset += Math.min(col, lines[line]?.length ?? 0);
    return offset;
  }

  function moveBookCaretVertically(element, multiline, direction) {
    if (!multiline) return false;

    const text = getEditablePlainText(element, true);
    const offset = getCaretOffsetInNote(element);
    if (offset === null) return false;

    const { line, col } = getLineColAtOffset(text, offset);
    const lines = text.split("\n");
    const targetLine = direction === "up" ? line - 1 : line + 1;

    if (targetLine < 0 || targetLine >= lines.length) {
      return false;
    }

    setCaretOffsetInNote(element, offsetAtLineCol(text, targetLine, col));
    return true;
  }

  function createBookCaret() {
    const caret = document.createElement("div");
    caret.className = "book-caret";
    caret.setAttribute("aria-hidden", "true");
    document.body.appendChild(caret);
    return caret;
  }

  const bookCaret = createBookCaret();
  let bookCaretFrame = null;

  function hideBookCaret() {
    bookCaret.classList.remove("is-visible");
  }

  function updateBookCaret() {
    const active = document.activeElement?.closest?.(".book-editable");
    if (!active) {
      hideBookCaret();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      hideBookCaret();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!active.contains(range.startContainer)) {
      hideBookCaret();
      return;
    }

    const rects = range.getClientRects();
    const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      hideBookCaret();
      return;
    }

    const style = window.getComputedStyle(active);
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || 16;
    const height = Math.max(Math.round(rect.height || lineHeight), Math.round(lineHeight * 0.92));

    bookCaret.style.left = `${Math.round(rect.left - 3)}px`;
    bookCaret.style.top = `${Math.round(rect.top + ((rect.height || height) - height) / 2)}px`;
    bookCaret.style.height = `${height}px`;
    bookCaret.classList.add("is-visible");
  }

  function queueBookCaretUpdate() {
    if (bookCaretFrame !== null) return;
    bookCaretFrame = window.requestAnimationFrame(() => {
      bookCaretFrame = null;
      updateBookCaret();
    });
  }

  function setupBookEditor(element, { multiline = false, onUpdate } = {}) {
    if (element === noteBody) {
      const handleChange = () => {
        const previous = noteBody.dataset.notePlain ?? "";
        const next = getEditablePlainText(noteBody, true).replace(/\u200b/g, "");
        noteBody.dataset.notePlain = next;
        syncNoteBodyEmptyState(next);

        if (previous !== next) {
          pushBookUndoState(noteBody, previous);
        }

        onUpdate?.();
        queueBookCaretUpdate();
      };

      element.addEventListener("input", handleChange);

      element.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") ?? "";
        insertTextAtCaret(element, text, true);
        handleChange();
      });

      element.addEventListener("focus", () => {
        if (!element.isContentEditable) {
          enterNoteBodyEditMode();
        } else {
          queueBookCaretUpdate();
        }
      });

      element.addEventListener("mousedown", (event) => {
        if (element.isContentEditable) {
          return;
        }

        event.preventDefault();
        enterNoteBodyEditMode();
      });

      element.addEventListener("blur", () => {
        finalizeBookEditor(element, true);
        if (isMarkdownPreviewEnabled()) {
          renderNoteBodyPreview();
        }
        hideBookCaret();
      });

      element.addEventListener("mouseup", queueBookCaretUpdate);
      element.addEventListener("keyup", queueBookCaretUpdate);

      element.addEventListener("keydown", (event) => {
        const modKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();

        if (modKey && key === "z" && !event.shiftKey) {
          event.preventDefault();
          undoBookEditor(element, true, onUpdate);
          return;
        }

        if (modKey && (key === "y" || (key === "z" && event.shiftKey))) {
          event.preventDefault();
          redoBookEditor(element, true, onUpdate);
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          insertTextAtCaret(element, "\n", true);
          handleChange();
          return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
          queueBookCaretUpdate();
          window.requestAnimationFrame(() => keepEditorInView(element));
        }
      });

      return;
    }

    const handleChange = () => {
      const previous = element.dataset.notePlain ?? "";
      let next = "";

      if (element === noteTitle && document.activeElement === element) {
        next = getEditablePlainText(element, multiline).replace(/\u200b/g, "");
        element.dataset.notePlain = next;
        element.dataset.empty = next.length === 0 ? "true" : "false";
      } else {
        finalizeBookEditor(element, multiline);
        next = element.dataset.notePlain ?? "";
      }

      if (previous !== next) {
        pushBookUndoState(element, previous);
      }

      onUpdate?.();
      queueBookCaretUpdate();
    };

    element.addEventListener("input", handleChange);

    element.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      insertTextAtCaret(element, text, multiline);
      handleChange();
    });

    element.addEventListener("blur", () => {
      finalizeBookEditor(element, multiline);
      syncEmptyState(element);
      hideBookCaret();
    });

    element.addEventListener("focus", () => {
      if (element.dataset.empty === "true") {
        prepareEmptyBookEditor(element);
      }

      if (element === noteTitle) {
        const text = element.dataset.notePlain ?? getEditablePlainText(element, multiline).replace(/\u200b/g, "");
        const offset = getCaretOffsetInNote(element) ?? text.length;
        element.classList.remove("is-word-highlighted");
        setEditablePlainText(element, text, Math.min(offset, text.length));
      }

      queueBookCaretUpdate();
    });

    element.addEventListener("mousedown", (event) => {
      if (element.dataset.empty !== "true") {
        return;
      }

      event.preventDefault();
      prepareEmptyBookEditor(element);
      element.focus({ preventScroll: true });
      setCaretOffsetInNote(element, 0);
      queueBookCaretUpdate();
    });

    element.addEventListener("mouseup", queueBookCaretUpdate);
    element.addEventListener("keyup", queueBookCaretUpdate);

    element.addEventListener("keydown", (event) => {
      const modKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modKey && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoBookEditor(element, multiline, onUpdate);
        return;
      }

      if (modKey && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        redoBookEditor(element, multiline, onUpdate);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (moveBookCaretVertically(element, multiline, event.key === "ArrowUp" ? "up" : "down")) {
          event.preventDefault();
          queueBookCaretUpdate();
          window.requestAnimationFrame(() => keepEditorInView(element));
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        queueBookCaretUpdate();
      }

      if (event.key !== "Enter") return;

      if (element === noteTitle) {
        event.preventDefault();
        placeCaretAtEnd(noteSubtitle);
        return;
      }

      if (element === noteSubtitle) {
        event.preventDefault();
        placeCaretAtEnd(noteBody);
        return;
      }

      if (element === noteBody) {
        event.preventDefault();
        insertTextAtCaret(noteBody, "\n", true);
        handleChange();
      }
    });
  }

  function needsNormalization(element) {
    if (element.childNodes.length === 0) return false;
    if (element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE) {
      return false;
    }

    return true;
  }

  function normalizeEditableContent(element, multiline = false) {
    const offset = getCaretCharacterOffset(element);
    const text = getEditablePlainText(element, multiline);

    if (element.textContent === text && !needsNormalization(element)) {
      return;
    }

    setEditablePlainText(element, text, offset !== null ? Math.min(offset, text.length) : null);
  }

  function setupPlainTextEditable(element, { multiline = false, onUpdate } = {}) {
    const handleChange = () => {
      normalizeEditableContent(element, multiline);
      syncEmptyState(element);
      onUpdate?.();
    };

    element.addEventListener("input", handleChange);

    element.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      insertTextAtCaret(element, text, multiline);
      handleChange();
    });

    element.addEventListener("blur", () => {
      normalizeEditableContent(element, multiline);
      syncEmptyState(element);
    });
  }

  function getTaskValue(textElement) {
    return textElement.textContent.replace(/\u00a0/g, " ").replace(/\u200b/g, "").trim();
  }

  function syncEmptyState(textElement) {
    textElement.dataset.empty = getTaskValue(textElement) === "" ? "true" : "false";
  }

  function placeCaretAtEnd(element) {
    element.focus({ preventScroll: true });

    if (element.classList.contains("book-editable")) {
      if (element === noteBody && !element.isContentEditable) {
        enterNoteBodyEditMode();
        return;
      }

      const multiline = element === noteBody;
      const text = getEditablePlainText(element, multiline).replace(/\u200b/g, "");

      if (text.length === 0) {
        prepareEmptyBookEditor(element);
        setCaretOffsetInNote(element, 0);
      } else if (!element.hasChildNodes()) {
        paintBookContent(element, multiline, text, bookEditorUsesHighlight(element));
        element.dataset.notePlain = text;
        setCaretOffsetInNote(element, text.length);
      } else {
        setCaretOffsetInNote(element, text.length);
      }

      queueBookCaretUpdate();
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function scrollTasksToBottom() {
    tasksPanel.scrollTop = tasksPanel.scrollHeight;
  }

  function keepTaskInView(task) {
    if (!task) return;
    const panelRect = tasksPanel.getBoundingClientRect();
    const taskRect = task.getBoundingClientRect();
    const padding = 24;

    if (taskRect.bottom > panelRect.bottom - padding) {
      tasksPanel.scrollTop += taskRect.bottom - panelRect.bottom + padding;
    } else if (taskRect.top < panelRect.top + padding) {
      tasksPanel.scrollTop -= panelRect.top + padding - taskRect.top;
    }
  }

  function getScrollableAncestor(element) {
    let current = element?.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const canScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
      if (canScroll && current.scrollHeight > current.clientHeight) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function keepEditorInView(element) {
    const scrollContainer = getScrollableAncestor(element);
    if (!scrollContainer) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Guard: only act when the selection is actually inside this element.
    // A stale global selection (e.g. left over from a book editor after closing
    // the notepad) would produce off-screen rect coordinates and cause a massive
    // unintended scroll jump.
    if (!element.contains(range.startContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 32;
    const containerHeight = containerRect.height;
    const isBookEditor = element.classList.contains("book-editable");
    const preferredBuffer = isBookEditor
      ? Math.max(lineHeight * 4, containerHeight * 0.35)
      : lineHeight * 4;
    const buffer = Math.min(preferredBuffer, containerHeight * 0.45);

    if (rect.bottom > containerRect.bottom - buffer) {
      scrollContainer.scrollTop += rect.bottom - (containerRect.bottom - buffer);
    } else if (rect.top < containerRect.top + buffer) {
      scrollContainer.scrollTop -= containerRect.top + buffer - rect.top;
    }
  }

  function updateDiagnostics() {
    const detail = diagnosticTemplates[Math.floor(Math.random() * diagnosticTemplates.length)];
    diagnostics.textContent = `${statuses[statusIndex]} ${detail}`;
  }

  function scheduleDiagnostics() {
    const nextDelay = 3500 + Math.random() * 5500;
    window.setTimeout(() => {
      updateDiagnostics();
      scheduleDiagnostics();
    }, nextDelay);
  }

  function triggerPrinterNote() {
    const message = printerMessages[Math.floor(Math.random() * printerMessages.length)];
    printerNote.textContent = message;
    printerNote.classList.remove("show");
    void printerNote.offsetWidth;
    printerNote.classList.add("show");
  }

  function getGlitchCharacter() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()[]{}<>/\\|_+-=~`'\";:,.?";
    return characters[Math.floor(Math.random() * characters.length)];
  }

  function animateTaskTextGlitch(textElement, duration = 500) {
    const originalText = textElement.textContent;
    if (!originalText) return;

    let startTime = null;
    const characters = Array.from(originalText);

    const frame = (timestamp) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min(1, (timestamp - startTime) / duration);
      const revealCount = Math.floor(progress * characters.length);
      const scrambled = characters.map((character, index) => {
        if (index < revealCount) {
          return character;
        }

        return getGlitchCharacter();
      }).join("");

      textElement.textContent = scrambled;

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        textElement.textContent = originalText;
      }
    };

    window.requestAnimationFrame(frame);
  }

  function moveTaskToTarget(task, targetTask, clientY) {
    if (!task || !targetTask || task === targetTask) return;

    const targetRect = targetTask.getBoundingClientRect();
    const midpoint = targetRect.top + targetRect.height / 2;
    const shouldInsertBefore = clientY < midpoint;

    if (shouldInsertBefore) {
      tasksPanel.insertBefore(task, targetTask);
    } else {
      tasksPanel.insertBefore(task, targetTask.nextSibling);
    }
  }

  function createTask(text = "", afterTask = null) {
    const task = document.createElement("div");
    task.className = "task";
    task.draggable = false;

    const check = document.createElement("button");
    check.className = "task-check";
    check.type = "button";
    check.setAttribute("aria-label", "Mark task done");
    check.setAttribute("aria-pressed", "false");

    const content = document.createElement("div");
    content.className = "task-content";

    const textElement = document.createElement("div");
    textElement.className = "task-text";
    textElement.contentEditable = "true";
    textElement.spellcheck = false;
    textElement.setAttribute("role", "textbox");
    textElement.setAttribute("aria-label", "Task text");
    textElement.setAttribute("data-placeholder", "Type here");
    textElement.textContent = text;
    syncEmptyState(textElement);
    content.appendChild(textElement);

    const deleteButton = document.createElement("button");
    deleteButton.className = "task-delete";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", "Delete task");
    deleteButton.textContent = "x";

    check.addEventListener("click", (event) => {
      event.stopPropagation();
      const done = task.classList.toggle("done");
      check.setAttribute("aria-pressed", String(done));

      if (getTaskValue(textElement) !== "") {
        textElement.classList.remove("is-glitching");
        void textElement.offsetWidth;
        textElement.classList.add("is-glitching");
        animateTaskTextGlitch(textElement, 500);
      }
    });

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const allTasks = Array.from(tasksPanel.querySelectorAll(".task"));
      if (allTasks.length <= 1) {
        textElement.textContent = "";
        syncEmptyState(textElement);
        placeCaretAtEnd(textElement);
        return;
      }

      const index = allTasks.indexOf(task);
      const fallback = allTasks[index - 1] || allTasks[index + 1];
      task.remove();
      placeCaretAtEnd(fallback.querySelector(".task-text"));
    });

    setupPlainTextEditable(textElement, {
      multiline: true,
      onUpdate: () => {
        keepTaskInView(task);
        window.requestAnimationFrame(() => keepEditorInView(textElement));
      }
    });

    textElement.addEventListener("focus", () => {
      // Intentionally no scroll — view stays fixed where the user left it.
    });

    textElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        insertTextAtCaret(textElement, "\n", true);
        normalizeEditableContent(textElement, true);
        syncEmptyState(textElement);
        // View stays fixed — no scroll on Shift+Enter.
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const nextTask = createTask("", task);
        placeCaretAtEnd(nextTask.querySelector(".task-text"));
        // View stays fixed — no scroll on Enter.
        return;
      }

      if (event.key === "Backspace" && getTaskValue(textElement) === "") {
        const allTasks = Array.from(tasksPanel.querySelectorAll(".task"));
        if (allTasks.length <= 1) return;

        event.preventDefault();
        const index = allTasks.indexOf(task);
        const fallback = allTasks[index - 1] || allTasks[index + 1];
        task.remove();
        placeCaretAtEnd(fallback.querySelector(".task-text"));
      }
    });

    check.addEventListener("dragstart", (event) => {
      draggedTask = task;
      task.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", "task");
      }
    });

    check.addEventListener("dragend", () => {
      draggedTask = null;
      task.classList.remove("is-dragging");
      document.querySelectorAll(".task.drag-over").forEach((item) => item.classList.remove("drag-over"));
    });

    task.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!draggedTask || task === draggedTask) return;

      task.classList.add("drag-over");
      moveTaskToTarget(draggedTask, task, event.clientY);
    });

    task.addEventListener("dragleave", () => {
      task.classList.remove("drag-over");
    });

    task.addEventListener("drop", (event) => {
      event.preventDefault();
      task.classList.remove("drag-over");
      draggedTask = null;
    });

    task.append(check, content, deleteButton);

    if (afterTask) {
      afterTask.insertAdjacentElement("afterend", task);
      triggerPrinterNote();
    } else {
      tasksPanel.appendChild(task);
    }

    // Do not auto-scroll — the user controls the viewport manually.
    return task;
  }

  function focusOrCreateLastTask() {
    const allTasks = Array.from(tasksPanel.querySelectorAll(".task"));
    const lastTask = allTasks[allTasks.length - 1];

    if (!lastTask) {
      const newTask = createTask();
      placeCaretAtEnd(newTask.querySelector(".task-text"));
      return;
    }

    const lastText = lastTask.querySelector(".task-text");
    if (getTaskValue(lastText) === "") {
      placeCaretAtEnd(lastText);
      return;
    }

    const newTask = createTask();
    placeCaretAtEnd(newTask.querySelector(".task-text"));
  }

  function triggerPixelShuffle() {
    screen.classList.remove("pixel-shuffle");
    void screen.offsetWidth;
    screen.classList.add("pixel-shuffle");
  }

  function schedulePixelShuffle() {
    const now = new Date();
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    window.setTimeout(() => {
      triggerPixelShuffle();
      window.setInterval(triggerPixelShuffle, 60000);
    }, delay);
  }

  function renderNoteEditor(noteId) {
    const note = notes[noteId];
    if (!note) return;

    noteTitle.textContent = note.title;
    noteSubtitle.textContent = note.subtitle;
    noteBody.dataset.notePlain = note.body;
    finalizeBookEditor(noteTitle, false);
    finalizeBookEditor(noteSubtitle, false);
    refreshNoteBodyPresentation();
    syncEmptyState(noteTitle);
    syncEmptyState(noteSubtitle);
    syncNoteBodyEmptyState(note.body);
    updateNoteTabPreview(noteId);
  }

  function saveActiveNote() {
    if (!activeNoteId) return;

    const note = notes[activeNoteId];
    if (!note) return;

    note.title = getEditablePlainText(noteTitle, false);
    note.subtitle = getEditablePlainText(noteSubtitle, false);
    note.body = noteBody.dataset.notePlain ?? "";
    updateNoteTabPreview(activeNoteId);
  }

  function closeNotes() {
    if (!activeNoteId || screen.classList.contains("note-closing")) return;

    const closingNoteId = activeNoteId;
    setNoteTransitionOrigin(closingNoteId);
    saveActiveNote();
    setReadingModeEnabled(false);

    // Cancel any pending caret RAF so it cannot re-show the caret after we
    // hide it — the RAF could have been queued just before this call.
    if (bookCaretFrame !== null) {
      window.cancelAnimationFrame(bookCaretFrame);
      bookCaretFrame = null;
    }

    // Blur all book editors before sliding away so they relinquish focus and
    // can't receive keystrokes or trigger scroll-into-view during the transition.
    bookEditors.forEach((editor) => editor.blur());
    hideBookCaret();

    // Clear the global selection so no stale book-editor range leaks into
    // keepEditorInView or the caret positioning logic after switching views.
    window.getSelection()?.removeAllRanges();

    const notepadPopdown = document.getElementById("notepadPopdown");
    if (notepadPopdown) {
      notepadPopdown.classList.remove("is-open");
    }
    if (popdownOpenTimeout) {
      clearTimeout(popdownOpenTimeout);
      popdownOpenTimeout = null;
    }
    if (popdownCloseTimeout) {
      clearTimeout(popdownCloseTimeout);
      popdownCloseTimeout = null;
    }

    clearNoteTransitionState();
    void bookShell.offsetWidth;
    screen.classList.add("note-closing");
    noteTransitionTimeout = window.setTimeout(() => {
      activeNoteId = null;
      screen.classList.remove("note-closing");
      screen.classList.remove("book-mode");
      bookView.setAttribute("aria-hidden", "true");

      noteTabs.forEach((tab) => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-expanded", "false");
      });

      noteTransitionTimeout = null;
    }, NOTE_TRANSITION_MS);
  }

  function openNote(noteId) {
    const note = notes[noteId];
    if (!note) return;

    if (screen.classList.contains("note-closing")) {
      clearNoteTransitionState();
    }

    setMusicControlsOpen(false);
    saveActiveNote();
    activeNoteId = noteId;
    renderNoteEditor(noteId);
    screen.classList.add("book-mode");
    bookView.setAttribute("aria-hidden", "false");
    if (bookScrollContainer) {
      bookScrollContainer.scrollTop = 0;
    }

    noteTabs.forEach((tab) => {
      const isActive = tab.dataset.note === noteId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-expanded", String(isActive));
    });

    startNoteOpenTransition(noteId);
  }

  statusButton.addEventListener("click", () => {
    setMusicControlsOpen(!musicControlsOpen);
  });

  if (musicReturn) {
    musicReturn.addEventListener("click", () => {
      setMusicControlsOpen(false);
    });
  }

  musicPreviousButton?.addEventListener("click", () => {
    sendMediaCommand("previous");
  });

  musicBackButton?.addEventListener("click", () => {
    sendMediaCommand("seek_relative", -10);
  });

  musicPlayPauseButton?.addEventListener("click", () => {
    const status = String(lastMediaState?.status ?? "paused").toLowerCase();
    const action = lastMediaState?.canTogglePlayPause
      ? "toggle"
      : status === "playing"
        ? "pause"
        : "play";
    sendMediaCommand(action);
  });

  musicForwardButton?.addEventListener("click", () => {
    sendMediaCommand("seek_relative", 10);
  });

  musicNextButton?.addEventListener("click", () => {
    sendMediaCommand("next");
  });

  debugFetchStateButton?.addEventListener("click", () => {
    refreshMediaState({ logSuccess: true });
  });

  debugPlayPauseButton?.addEventListener("click", () => {
    const status = String(lastMediaState?.status ?? "paused").toLowerCase();
    const action = lastMediaState?.canTogglePlayPause
      ? "toggle"
      : status === "playing"
        ? "pause"
        : "play";
    sendMediaCommand(action);
  });

  debugPreviousButton?.addEventListener("click", () => {
    sendMediaCommand("previous");
  });

  debugNextButton?.addEventListener("click", () => {
    sendMediaCommand("next");
  });

  debugSeekBackButton?.addEventListener("click", () => {
    sendMediaCommand("seek_relative", -10);
  });

  debugSeekForwardButton?.addEventListener("click", () => {
    sendMediaCommand("seek_relative", 10);
  });

  if (musicOutputSlider) {
    renderMusicOutputLevel(musicOutputLevel);

    musicOutputSlider.addEventListener("input", () => {
      renderMusicOutputLevel(musicOutputSlider.value);
    });

    musicOutputSlider.addEventListener("change", () => {
      commitMusicOutputLevel(musicOutputSlider.value);
    });
  }

  if (musicMixer && musicMixerKnobs.length) {
    renderMusicMixer();

    const beginEqDrag = (band, knob, event) => {
      event.preventDefault();
      activeMixerBand = band;
      activeMixerKnob = knob;
      knob.classList.add("is-dragging");
      document.body.classList.add("eq-dragging");
      knob.setPointerCapture?.(event.pointerId);
      setEqProximity(event.clientX, event.clientY);
      updateMusicMixerBandFromPointer(event.clientY);
    };

    musicEqBands.forEach((band) => {
      const knob = band.querySelector(".media-deck-mixer-knob");
      const track = band.querySelector(".media-deck-eq-track");
      const bandIndex = Number.parseInt(band.dataset.band ?? "", 10);
      if (Number.isNaN(bandIndex) || !knob || !track) return;

      knob.addEventListener("pointerdown", (event) => {
        beginEqDrag(bandIndex, knob, event);
      });

      track.addEventListener("pointerdown", (event) => {
        beginEqDrag(bandIndex, knob, event);
      });
    });

    musicMixerKnobs.forEach((knob) => {
      knob.addEventListener("dragstart", (event) => {
        event.preventDefault();
      });

      knob.addEventListener("selectstart", (event) => {
        event.preventDefault();
      });
    });

    musicMixer.addEventListener("pointermove", (event) => {
      if (activeMixerBand !== null) return;
      setEqProximity(event.clientX, event.clientY);
    });

    musicMixer.addEventListener("pointerleave", () => {
      if (activeMixerBand !== null) return;
      clearEqProximity();
    });

    window.addEventListener("pointermove", (event) => {
      if (activeMixerBand === null) return;
      event.preventDefault();
      setEqProximity(event.clientX, event.clientY);
      updateMusicMixerBandFromPointer(event.clientY);
    });

    window.addEventListener("pointerup", (event) => {
      if (activeMixerBand === null) return;
      activeMixerKnob?.releasePointerCapture?.(event.pointerId);
      activeMixerBand = null;
      activeMixerKnob = null;
      document.body.classList.remove("eq-dragging");
      musicMixerKnobs.forEach((knob) => knob.classList.remove("is-dragging"));
      clearEqProximity();
    });
  }

  musicEqResetButton?.addEventListener("click", () => {
    resetMusicMixerBands();
  });

  if (musicScreenShell) {
    resetMusicCardTilt();

    musicScreenShell.addEventListener("pointermove", (event) => {
      setMusicCardTilt(event.clientX, event.clientY);
    });

    musicScreenShell.addEventListener("pointerleave", resetMusicCardTilt);
  }

  tasksPanel.addEventListener("click", (event) => {
    if (event.target === tasksPanel) {
      focusOrCreateLastTask();
    }
  });

  // The outer .screen has overflow:hidden which prevents the browser from
  // routing wheel events to the scrollable tasks panel. Forward them manually.
  tasksPanel.addEventListener("wheel", (event) => {
    event.preventDefault();
    tasksPanel.scrollTop += event.deltaY;
  }, { passive: false });

  noteTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      openNote(tab.dataset.note);
    });
  });

  if (readingModeToggle) {
    readingModeToggle.addEventListener("click", () => {
      setReadingModeEnabled(!readingModeEnabled);
    });
  }

  if (bookScrollContainer) {
    bookScrollContainer.addEventListener("wheel", () => {
      pauseReadingModeForUserInput();
    }, { passive: true });

    bookScrollContainer.addEventListener("pointerdown", () => {
      pauseReadingModeForUserInput();
    });

    bookScrollContainer.addEventListener("touchstart", () => {
      pauseReadingModeForUserInput();
    }, { passive: true });

    bookScrollContainer.addEventListener("keydown", () => {
      pauseReadingModeForUserInput();
    });

    bookScrollContainer.addEventListener("scroll", () => {
      if (window.performance.now() < readingModeScrollIgnoreUntil) {
        return;
      }

      pauseReadingModeForUserInput();
    });
  }

  bookEditors.forEach((editor) => {
    const multiline = editor === noteBody;

    syncEmptyState(editor);
    if (editor.dataset.empty !== "true") {
      finalizeBookEditor(editor, multiline);
    }

    setupBookEditor(editor, {
      multiline,
      onUpdate: () => {
        saveActiveNote();
        window.requestAnimationFrame(() => keepEditorInView(editor));
      }
    });
  });

  document.addEventListener("selectionchange", () => {
    if (document.activeElement?.closest?.(".book-editable")) {
      queueBookCaretUpdate();
    }
  });

  document.addEventListener("scroll", queueBookCaretUpdate, true);
  window.addEventListener("resize", queueBookCaretUpdate);

  checklistReturn.addEventListener("click", () => {
    closeNotes();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeNoteId) {
      closeNotes();
      return;
    }

    if (event.key === "Escape" && musicControlsOpen) {
      setMusicControlsOpen(false);
    }
  });

  // Notepad Pop-down Toolbar logic
  const notepadPopdown = document.getElementById("notepadPopdown");
  const plainTextToggle = document.getElementById("plainTextToggle");

  if (notepadPopdown) {
    notepadPopdown.addEventListener("mouseenter", () => {
      if (!screen.classList.contains("book-mode")) return;

      if (popdownCloseTimeout) {
        clearTimeout(popdownCloseTimeout);
        popdownCloseTimeout = null;
      }

      if (notepadPopdown.classList.contains("is-open")) return;

      popdownOpenTimeout = setTimeout(() => {
        notepadPopdown.classList.add("is-open");
      }, 2000);
    });

    notepadPopdown.addEventListener("mouseleave", () => {
      if (popdownOpenTimeout) {
        clearTimeout(popdownOpenTimeout);
        popdownOpenTimeout = null;
      }

      if (notepadPopdown.classList.contains("is-open")) {
        popdownCloseTimeout = setTimeout(() => {
          notepadPopdown.classList.remove("is-open");
        }, 800);
      }
    });
  }

  if (plainTextToggle) {
    plainTextToggle.addEventListener("click", () => {
      const isHalfInverted = document.body.classList.toggle("half-invert-mode");
      plainTextToggle.classList.toggle("is-active", isHalfInverted);
      plainTextToggle.textContent = isHalfInverted ? "ON" : "OFF";
      plainTextToggle.setAttribute("aria-pressed", String(isHalfInverted));

      if (activeNoteId) {
        bookEditors.forEach((editor) => {
          const multiline = editor === noteBody;
          const text = editor === noteBody
            ? getNoteBodyMarkdown()
            : (editor.dataset.notePlain ?? getEditablePlainText(editor, multiline).replace(/\u200b/g, ""));
          const caretOffset = document.activeElement === editor
            ? (multiline ? getCaretOffsetInNote(editor) : getCaretCharacterOffset(editor))
            : null;

          restoreBookEditorText(editor, multiline, text, caretOffset);
          if (editor === noteBody) {
            syncNoteBodyEmptyState(text);
          } else {
            syncEmptyState(editor);
          }
        });

        saveActiveNote();
      }

      queueBookCaretUpdate();
    });
  }

  setMusicControlsOpen(false);
  updateAllNoteTabPreviews();
  syncReadingModeButton();
  renderNowPlayingPanel(emptyNowPlayingState);

  startEngineRotor();
  updateStatusTime();
  window.setInterval(updateStatusTime, 1000);
  schedulePixelShuffle();
  updateDiagnostics();
  scheduleDiagnostics();
  connectNotificationBridge();
  createTask();
})();
