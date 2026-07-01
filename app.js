(() => {
  const clock = document.getElementById("clock");
  const secondsHand = document.getElementById("secondsHand");
  const tasksPanel = document.getElementById("tasks");
  const statusButton = document.getElementById("statusButton");
  const diagnostics = document.getElementById("diagnostics");
  const printerNote = document.getElementById("printerNote");
  const screen = document.querySelector(".screen");
  const noteTabs = Array.from(document.querySelectorAll(".note-tab"));
  const bookView = document.getElementById("bookView");
  const checklistReturn = document.getElementById("checklistReturn");
  const bookShell = document.querySelector(".book-shell");
  const bookLeftTitle = document.getElementById("bookLeftTitle");
  const bookLeftCopy = document.getElementById("bookLeftCopy");
  const bookRightTitle = document.getElementById("bookRightTitle");
  const bookRightCopy = document.getElementById("bookRightCopy");
  const bookPager = document.getElementById("bookPager");
  const bookPagerLabel = document.getElementById("bookPagerLabel");
  const bookEditors = [bookLeftTitle, bookLeftCopy, bookRightTitle, bookRightCopy];
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
      pages: [
        {
          leftTitle: "",
          leftCopy: "",
          rightTitle: "",
          rightCopy: ""
        },
        {
          leftTitle: "",
          leftCopy: "",
          rightTitle: "",
          rightCopy: ""
        }
      ]
    },
    "note-2": {
      pages: [
        {
          leftTitle: "",
          leftCopy: "",
          rightTitle: "",
          rightCopy: ""
        },
        {
          leftTitle: "",
          leftCopy: "",
          rightTitle: "",
          rightCopy: ""
        }
      ]
    },
    "note-3": {
      pages: [
        {
          leftTitle: "",
          leftCopy: "",
          rightTitle: "",
          rightCopy: ""
        },
        {
          leftTitle: "",
          leftCopy: "",
          rightTitle: "",
          rightCopy: ""
        }
      ]
    }
  };

  let statusIndex = 0;
  let statusSwitchTimeout = null;
  let activeNoteId = null;
  let activeNotePageIndex = 0;
  let bookShuffleTimeout = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateClock() {
    const now = new Date();
    clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    secondsHand.style.transform = `translate(-50%, -100%) rotate(${now.getSeconds() * 6}deg)`;
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
    });

    textElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const nextTask = createTask("", task);
        placeCaretAtEnd(nextTask.querySelector(".task-text"));
        keepTaskInView(nextTask);
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

  function renderBookPage(noteId, pageIndex) {
    const note = notes[noteId];
    if (!note) return;
    const page = note.pages[pageIndex];
    if (!page) return;

    bookLeftTitle.textContent = page.leftTitle;
    bookLeftCopy.textContent = page.leftCopy;
    bookRightTitle.textContent = page.rightTitle;
    bookRightCopy.textContent = page.rightCopy;
    syncEmptyState(bookLeftTitle);
    syncEmptyState(bookLeftCopy);
    syncEmptyState(bookRightTitle);
    syncEmptyState(bookRightCopy);
    bookPagerLabel.textContent = `page ${pageIndex + 1}`;
  }

  function saveActiveBookPage() {
    if (!activeNoteId) return;

    const page = notes[activeNoteId]?.pages[activeNotePageIndex];
    if (!page) return;

    page.leftTitle = bookLeftTitle.textContent;
    page.leftCopy = bookLeftCopy.textContent;
    page.rightTitle = bookRightTitle.textContent;
    page.rightCopy = bookRightCopy.textContent;
  }

  function closeNotes() {
    saveActiveBookPage();
    activeNoteId = null;
    activeNotePageIndex = 0;
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

    saveActiveBookPage();
    activeNoteId = noteId;
    activeNotePageIndex = 0;
    renderBookPage(noteId, activeNotePageIndex);
    screen.classList.add("book-mode");
    bookView.setAttribute("aria-hidden", "false");

    noteTabs.forEach((tab) => {
      const isActive = tab.dataset.note === noteId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-expanded", String(isActive));
    });
  }

  function advanceBookPage() {
    if (!activeNoteId) return;

    const note = notes[activeNoteId];
    if (!note || note.pages.length <= 1) return;

    saveActiveBookPage();
    activeNotePageIndex = (activeNotePageIndex + 1) % note.pages.length;
    renderBookPage(activeNoteId, activeNotePageIndex);

    bookShell.classList.remove("is-shuffling");
    void bookShell.offsetWidth;
    bookShell.classList.add("is-shuffling");

    if (bookShuffleTimeout) {
      window.clearTimeout(bookShuffleTimeout);
    }

    bookShuffleTimeout = window.setTimeout(() => {
      bookShell.classList.remove("is-shuffling");
    }, 380);
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
      saveActiveBookPage();
    });

    editor.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      insertPlainText(text);
      syncEmptyState(editor);
      saveActiveBookPage();
    });
  });

  checklistReturn.addEventListener("click", () => {
    closeNotes();
  });

  bookPager.addEventListener("click", () => {
    advanceBookPage();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeNoteId) {
      closeNotes();
    }

    if (event.key === "ArrowRight" && activeNoteId && !event.target.closest?.(".book-editable")) {
      advanceBookPage();
    }
  });

  updateClock();
  window.setInterval(updateClock, 1000);
  schedulePixelShuffle();
  updateDiagnostics();
  scheduleDiagnostics();
  createTask();
})();
