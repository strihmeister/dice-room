import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const isConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith("YOUR_") &&
  firebaseConfig.databaseURL &&
  !firebaseConfig.databaseURL.includes("YOUR_");

let db = null;
if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

const $ = (id) => document.getElementById(id);
const landing = $("landing");
const room = $("room");
const nameInput = $("name-input");
const joinCodeInput = $("join-code");
const createBtn = $("create-btn");
const joinBtn = $("join-btn");
const rollBtn = $("roll-btn");
const clearBtn = $("clear-btn");
const leaveBtn = $("leave-btn");
const copyBtn = $("copy-link");
const roomCodeDisplay = $("room-code-display");
const rollsList = $("rolls-list");
const peerStatus = $("peer-status");
const nameError = $("name-error");
const joinSection = $("join-section");
const landingTitle = $("landing-title");
const landingTagline = $("landing-tagline");
const configWarning = $("config-warning");

const NAME_KEY = "dice-room:name";
nameInput.value = localStorage.getItem(NAME_KEY) || "";

let currentRoomCode = null;
let unsubscribeRolls = null;
let unsubscribeConnected = null;

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function showNameError() {
  if (nameError) nameError.hidden = false;
  nameInput.classList.remove("error");
  void nameInput.offsetWidth;
  nameInput.classList.add("error");
  nameInput.focus();
}

function clearNameError() {
  if (nameError) nameError.hidden = true;
  nameInput.classList.remove("error");
}

function requireName() {
  const name = nameInput.value.trim();
  if (!name) { showNameError(); return null; }
  clearNameError();
  localStorage.setItem(NAME_KEY, name);
  return name;
}

function requireFirebase() {
  if (!db) {
    alert("Firebase is not configured. Open firebase-config.js and follow README.md.");
    return false;
  }
  return true;
}

nameInput.addEventListener("input", () => {
  if (nameInput.value.trim()) clearNameError();
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function showLanding(joiningCode) {
  landing.hidden = false;
  room.hidden = true;
  if (configWarning) configWarning.hidden = isConfigured;
  if (joiningCode) {
    landingTitle.textContent = "JOIN ROOM";
    landingTagline.innerHTML = `Joining room <strong class="inline-code"></strong>`;
    landingTagline.querySelector(".inline-code").textContent = joiningCode;
    createBtn.textContent = "Enter room";
    joinSection.hidden = true;
  } else {
    landingTitle.textContent = "DICE ROOM";
    landingTagline.textContent = "Roll for loot. Highest wins.";
    createBtn.textContent = "Create new room";
    joinSection.hidden = false;
  }
}

function showRoom(code) {
  landing.hidden = true;
  room.hidden = false;
  roomCodeDisplay.textContent = code;
}

function joinDiceRoom(code) {
  leaveDiceRoom();
  if (!db) return;
  currentRoomCode = code;

  const rollsRef = ref(db, `rooms/${code}/rolls`);
  unsubscribeRolls = onValue(rollsRef, (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => b.value - a.value || a.timestamp - b.timestamp);
    renderRolls(list);
  });

  const connRef = ref(db, ".info/connected");
  unsubscribeConnected = onValue(connRef, (snap) => {
    if (snap.val() === true) {
      peerStatus.textContent = "Live";
      peerStatus.classList.add("connected");
      peerStatus.classList.remove("searching");
    } else {
      peerStatus.textContent = "Reconnecting";
      peerStatus.classList.remove("connected");
      peerStatus.classList.add("searching");
    }
  });

  renderRolls([]);
}

function leaveDiceRoom() {
  if (unsubscribeRolls) { unsubscribeRolls(); unsubscribeRolls = null; }
  if (unsubscribeConnected) { unsubscribeConnected(); unsubscribeConnected = null; }
  currentRoomCode = null;
}

function renderRolls(list) {
  if (!list || list.length === 0) {
    rollsList.innerHTML = '<li class="empty">No rolls yet &mdash; press the button to roll.</li>';
    return;
  }
  const top = list[0].value;
  rollsList.innerHTML = list.map((r, i) => `
    <li class="roll ${r.value === top ? "winner" : ""}">
      <span class="roll-rank">${i + 1}.</span>
      <span class="roll-name">${escapeHtml(r.name)}</span>
      <span class="roll-time">${formatTime(r.timestamp)}</span>
      <span class="roll-value">${r.value}</span>
    </li>
  `).join("");
}

createBtn.addEventListener("click", () => {
  if (!requireFirebase()) return;
  if (!requireName()) return;
  const existing = location.hash.replace(/^#/, "").toUpperCase().slice(0, 8);
  if (existing) {
    handleRoute();
  } else {
    location.hash = randomCode();
  }
});

joinBtn.addEventListener("click", () => {
  if (!requireFirebase()) return;
  if (!requireName()) return;
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) { joinCodeInput.focus(); return; }
  location.hash = code;
});

joinCodeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinBtn.click(); });
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createBtn.click(); });

rollBtn.addEventListener("click", async () => {
  if (!requireFirebase() || !currentRoomCode) return;
  const name = requireName();
  if (!name) return;
  rollBtn.disabled = true;
  try {
    const value = 1 + Math.floor(Math.random() * 100);
    await push(ref(db, `rooms/${currentRoomCode}/rolls`), {
      name,
      value,
      timestamp: Date.now()
    });
  } finally {
    setTimeout(() => { rollBtn.disabled = false; }, 200);
  }
});

clearBtn.addEventListener("click", async () => {
  if (!requireFirebase() || !currentRoomCode) return;
  if (!confirm("Clear all rolls in this room?")) return;
  await remove(ref(db, `rooms/${currentRoomCode}/rolls`));
});

leaveBtn.addEventListener("click", () => { location.hash = ""; });

copyBtn.addEventListener("click", async () => {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    const orig = copyBtn.textContent;
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
  } catch {
    prompt("Copy this link:", url);
  }
});

function handleRoute() {
  const hash = location.hash.replace(/^#/, "").toUpperCase().slice(0, 8);
  const savedName = (localStorage.getItem(NAME_KEY) || "").trim();
  if (hash) {
    if (savedName) {
      if (hash !== currentRoomCode) joinDiceRoom(hash);
      showRoom(hash);
    } else {
      leaveDiceRoom();
      showLanding(hash);
      nameInput.focus();
    }
  } else {
    leaveDiceRoom();
    showLanding(null);
  }
}

window.addEventListener("hashchange", handleRoute);
handleRoute();
