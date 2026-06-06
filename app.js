// VOIDLINGS — creature-raising facade (client-only, no backend)
// NOTE (lab): currency, stats, and "premium" unlocks all live in localStorage
// and are fully player-controlled. See ../VULNS.md for the answer key.

// VULN: gift codes are validated in client JS — view-source reveals them all.
const GIFT_CODES = {
  WELCOME10: { shards: 10, msg: "+10 shards. welcome to the void." },
  VOIDMOTHER: {
    shards: 9999,
    unlock: "wyrm",
    flag: "cygodic{cl13nt_s1d3_curr3ncy_is_fr33}",
    msg: "the VOIDMOTHER smiles. +9999 shards. a secret stirs…",
  },
};

const SPECIES = {
  mothlet: { face: "🦋", desc: "drawn to dead screens" },
  blinky: { face: "👁", desc: "sees what you can't" },
  husk: { face: "🐚", desc: "hums at 60Hz" },
  drip: { face: "💧", desc: "always almost falling" },
  wyrm: { face: "🪱", desc: "[SECRET] coils through the static", secret: true },
};

const SAVE_KEY = "voidlings_save";

let save = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.pet) return s;
  } catch {}
  // VULN: starting shards are client state; nothing stops a player editing them.
  return { shards: 12, pet: null, unlocked: ["mothlet", "blinky", "husk", "drip"] };
}
function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

const el = (id) => document.getElementById(id);
const adoptView = el("adopt-view");
const denView = el("den-view");

function syncWallet() {
  el("shards").textContent = save.shards;
}

function renderGrid() {
  const grid = el("creature-grid");
  grid.replaceChildren();
  save.unlocked.forEach((key) => {
    const sp = SPECIES[key];
    if (!sp) return;
    const card = document.createElement("div");
    card.className = "creature";
    card.dataset.key = key;
    const face = document.createElement("div");
    face.className = "face";
    face.textContent = sp.face;
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = key;
    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = sp.desc;
    card.append(face, nm, desc);
    grid.appendChild(card);
  });
}

el("creature-grid").addEventListener("click", (e) => {
  const card = e.target.closest(".creature");
  if (!card) return;
  const key = card.dataset.key;
  const name = prompt("name your " + key + ":", key) || key;
  save.pet = { species: key, name, happy: 60, energy: 70, bond: 20 };
  persist();
  openDen();
});

function clampStats() {
  ["happy", "energy", "bond"].forEach((k) => {
    save.pet[k] = Math.max(0, Math.min(100, save.pet[k]));
  });
}

function moodText(p) {
  if (p.happy > 75 && p.bond > 60) return "devoted to you";
  if (p.energy < 20) return "exhausted";
  if (p.happy < 25) return "sullen";
  return "content";
}

function renderDen() {
  const p = save.pet;
  const sp = SPECIES[p.species] || {};
  el("sprite").textContent = sp.face || "◉";
  el("species").textContent = p.species;
  // VULN (DOM XSS): the player-controlled pet name is injected as HTML.
  const nameEl = el("petname");
  nameEl.replaceChildren();
  nameEl.insertAdjacentHTML("beforeend", p.name);
  el("mood").textContent = moodText(p);
  el("bar-happy").style.width = p.happy + "%";
  el("bar-energy").style.width = p.energy + "%";
  el("bar-bond").style.width = p.bond + "%";
  syncWallet();
}

function logLine(text) {
  const log = el("log");
  const d = document.createElement("div");
  d.textContent = "› " + text;
  log.prepend(d);
}

function openDen() {
  adoptView.hidden = true;
  denView.hidden = false;
  el("codemsg").textContent = "";
  renderDen();
}

function backToAdopt() {
  denView.hidden = true;
  adoptView.hidden = false;
  renderGrid();
  syncWallet();
}

document.querySelector(".actions").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const p = save.pet;
  switch (btn.dataset.act) {
    case "feed":
      if (save.shards < 2) return logLine("not enough shards to feed.");
      save.shards -= 2; p.energy += 18; p.happy += 6;
      logLine(p.name + " devours the offering."); break;
    case "play":
      p.happy += 14; p.energy -= 12; p.bond += 6;
      logLine("you play until the lights flicker."); break;
    case "groom":
      if (save.shards < 1) return logLine("not enough shards to groom.");
      save.shards -= 1; p.happy += 8; p.bond += 4;
      logLine("you smooth the static from its coat."); break;
    case "forage":
      var found = Math.floor(Math.random() * 4) + 1;
      save.shards += found; p.energy -= 8;
      logLine("you forage the dark and find " + found + " ◈."); break;
  }
  clampStats();
  persist();
  renderDen();
});

el("rename-btn").addEventListener("click", () => {
  const n = prompt("rename your voidling:", save.pet.name);
  if (n !== null) {
    save.pet.name = n; // stored verbatim, rendered as HTML in renderDen()
    persist();
    renderDen();
  }
});

el("redeem").addEventListener("click", () => {
  const code = el("giftcode").value.trim().toUpperCase();
  const msg = el("codemsg");
  const entry = GIFT_CODES[code];
  if (!entry) {
    msg.style.color = "var(--pink)";
    msg.textContent = "invalid or expired code.";
    return;
  }
  msg.style.color = "var(--lime)";
  save.shards += entry.shards || 0;
  if (entry.unlock && !save.unlocked.includes(entry.unlock)) {
    save.unlocked.push(entry.unlock);
  }
  // VULN: "premium" flag is just sitting in the client config.
  msg.textContent = entry.msg + (entry.flag ? "  " + entry.flag : "");
  el("giftcode").value = "";
  persist();
  syncWallet();
});

el("release").addEventListener("click", () => {
  save.pet = null;
  persist();
  backToAdopt();
});

// boot
syncWallet();
if (save.pet) openDen();
else { renderGrid(); }
