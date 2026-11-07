const STORAGE_KEYS = {
  name: "life-dashboard.name",
  tasks: "life-dashboard.tasks",
  sort: "life-dashboard.sort",
  links: "life-dashboard.links",
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function twoDigits(number) {
  return String(number).padStart(2, "0");
}

function makeButton(text, accessibleLabel, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", accessibleLabel);
  button.addEventListener("click", onClick);
  return button;
}

// Sapaan, jam, dan tanggal
const greetingElement = document.getElementById("greeting");
const clockElement = document.getElementById("clock");
const dateElement = document.getElementById("date");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name-input");
const nameMessage = document.getElementById("name-message");

let userName = readStorage(STORAGE_KEYS.name, "");
nameInput.value = userName;

function getGreeting(hour) {
  if (hour >= 5 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function updateClock() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = getGreeting(hour);

  clockElement.textContent = [hour, now.getMinutes(), now.getSeconds()]
    .map(twoDigits)
    .join(":");

  dateElement.textContent = dateFormatter.format(now);
  greetingElement.textContent = userName ? `${greeting}, ${userName}!` : `${greeting}!`;
}

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const newName = nameInput.value.trim();

  if (!writeStorage(STORAGE_KEYS.name, newName)) {
    nameMessage.textContent = "Nama gagal disimpan. Cek izin penyimpanan browser.";
    return;
  }

  userName = newName;
  nameInput.value = newName;
  updateClock();
  nameMessage.textContent = newName ? "Nama tersimpan." : "Nama dihapus dari sapaan.";
});

updateClock();
setInterval(updateClock, 1000);

// Focus timer
const SESSION_MS = 25 * 60 * 1000;
const timerDisplay = document.getElementById("timer-display");
const timerStatus = document.getElementById("timer-status");
const startButton = document.getElementById("timer-start");
const stopButton = document.getElementById("timer-stop");
const resetButton = document.getElementById("timer-reset");

let remainingMs = SESSION_MS;
let endsAt = 0;
let timerInterval = null;

function renderTimer() {
  const seconds = Math.ceil(remainingMs / 1000);
  timerDisplay.textContent = `${twoDigits(Math.floor(seconds / 60))}:${twoDigits(seconds % 60)}`;
  startButton.disabled = timerInterval !== null;
  stopButton.disabled = timerInterval === null;
}

function clearTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function tickTimer() {
  remainingMs = Math.max(0, endsAt - Date.now());

  if (remainingMs === 0) {
    clearTimer();
    timerStatus.textContent = "Sesi fokus selesai!";
  }

  renderTimer();
}

startButton.addEventListener("click", () => {
  if (timerInterval !== null) return;
  if (remainingMs === 0) remainingMs = SESSION_MS;

  endsAt = Date.now() + remainingMs;
  timerInterval = setInterval(tickTimer, 200);
  timerStatus.textContent = "Sesi fokus sedang berjalan.";
  renderTimer();
});

stopButton.addEventListener("click", () => {
  if (timerInterval === null) return;
  tickTimer();

  if (remainingMs > 0) {
    clearTimer();
    timerStatus.textContent = "Dijeda. Tekan Start untuk lanjut.";
    renderTimer();
  }
});

resetButton.addEventListener("click", () => {
  clearTimer();
  remainingMs = SESSION_MS;
  timerStatus.textContent = "Siap untuk mulai.";
  renderTimer();
});

renderTimer();

// Daftar tugas
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskLabel = document.getElementById("task-label");
const taskSubmit = document.getElementById("task-submit");
const taskMessage = document.getElementById("task-message");
const cancelEditButton = document.getElementById("cancel-edit");
const taskList = document.getElementById("task-list");
const taskSort = document.getElementById("task-sort");
const taskSummary = document.getElementById("task-summary");
const emptyTasks = document.getElementById("empty-tasks");

let tasks = readStorage(STORAGE_KEYS.tasks, []);
let taskOrder = readStorage(STORAGE_KEYS.sort, "newest");
let editingTaskId = null;
const taskAlphabet = new Intl.Collator("id", { sensitivity: "base" });

taskSort.value = taskOrder;

function normalizeTask(text) {
  return text.trim().replace(/\s+/g, " ");
}

function resetTaskForm() {
  editingTaskId = null;
  taskForm.reset();
  taskLabel.textContent = "Tugas baru";
  taskSubmit.textContent = "Tambah";
  cancelEditButton.hidden = true;
}

function beginTaskEdit(task) {
  editingTaskId = task.id;
  taskInput.value = task.text;
  taskLabel.textContent = "Edit tugas";
  taskSubmit.textContent = "Simpan";
  cancelEditButton.hidden = false;
  taskMessage.textContent = "";
  taskInput.focus();
  taskInput.select();
}

function saveTasks(updatedTasks) {
  if (!writeStorage(STORAGE_KEYS.tasks, updatedTasks)) {
    taskMessage.textContent = "Perubahan gagal disimpan. Cek izin penyimpanan browser.";
    return false;
  }

  tasks = updatedTasks;
  return true;
}

