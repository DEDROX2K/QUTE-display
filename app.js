(() => {
  const engineRotor = document.getElementById("secondsHand");
  const tasksPanel = document.getElementById("tasks");
  const statusButton = document.getElementById("statusButton");
  const diagnostics = document.getElementById("diagnostics");
  const statusTime = document.getElementById("statusTime");
  const printerNote = document.getElementById("printerNote");
  const screen = document.querySelector(".screen");
  const noteTabs = Array.from(document.querySelectorAll(".note-tab"));
  const bookView = document.getElementById("bookView");
  const checklistReturn = document.getElementById("checklistReturn");
  const bookShell = document.querySelector(".book-shell");
  const noteTitle = document.getElementById("noteTitle");
  const noteSubtitle = document.getElementById("noteSubtitle");
  const noteBody = document.getElementById("noteBody");
  const bookEditors = [noteTitle, noteSubtitle, noteBody];
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
    }
  };

  let statusIndex = 0;
  let statusSwitchTimeout = null;
  let activeNoteId = null;
  let draggedTask = null;
  let rotorAngle = 0;
  let rotorVelocity = 3.2;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateEngineRotor() {
    const now = new Date();

    if (engineRotor) {
      const reversal = Math.random() < 0.18 ? -1 : 1;
      const jitter = (Math.random() - 0.5) * 34;
      const surge = Math.random() * 19 + 8;
      rotorVelocity = rotorVelocity * 0.7 + surge * 0.3;
      rotorVelocity *= reversal;
      rotorAngle = (rotorAngle + rotorVelocity + jitter) % 360;
      engineRotor.style.transform = `translate(-10%, -50%) rotate(${rotorAngle}deg)`;
    }

    if (statusTime) {
      statusTime.textContent = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }
  }

  function getTaskValue(textElement) {
    return textElement.textContent.replace(/\u00a0/g, " ").trim();
  }

  function syncEmptyState(textElement) {
    textElement.dataset.empty = getTaskValue(textElement) === "" ? "true" : "false";
  }

  function placeCaretAtEnd(element) {
    element.focus();
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
    const rect = range.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 32;
    const buffer = lineHeight * 4;

    if (rect.bottom > containerRect.bottom - buffer) {
      scrollContainer.scrollTop += rect.bottom - (containerRect.bottom - buffer);
    } else if (rect.top < containerRect.top + buffer) {
      scrollContainer.scrollTop -= containerRect.top + buffer - rect.top;
    }
  }

  function insertPlainText(text) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const normalizedText = text.replace(/\r\n?/g, "\n");

    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, normalizedText);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const lines = normalizedText.split("\n");
    const fragment = document.createDocumentFragment();

    lines.forEach((line, index) => {
      fragment.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        fragment.appendChild(document.createElement("br"));
      }
    });

    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (!lastNode) return;

    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
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

    textElement.addEventListener("input", () => {
      syncEmptyState(textElement);
      keepTaskInView(task);
      window.requestAnimationFrame(() => keepEditorInView(textElement));
    });

    textElement.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      insertPlainText(text);
      syncEmptyState(textElement);
      keepTaskInView(task);
    });

    textElement.addEventListener("focus", () => {
      keepTaskInView(task);
      window.requestAnimationFrame(() => keepEditorInView(textElement));
    });

    textElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const nextTask = createTask("", task);
        placeCaretAtEnd(nextTask.querySelector(".task-text"));
        keepTaskInView(nextTask);
        window.requestAnimationFrame(() => keepEditorInView(nextTask.querySelector(".task-text")));
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

    scrollTasksToBottom();
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
    noteBody.textContent = note.body;
    syncEmptyState(noteTitle);
    syncEmptyState(noteSubtitle);
    syncEmptyState(noteBody);
  }

  function saveActiveNote() {
    if (!activeNoteId) return;

    const note = notes[activeNoteId];
    if (!note) return;

    note.title = noteTitle.textContent;
    note.subtitle = noteSubtitle.textContent;
    note.body = noteBody.textContent;
  }

  function closeNotes() {
    saveActiveNote();
    activeNoteId = null;
    screen.classList.remove("book-mode");
    bookView.setAttribute("aria-hidden", "true");

    noteTabs.forEach((tab) => {
      tab.classList.remove("is-active");
      tab.setAttribute("aria-expanded", "false");
    });
  }

  function openNote(noteId) {
    const note = notes[noteId];
    if (!note) return;

    saveActiveNote();
    activeNoteId = noteId;
    renderNoteEditor(noteId);
    screen.classList.add("book-mode");
    bookView.setAttribute("aria-hidden", "false");

    noteTabs.forEach((tab) => {
      const isActive = tab.dataset.note === noteId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-expanded", String(isActive));
    });
  }

  statusButton.addEventListener("click", () => {
    const nextIndex = (statusIndex + 1) % statuses.length;
    beginStatusSwitch(nextIndex);
  });

  tasksPanel.addEventListener("click", (event) => {
    if (event.target === tasksPanel) {
      focusOrCreateLastTask();
    }
  });

  noteTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      openNote(tab.dataset.note);
    });
  });

  bookEditors.forEach((editor) => {
    syncEmptyState(editor);

    editor.addEventListener("input", () => {
      syncEmptyState(editor);
      saveActiveNote();
      window.requestAnimationFrame(() => keepEditorInView(editor));
    });

    editor.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      insertPlainText(text);
      syncEmptyState(editor);
      saveActiveNote();
      window.requestAnimationFrame(() => keepEditorInView(editor));
    });

    editor.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      const isTitle = editor === noteTitle;
      const isSubtitle = editor === noteSubtitle;

      if (isTitle) {
        event.preventDefault();
        placeCaretAtEnd(noteSubtitle);
        return;
      }

      if (isSubtitle) {
        event.preventDefault();
        placeCaretAtEnd(noteBody);
        return;
      }

      if (event.shiftKey) {
        return;
      }

      event.preventDefault();
      placeCaretAtEnd(noteBody);
    });
  });

  checklistReturn.addEventListener("click", () => {
    closeNotes();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeNoteId) {
      closeNotes();
    }
  });

  updateEngineRotor();
  window.setInterval(updateEngineRotor, 1000);
  schedulePixelShuffle();
  updateDiagnostics();
  scheduleDiagnostics();
  createTask();
})();
