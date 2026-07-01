(() => {
  const stage = document.getElementById("stage");
  const clock = document.getElementById("clock");
  const secondsHand = document.getElementById("secondsHand");
  const openNotepad = document.getElementById("openNotepad");
  const closeNotepad = document.getElementById("closeNotepad");
  const tasksPanel = document.getElementById("tasks");
  const statusButton = document.getElementById("statusButton");
  const diagnostics = document.getElementById("diagnostics");
  const printerNote = document.getElementById("printerNote");
  const screen = document.querySelector(".screen");
  const leftTablist = document.getElementById("leftTablist");
  const rightTablist = document.getElementById("rightTablist");
  const leftNoteTitleInput = document.getElementById("leftNoteTitleInput");
  const leftNoteBodyInput = document.getElementById("leftNoteBodyInput");
  const rightNoteTitleInput = document.getElementById("rightNoteTitleInput");
  const rightNoteBodyInput = document.getElementById("rightNoteBodyInput");
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
  const notepadStorageKey = "qute-notepad-state";
  const defaultTabs = Array.from({ length: 6 }, (_, index) => ({
    title: `Note ${index + 1}`,
    body: ""
  }));
  let statusIndex = 0;
  let overtimeEnabled = false;
  let statusSwitchTimeout = null;
  let isRefreshingDosCaret = false;
  let dosCaretFrame = 0;
  let activeView = "crt";
  let notepadState = loadNotepadState();

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function loadNotepadState() {
    try {
      const stored = window.localStorage.getItem(notepadStorageKey);
      if (!stored) {
        return { leftActiveTabIndex: 0, rightActiveTabIndex: 3, tabs: defaultTabs.map((tab) => ({ ...tab })) };
      }

      const parsed = JSON.parse(stored);
      const tabs = Array.isArray(parsed?.tabs) ? parsed.tabs.slice(0, 6) : [];
      const normalizedTabs = Array.from({ length: 6 }, (_, index) => {
        const source = tabs[index] || defaultTabs[index];
        return {
          title: typeof source.title === "string" && source.title.trim() ? source.title : defaultTabs[index].title,
          body: typeof source.body === "string" ? source.body : ""
        };
      });
      const leftActiveTabIndex = Number.isInteger(parsed?.leftActiveTabIndex) && parsed.leftActiveTabIndex >= 0 && parsed.leftActiveTabIndex < 3
        ? parsed.leftActiveTabIndex
        : 0;
      const rightActiveTabIndex = Number.isInteger(parsed?.rightActiveTabIndex) && parsed.rightActiveTabIndex >= 3 && parsed.rightActiveTabIndex < 6
        ? parsed.rightActiveTabIndex
        : 3;
      return { leftActiveTabIndex, rightActiveTabIndex, tabs: normalizedTabs };
    } catch {
      return { leftActiveTabIndex: 0, rightActiveTabIndex: 3, tabs: defaultTabs.map((tab) => ({ ...tab })) };
    }
  }

  function saveNotepadState() {
    window.localStorage.setItem(notepadStorageKey, JSON.stringify(notepadState));
  }

  function setView(nextView) {
    activeView = nextView;
    stage.dataset.view = nextView;
  }

  function renderTabGroup(container, startIndex, endIndex, activeIndex, onSelect) {
    container.innerHTML = "";
    notepadState.tabs.slice(startIndex, endIndex).forEach((tab, offset) => {
      const index = startIndex + offset;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `notepad-tab${index === activeIndex ? " is-active" : ""}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === activeIndex));
      button.textContent = tab.title || defaultTabs[index].title;
      button.addEventListener("click", () => {
        if (activeIndex === index) return;
        persistEditor();
        onSelect(index);
      });
      container.appendChild(button);
    });
  }

  function renderTabs() {
    renderTabGroup(leftTablist, 0, 3, notepadState.leftActiveTabIndex, (index) => {
      notepadState.leftActiveTabIndex = index;
      saveNotepadState();
      syncEditorFromState();
      renderTabs();
    });

    renderTabGroup(rightTablist, 3, 6, notepadState.rightActiveTabIndex, (index) => {
      notepadState.rightActiveTabIndex = index;
      saveNotepadState();
      syncEditorFromState();
      renderTabs();
    });
  }

  function syncEditorFromState() {
    const leftTab = notepadState.tabs[notepadState.leftActiveTabIndex];
    const rightTab = notepadState.tabs[notepadState.rightActiveTabIndex];
    leftNoteTitleInput.value = leftTab.title;
    leftNoteBodyInput.value = leftTab.body;
    rightNoteTitleInput.value = rightTab.title;
    rightNoteBodyInput.value = rightTab.body;
  }

  function persistEditor() {
    const leftTab = notepadState.tabs[notepadState.leftActiveTabIndex];
    const rightTab = notepadState.tabs[notepadState.rightActiveTabIndex];
    leftTab.title = leftNoteTitleInput.value.trim() || defaultTabs[notepadState.leftActiveTabIndex].title;
    leftTab.body = leftNoteBodyInput.value;
    rightTab.title = rightNoteTitleInput.value.trim() || defaultTabs[notepadState.rightActiveTabIndex].title;
    rightTab.body = rightNoteBodyInput.value;
    saveNotepadState();
  }

  function updateClock() {
    const now = new Date();
    clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const rotation = now.getSeconds() * 6;
    secondsHand.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
  }

  function placeCaretAtEnd(element) {
    clearDosCaret();
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function getTaskValue(textElement) {
    return textElement.textContent.replace(/\u00a0/g, " ").trim();
  }

  function syncEmptyState(textElement) {
    textElement.dataset.empty = getTaskValue(textElement) === "" ? "true" : "false";
  }

  function scrollTasksToBottom() {
    tasksPanel.scrollTop = tasksPanel.scrollHeight;
  }

  function clearDosCaret() {
    tasksPanel.querySelectorAll(".dos-caret").forEach((caret) => caret.remove());
  }

  function getSelectedTaskText() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return null;
    const anchorElement = anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement;
    return anchorElement?.closest(".task-text") || null;
  }

  function refreshDosCaret() {
    if (isRefreshingDosCaret) return;
    isRefreshingDosCaret = true;
    clearDosCaret();

    const active = document.activeElement;
    const selection = window.getSelection();
    const textElement = getSelectedTaskText();
    if (!active || !active.classList.contains("task-text") || !selection || !selection.rangeCount || !selection.isCollapsed || textElement !== active) {
      isRefreshingDosCaret = false;
      return;
    }

    const caret = document.createElement("span");
    caret.className = "dos-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.contentEditable = "false";

    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    range.insertNode(caret);
    range.setStartAfter(caret);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    isRefreshingDosCaret = false;
  }

  function queueDosCaretRefresh() {
    window.cancelAnimationFrame(dosCaretFrame);
    dosCaretFrame = window.requestAnimationFrame(refreshDosCaret);
  }

  function placeCaretAtEndAndRefresh(element) {
    placeCaretAtEnd(element);
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

  function beginStatusSwitch(nextIndex) {
    if (statusSwitchTimeout) {
      window.clearTimeout(statusSwitchTimeout);
    }

    statusButton.classList.add("is-switching");
    statusButton.textContent = ".........";
    diagnostics.textContent = "RELAY SWITCHING";

    statusSwitchTimeout = window.setTimeout(() => {
      statusIndex = nextIndex;
      statusButton.textContent = statuses[statusIndex];
      statusButton.classList.remove("is-switching");
      updateDiagnostics();
    }, 360);
  }

  function createTask(text = "", afterTask = null) {
    const task = document.createElement("div");
    task.className = "task";

    const check = document.createElement("button");
    check.className = "task-check";
    check.type = "button";
    check.setAttribute("aria-label", "Mark task done");
    check.setAttribute("aria-pressed", "false");

    const content = document.createElement("div");
    content.className = "task-content";

    const deleteButton = document.createElement("button");
    deleteButton.className = "task-delete";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", "Delete task");
    deleteButton.textContent = "x";

    const textElement = document.createElement("div");
    textElement.className = "task-text";
    textElement.contentEditable = "true";
    textElement.spellcheck = false;
    textElement.setAttribute("role", "textbox");
    textElement.setAttribute("aria-label", "Task text");
    textElement.setAttribute("data-placeholder", "add here");
    textElement.textContent = text;
    syncEmptyState(textElement);
    content.appendChild(textElement);

    check.addEventListener("click", (event) => {
      event.stopPropagation();
      const done = task.classList.toggle("done");
      check.setAttribute("aria-pressed", String(done));
    });

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const allTasks = Array.from(tasksPanel.querySelectorAll(".task"));
      if (allTasks.length <= 1) {
        textElement.textContent = "";
        syncEmptyState(textElement);
        placeCaretAtEndAndRefresh(textElement);
        return;
      }
      const index = allTasks.indexOf(task);
      const fallback = allTasks[index - 1] || allTasks[index + 1];
      task.remove();
      placeCaretAtEndAndRefresh(fallback.querySelector(".task-text"));
    });

    textElement.addEventListener("input", () => {
      syncEmptyState(textElement);
      queueDosCaretRefresh();
    });

    textElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const nextTask = createTask("", task);
        placeCaretAtEndAndRefresh(nextTask.querySelector(".task-text"));
        return;
      }

      if (event.key === "Backspace" && getTaskValue(textElement) === "") {
        const allTasks = Array.from(tasksPanel.querySelectorAll(".task"));
        if (allTasks.length <= 1) return;
        event.preventDefault();
        const index = allTasks.indexOf(task);
        const fallback = allTasks[index - 1] || allTasks[index + 1];
        task.remove();
        placeCaretAtEndAndRefresh(fallback.querySelector(".task-text"));
      }
    });

    task.append(check, content, deleteButton);

    if (afterTask) {
      afterTask.insertAdjacentElement("afterend", task);
      triggerPrinterNote();
    } else {
      tasksPanel.appendChild(task);
    }

    scrollTasksToBottom();
    return task;
  }

  function focusOrCreateLastTask() {
    const allTasks = Array.from(tasksPanel.querySelectorAll(".task"));
    const lastTask = allTasks[allTasks.length - 1];
    if (!lastTask) {
      const newTask = createTask();
      placeCaretAtEndAndRefresh(newTask.querySelector(".task-text"));
      return;
    }

    const lastText = lastTask.querySelector(".task-text");
    if (getTaskValue(lastText) === "") {
      placeCaretAtEndAndRefresh(lastText);
      return;
    }

    const newTask = createTask();
    placeCaretAtEndAndRefresh(newTask.querySelector(".task-text"));
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

  statusButton.addEventListener("click", () => {
    const nextIndex = (statusIndex + 1) % statuses.length;
    beginStatusSwitch(nextIndex);
  });

  openNotepad.addEventListener("click", () => {
    persistEditor();
    setView("notepad");
    window.setTimeout(() => leftNoteBodyInput.focus(), 300);
  });

  closeNotepad.addEventListener("click", () => {
    persistEditor();
    setView("crt");
  });

  tasksPanel.addEventListener("click", (event) => {
    if (event.target === tasksPanel) focusOrCreateLastTask();
  });

  leftNoteTitleInput.addEventListener("input", () => {
    const activeTab = notepadState.tabs[notepadState.leftActiveTabIndex];
    activeTab.title = leftNoteTitleInput.value.trim() || defaultTabs[notepadState.leftActiveTabIndex].title;
    saveNotepadState();
    renderTabs();
  });

  leftNoteBodyInput.addEventListener("input", () => {
    notepadState.tabs[notepadState.leftActiveTabIndex].body = leftNoteBodyInput.value;
    saveNotepadState();
  });

  rightNoteTitleInput.addEventListener("input", () => {
    const activeTab = notepadState.tabs[notepadState.rightActiveTabIndex];
    activeTab.title = rightNoteTitleInput.value.trim() || defaultTabs[notepadState.rightActiveTabIndex].title;
    saveNotepadState();
    renderTabs();
  });

  rightNoteBodyInput.addEventListener("input", () => {
    notepadState.tabs[notepadState.rightActiveTabIndex].body = rightNoteBodyInput.value;
    saveNotepadState();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "o" && event.shiftKey) {
      overtimeEnabled = !overtimeEnabled;
      screen.classList.toggle("overtime", overtimeEnabled);
      updateDiagnostics();
      triggerPrinterNote();
    }

    if (event.key === "Escape" && activeView === "notepad") {
      persistEditor();
      setView("crt");
    }
  });

  syncEditorFromState();
  renderTabs();
  updateClock();
  setInterval(updateClock, 1000);
  schedulePixelShuffle();
  updateDiagnostics();
  scheduleDiagnostics();
  createTask();
})();
