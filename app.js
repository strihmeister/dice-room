import { joinRoom, selfId } from "https://esm.sh/trystero@0.20.0/torrent";

const APP_ID = "dice-room-strihmeister";

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

const NAME_KEY = "dice-room:name";
nameInput.value = localStorage.getItem(NAME_KEY) || "";

let currentRoomCode = null;
let trysteroRoom = null;
let sendRoll = null;
let sendSync = null;
let sendClear = null;
const rolls = new Map();
const peers = new Set();

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function requireName() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return null; }
  localStorage.setItem(NAME_KEY, name);
  return name;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function showLanding() {
  landing.hidden = false;
  room.hidden = true;
}

function showRoom(code) {
  landing.hidden = true;
  room.hidden = false;
  roomCodeDisplay.textContent = code;
}

function joinDiceRoom(code) {
  leaveDiceRoom();
  currentRoomCode = code;
  rolls.clear();
  peers.clear();
  updatePeerStatus();

  const r = joinRoom({ appId: APP_ID }, code);
  trysteroRoom = r;

  const [_sendRoll, getRoll] = r.makeAction("roll");
  const [_sendSync, getSync] = r.makeAction("sync");
  const [_sendClear, getClear] = r.makeAction("clear");
  sendRoll = _sendRoll;
  sendSync = _sendSync;
  sendClear = _sendClear;

  getRoll((data) => {
    if (data && data.id) {
      rolls.set(data.id, data);
      renderRolls();
    }
  });

  getSync((state) => {
    if (!Array.isArray(state)) return;
    for (const item of state) {
      if (item && item.id) rolls.set(item.id, item);
    }
    renderRolls();
  });

  getClear(() => {
    rolls.clear();
    renderRolls();
  });

  r.onPeerJoin((peerId) => {
    peers.add(peerId);
    updatePeerStatus();
    sendSync(Array.from(rolls.values()), peerId);
  });

  r.onPeerLeave((peerId) => {
    peers.delete(peerId);
    updatePeerStatus();
  });

  renderRolls();
}

function leaveDiceRoom() {
  if (trysteroRoom) {
    try { trysteroRoom.leave(); } catch {}
    trysteroRoom = null;
  }
  sendRoll = sendSync = sendClear = null;
  rolls.clear();
  peers.clear();
  currentRoomCode = null;
}

function renderRolls() {
  const list = Array.from(rolls.values())
    .sort((a, b) => b.value - a.value || a.timestamp - b.timestamp);
  if (list.length === 0) {
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

function updatePeerStatus() {
  if (!peerStatus) return;
  const count = peers.size;
  if (count === 0) {
    peerStatus.textContent = "Waiting for friends — share the link";
    peerStatus.classList.remove("connected");
    peerStatus.classList.add("searching");
  } else {
    peerStatus.textContent = count === 1 ? "1 friend connected" : `${count} friends connected`;
    peerStatus.classList.add("connected");
    peerStatus.classList.remove("searching");
  }
}

createBtn.addEventListener("click", () => {
  if (!requireName()) return;
  location.hash = randomCode();
});

joinBtn.addEventListener("click", () => {
  if (!requireName()) return;
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) { joinCodeInput.focus(); return; }
  location.hash = code;
});

joinCodeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinBtn.click(); });
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createBtn.click(); });

rollBtn.addEventListener("click", () => {
  if (!currentRoomCode) return;
  const name = requireName();
  if (!name) return;
  rollBtn.disabled = true;
  try {
    const value = 1 + Math.floor(Math.random() * 100);
    const roll = {
      id: `${selfId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      value,
      timestamp: Date.now()
    };
    rolls.set(roll.id, roll);
    if (sendRoll) sendRoll(roll);
    renderRolls();
  } finally {
    setTimeout(() => { rollBtn.disabled = false; }, 200);
  }
});

clearBtn.addEventListener("click", () => {
  if (!currentRoomCode) return;
  if (!confirm("Clear all rolls in this room?")) return;
  rolls.clear();
  if (sendClear) sendClear(1);
  renderRolls();
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
  if (hash) {
    const savedName = (localStorage.getItem(NAME_KEY) || "").trim();
    if (!savedName) {
      joinCodeInput.value = hash;
      history.replaceState(null, "", location.pathname + location.search);
      showLanding();
      nameInput.focus();
      return;
    }
    if (hash !== currentRoomCode) joinDiceRoom(hash);
    showRoom(hash);
  } else {
    leaveDiceRoom();
    showLanding();
  }
}

window.addEventListener("hashchange", handleRoute);
handleRoute();