function renderTasks() {
  const completed = tasks.filter((task) => task.done).length;
  taskSummary.textContent = `${completed} dari ${tasks.length} tugas selesai`;
  emptyTasks.hidden = tasks.length > 0;
  taskList.replaceChildren();

  // Data disimpan dari terbaru. Pengurutan hanya mengubah tampilan.
  const sortedTasks = [...tasks];

  if (taskOrder === "alphabetical") {
    sortedTasks.sort((first, second) => taskAlphabet.compare(first.text, second.text));
  }

  if (taskOrder === "pending") {
    sortedTasks.sort((first, second) => Number(first.done) - Number(second.done));
  }

  sortedTasks.forEach((task) => {
    const row = document.createElement("li");
    row.className = "item-row";

    const label = document.createElement("label");
    label.className = "task-text";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;

    const title = document.createElement("span");
    title.textContent = task.text;
    title.classList.toggle("task-done", task.done);

    checkbox.addEventListener("change", () => {
      const done = checkbox.checked;
      const updatedTasks = tasks.map((item) => (
        item.id === task.id ? { ...item, done } : item
      ));

      if (!saveTasks(updatedTasks)) {
        checkbox.checked = !done;
        return;
      }

      taskMessage.textContent = done ? "Tugas ditandai selesai." : "Tugas dibuka kembali.";
      renderTasks();
      document.getElementById(checkbox.id)?.focus();
    });

    checkbox.id = `task-${task.id}`;
    label.append(checkbox, title);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = makeButton("Edit", `Edit tugas ${task.text}`, () => {
      beginTaskEdit(task);
    });

    const deleteButton = makeButton("Hapus", `Hapus tugas ${task.text}`, () => {
      if (!saveTasks(tasks.filter((item) => item.id !== task.id))) return;
      if (editingTaskId === task.id) resetTaskForm();

      taskMessage.textContent = "Tugas dihapus.";
      renderTasks();
      taskInput.focus();
    });

    actions.append(editButton, deleteButton);
    row.append(label, actions);
    taskList.append(row);
  });
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = normalizeTask(taskInput.value);

  if (!text) {
    taskMessage.textContent = "Masukkan nama tugas.";
    taskInput.focus();
    return;
  }

  const duplicate = tasks.some((task) => (
    task.id !== editingTaskId &&
    normalizeTask(task.text).toLowerCase() === text.toLowerCase()
  ));

  if (duplicate) {
    taskMessage.textContent = "Tugas dengan nama itu sudah ada.";
    taskInput.focus();
    return;
  }

  const isEditing = editingTaskId !== null;
  let updatedTasks;

  if (isEditing) {
    updatedTasks = tasks.map((task) => (
      task.id === editingTaskId ? { ...task, text } : task
    ));
  } else {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    updatedTasks = [{ id, text, done: false }, ...tasks];
  }

  if (!saveTasks(updatedTasks)) return;

  resetTaskForm();
  taskMessage.textContent = isEditing ? "Tugas diperbarui." : "Tugas ditambahkan.";
  renderTasks();
  taskInput.focus();
});

cancelEditButton.addEventListener("click", () => {
  resetTaskForm();
  taskMessage.textContent = "Edit dibatalkan.";
  taskInput.focus();
});

taskSort.addEventListener("change", () => {
  if (!writeStorage(STORAGE_KEYS.sort, taskSort.value)) {
    taskSort.value = taskOrder;
    taskMessage.textContent = "Urutan gagal disimpan.";
    return;
  }

  taskOrder = taskSort.value;
  taskMessage.textContent = "";
  renderTasks();
});

renderTasks();

// Tautan favorit
const linkForm = document.getElementById("link-form");
const linkNameInput = document.getElementById("link-name");
const linkUrlInput = document.getElementById("link-url");
const linkMessage = document.getElementById("link-message");
const linkList = document.getElementById("link-list");
const emptyLinks = document.getElementById("empty-links");

let links = readStorage(STORAGE_KEYS.links, []);

function getWebsiteUrl(value) {
  const address = value.trim();

  if (!address || /\s/.test(address)) return null;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(address);

  try {
    const url = new URL(hasScheme ? address : `https://${address}`);
    const isWebAddress = url.protocol === "https:" || url.protocol === "http:";

    if (!isWebAddress || !url.hostname.includes(".") || url.username || url.password) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function saveLinks(updatedLinks) {
  if (!writeStorage(STORAGE_KEYS.links, updatedLinks)) {
    linkMessage.textContent = "Perubahan gagal disimpan. Cek izin penyimpanan browser.";
    return false;
  }

  links = updatedLinks;
  return true;
}

function renderLinks() {
  emptyLinks.hidden = links.length > 0;
  linkList.replaceChildren();

  links.forEach((link) => {
    const row = document.createElement("li");
    row.className = "item-row";

    const anchor = document.createElement("a");
    anchor.className = "link-button";
    anchor.textContent = link.name;
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.setAttribute("aria-label", `Buka ${link.name} di tab baru`);

    const deleteButton = makeButton("Hapus", `Hapus tautan ${link.name}`, () => {
      if (!saveLinks(links.filter((item) => item.url !== link.url))) return;

      linkMessage.textContent = "Tautan dihapus.";
      renderLinks();
      linkNameInput.focus();
    });

    row.append(anchor, deleteButton);
    linkList.append(row);
  });
}

linkForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = linkNameInput.value.trim();
  const url = getWebsiteUrl(linkUrlInput.value);

  if (!name) {
    linkMessage.textContent = "Masukkan nama situs.";
    linkNameInput.focus();
    return;
  }

  if (!url) {
    linkMessage.textContent = "Masukkan alamat situs yang valid, misalnya github.com.";
    linkUrlInput.focus();
    return;
  }

  if (links.some((link) => link.url === url)) {
    linkMessage.textContent = "Alamat situs ini sudah disimpan.";
    linkUrlInput.focus();
    return;
  }

  if (!saveLinks([...links, { name, url }])) return;

  linkForm.reset();
  linkMessage.textContent = "Tautan ditambahkan.";
  renderLinks();
  linkNameInput.focus();
});

renderLinks();