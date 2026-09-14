import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Home, Shirt as ShirtIcon, LayoutGrid, CalendarDays, BarChart3, Settings as SettingsIcon,
  RefreshCw, Plus, X, Check, ChevronRight, ChevronLeft, Shuffle, Sun, Moon, Trash2,
  Edit3, ImagePlus, Search, GripVertical, AlertCircle, Sparkles, Footprints, Upload,
  RotateCcw, ArrowRight, Circle, CheckCircle2, XCircle, Clock, ChevronDown, Download, FileUp, MoreVertical
} from "lucide-react";
import * as XLSX from "xlsx";
import { storage } from "./lib/storage.js";

/* ============================================================
   CONSTANTS
   ============================================================ */
const WEEKS = [1, 2, 3, 4];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TOTAL_SLOTS = WEEKS.length * DAY_LABELS.length; // 20
const CATEGORIES = ["Shirt", "Pants", "Shoes"];
const STORAGE_KEY = "dailydrobe:v1";
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ============================================================
   SEED DATA — parsed from the user's uploaded rotation workbook.
   This is authoritative initial data, not example placeholder text.
   ============================================================ */
const RAW_CLOTHING = {
  Shirt: [
    "Dark grey shirt", "Dark green shirt with white stripes full sleeves", "Black Oversized color shirt",
    "Black half sleeves shirt", "Teal polo t-shirt", "Blue and white line shirt", "Brown polo t-shirt",
    "Olive full sleeves shirt", "White polo tshirt", "Linen Brown full sleeves", "Charcoal grey polo t-shirt",
    "Blush pink polo t-shirt", "Jungle green shirt half sleeves oversized", "Crimson Red Shirt",
    "Blue and white chain polo t-shirt", "Light brown full sleeves shirt", "Black polo t-shirt",
    "Dark blue corduroy shirt", "Dark Blue and white stripes shirt", "Navy Blue polo tshirt"
  ],
  Pants: [
    "Paler grey denim jeans", "Beige corduroy pleated trousers", "Beige jeans", "Dark blue denim jeans",
    "Black corduroy trouser", "Light fade blue jeans", "Black denim jeans"
  ],
  Shoes: [
    "Puma Kyzer Black and Brown", "White sneaker with brown gum sole", "Brown sneakers with white sole",
    "Blue and White Adidas Sneakers"
  ]
};

// Week -> Day -> {Shirt, Pants, Shoes} exactly as authored in the workbook (Week -> Day -> Look order)
const RAW_ROTATION = {
  1: {
    Mon: { Shirt: "Dark grey shirt", Pants: "Paler grey denim jeans", Shoes: "Puma Kyzer Black and Brown" },
    Tue: { Shirt: "Dark green shirt with white stripes full sleeves", Pants: "Beige corduroy pleated trousers", Shoes: "White sneaker with brown gum sole" },
    Wed: { Shirt: "Black Oversized color shirt", Pants: "Paler grey denim jeans", Shoes: "Puma Kyzer Black and Brown" },
    Thu: { Shirt: "Black half sleeves shirt", Pants: "Beige corduroy pleated trousers", Shoes: "Puma Kyzer Black and Brown" },
    Fri: { Shirt: "Teal polo t-shirt", Pants: "Paler grey denim jeans", Shoes: "Brown sneakers with white sole" }
  },
  2: {
    Mon: { Shirt: "blue and white line shirt", Pants: "Beige jeans", Shoes: "White sneaker with brown gum sole" },
    Tue: { Shirt: "Brown polo t-shirt", Pants: "Dark blue denim jeans", Shoes: "Brown sneakers with white sole" },
    Wed: { Shirt: "Olive full sleeves shirt", Pants: "Beige jeans", Shoes: "White sneaker with brown gum sole" },
    Thu: { Shirt: "White polo tshirt", Pants: "Dark blue denim jeans", Shoes: "Blue and White Adidas Sneakers" },
    Fri: { Shirt: "Linen Brown full sleeves", Pants: "Beige jeans", Shoes: "White sneaker with brown gum sole" }
  },
  3: {
    Mon: { Shirt: "Charcoal grey polo t-shirt", Pants: "Black corduroy trouser", Shoes: "Puma Kyzer Black and Brown" },
    Tue: { Shirt: "Blush pink polo t-shirt", Pants: "Light fade blue jeans", Shoes: "White sneaker with brown gum sole" },
    Wed: { Shirt: "Jungle green shirt half sleeves oversized", Pants: "Black corduroy trouser", Shoes: "Puma Kyzer Black and Brown" },
    Thu: { Shirt: "Crimson Red Shirt", Pants: "Black denim jeans", Shoes: "Puma Kyzer Black and Brown" },
    Fri: { Shirt: "Blue and white chain polo t-shirt", Pants: "Light fade blue jeans", Shoes: "Blue and White Adidas Sneakers" }
  },
  4: {
    Mon: { Shirt: "Light brown full sleeves shirt", Pants: "Black denim jeans", Shoes: "Brown sneakers with white sole" },
    Tue: { Shirt: "Black polo t-shirt", Pants: "Light fade blue jeans", Shoes: "Blue and White Adidas Sneakers" },
    Wed: { Shirt: "Dark blue corduroy shirt", Pants: "Black denim jeans", Shoes: "Puma Kyzer Black and Brown" },
    Thu: { Shirt: "Dark Blue and white stripes shirt", Pants: "Light fade blue jeans", Shoes: "Blue and White Adidas Sneakers" },
    Fri: { Shirt: "Navy Blue polo tshirt", Pants: "Black corduroy trouser", Shoes: "Brown sneakers with white sole" }
  }
};

/* ============================================================
   HELPERS
   ============================================================ */
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function itemId(category, name) { return `${category.toLowerCase()}__${slugify(name)}`; }
function fmtDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(dateStr, n) { const d = parseDate(dateStr); d.setDate(d.getDate() + n); return fmtDate(d); }
function todayStr() { return fmtDate(new Date()); }
function isSameMonth(dateStr, ref) { const d = parseDate(dateStr), r = parseDate(ref); return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth(); }
function niceDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function shortDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

/* ============================================================
   SFX — tiny synthesized tones via Web Audio API. No audio files,
   no external URLs, no autoplay. Only ever called from inside a
   user-gesture click handler, and only when the user has opted in
   via Settings. Every call is wrapped so a failure never surfaces.
   ============================================================ */
let _audioCtx = null;
function getAudioCtx() {
  try {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      _audioCtx = new Ctx();
    }
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
    return _audioCtx;
  } catch (e) { return null; }
}
function playTone({ freq = 440, glideTo = null, duration = 0.12, type = "sine", gain = 0.05 }) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch (e) { /* fail silently, sound is never load-bearing */ }
}
const SFX = {
  enter: () => playTone({ freq: 340, glideTo: 640, duration: 0.32, type: "sine", gain: 0.06 }),
  tap: () => playTone({ freq: 520, duration: 0.045, type: "square", gain: 0.018 }),
  confirm: () => playTone({ freq: 480, glideTo: 740, duration: 0.16, type: "sine", gain: 0.05 }),
  chime: () => playTone({ freq: 600, glideTo: 900, duration: 0.2, type: "triangle", gain: 0.045 })
};
function playSfx(name, enabled) {
  if (!enabled) return;
  SFX[name] && SFX[name]();
}


// Short, editorial display label for a clothing item — never mutates the
// underlying name, just trims it for compact UI (cards, outfit summaries).
function titleCase(s) { return s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()); }
function shortDisplayName(name) {
  if (!name) return "";
  const stopAt = /(polo t-?shirt|t-?shirt|shirt|trousers?|jeans|pants|denim|corduroy|sneakers?|shoes?|loafers?)/i;
  const m = name.match(stopAt);
  const cut = m ? name.slice(0, m.index + m[0].length) : name.split(/\s+/).slice(0, 3).join(" ");
  return titleCase(cut.replace(/\s+/g, " ").trim());
}
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

/* ============================================================
   EXCEL PARSING (used for initial seed AND re-import via SheetJS)
   ============================================================ */
function parseCellCombo(text) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const out = {};
  for (const line of lines) {
    const m = line.match(/(shirt|pant|pants|shoe|shoes)\s*:\s*(.+)/i);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key.startsWith("shirt")) out.Shirt = val;
      else if (key.startsWith("pant")) out.Pants = val;
      else if (key.startsWith("shoe")) out.Shoes = val;
    }
  }
  if (out.Shirt && out.Pants && out.Shoes) return out;
  return null;
}

function buildSeedFromRotation(rawRotation, rawClothing) {
  const clothingItems = {};
  for (const cat of CATEGORIES) {
    for (const name of rawClothing[cat] || []) {
      const id = itemId(cat, name);
      if (!clothingItems[id]) {
        clothingItems[id] = { id, name, category: cat, status: "Available", image: null, createdAt: Date.now(), updatedAt: Date.now() };
      }
    }
  }
  const looks = {};
  const rotationSlots = [];
  for (const week of WEEKS) {
    for (const day of DAY_LABELS) {
      const combo = rawRotation[week] && rawRotation[week][day];
      let lookId = null;
      if (combo) {
        const shirtId = itemId("Shirt", combo.Shirt);
        const pantsId = itemId("Pants", combo.Pants);
        const shoesId = itemId("Shoes", combo.Shoes);
        // ensure items exist even if not in clothing list sheet
        for (const [cat, id, name] of [["Shirt", shirtId, combo.Shirt], ["Pants", pantsId, combo.Pants], ["Shoes", shoesId, combo.Shoes]]) {
          if (!clothingItems[id]) clothingItems[id] = { id, name, category: cat, status: "Available", image: null, createdAt: Date.now(), updatedAt: Date.now() };
        }
        lookId = uid("look");
        looks[lookId] = {
          id: lookId, shirtId, pantsId, shoesId,
          name: `Week ${week} · ${day}`,
          status: "active", createdAt: Date.now(), updatedAt: Date.now()
        };
      }
      rotationSlots.push({ week, day, lookId });
    }
  }
  return { clothingItems, looks, rotationSlots };
}

function buildInitialState() {
  const { clothingItems, looks, rotationSlots } = buildSeedFromRotation(RAW_ROTATION, RAW_CLOTHING);
  const snapshot = { clothingItems: deepClone(clothingItems), looks: deepClone(looks), rotationSlots: deepClone(rotationSlots) };
  return {
    version: 1,
    clothingItems, looks, rotationSlots,
    rotationCursor: 0,
    lastProcessedDate: null,
    dailyPlans: {},
    actualWear: {},
    attendance: {},
    settings: { officeDays: [1, 2, 3, 4, 5], theme: "dark", soundEnabled: false },
    originalSnapshot: snapshot,
    importedAt: Date.now()
  };
}

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

/* ============================================================
   CORE ROTATION / RESOLUTION LOGIC (deterministic, pure)
   ============================================================ */
function lookIsAvailable(look, clothingItems) {
  if (!look) return false;
  const s = clothingItems[look.shirtId], p = clothingItems[look.pantsId], sh = clothingItems[look.shoesId];
  if (!s || !p || !sh) return false;
  return s.status === "Available" && p.status === "Available" && sh.status === "Available";
}

function findNextAvailableLook(rotationSlots, looks, clothingItems, startSeq) {
  const skippedSequences = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const seq = (startSeq + i) % TOTAL_SLOTS;
    const slot = rotationSlots[seq];
    const look = slot.lookId ? looks[slot.lookId] : null;
    if (look && look.status === "active" && lookIsAvailable(look, clothingItems)) {
      return { sequence: seq, lookId: look.id, skippedSequences };
    }
    skippedSequences.push(seq);
  }
  return { sequence: startSeq, lookId: null, skippedSequences }; // nothing available at all
}

// advance dailyPlans + cursor from lastProcessedDate+1 up to targetDate (inclusive)
function advanceStateToDate(state, targetDate) {
  let cursor = state.rotationCursor;
  const dailyPlans = { ...state.dailyPlans };
  let cursorDate = state.lastProcessedDate ? addDays(state.lastProcessedDate, 1) : targetDate;
  let guard = 0;
  const officeDays = state.settings.officeDays;
  let lastProcessed = state.lastProcessedDate;

  while (cursorDate <= targetDate && guard < 3660) {
    guard++;
    if (!dailyPlans[cursorDate]) {
      const dow = parseDate(cursorDate).getDay();
      const isOffice = officeDays.includes(dow);
      if (!isOffice) {
        dailyPlans[cursorDate] = { status: "no-office" };
      } else {
        const { sequence, lookId, skippedSequences } = findNextAvailableLook(state.rotationSlots, state.looks, state.clothingItems, cursor);
        dailyPlans[cursorDate] = {
          status: "office",
          sequence,
          rotationSequence: sequence,
          lookId,
          skippedSequences,
          source: "rotation",
          triedSequencesToday: lookId ? [sequence] : []
        };
        if (lookId) cursor = (sequence + 1) % TOTAL_SLOTS;
      }
    }
    lastProcessed = cursorDate;
    if (cursorDate === targetDate) break;
    cursorDate = addDays(cursorDate, 1);
  }
  return { ...state, dailyPlans, rotationCursor: cursor, lastProcessedDate: lastProcessed };
}

function tryAnotherLook(state, dateStr) {
  const plan = state.dailyPlans[dateStr];
  if (!plan || plan.status !== "office") return state;
  const tried = plan.triedSequencesToday || [];
  const startSeq = (plan.sequence + 1) % TOTAL_SLOTS;
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const seq = (startSeq + i) % TOTAL_SLOTS;
    if (tried.includes(seq)) continue;
    const slot = state.rotationSlots[seq];
    const look = slot.lookId ? state.looks[slot.lookId] : null;
    if (look && look.status === "active" && lookIsAvailable(look, state.clothingItems)) {
      const newPlan = {
        ...plan, sequence: seq, lookId: look.id, source: "try-another",
        triedSequencesToday: [...tried, seq]
      };
      return { ...state, dailyPlans: { ...state.dailyPlans, [dateStr]: newPlan } };
    }
  }
  return state; // no more untried available looks today
}

function chooseLookManually(state, dateStr, lookId) {
  const plan = state.dailyPlans[dateStr];
  if (!plan || plan.status !== "office") return state;
  const newPlan = { ...plan, lookId, source: "manual", triedSequencesToday: [...(plan.triedSequencesToday || []), plan.sequence] };
  return { ...state, dailyPlans: { ...state.dailyPlans, [dateStr]: newPlan } };
}

function recordWoreThis(state, dateStr) {
  const plan = state.dailyPlans[dateStr];
  if (!plan || plan.status !== "office" || !plan.lookId) return state;
  const look = state.looks[plan.lookId];
  const snapshot = { shirtId: look.shirtId, pantsId: look.pantsId, shoesId: look.shoesId, lookName: look.name };
  const wear = {
    date: dateStr, plannedLookId: plan.lookId, plannedSnapshot: snapshot,
    actualShirtId: look.shirtId, actualPantsId: look.pantsId, actualShoesId: look.shoesId,
    wasPlannedWorn: true, wasSkipped: false, recordedAt: Date.now()
  };
  return {
    ...state,
    actualWear: { ...state.actualWear, [dateStr]: wear },
    attendance: { ...(state.attendance || {}), [dateStr]: { status: "present", recordedAt: Date.now() } }
  };
}

function recordWoreSomethingElse(state, dateStr, { shirtId, pantsId, shoesId }) {
  const plan = state.dailyPlans[dateStr];
  let snapshot = null, plannedLookId = null;
  if (plan && plan.status === "office" && plan.lookId) {
    const look = state.looks[plan.lookId];
    snapshot = { shirtId: look.shirtId, pantsId: look.pantsId, shoesId: look.shoesId, lookName: look.name };
    plannedLookId = look.id;
  }
  const wear = {
    date: dateStr, plannedLookId, plannedSnapshot: snapshot,
    actualShirtId: shirtId, actualPantsId: pantsId, actualShoesId: shoesId,
    wasPlannedWorn: false, wasSkipped: true, recordedAt: Date.now()
  };
  return {
    ...state,
    actualWear: { ...state.actualWear, [dateStr]: wear },
    attendance: { ...(state.attendance || {}), [dateStr]: { status: "present", recordedAt: Date.now() } }
  };
}

function markNotGoingToOffice(state, dateStr) {
  const plan = state.dailyPlans[dateStr];
  if (!plan || plan.status !== "office") return state;
  const rotationSequence = plan.rotationSequence ?? plan.sequence ?? state.rotationCursor;
  return {
    ...state,
    dailyPlans: { ...state.dailyPlans, [dateStr]: { ...plan, status: "no-office", noOfficeReason: "user" } },
    // Put the rotation cursor back so this day's Look is carried forward.
    rotationCursor: rotationSequence,
    attendance: { ...(state.attendance || {}), [dateStr]: { status: "absent", recordedAt: Date.now() } }
  };
}

/* ============================================================
   DERIVED / ANALYTICS
   ============================================================ */
function computeItemStats(state) {
  const counts = {}; const lastWorn = {};
  Object.values(state.actualWear).forEach(w => {
    [w.actualShirtId, w.actualPantsId, w.actualShoesId].forEach(id => {
      if (!id) return;
      counts[id] = (counts[id] || 0) + 1;
      if (!lastWorn[id] || w.date > lastWorn[id]) lastWorn[id] = w.date;
    });
  });
  return { counts, lastWorn };
}

function computeLookStats(state) {
  const counts = {};
  Object.values(state.actualWear).forEach(w => {
    if (w.wasPlannedWorn && w.plannedLookId) counts[w.plannedLookId] = (counts[w.plannedLookId] || 0) + 1;
  });
  return counts;
}

function dayStatus(state, dateStr) {
  const plan = state.dailyPlans[dateStr];
  const wear = state.actualWear[dateStr];
  const today = todayStr();
  if (!plan) return dateStr > today ? null : "unrecorded";
  if (plan.status === "no-office") return "no-office";
  if (wear) return wear.wasPlannedWorn ? "worn" : "skipped";
  if (dateStr === today) return "planned";
  if (dateStr < today) return "unrecorded";
  return "planned";
}

/* ============================================================
   STYLE TOKENS
   ============================================================ */
const GLOBAL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

html, body { height:100%; margin:0; padding:0; }
.dd-root{
  --lime:#c6ff3d; --lime-soft:#dcff8a; --pink:#ff9ecf; --pink-soft:#ffc4e3;
  --lime-fill:#c6ff3d; --pink-fill:#ff9ecf; --pink-soft-fill:#ffc4e3;
  font-family:'Inter';
  min-height:100vh; width:100%; position:relative; transition:background .25s ease,color .25s ease;
}
.dd-root[data-theme='dark']{
  --bg:#0a0a0d; --bg2:#0f0f13; --panel:rgba(255,255,255,0.045); --panel-strong:rgba(255,255,255,0.07);
  --border:rgba(255,255,255,0.09); --text:#f3f3ee; --muted:#96968f; --muted2:#6d6d67;
  background:
    radial-gradient(circle at 15% 0%, rgba(198,255,61,0.08), transparent 40%),
    radial-gradient(circle at 90% 20%, rgba(255,158,207,0.07), transparent 45%),
    var(--bg);
  color:var(--text);
}
.dd-root[data-theme='light']{
  --bg:#eef1ea; --bg2:#e6e9e0; --panel:rgba(10,12,8,0.035); --panel-strong:rgba(10,12,8,0.06);
  --border:rgba(10,12,8,0.10); --text:#14150f; --muted:#5c5d54; --muted2:#84857a;
  --lime:#4d7a15; --lime-soft:#3c5f10; --pink:#b23368; --pink-soft:#96295a;
  background:
    radial-gradient(circle at 15% 0%, rgba(198,255,61,0.16), transparent 40%),
    radial-gradient(circle at 90% 20%, rgba(255,158,207,0.16), transparent 45%),
    var(--bg);
  color:var(--text);
}
.dd-root h1,.dd-root h2,.dd-root h3,.dd-heading{font-family:'Space Grotesk'; letter-spacing:-0.01em;}
.dd-glass{
  background:var(--panel); border:1px solid var(--border); border-radius:22px;
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
  box-shadow:0 2px 14px rgba(0,0,0,0.14);
  transition:border-color .18s ease, box-shadow .18s ease, transform .15s ease;
}
.dd-glass:hover{ border-color:var(--border-strong,var(--border)); }
.dd-glass-strong{ background:var(--panel-strong); border:1px solid var(--border); border-radius:22px; box-shadow:0 4px 20px rgba(0,0,0,0.18); }
.dd-btn{
  font-family:'Space Grotesk'; font-weight:600; border-radius:16px; padding:12px 20px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;
  border:1px solid var(--border); transition:transform .15s ease, box-shadow .15s ease, background .2s ease;
  user-select:none;
}
.dd-btn:active{ transform:scale(0.97); }
.dd-btn-primary{ background:var(--lime-fill); color:#0a0a0d; border:none; box-shadow:0 0 0 rgba(198,255,61,0); }
.dd-btn-primary:hover{ box-shadow:0 4px 24px rgba(198,255,61,0.35); }
.dd-btn-ghost{ background:transparent; color:var(--text); }
.dd-btn-ghost:hover{ background:var(--panel-strong); }
.dd-btn-pink{ background:var(--pink); color:#2a0f1e; border:none; }
.dd-chip{
  font-size:12px; font-weight:600; padding:5px 12px; border-radius:999px; display:inline-flex; align-items:center; gap:6px;
  border:1px solid var(--border); color:var(--muted);
}
.dd-nav-item{
  display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:14px; cursor:pointer; color:var(--muted);
  transition:background .15s ease, color .15s ease; font-weight:600; font-size:14px;
}
.dd-nav-item:hover{ background:var(--panel); color:var(--text); }
.dd-nav-item.active{ background:var(--panel-strong); color:var(--lime); box-shadow:inset 0 0 0 1px var(--border); }
.dd-input{
  width:100%; background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:11px 14px;
  color:var(--text); font-family:'Inter'; font-size:14px; outline:none;
}
.dd-input:focus{ border-color:var(--lime); }
select.dd-input{ cursor:pointer; }
.dd-root[data-theme='dark'] select.dd-input{ color-scheme:dark; }
.dd-root[data-theme='light'] select.dd-input{ color-scheme:light; }
.dd-root[data-theme='dark'] select.dd-input option{ background:#161619; color:#f3f3ee; }
.dd-root[data-theme='light'] select.dd-input option{ background:#ffffff; color:#14150f; }
.dd-scrollbar::-webkit-scrollbar{width:6px; height:6px;}
.dd-scrollbar::-webkit-scrollbar-thumb{background:var(--border); border-radius:99px;}
.dd-garment-glow{ filter:drop-shadow(0 0 18px rgba(198,255,61,0.18)); }
.dd-fade-in{ animation:ddFade .35s ease both; }
@keyframes ddFade{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }
.dd-pop{ animation:ddPop .3s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes ddPop{ from{opacity:0; transform:scale(.92);} to{opacity:1; transform:scale(1);} }
.dd-slot{ transition:transform .15s ease, box-shadow .15s ease; }
.dd-slot.dragging{ opacity:.4; }
.dd-slot.drop-target{ box-shadow:0 0 0 2px var(--lime) inset; }

.dd-landing{
  min-height:100vh; min-height:100dvh; width:100%; box-sizing:border-box;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:20px; padding:32px; text-align:center; overflow-x:hidden;
  transition:opacity .32s ease, transform .32s ease;
}
.dd-landing > *{ max-width:100%; box-sizing:border-box; }
@media (max-width: 600px){
  .dd-landing{ padding:24px 20px; gap:18px; }
  .dd-landing-logo{ font-size:34px !important; line-height:1.05; white-space:nowrap; }
  .dd-landing-copy{ width:100%; }
  .dd-landing-copy > div{ margin-bottom:12px !important; }
  .dd-landing-copy p{ max-width:280px; }
  .dd-landing-cta{ width:100%; display:flex; justify-content:center; }
}
.dd-landing.exiting{ opacity:0; transform:scale(0.98); }
@keyframes ddRise{ from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:translateY(0);} }
@keyframes ddLineGrow{ from{width:0; opacity:0;} to{width:64px; opacity:1;} }
@keyframes ddScaleIn{ from{opacity:0; transform:scale(.9);} to{opacity:1; transform:scale(1);} }
.dd-landing-logo{ animation:ddRise .6s ease both; animation-delay:.05s; }
.dd-landing-line{ height:2px; border-radius:2px; background:linear-gradient(90deg,var(--lime-fill),var(--pink-fill)); animation:ddLineGrow .5s ease both; animation-delay:.45s; }
.dd-landing-visual{ animation:ddScaleIn .55s ease both; animation-delay:.7s; }
.dd-landing-copy{ animation:ddRise .5s ease both; animation-delay:1s; }
.dd-landing-cta{ animation:ddRise .5s ease both; animation-delay:1.25s; }
@media (prefers-reduced-motion: reduce){
  .dd-landing-logo,.dd-landing-line,.dd-landing-visual,.dd-landing-copy,.dd-landing-cta{ animation:ddFadeSimple .01s linear both !important; animation-delay:0s !important; }
  .dd-landing{ transition:opacity .15s ease; }
}
@keyframes ddFadeSimple{ from{opacity:0;} to{opacity:1;} }

`;

/* ============================================================
   GARMENT VISUAL — detailed SVG illustration, colored from the
   item's actual name (e.g. "Black shirt" → black shirt artwork)
   ============================================================ */
const COLOR_WORD_MAP = [
  ["jungle green", "#1f5c3a"], ["dark green", "#1e4d2b"], ["forest green", "#1e4d2b"], ["olive", "#6b6b34"], ["green", "#2f7a3e"],
  ["paler grey", "#b7b7b2"], ["paler gray", "#b7b7b2"], ["dark grey", "#4a4a4d"], ["dark gray", "#4a4a4d"],
  ["charcoal grey", "#3a3a3d"], ["charcoal", "#3a3a3d"], ["light grey", "#c7c7c2"], ["light gray", "#c7c7c2"],
  ["silver", "#b7b8b6"], ["grey", "#8a8a86"], ["gray", "#8a8a86"],
  ["blush pink", "#e6a9bd"], ["hot pink", "#d63d84"], ["pink", "#e6a9bd"],
  ["maroon", "#6e1f26"], ["crimson", "#a3232c"], ["burgundy", "#5c1f2e"], ["red", "#b3282f"],
  ["navy blue", "#1c2b4a"], ["navy", "#1c2b4a"], ["dark blue", "#223a63"], ["sky blue", "#6fa8d6"],
  ["light fade blue", "#8aa9cf"], ["blue", "#3763a3"],
  ["turquoise", "#2a9d9d"], ["teal", "#1f7a76"], ["mint", "#8fd6b4"],
  ["mustard", "#c99a2e"], ["gold", "#c9a44a"], ["yellow", "#d9b93c"],
  ["orange", "#cf6a2c"], ["rust", "#a1522a"],
  ["lavender", "#9a8bc4"], ["violet", "#6f4e9c"], ["purple", "#6a3f8f"],
  ["khaki", "#b8a978"], ["cream", "#ecdfc3"],
  ["light brown", "#a9754f"], ["linen brown", "#b98a5e"], ["brown", "#7a4b30"],
  ["beige", "#d8c6a1"], ["tan", "#c9a877"],
  ["black", "#242426"], ["white", "#f2f2ee"],
  ["corduroy", "#8a6c46"], ["denim", "#3e5a82"]
];
function colorFromName(name) {
  const lower = (name || "").toLowerCase();
  for (const [key, hex] of COLOR_WORD_MAP) if (lower.includes(key)) return hex;
  return null;
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function relLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const GARMENT_EMOJI = { Shirt: "👕", Pants: "👖", Shoes: "👟" };

function hexToHsl(hex) {
  let [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Colorize a flat emoji glyph to approximate a target hex color via CSS filters.
function emojiFilterFor(hex) {
  const { h, s, l } = hexToHsl(hex);
  const hueRotate = ((h - 30) + 360) % 360; // sepia() lands around hue 30
  const sat = Math.max(1.4, Math.min(7, 0.8 + s / 18));
  const bright = 0.55 + (l / 100) * 1.05;
  return `grayscale(1) brightness(${bright.toFixed(2)}) sepia(1) hue-rotate(${hueRotate.toFixed(0)}deg) saturate(${sat.toFixed(1)})`;
}

function nameToHex(name) {
  const named = colorFromName(name);
  if (named) return named;
  const hue = hashHue(name);
  const s = 50, l = 55;
  const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100), x = c * (1 - Math.abs(((hue / 60) % 2) - 1)), m = l / 100 - c / 2;
  let r1, g1, b1;
  if (hue < 60) { r1 = c; g1 = x; b1 = 0; } else if (hue < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (hue < 180) { r1 = 0; g1 = c; b1 = x; } else if (hue < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (hue < 300) { r1 = x; g1 = 0; b1 = c; } else { r1 = c; g1 = 0; b1 = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

// Shoes often name two colors (upper + sole), e.g. "White sneaker with brown gum sole",
// "Puma Kyzer Black and Brown". Parse both so the icon can show upper vs sole distinctly.
function parseShoeColors(name) {
  const lower = (name || "").toLowerCase();
  const found = [];
  for (const [key, hex] of COLOR_WORD_MAP) {
    const idx = lower.indexOf(key);
    if (idx !== -1) found.push({ idx, hex });
  }
  found.sort((a, b) => a.idx - b.idx);
  const uniq = [];
  for (const f of found) if (!uniq.some(u => u.hex === f.hex)) uniq.push(f);
  let upper = uniq[0]?.hex || null;
  let sole = uniq[1]?.hex || null;
  const soleIdx = lower.indexOf("sole");
  if (soleIdx !== -1) {
    const before = found.filter(f => f.idx < soleIdx).sort((a, b) => b.idx - a.idx);
    if (before[0]) sole = before[0].hex;
  }
  if (!upper) upper = nameToHex(name);
  if (!sole) sole = "#d8c6a1";
  return { upper, sole };
}

/* ============================================================
   GARMENT VISUAL — illustrated, name-driven SVG artwork.
   Priority: 1) the user's own uploaded photo, 2) an illustrated
   garment that reads its own construction (sleeve length, fit,
   fabric, color) straight from the item's name.
   ============================================================ */
function ShadowEllipse({ cx = 50, cy = 95, rx = 30, ry = 4 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity="0.28" />;
}

// Sleeve length + silhouette width parsed from the item's own name.
function parseGarmentTraits(name) {
  const lower = (name || "").toLowerCase();
  const oversized = /oversized|oversize/.test(lower);
  const stripeMatch = lower.match(/([a-z]+)\s+(?:stripes?|lines?)\b/);
  const stripeColor = stripeMatch ? colorFromName(stripeMatch[1]) : null;
  return { oversized, stripeColor };
}

function parsePantsTraits(name) {
  const lower = (name || "").toLowerCase();
  return {
    jeans: /jean|denim/.test(lower),
    cargo: /cargo/.test(lower),
    corduroy: /corduroy/.test(lower),
    pleated: /pleat/.test(lower)
  };
}

function GarmentVisual({ item, size = 120 }) {
  if (!item) return null;
  if (item.image) {
    return <img src={item.image} alt={item.name} style={{ width: size, height: size, objectFit: "cover", borderRadius: Math.max(10, size * 0.12) }} className="dd-garment-glow" />;
  }
  const gid = `g_${item.id.replace(/[^a-z0-9]/gi, "")}`;

  function FabricGradient({ id, base, angle = 1 }) {
    return (
      <linearGradient id={id} x1={angle > 0 ? "5%" : "95%"} y1="0%" x2={angle > 0 ? "95%" : "5%"} y2="100%">
        <stop offset="0%" stopColor={shade(base, 40)} />
        <stop offset="30%" stopColor={shade(base, 14)} />
        <stop offset="60%" stopColor={base} />
        <stop offset="100%" stopColor={shade(base, -28)} />
      </linearGradient>
    );
  }

  /* ---------------- SHOES ---------------- */
  if (item.category === "Shoes") {
    const { upper, sole } = parseShoeColors(item.name);
    const upperLight = relLuminance(upper) > 0.55;
    const upperStroke = upperLight ? shade(upper, -90) : shade(upper, 60);
    const soleStroke = shade(sole, -45);
    const soleLight = shade(sole, 30);
    const lower = item.name.toLowerCase();
    const isLoafer = /loafer|formal|oxford|derby/.test(lower);
    const isRunning = /running|sport|athletic/.test(lower);

    const Shoe = ({ scale = 1, opacity = 1, dx = 0, dy = 0 }) => (
      <g transform={`translate(${dx} ${dy}) scale(${scale})`} opacity={opacity}>
        {isLoafer ? (
          <>
            <path d="M6 78 Q6 70 14 68 L82 62 Q92 61 94 68 L95 76 Q96 82 89 84 L14 88 Q6 88 6 82 Z"
              fill={`url(#${gid}s)`} stroke={soleStroke} strokeWidth="2" strokeLinejoin="round" />
            <path d="M8 76 L92 68" stroke={soleLight} strokeWidth="1" opacity="0.6" fill="none" />
            <path d="M12 68 L18 50 Q23 40 38 40 L64 40 Q78 42 84 52 L88 62 L84 66 L12 68 Z"
              fill={`url(#${gid}u)`} stroke={upperStroke} strokeWidth="2" strokeLinejoin="round" />
            <path d="M20 65 Q34 56 50 55" stroke={upperStroke} strokeWidth="1" opacity="0.5" fill="none" />
            <rect x="40" y="52" width="18" height="7" rx="3" fill={shade(upper, -25)} stroke={upperStroke} strokeWidth="1.2" />
            <ellipse cx="28" cy="47" rx="10" ry="4.5" fill={shade(upper, 45)} opacity="0.35" />
            <path d="M76 42 L86 47 L84 58 L74 53 Z" fill={shade(upper, -30)} opacity="0.6" />
          </>
        ) : (
          <>
            <path d="M6 76 Q6 68 14 66 L83 58 Q94 57 96 66 L97 75 Q98 82 90 84 L14 89 Q6 89 6 82 Z"
              fill={`url(#${gid}s)`} stroke={soleStroke} strokeWidth="2" strokeLinejoin="round" />
            <path d="M8 74 L94 66" stroke={soleLight} strokeWidth="1.1" opacity="0.65" fill="none" />
            {[16, 28, 40, 52, 64, 76, 88].map(x => (
              <line key={x} x1={x} y1={80 - x * 0.14} x2={x - 1.5} y2={85 - x * 0.14} stroke={soleStroke} strokeWidth="1" opacity="0.4" />
            ))}
            <path d="M13 66 L19 48 Q23 38 36 36 L62 33 Q76 33 83 44 L88 57 L85 61 L13 66 Z"
              fill={`url(#${gid}u)`} stroke={upperStroke} strokeWidth="2" strokeLinejoin="round" />
            <ellipse cx="27" cy="46" rx="9" ry="5" fill={shade(upper, 50)} opacity="0.32" />
            <path d="M74 36 L86 41 L84 55 L72 50 Z" fill={shade(upper, -28)} stroke={upperStroke} strokeWidth="1" opacity="0.85" />
            <path d="M38 38 Q46 48 44 60" stroke={upperStroke} strokeWidth="0.9" opacity="0.5" fill="none" />
            <path d="M39 40 L52 37 L56 47 L44 51 Z" fill={shade(upper, 20)} opacity="0.65" />
            <line x1="42" y1="41" x2="53" y2="49" stroke={upperStroke} strokeWidth="1.5" opacity="0.9" />
            <line x1="46" y1="38" x2="57" y2="46" stroke={upperStroke} strokeWidth="1.5" opacity="0.9" />
            <line x1="50" y1="36" x2="61" y2="44" stroke={upperStroke} strokeWidth="1.5" opacity="0.9" />
            {isRunning && Array.from({ length: 10 }).map((_, i) => (
              <circle key={i} cx={40 + (i % 5) * 6} cy={50 + Math.floor(i / 5) * 5} r="0.7" fill={upperStroke} opacity="0.4" />
            ))}
          </>
        )}
      </g>
    );

    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="dd-garment-glow">
        <defs>
          <FabricGradient id={gid + "u"} base={upper} />
          <FabricGradient id={gid + "s"} base={sole} />
        </defs>
        <ShadowEllipse cx={52} cy={92} rx={38} ry={5} />
        <Shoe scale={1} opacity={1} dx={0} dy={0} />
      </svg>
    );
  }

  const fill = nameToHex(item.name);
  const light = relLuminance(fill) > 0.55;
  const stroke = light ? shade(fill, -90) : shade(fill, 60);
  const shadow = shade(fill, light ? -15 : -30);

  /* ---------------- SHIRTS / POLOS ---------------- */
  if (item.category === "Shirt") {
    const isPolo = /polo/i.test(item.name);
    const { oversized, stripeColor } = parseGarmentTraits(item.name);
    const bodyW = oversized ? 42 : 34;
    const bodyX = 50 - bodyW / 2;
    const sleeveLen = oversized ? 28 : 24;
    const sleeveW = oversized ? 25 : 21;
    const bodyPath = `M${bodyX + 4} 18 C${bodyX + 10} 13 ${bodyX + 16} 12 50 12 C${100 - bodyX - 16} 12 ${100 - bodyX - 10} 13 ${100 - bodyX - 4} 18 L${100 - bodyX + 2} 31 L${100 - bodyX - 2} 28 L${100 - bodyX - 2} 90 L${bodyX + 2} 90 L${bodyX + 2} 28 L${bodyX - 2} 31 Z`;
    const bodyClipId = gid + "clip";
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="dd-garment-glow">
        <defs>
          <FabricGradient id={gid} base={fill} />
          <clipPath id={bodyClipId}><path d={bodyPath} /></clipPath>
        </defs>
        <ShadowEllipse cx={50} cy={94} rx={22} ry={4} />
        <rect x={bodyX - sleeveW + 2} y="21" width={sleeveW} height={sleeveLen} rx="2" fill={`url(#${gid})`} stroke={stroke} strokeWidth="2" transform={`rotate(-15 ${bodyX - sleeveW / 2 + 2} ${21 + sleeveLen / 2})`} />
        <rect x={100 - bodyX - 2} y="21" width={sleeveW} height={sleeveLen} rx="2" fill={`url(#${gid})`} stroke={stroke} strokeWidth="2" transform={`rotate(15 ${100 - bodyX - 2 + sleeveW / 2} ${21 + sleeveLen / 2})`} />
        <path d={bodyPath} fill={`url(#${gid})`} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        {stripeColor && (
          <g clipPath={`url(#${bodyClipId})`} opacity="0.85">
            {Array.from({ length: 7 }).map((_, i) => (
              <rect key={i} x={bodyX - 6 + i * 6} y="10" width="2.2" height="86" fill={stripeColor} opacity="0.6" />
            ))}
          </g>
        )}
        <path d={`M${bodyX + 4} 18 C${bodyX + 16} 24 ${100 - bodyX - 16} 24 ${100 - bodyX - 4} 18`} stroke={shade(fill, -12)} strokeWidth="1" opacity="0.45" fill="none" />
        <ellipse cx={bodyX + 8} cy="34" rx="4" ry="10" fill={shadow} opacity="0.3" />
        <ellipse cx={100 - bodyX - 8} cy="34" rx="4" ry="10" fill={shadow} opacity="0.3" />
        <rect x={bodyX + 6} y="16" width="7" height="60" fill={shade(fill, 30)} opacity="0.14" />
        {isPolo ? (
          <>
            <polygon points="44,17 50,28 46,12" fill={shadow} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <polygon points="56,17 50,28 54,12" fill={shadow} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <line x1="50" y1="29" x2="50" y2="46" stroke={stroke} strokeWidth="1.1" opacity="0.6" />
            <circle cx="50" cy="34" r="1.3" fill={stroke} opacity="0.8" />
            <circle cx="50" cy="41" r="1.3" fill={stroke} opacity="0.8" />
          </>
        ) : (
          <>
            <polygon points="41,15 50,29 45,10" fill={shadow} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <polygon points="59,15 50,29 55,10" fill={shadow} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <line x1="42" y1="13" x2="45" y2="10" stroke={shade(fill, 40)} strokeWidth="0.8" opacity="0.5" />
            <line x1="58" y1="13" x2="55" y2="10" stroke={shade(fill, 40)} strokeWidth="0.8" opacity="0.5" />
            <line x1="50" y1="30" x2="50" y2="87" stroke={stroke} strokeWidth="1.1" opacity="0.6" />
            {[38, 48, 58, 68, 78].map(y => <circle key={y} cx="50" cy={y} r="1.2" fill={stroke} opacity="0.8" />)}
          </>
        )}
      </svg>
    );
  }

  /* ---------------- PANTS ---------------- */
  const { jeans, cargo, corduroy, pleated } = parsePantsTraits(item.name);
  const stitch = "#d9a441";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="dd-garment-glow">
      <defs><FabricGradient id={gid} base={fill} /></defs>
      <ShadowEllipse cx={50} cy={95} rx={26} ry={4} />
      <rect x="29" y="9" width="42" height="9" rx="3" fill={shadow} stroke={stroke} strokeWidth="1.5" />
      {[33, 42, 50, 58, 67].map(x => <rect key={x} x={x} y="7.5" width="2.4" height="5" rx="1" fill={stroke} opacity="0.7" />)}
      <rect x="28" y="18" width="19" height="70" rx="3" fill={`url(#${gid})`} stroke={stroke} strokeWidth="2.2" />
      <rect x="53" y="18" width="19" height="70" rx="3" fill={`url(#${gid})`} stroke={stroke} strokeWidth="2.2" />
      <line x1="50" y1="18" x2="50" y2="34" stroke={stroke} strokeWidth="1.1" opacity="0.55" />
      <rect x="28" y="18" width="6" height="70" fill={shade(fill, 22)} opacity="0.28" />
      <rect x="66" y="18" width="6" height="70" fill={shadow} opacity="0.22" />
      {jeans && (
        <>
          <line x1="31" y1="21" x2="31" y2="86" stroke={stitch} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.85" />
          <line x1="63" y1="21" x2="63" y2="86" stroke={stitch} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.85" />
          <path d="M30 21 Q37 25 44 21" stroke={stitch} strokeWidth="0.8" fill="none" opacity="0.7" />
          <path d="M56 21 Q63 25 70 21" stroke={stitch} strokeWidth="0.8" fill="none" opacity="0.7" />
          <rect x="59" y="22" width="8" height="9" rx="1" fill="none" stroke={stitch} strokeWidth="0.8" opacity="0.85" />
        </>
      )}
      {cargo && (
        <>
          <rect x="29" y="44" width="16" height="19" rx="2" fill={shadow} stroke={stroke} strokeWidth="1.2" />
          <rect x="55" y="44" width="16" height="19" rx="2" fill={shadow} stroke={stroke} strokeWidth="1.2" />
          <line x1="29" y1="51" x2="45" y2="51" stroke={stroke} strokeWidth="1" opacity="0.6" />
          <line x1="55" y1="51" x2="71" y2="51" stroke={stroke} strokeWidth="1" opacity="0.6" />
          <circle cx="37" cy="47" r="0.9" fill={stroke} opacity="0.7" />
          <circle cx="63" cy="47" r="0.9" fill={stroke} opacity="0.7" />
        </>
      )}
      {corduroy && Array.from({ length: 14 }).map((_, i) => (
        <React.Fragment key={i}>
          <line x1="29" y1={20 + i * 5} x2="46" y2={20 + i * 5} stroke={shadow} strokeWidth="0.5" opacity="0.35" />
          <line x1="54" y1={20 + i * 5} x2="71" y2={20 + i * 5} stroke={shadow} strokeWidth="0.5" opacity="0.35" />
        </React.Fragment>
      ))}
      {!jeans && !cargo && (
        <>
          <path d="M30 21 Q38 26 44 22" stroke={stroke} strokeWidth="1" opacity="0.5" fill="none" />
          <path d="M70 21 Q62 26 56 22" stroke={stroke} strokeWidth="1" opacity="0.5" fill="none" />
          {pleated && <><line x1="40" y1="20" x2="40" y2="40" stroke={shadow} strokeWidth="1" opacity="0.5" /><line x1="60" y1="20" x2="60" y2="40" stroke={shadow} strokeWidth="1" opacity="0.5" /></>}
          <line x1="37" y1="24" x2="37" y2="86" stroke={shade(fill, -8)} strokeWidth="1" opacity="0.45" />
          <line x1="63" y1="24" x2="63" y2="86" stroke={shade(fill, -8)} strokeWidth="1" opacity="0.45" />
        </>
      )}
    </svg>
  );
}


/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;

  // The dialog is portaled to <body> so its position is tied to the real
  // viewport rather than an animated/transformed DailyDrobe container.
  // Keep the DailyDrobe theme tokens locally because the portal sits outside
  // .dd-root, where those CSS variables are normally defined.
  const modal = (
    <div
      data-dailydrobe-modal="true"
      style={{
        "--bg2": "#0f0f13",
        "--panel": "rgba(255,255,255,0.045)",
        "--panel-strong": "rgba(255,255,255,0.07)",
        "--border": "rgba(255,255,255,0.09)",
        "--text": "#f3f3ee",
        "--muted": "#96968f",
        "--lime": "#c6ff3d",
        "--lime-fill": "#c6ff3d",
        "--pink": "#ff9ecf",
        "--pink-fill": "#ff9ecf",
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflow: "hidden",
        overscrollBehavior: "contain"
      }}
      onClick={onClose}
    >
      <style>{`
        [data-dailydrobe-modal] *,
        [data-dailydrobe-modal] *::before,
        [data-dailydrobe-modal] *::after { box-sizing: border-box; }
        [data-dailydrobe-modal] select.dd-input {
          background: #161619 !important;
          color: #f3f3ee !important;
          color-scheme: dark;
        }
        [data-dailydrobe-modal] select.dd-input option,
        [data-dailydrobe-modal] select.dd-input optgroup {
          background: #161619 !important;
          color: #f3f3ee !important;
        }
        [data-dailydrobe-modal] select.dd-input option:checked {
          background: #c6ff3d !important;
          color: #0a0a0d !important;
        }
        [data-dailydrobe-modal] .dd-modal-content { color: #f3f3ee !important; font-family: 'Inter' !important; }
        [data-dailydrobe-modal] .dd-modal-content strong { color: #f3f3ee !important; }
        [data-dailydrobe-modal] .dd-btn-primary { background: #c6ff3d !important; color: #0a0a0d !important; }
      `}</style>
      <div
        className="dd-pop dd-scrollbar dd-modal-content"
        style={{
          width: `min(${width}px, calc(100vw - 32px))`,
          maxWidth: `calc(100vw - 32px)`,
          maxHeight: "85dvh",
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
          padding: 24,
          background: "#0f0f13",
          color: "#f3f3ee",
          fontFamily: "'Inter'",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, minWidth: 0 }}>
          <h3 className="dd-heading" style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "#c6ff3d" }}>{title}</h3>
          <div className="dd-btn dd-btn-ghost" style={{ padding: 8, flexShrink: 0, color: "#f3f3ee" }} onClick={onClose}><X size={18} /></div>
        </div>
        <div style={{ minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function StatusPill({ status }) {
  const map = {
    worn: { color: "var(--lime)", label: "Worn", icon: <CheckCircle2 size={13} /> },
    skipped: { color: "var(--pink)", label: "Skipped", icon: <Shuffle size={13} /> },
    "no-office": { color: "var(--muted2)", label: "No Office", icon: <Circle size={13} /> },
    unrecorded: { color: "#e0a94a", label: "Unrecorded", icon: <AlertCircle size={13} /> },
    planned: { color: "var(--pink-soft)", label: "Planned", icon: <Clock size={13} /> }
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className="dd-chip" style={{ color: s.color, borderColor: "currentColor" }}>{s.icon}{s.label}</span>
  );
}

/* ============================================================
   TODAY SCREEN
   ============================================================ */
function TodayScreen({ state, setState, missingDay, onResolveMissing, dismissMissing }) {
  const t = todayStr();
  const [dayOffset, setDayOffset] = useState(0);
  const isToday = dayOffset === 0;
  const viewDate = addDays(t, dayOffset);
  const viewState = useMemo(() => (isToday ? state : advanceStateToDate(state, viewDate)), [state, dayOffset, viewDate, isToday]);

  const plan = viewState.dailyPlans[viewDate];
  const wear = isToday ? state.actualWear[t] : null;
  const look = plan && plan.lookId ? viewState.looks[plan.lookId] : null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [worePicker, setWorePicker] = useState(false); // for "wore something else" today

  const shirt = look ? viewState.clothingItems[look.shirtId] : null;
  const pants = look ? viewState.clothingItems[look.pantsId] : null;
  const shoes = look ? viewState.clothingItems[look.shoesId] : null;

  const woreThis = () => { setState(s => recordWoreThis(s, t)); playSfx("confirm", state.settings.soundEnabled); };
  const tryAnother = () => { setState(s => tryAnotherLook(s, t)); playSfx("chime", state.settings.soundEnabled); };
  const notGoingToOffice = () => { setState(s => markNotGoingToOffice(s, t)); playSfx("chime", state.settings.soundEnabled); };

  const activeApprovedLooks = useMemo(() => Object.values(state.looks).filter(l => l.status === "active" && lookIsAvailable(l, state.clothingItems)), [state.looks, state.clothingItems]);

  const nextOfficePreview = useMemo(() => {
    if (!plan || plan.status !== "no-office") return null;
    let probe = viewDate;
    for (let i = 0; i < 14; i++) {
      probe = addDays(probe, 1);
      const s2 = advanceStateToDate(state, probe);
      const p2 = s2.dailyPlans[probe];
      if (p2 && p2.status === "office") {
        const lk = p2.lookId ? s2.looks[p2.lookId] : null;
        return { date: probe, look: lk };
      }
    }
    return null;
  }, [state, plan, viewDate]);

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {missingDay && (
        <div className="dd-glass" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderColor: "var(--pink)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="var(--pink)" />
            <span style={{ fontSize: 14 }}>Did you wear <strong>{shortDate(missingDay)}</strong>'s Look?</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="dd-btn dd-btn-primary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => onResolveMissing(missingDay, "wore-this")}>Wore this</div>
            <div className="dd-btn dd-btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => onResolveMissing(missingDay, "wore-else")}>Wore something else</div>
            <div className="dd-btn dd-btn-ghost" style={{ padding: "8px 10px", fontSize: 13 }} onClick={dismissMissing}><X size={14} /></div>
          </div>
        </div>
      )}

      <div>
        <h1 className="dd-heading" style={{ fontSize: 32, margin: "0 0 4px" }}>{isToday ? "Today" : "Upcoming"}</h1>
        <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.4 }}>{niceDate(viewDate).toUpperCase()}</div>
      </div>

      <div className="dd-glass" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5 }}>BROWSE UPCOMING DAYS</span>
          <span className="dd-chip" style={{ color: isToday ? "var(--lime)" : "var(--pink)", borderColor: isToday ? "var(--lime)" : "var(--pink)" }}>
            {isToday ? "Today" : `+${dayOffset} day${dayOffset > 1 ? "s" : ""}`}
          </span>
        </div>
        <input type="range" min={0} max={6} step={1} value={dayOffset}
          onChange={e => setDayOffset(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--lime-fill)", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted2)", marginTop: 6 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} style={{ fontWeight: i === dayOffset ? 700 : 400, color: i === dayOffset ? "var(--lime)" : "var(--muted2)" }}>
              {i === 0 ? "Today" : shortDate(addDays(t, i))}
            </span>
          ))}
        </div>
      </div>

      {!plan && <div className="dd-glass" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Setting things up…</div>}

      {plan && plan.status === "no-office" && (
        <div className="dd-glass dd-pop" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🌴</div>
          <h2 className="dd-heading" style={{ margin: "0 0 6px" }}>Out of Office</h2>
          <p style={{ color: "var(--muted)", margin: "0 0 4px" }}>Rotation paused</p>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>No look planned {isToday ? "today" : "that day"}. Your rotation is holding its place.</p>
          {nextOfficePreview && (
            <div className="dd-glass" style={{ marginTop: 20, padding: 14, display: "inline-flex", alignItems: "center", gap: 10, textAlign: "left" }}>
              <Clock size={16} color="var(--lime)" />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: "var(--muted2)" }}>NEXT OFFICE DAY</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{shortDate(nextOfficePreview.date)}{nextOfficePreview.look ? ` · ${nextOfficePreview.look.name}` : ""}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {plan && plan.status === "office" && !look && (
        <div className="dd-glass" style={{ padding: 40, textAlign: "center" }}>
          <AlertCircle size={28} color="var(--pink)" style={{ marginBottom: 10 }} />
          <h3 className="dd-heading" style={{ margin: "0 0 6px" }}>No approved Look is available</h3>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Every Look in rotation has an unavailable item. Update your wardrobe or approve a new Look.</p>
        </div>
      )}

      {plan && plan.status === "office" && look && (
        <div className="dd-pop" key={viewDate + look.id + plan.source}>
          <div className="dd-glass-strong" style={{ padding: "36px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(198,255,61,0.18), transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: -50, left: -50, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,158,207,0.15), transparent 70%)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, position: "relative" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lime)", letterSpacing: 1 }}>{isToday ? "APPROVED LOOK" : "PREVIEW"}</span>
                  <span className="dd-chip" style={{ fontSize: 10 }}>LOOK {String(plan.sequence + 1).padStart(2, "0")}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{look.name}{isToday && plan.source !== "rotation" ? ` · ${plan.source === "manual" ? "Chosen by you" : "Swapped"}` : ""}</div>
              </div>
              {wear && <StatusPill status={wear.wasPlannedWorn ? "worn" : "skipped"} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
              {[["Shirt", shirt], ["Pants", pants], ["Shoes", shoes]].map(([label, itm], i) => (
                <div key={label} style={{ padding: "16px 4px", display: "flex", alignItems: "center", gap: 18, borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <GarmentVisual item={itm} size={68} />
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted2)", fontWeight: 700 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }} title={itm ? itm.name : ""}>{itm ? shortDisplayName(itm.name) : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isToday ? (
            !wear ? (
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <div className="dd-btn dd-btn-primary" style={{ flex: "1 1 160px" }} onClick={woreThis}><Check size={17} /> Wore This</div>
                <div className="dd-btn dd-btn-ghost dd-glass" style={{ flex: "1 1 140px" }} onClick={tryAnother}><Shuffle size={17} /> Try Another</div>
                <div className="dd-btn dd-btn-ghost dd-glass" style={{ flex: "1 1 160px", color: "var(--pink)" }} onClick={notGoingToOffice}><XCircle size={17} /> Not Going to Office</div>
                <div className="dd-btn dd-btn-ghost dd-glass" style={{ flex: "1 1 140px" }} onClick={() => setPickerOpen(true)}><LayoutGrid size={17} /> Choose Myself</div>
              </div>
            ) : (
              <div className="dd-glass" style={{ marginTop: 14, padding: 14, fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color="var(--lime)" />
                {wear.wasPlannedWorn ? "Recorded as worn today." : "You logged a different outfit for today."}
                <span className="dd-btn dd-btn-ghost" style={{ marginLeft: "auto", padding: "6px 10px", fontSize: 12 }} onClick={() => setWorePicker(true)}>Edit actual outfit</span>
              </div>
            )
          ) : (
            <div className="dd-glass" style={{ marginTop: 14, padding: 14, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} />
              Preview based on the current rotation & wardrobe availability — it may change if something is used, laundered, or retired before then.
            </div>
          )}
        </div>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose an Approved Look">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }} className="dd-scrollbar">
          {activeApprovedLooks.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14 }}>No approved Looks are currently available.</div>}
          {activeApprovedLooks.map(l => {
            const s = state.clothingItems[l.shirtId], p = state.clothingItems[l.pantsId], sh = state.clothingItems[l.shoesId];
            return (
              <div key={l.id} className="dd-glass" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                onClick={() => { setState(s2 => chooseLookManually(s2, t, l.id)); setPickerOpen(false); playSfx("chime", state.settings.soundEnabled); }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <GarmentVisual item={s} size={34} /><GarmentVisual item={p} size={34} /><GarmentVisual item={sh} size={34} />
                </div>
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{s?.name} · {p?.name} · {sh?.name}</div>
                </div>
                <ChevronRight size={16} style={{ marginLeft: "auto" }} color="var(--muted)" />
              </div>
            );
          })}
        </div>
      </Modal>

      <OutfitPickerModal open={worePicker} onClose={() => setWorePicker(false)} state={state}
        onSubmit={(sel) => { setState(s2 => recordWoreSomethingElse(s2, t, sel)); setWorePicker(false); }} />
    </div>
  );
}

function OutfitPickerModal({ open, onClose, state, onSubmit }) {
  const [sel, setSel] = useState({ shirtId: "", pantsId: "", shoesId: "" });
  useEffect(() => { if (open) setSel({ shirtId: "", pantsId: "", shoesId: "" }); }, [open]);
  const byCat = (cat) => Object.values(state.clothingItems).filter(i => i.category === cat && i.status !== "Retired");
  return (
    <Modal open={open} onClose={onClose} title="What did you wear?">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[["Shirt", "shirtId"], ["Pants", "pantsId"], ["Shoes", "shoesId"]].map(([label, key]) => (
          <div key={key}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>{label.toUpperCase()}</div>
            <select className="dd-input" value={sel[key]} onChange={e => setSel(s => ({ ...s, [key]: e.target.value }))}>
              <option value="">Select {label.toLowerCase()}…</option>
              {byCat(label).map(i => <option key={i.id} value={i.id}>{i.name}{i.status === "In Laundry" ? " (in laundry)" : ""}</option>)}
            </select>
          </div>
        ))}
        <div className="dd-btn dd-btn-primary" style={{ opacity: (sel.shirtId && sel.pantsId && sel.shoesId) ? 1 : 0.4, pointerEvents: (sel.shirtId && sel.pantsId && sel.shoesId) ? "auto" : "none" }}
          onClick={() => onSubmit(sel)}>Save actual outfit</div>
      </div>
    </Modal>
  );
}

/* ============================================================
   WARDROBE SCREEN
   ============================================================ */
function WardrobeScreen({ state, setState }) {
  const [tab, setTab] = useState("Shirt");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [newAssignPrompt, setNewAssignPrompt] = useState(null);

  const { counts, lastWorn } = useMemo(() => computeItemStats(state), [state.actualWear]);

  const items = useMemo(() => {
    let list = Object.values(state.clothingItems).filter(i => i.category === tab);
    list = list.filter(i => showRetired ? true : i.status !== "Retired");
    if (query.trim()) list = list.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
    if (sort === "most") list = [...list].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    else if (sort === "least") list = [...list].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [state.clothingItems, tab, query, sort, showRetired, counts]);

  const addItem = (data) => {
    const id = uid("item");
    const item = { id, name: data.name, category: data.category, status: "Available", image: data.image || null, createdAt: Date.now(), updatedAt: Date.now() };
    setState(s => ({ ...s, clothingItems: { ...s.clothingItems, [id]: item } }));
    setShowAdd(false);
    setNewAssignPrompt(item);
  };

  const updateItem = (id, patch) => setState(s => ({ ...s, clothingItems: { ...s.clothingItems, [id]: { ...s.clothingItems[id], ...patch, updatedAt: Date.now() } } }));
  const retireItem = (id) => updateItem(id, { status: "Retired" });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const lookUsage = (id) => Object.values(state.looks).filter(l => l.shirtId === id || l.pantsId === id || l.shoesId === id);
  const deleteItem = (id) => {
    setState(s => {
      const clothingItems = { ...s.clothingItems };
      delete clothingItems[id];
      return { ...s, clothingItems };
    });
    setDeleteTarget(null);
  };

  const activeItems = useMemo(() => Object.values(state.clothingItems).filter(i => i.status !== "Retired"), [state.clothingItems]);
  const catBreakdown = CATEGORIES.map(c => `${activeItems.filter(i => i.category === c).length} ${c.toLowerCase()}${c === "Shirt" ? "s" : ""}`).join(" · ");

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="dd-heading" style={{ fontSize: 30, margin: "0 0 4px" }}>My Wardrobe</h1>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{activeItems.length} items · {catBreakdown}</div>
        </div>
        <div className="dd-btn dd-btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Item</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {CATEGORIES.map(c => (
          <div key={c} className="dd-chip" style={{ cursor: "pointer", padding: "8px 16px", fontSize: 13, background: tab === c ? "var(--panel-strong)" : "transparent", color: tab === c ? "var(--lime)" : "var(--muted)", borderColor: tab === c ? "var(--lime)" : "var(--border)" }}
            onClick={() => setTab(c)}>{c === "Shirt" ? "Shirts" : c}</div>
        ))}
      </div>

      <div className="dd-wardrobe-tools" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="dd-glass" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", flex: "1 1 200px" }}>
          <Search size={15} color="var(--muted)" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13, width: "100%" }} />
        </div>
        <select className="dd-input" style={{ width: "auto" }} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="recent">Recently added</option>
          <option value="most">Most worn</option>
          <option value="least">Least worn</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={showRetired} onChange={e => setShowRetired(e.target.checked)} /> Show retired
        </label>
      </div>

      {items.length === 0 && (
        <div className="dd-glass" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          <ShirtIcon size={26} style={{ marginBottom: 8 }} />
          <div>Your wardrobe starts here. Add your first {tab.toLowerCase()}.</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        {items.map(it => {
          const statusColor = it.status === "Available" ? "var(--lime)" : it.status === "In Laundry" ? "var(--pink)" : "var(--muted2)";
          return (
          <div key={it.id} className="dd-glass" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, opacity: it.status === "Retired" ? 0.55 : 1 }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><GarmentVisual item={it} size={100} /></div>
            <div style={{ fontSize: 13, fontWeight: 600, textAlign: "center", lineHeight: 1.25 }}>{it.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
              <span style={{ color: statusColor, fontWeight: 600 }}>{it.status}</span> · Worn {counts[it.id] || 0}×{lastWorn[it.id] ? ` · ${shortDate(lastWorn[it.id])}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>
              <div className="dd-btn dd-btn-ghost" style={{ padding: 7 }} onClick={() => setEditItem(it)}><Edit3 size={13} /></div>
              <div className="dd-btn dd-btn-ghost" style={{ padding: 7 }} onClick={() => setDeleteTarget(it)}><Trash2 size={13} /></div>
              {it.status !== "Retired" ? (
                <select className="dd-input" style={{ width: "auto", fontSize: 11, padding: "6px 8px" }} value={it.status}
                  onChange={e => updateItem(it.id, { status: e.target.value })}>
                  <option value="Available">Available</option>
                  <option value="In Laundry">In Laundry</option>
                  <option value="Retired">Retired</option>
                </select>
              ) : (
                <div className="dd-btn dd-btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => updateItem(it.id, { status: "Available" })}>Restore</div>
              )}
            </div>
          </div>
        );})}
      </div>

      <AddItemModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addItem} defaultCategory={tab} />
      {editItem && (
        <EditItemModal item={editItem} onClose={() => setEditItem(null)}
          onSave={(patch) => { updateItem(editItem.id, patch); setEditItem(null); }} />
      )}
      {newAssignPrompt && (
        <Modal open={true} onClose={() => setNewAssignPrompt(null)} title="Create or assign an approved Look">
          <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 0 }}>
            "{newAssignPrompt.name}" is in your wardrobe now, but it won't appear in recommendations until it's part of an Approved Look.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="dd-btn dd-btn-primary" style={{ flex: 1 }} onClick={() => setNewAssignPrompt({ ...newAssignPrompt, __openLookBuilder: true })}>Create a Look now</div>
            <div className="dd-btn dd-btn-ghost dd-glass" style={{ flex: 1 }} onClick={() => setNewAssignPrompt(null)}>Later</div>
          </div>
          {newAssignPrompt.__openLookBuilder && (
            <div style={{ marginTop: 16 }}>
              <LookBuilderInline state={state} setState={setState} presetItem={newAssignPrompt} onDone={() => setNewAssignPrompt(null)} />
            </div>
          )}
        </Modal>
      )}
      {deleteTarget && (() => {
        const usedLooks = lookUsage(deleteTarget.id);
        const wearCount = counts[deleteTarget.id] || 0;
        const blocked = usedLooks.length > 0 || wearCount > 0;
        return (
          <Modal open={true} onClose={() => setDeleteTarget(null)} title="Delete item">
            <p style={{ fontSize: 14, marginTop: 0 }}>Delete <strong>{deleteTarget.name}</strong> from your wardrobe?</p>
            {blocked ? (
              <>
                <p style={{ fontSize: 13, color: "var(--pink)", background: "var(--panel)", padding: 12, borderRadius: 12 }}>
                  This item can't be deleted — {usedLooks.length > 0 ? `it's used in ${usedLooks.length} Look${usedLooks.length > 1 ? "s" : ""}` : ""}{usedLooks.length > 0 && wearCount > 0 ? " and " : ""}{wearCount > 0 ? `it has ${wearCount} wear record${wearCount > 1 ? "s" : ""}` : ""}. Deleting it would break those references and historical accuracy.
                </p>
                <div className="dd-btn dd-btn-ghost dd-glass" onClick={() => { retireItem(deleteTarget.id); setDeleteTarget(null); }}>Retire instead</div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <div className="dd-btn dd-btn-pink" style={{ flex: 1 }} onClick={() => deleteItem(deleteTarget.id)}>Delete permanently</div>
                <div className="dd-btn dd-btn-ghost dd-glass" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</div>
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}

function ImageDrop({ value, onChange }) {
  const inputRef = useRef();
  const handleFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(f);
  };
  return (
    <div className="dd-glass" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => inputRef.current?.click()}>
      {value ? <img src={value} style={{ width: 46, height: 46, objectFit: "contain", borderRadius: 10 }} /> : <ImagePlus size={20} color="var(--muted)" />}
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{value ? "Change photo" : "Upload photo (optional)"}</span>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}

function AddItemModal({ open, onClose, onSubmit, defaultCategory }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [image, setImage] = useState(null);
  useEffect(() => { if (open) { setName(""); setCategory(defaultCategory); setImage(null); } }, [open, defaultCategory]);
  return (
    <Modal open={open} onClose={onClose} title="Add Clothing Item">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 700 }}>NAME</div>
          <input className="dd-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Navy chore jacket" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 700 }}>CATEGORY</div>
          <select className="dd-input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <ImageDrop value={image} onChange={setImage} />
        <div className="dd-btn dd-btn-primary" style={{ opacity: name.trim() ? 1 : 0.4, pointerEvents: name.trim() ? "auto" : "none" }}
          onClick={() => onSubmit({ name: name.trim(), category, image })}>Add to Wardrobe</div>
      </div>
    </Modal>
  );
}

function EditItemModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item.name);
  const [image, setImage] = useState(item.image);
  return (
    <Modal open={true} onClose={onClose} title="Edit Item">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input className="dd-input" value={name} onChange={e => setName(e.target.value)} />
        <ImageDrop value={image} onChange={setImage} />
        <div className="dd-btn dd-btn-primary" onClick={() => onSave({ name, image })}>Save changes</div>
      </div>
    </Modal>
  );
}

/* ============================================================
   LOOKS LIBRARY
   ============================================================ */
function LookBuilderInline({ state, setState, presetItem, onDone }) {
  const [shirtId, setShirtId] = useState(presetItem?.category === "Shirt" ? presetItem.id : "");
  const [pantsId, setPantsId] = useState(presetItem?.category === "Pants" ? presetItem.id : "");
  const [shoesId, setShoesId] = useState(presetItem?.category === "Shoes" ? presetItem.id : "");
  const [name, setName] = useState("");
  const byCat = (cat) => Object.values(state.clothingItems).filter(i => i.category === cat);
  const canSave = shirtId && pantsId && shoesId;
  const save = () => {
    const id = uid("look");
    const look = { id, shirtId, pantsId, shoesId, name: name.trim() || "Untitled Look", status: "active", createdAt: Date.now(), updatedAt: Date.now() };
    setState(s => ({ ...s, looks: { ...s.looks, [id]: look } }));
    onDone && onDone();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="dd-input" placeholder="Look name (optional)" value={name} onChange={e => setName(e.target.value)} />
      {[["Shirt", shirtId, setShirtId], ["Pants", pantsId, setPantsId], ["Shoes", shoesId, setShoesId]].map(([label, val, setter]) => (
        <select key={label} className="dd-input" value={val} onChange={e => setter(e.target.value)}>
          <option value="">Select {label.toLowerCase()}…</option>
          {byCat(label).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      ))}
      <div className="dd-btn dd-btn-primary" style={{ opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? "auto" : "none" }} onClick={save}>Save as Approved Look</div>
    </div>
  );
}

function LooksScreen({ state, setState }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const [editingLook, setEditingLook] = useState(null);
  const [deleteLookTarget, setDeleteLookTarget] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const lookStats = useMemo(() => computeLookStats(state), [state.actualWear]);
  const inRotationIds = useMemo(() => new Set(state.rotationSlots.filter(s => s.lookId).map(s => s.lookId)), [state.rotationSlots]);

  const looks = Object.values(state.looks).filter(l => showRetired ? true : l.status !== "retired");
  const approvedCount = Object.values(state.looks).filter(l => l.status === "active").length;
  const inRotationCount = new Set(state.rotationSlots.filter(s => s.lookId).map(s => s.lookId)).size;

  const retireLook = (id) => setState(s => ({ ...s, looks: { ...s.looks, [id]: { ...s.looks[id], status: "retired" } } }));
  const restoreLook = (id) => setState(s => ({ ...s, looks: { ...s.looks, [id]: { ...s.looks[id], status: "active" } } }));
  const deleteLook = (id) => setState(s => {
    const looksNext = { ...s.looks };
    delete looksNext[id];
    const rotationSlotsNext = s.rotationSlots.map(slot => slot.lookId === id ? { ...slot, lookId: null } : slot);
    const dailyPlansNext = Object.fromEntries(Object.entries(s.dailyPlans || {}).map(([date, plan]) => [
      date, plan && plan.lookId === id ? { ...plan, lookId: null } : plan
    ]));
    return { ...s, looks: looksNext, rotationSlots: rotationSlotsNext, dailyPlans: dailyPlansNext };
  });

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }} onClick={() => setMenuOpenId(null)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="dd-heading" style={{ fontSize: 30, margin: "0 0 4px" }}>Approved Looks</h1>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{approvedCount} approved · {inRotationCount} in rotation</div>
        </div>
        <div className="dd-btn dd-btn-primary" onClick={() => setShowBuilder(true)}><Plus size={16} /> New Look</div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
        <input type="checkbox" checked={showRetired} onChange={e => setShowRetired(e.target.checked)} /> Show retired Looks
      </label>

      {looks.length === 0 && (
        <div className="dd-glass" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Create your first approved Look.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {looks.map(l => {
          const s = state.clothingItems[l.shirtId], p = state.clothingItems[l.pantsId], sh = state.clothingItems[l.shoesId];
          const needsAttention = [s, p, sh].some(x => !x || x.status === "Retired");
          const available = lookIsAvailable(l, state.clothingItems);
          const statusLabel = needsAttention ? "Needs attention" : !available ? "Unavailable" : inRotationIds.has(l.id) ? "In rotation" : "Approved";
          const statusColor = needsAttention ? "#e0a94a" : !available ? "var(--pink)" : "var(--lime)";
          return (
            <div key={l.id} className="dd-glass" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, opacity: l.status === "retired" ? 0.55 : 1, position: "relative" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 3 }}>
                  <GarmentVisual item={s} size={26} /><GarmentVisual item={p} size={26} /><GarmentVisual item={sh} size={26} />
                </div>
                <div style={{ position: "relative" }}>
                  <div className="dd-btn dd-btn-ghost" style={{ padding: 6 }} onClick={() => setMenuOpenId(menuOpenId === l.id ? null : l.id)}><MoreVertical size={14} /></div>
                  {menuOpenId === l.id && (
                    <div className="dd-glass-strong" style={{ position: "absolute", right: 0, top: "110%", zIndex: 10, padding: 6, minWidth: 110 }}>
                      {l.status !== "retired"
                        ? <div style={{ padding: "8px 10px", fontSize: 12.5, borderRadius: 8, cursor: "pointer" }} onClick={() => { retireLook(l.id); setMenuOpenId(null); }}>Retire</div>
                        : <div style={{ padding: "8px 10px", fontSize: 12.5, borderRadius: 8, cursor: "pointer" }} onClick={() => { restoreLook(l.id); setMenuOpenId(null); }}>Restore</div>}
                      <div style={{ padding: "8px 10px", fontSize: 12.5, borderRadius: 8, cursor: "pointer", color: "var(--pink)" }} onClick={() => { setDeleteLookTarget(l); setMenuOpenId(null); }}>Delete</div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  <div>{s ? shortDisplayName(s.name) : "Missing shirt"}</div>
                  <div>{p ? shortDisplayName(p.name) : "Missing pants"}</div>
                  <div>{sh ? shortDisplayName(sh.name) : "Missing shoes"}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                <div className="dd-btn dd-btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditingLook(l)}><Edit3 size={12} /> Edit</div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showBuilder} onClose={() => setShowBuilder(false)} title="New Approved Look">
        <LookBuilderInline state={state} setState={setState} onDone={() => setShowBuilder(false)} />
      </Modal>

      {deleteLookTarget && (
        <Modal open={true} onClose={() => setDeleteLookTarget(null)} title="Delete Look">
          <p style={{ fontSize: 14, marginTop: 0 }}>Delete <strong>{deleteLookTarget.name}</strong>?</p>
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>This removes the Look from Approved Looks and clears any rotation or daily-plan references to it. Your clothing items are not affected.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <div className="dd-btn dd-btn-pink" style={{ flex: 1 }} onClick={() => { deleteLook(deleteLookTarget.id); setDeleteLookTarget(null); }}>Delete</div>
            <div className="dd-btn dd-btn-ghost dd-glass" style={{ flex: 1 }} onClick={() => setDeleteLookTarget(null)}>Cancel</div>
          </div>
        </Modal>
      )}

      {editingLook && (
        <Modal open={true} onClose={() => setEditingLook(null)} title="Edit Look">
          <EditLookForm state={state} look={editingLook}
            onSave={(patch) => { setState(s => ({ ...s, looks: { ...s.looks, [editingLook.id]: { ...s.looks[editingLook.id], ...patch, updatedAt: Date.now() } } })); setEditingLook(null); }} />
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>Past wear records for this Look keep the original combination — editing only changes what's used going forward.</p>
        </Modal>
      )}
    </div>
  );
}

function EditLookForm({ state, look, onSave }) {
  const [name, setName] = useState(look.name);
  const [shirtId, setShirtId] = useState(look.shirtId);
  const [pantsId, setPantsId] = useState(look.pantsId);
  const [shoesId, setShoesId] = useState(look.shoesId);
  const byCat = (cat) => Object.values(state.clothingItems).filter(i => i.category === cat);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="dd-input" value={name} onChange={e => setName(e.target.value)} />
      {[["Shirt", shirtId, setShirtId], ["Pants", pantsId, setPantsId], ["Shoes", shoesId, setShoesId]].map(([label, val, setter]) => (
        <select key={label} className="dd-input" value={val} onChange={e => setter(e.target.value)}>
          {byCat(label).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      ))}
      <div className="dd-btn dd-btn-primary" onClick={() => onSave({ name, shirtId, pantsId, shoesId })}>Save changes</div>
    </div>
  );
}

/* ============================================================
   ROTATION SCREEN
   ============================================================ */
function startOfWeek(dateStr) {
  const d = parseDate(dateStr);
  const dow = d.getDay();
  const diff = (dow === 0 ? -6 : 1) - dow;
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
}

// Resolve a day's plan/wear for display. Past & today come straight from real
// state; future days are computed as a non-persisted preview (same technique
// Today's slider uses) so Rotation can show what's coming without inventing data.
function getDayView(state, dateStr) {
  const today = todayStr();
  if (dateStr <= today) {
    return { plan: state.dailyPlans[dateStr], wear: state.actualWear[dateStr], viewState: state, isPreview: false };
  }
  const viewState = advanceStateToDate(state, dateStr);
  return { plan: viewState.dailyPlans[dateStr], wear: null, viewState, isPreview: true };
}

function dayViewStatus(state, dateStr, view) {
  if (!view.isPreview) return dayStatus(state, dateStr);
  if (!view.plan) return null;
  return view.plan.status === "no-office" ? "no-office" : "planned";
}

const STATUS_TEXT = {
  worn: { label: "Worn", color: "var(--lime)" },
  skipped: { label: "Skipped", color: "var(--pink)" },
  "no-office": { label: "No Office", color: "var(--muted2)" },
  unrecorded: { label: "Unrecorded", color: "#e0a94a" },
  planned: { label: "Planned", color: "var(--muted)" }
};

function DayRow({ state, dateStr, isFirst, onOpen }) {
  const t = todayStr();
  const view = getDayView(state, dateStr);
  const status = dayViewStatus(state, dateStr, view);
  const look = view.plan && view.plan.lookId ? view.viewState.looks[view.plan.lookId] : null;
  const isToday = dateStr === t;
  const dow = parseDate(dateStr).getDay();
  const st = STATUS_TEXT[status];
  return (
    <div onClick={() => onOpen(dateStr)}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "12px 10px", cursor: "pointer",
        borderTop: isFirst ? "none" : "1px solid var(--border)",
        background: isToday ? "var(--panel)" : "transparent", borderRadius: isToday ? 14 : 0
      }}>
      <div style={{ width: 56, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--lime)" : "var(--muted2)", letterSpacing: 0.5 }}>{DOW_NAMES[dow]}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{shortDate(dateStr)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {view.plan && view.plan.status === "no-office" ? "No Office" : look ? look.name : "—"}
        </div>
        <div style={{ fontSize: 11.5, color: st ? st.color : "var(--muted2)" }}>
          {view.plan && view.plan.status === "no-office" ? "Carried forward" : st ? st.label : ""}
        </div>
      </div>
      <ChevronRight size={15} color="var(--muted2)" />
    </div>
  );
}

function RotationScreen({ state, setState }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const t = todayStr();
  const officeDays = state.settings.officeDays;
  const thisWeekStart = startOfWeek(t);
  const nextWeekStart = addDays(thisWeekStart, 7);
  const thisWeek = Array.from({ length: 7 }, (_, i) => addDays(thisWeekStart, i)).filter(d => officeDays.includes(parseDate(d).getDay()));
  const nextWeek = Array.from({ length: 7 }, (_, i) => addDays(nextWeekStart, i)).filter(d => officeDays.includes(parseDate(d).getDay()));

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 className="dd-heading" style={{ fontSize: 30, margin: 0 }}>Rotation</h1>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.6, marginBottom: 4 }}>THIS WEEK</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {thisWeek.map((d, i) => <DayRow key={d} state={state} dateStr={d} isFirst={i === 0} onOpen={setSelectedDay} />)}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.6, marginBottom: 4 }}>NEXT WEEK</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {nextWeek.map((d, i) => <DayRow key={d} state={state} dateStr={d} isFirst={i === 0} onOpen={setSelectedDay} />)}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted2)", margin: 0 }}>Need to reorder or manage the underlying 4-week sequence? That lives in Settings → Rotation Management.</p>

      {selectedDay && <DayDetailModal state={state} setState={setState} dateStr={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
}

function RotationManagementScreen({ state, setState }) {
  const [dragSeq, setDragSeq] = useState(null);
  const activeLooks = Object.values(state.looks).filter(l => l.status === "active");

  const setSlotLook = (seq, lookId) => {
    setState(s => {
      const rotationSlots = [...s.rotationSlots];
      rotationSlots[seq] = { ...rotationSlots[seq], lookId: lookId || null };
      return { ...s, rotationSlots };
    });
  };
  const swapSlots = (a, b) => {
    setState(s => {
      const rotationSlots = [...s.rotationSlots];
      const tmp = rotationSlots[a].lookId;
      rotationSlots[a] = { ...rotationSlots[a], lookId: rotationSlots[b].lookId };
      rotationSlots[b] = { ...rotationSlots[b], lookId: tmp };
      return { ...s, rotationSlots };
    });
  };

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 className="dd-heading" style={{ fontSize: 26, margin: "0 0 4px" }}>Rotation Management</h1>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>The full 4-week sequence. Drag a slot onto another to swap, or pick a different Look from its menu — this order is what Rotation and Today draw from.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {WEEKS.map(week => (
          <div key={week}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12.5, color: "var(--lime)", letterSpacing: 0.5 }}>WEEK {week}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {DAY_LABELS.map((day, di) => {
                const seq = (week - 1) * 5 + di;
                const slot = state.rotationSlots[seq];
                const isCurrent = seq === state.rotationCursor;
                return (
                  <div key={day}
                    className={`dd-slot ${dragSeq === seq ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => setDragSeq(seq)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragSeq !== null && dragSeq !== seq) swapSlots(dragSeq, seq); setDragSeq(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", cursor: "grab",
                      borderTop: di > 0 ? "1px solid var(--border)" : "none",
                      boxShadow: isCurrent ? "0 0 0 1px var(--lime) inset" : "none", borderRadius: isCurrent ? 10 : 0
                    }}>
                    <GripVertical size={13} color="var(--muted2)" />
                    <div style={{ width: 34, fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{day}</div>
                    <div style={{ width: 56, fontSize: 10, color: "var(--muted2)", flexShrink: 0 }}>LOOK {String(seq + 1).padStart(2, "0")}</div>
                    <select className="dd-input" style={{ flex: 1, fontSize: 12, padding: "6px 8px" }} value={slot.lookId || ""} onChange={e => setSlotLook(seq, e.target.value)}>
                      <option value="">— empty —</option>
                      {activeLooks.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    {isCurrent && <span className="dd-chip" style={{ fontSize: 9, color: "var(--lime)", borderColor: "var(--lime)" }}>next</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function shortDayHeader(dateStr) {
  const d = parseDate(dateStr);
  return `${DOW_NAMES[d.getDay()].toUpperCase()} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}`;
}

function DayDetailModal({ state, setState, dateStr, onClose }) {
  const view = getDayView(state, dateStr);
  const { plan, wear, viewState, isPreview } = view;
  const status = dayViewStatus(state, dateStr, view);
  const [editing, setEditing] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const look = plan && plan.lookId ? viewState.looks[plan.lookId] : null;
  const shirt = look ? viewState.clothingItems[look.shirtId] : null;
  const pants = look ? viewState.clothingItems[look.pantsId] : null;
  const shoes = look ? viewState.clothingItems[look.shoesId] : null;
  const isToday = dateStr === todayStr();
  const activeApprovedLooks = useMemo(() => Object.values(state.looks).filter(l => l.status === "active" && lookIsAvailable(l, state.clothingItems)), [state.looks, state.clothingItems]);

  return (
    <Modal open={true} onClose={onClose} title={shortDayHeader(dateStr)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {plan && plan.status === "no-office" ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.5 }}>NO OFFICE</div>
            <p style={{ fontSize: 14, margin: 0 }}>{look ? look.name : "The planned Look"} will carry forward to the next office day.</p>
          </>
        ) : look ? (
          <>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--lime)", letterSpacing: 0.5 }}>LOOK {String(plan.sequence + 1).padStart(2, "0")}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{look.name}</div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
              <div>{shirt ? shortDisplayName(shirt.name) : "—"}</div>
              <div>{pants ? shortDisplayName(pants.name) : "—"}</div>
              <div>{shoes ? shortDisplayName(shoes.name) : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.5 }}>STATUS</div>
              <div style={{ fontSize: 13, color: STATUS_TEXT[status]?.color || "var(--text)", fontWeight: 600 }}>{STATUS_TEXT[status]?.label || status}</div>
            </div>
            {wear && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.5 }}>ACTUAL OUTFIT</div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  {[wear.actualShirtId, wear.actualPantsId, wear.actualShoesId].map(id => state.clothingItems[id]?.name).filter(Boolean).map((n, i) => <div key={i}>{shortDisplayName(n)}</div>)}
                </div>
              </div>
            )}
            {isPreview && <p style={{ fontSize: 11.5, color: "var(--muted2)", margin: 0 }}>Preview based on the current rotation — may change if something becomes unavailable before then.</p>}
            {!isPreview && isToday && !wear && <div className="dd-btn dd-btn-ghost dd-glass" onClick={() => setChoosing(true)}>Change Look</div>}
            {!isPreview && (
              <div className="dd-btn dd-btn-ghost dd-glass" onClick={() => setEditing(true)}>{wear ? "Correct" : "Log what was worn"}</div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Nothing planned yet.</div>
        )}
        {choosing && (
          <Modal open={true} onClose={() => setChoosing(false)} title="Choose an Approved Look">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }} className="dd-scrollbar">
              {activeApprovedLooks.map(l => (
                <div key={l.id} className="dd-glass" style={{ padding: 12, cursor: "pointer" }}
                  onClick={() => { setState(s2 => chooseLookManually(s2, dateStr, l.id)); setChoosing(false); }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                </div>
              ))}
            </div>
          </Modal>
        )}
        {editing && (
          <OutfitPickerModal open={true} onClose={() => setEditing(false)} state={state}
            onSubmit={(sel) => { setState(s => recordWoreSomethingElse(s, dateStr, sel)); setEditing(false); }} />
        )}
        {!isPreview && plan && plan.status === "office" && <p style={{ fontSize: 11, color: "var(--muted2)", margin: 0 }}>Correcting a past day updates this record only — it won't recalculate other historical totals.</p>}
      </div>
    </Modal>
  );
}

function attendanceSummary(state, startDate, endDate) {
  const officeDays = new Set(state.settings.officeDays || []);
  let scheduled = 0, present = 0, absent = 0, unrecorded = 0;
  let d = startDate;
  while (d <= endDate) {
    if (officeDays.has(parseDate(d).getDay())) {
      scheduled++;
      const attendance = state.attendance?.[d];
      if (attendance?.status === "present" || state.actualWear?.[d]) present++;
      else if (attendance?.status === "absent") absent++;
      else unrecorded++;
    }
    d = addDays(d, 1);
  }
  return { scheduled, present, absent, unrecorded, percentage: scheduled ? Math.round((present / scheduled) * 100) : 0 };
}

function startOfMonth(dateStr) {
  const d = parseDate(dateStr);
  d.setDate(1);
  return fmtDate(d);
}

function startOfQuarter(dateStr) {
  const d = parseDate(dateStr);
  d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  return fmtDate(d);
}

/* ============================================================
   INSIGHTS SCREEN
   ============================================================ */
function InsightsScreen({ state }) {
  const { counts, lastWorn } = useMemo(() => computeItemStats(state), [state.actualWear]);
  const items = Object.values(state.clothingItems).filter(i => i.status !== "Retired");
  const worn = items.filter(i => counts[i.id]);
  const neverWorn = items.filter(i => !counts[i.id]);

  const mostWorn = [...worn].sort((a, b) => counts[b.id] - counts[a.id]).slice(0, 5);
  const leastWorn = [...worn].sort((a, b) => counts[a.id] - counts[b.id]).slice(0, 5);

  const today = todayStr();
  const monthAttendance = attendanceSummary(state, startOfMonth(today), today);
  const quarterAttendance = attendanceSummary(state, startOfQuarter(today), today);
  const gaps = worn.map(i => ({ item: i, days: Math.round((parseDate(today) - parseDate(lastWorn[i.id])) / 86400000) }));
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b.days, 0) / gaps.length : 0;
  const notWornRecently = gaps.filter(g => g.days > avgGap && g.days > 0).sort((a, b) => b.days - a.days).slice(0, 6);

  const monthOfficeDays = Object.keys(state.dailyPlans).filter(d => isSameMonth(d, today) && state.dailyPlans[d].status === "office").length;
  const monthWorn = Object.keys(state.actualWear).filter(d => isSameMonth(d, today)).length;
  const totalWardrobe = items.length;
  const distinctWornThisMonth = new Set();
  Object.entries(state.actualWear).forEach(([d, w]) => { if (isSameMonth(d, today)) [w.actualShirtId, w.actualPantsId, w.actualShoesId].forEach(id => id && distinctWornThisMonth.add(id)); });
  const utilization = totalWardrobe ? Math.round((distinctWornThisMonth.size / totalWardrobe) * 100) : 0;

  const catStats = CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    const usedThisMonth = catItems.filter(i => distinctWornThisMonth.has(i.id)).length;
    return { cat, total: catItems.length, used: usedThisMonth };
  });

  const heavyRotationItem = mostWorn[0];
  const barelyWornItem = neverWorn[0] || notWornRecently[0]?.item;
  const summarySentence = heavyRotationItem && barelyWornItem
    ? `Your ${heavyRotationItem.name.toLowerCase()} is getting heavy rotation, while your ${barelyWornItem.name.toLowerCase()} has barely entered the cycle.`
    : heavyRotationItem
      ? `Your ${heavyRotationItem.name.toLowerCase()} has been your most-used item recently.`
      : null;

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="dd-heading" style={{ fontSize: 30, margin: "0 0 4px" }}>Insights</h1>
        {summarySentence && <div style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 520, lineHeight: 1.5 }}>{summarySentence}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        {[["Wardrobe size", totalWardrobe], ["Office days (mo.)", monthOfficeDays], ["Outfits worn (mo.)", monthWorn], ["Utilization", `${utilization}%`]].map(([label, val]) => (
          <div key={label} className="dd-glass" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Space Grotesk'", color: "var(--lime)" }}>{val}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {[
          ["This month’s attendance", monthAttendance],
          ["This quarter’s attendance", quarterAttendance]
        ].map(([label, a]) => (
          <div key={label} className="dd-glass" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.6 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 27, fontWeight: 700, fontFamily: "'Space Grotesk'", color: "var(--lime)", marginTop: 4 }}>{a.present}/{a.scheduled} days</div>
              </div>
              <div style={{ fontSize: 27, fontWeight: 700, fontFamily: "'Space Grotesk'", color: "var(--lime)" }}>{a.percentage}%</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted2)" }}>{a.absent} absent · {a.unrecorded} unrecorded</div>
          </div>
        ))}
      </div>

      <div className="dd-glass" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Category utilization this month</div>
        {catStats.map(c => (
          <div key={c.cat} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              <span>{c.cat === "Shirt" ? "Shirts" : c.cat}</span><span>{c.used}/{c.total}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "var(--panel)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${c.total ? (c.used / c.total) * 100 : 0}%`, background: "linear-gradient(90deg, var(--lime-fill), var(--pink-fill))" }} />
            </div>
          </div>
        ))}
      </div>

      <InsightList title="Most worn" data={mostWorn} counts={counts} note={i => `worn ${counts[i.id]}× — your rotation favorite right now.`} />
      <InsightList title="Least worn" data={leastWorn} counts={counts} note={i => `only ${counts[i.id]}× — barely made it into rotation.`} />

      <div className="dd-glass" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Not worn recently</div>
        {notWornRecently.length === 0 && neverWorn.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>Everything's in healthy rotation.</div>}
        {notWornRecently.map(g => (
          <div key={g.item.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13 }}>Your <strong>{g.item.name.toLowerCase()}</strong> has had very little rotation recently — {g.days} days since last worn.</div>
          </div>
        ))}
        {neverWorn.slice(0, 5).map(i => (
          <div key={i.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13 }}>Your <strong>{i.name.toLowerCase()}</strong> hasn't been worn yet.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightList({ title, data, counts, note }) {
  if (data.length === 0) return null;
  return (
    <div className="dd-glass" style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {data.map(i => (
        <div key={i.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13 }}>Your <strong>{i.name.toLowerCase()}</strong> has been {note(i)}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   SETTINGS SCREEN
   ============================================================ */
function SettingsScreen({ state, setState }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [reimportFile, setReimportFile] = useState(null);
  const [reimportMode, setReimportMode] = useState("merge");
  const [reimportPreview, setReimportPreview] = useState(null);
  const [backupMsg, setBackupMsg] = useState(null);
  const [showRotationMgmt, setShowRotationMgmt] = useState(false);
  const fileRef = useRef();
  const backupFileRef = useRef();

  if (showRotationMgmt) {
    return (
      <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="dd-btn dd-btn-ghost" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 13 }} onClick={() => setShowRotationMgmt(false)}>
          <ChevronLeft size={15} /> Settings
        </div>
        <RotationManagementScreen state={state} setState={setState} />
      </div>
    );
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = todayStr();
    a.href = url;
    a.download = `dailydrobe-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importBackup = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.clothingItems || !parsed.looks || !parsed.rotationSlots) {
          setBackupMsg({ ok: false, text: "That file doesn't look like a DailyDrobe backup." });
          return;
        }
        setState(advanceStateToDate(parsed, todayStr()));
        setBackupMsg({ ok: true, text: "Backup restored." });
      } catch (e) {
        setBackupMsg({ ok: false, text: "Couldn't read that file — make sure it's a DailyDrobe backup JSON." });
      }
    };
    reader.readAsText(file);
  };

  const toggleOfficeDay = (dow) => {
    setState(s => {
      const has = s.settings.officeDays.includes(dow);
      const officeDays = has ? s.settings.officeDays.filter(d => d !== dow) : [...s.settings.officeDays, dow].sort();
      return { ...s, settings: { ...s.settings, officeDays } };
    });
  };

  const doReset = () => {
    setState(s => ({
      ...s,
      clothingItems: deepClone(s.originalSnapshot.clothingItems),
      looks: deepClone(s.originalSnapshot.looks),
      rotationSlots: deepClone(s.originalSnapshot.rotationSlots),
      rotationCursor: 0,
      lastProcessedDate: null,
      dailyPlans: {}
      // actualWear + settings preserved
    }));
    setConfirmReset(false);
  };

  const handleReimportFile = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet1 = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
    // find header row with 'Day'
    let headerRowIdx = rows.findIndex(r => r.some(c => String(c).trim() === "Day"));
    const rawRotation = {};
    if (headerRowIdx >= 0) {
      const header = rows[headerRowIdx];
      const weekCols = [];
      header.forEach((cell, idx) => {
        const m = String(cell || "").match(/week\s*(\d+)/i);
        if (m) weekCols.push({ week: Number(m[1]), col: idx });
      });
      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const dayCell = rows[r]?.find(c => DAY_LABELS.includes(String(c).slice(0, 3)));
        const dayIdx = rows[r]?.findIndex(c => DAY_LABELS.some(d => String(c).startsWith(d)));
        if (dayIdx == null || dayIdx < 0) continue;
        const dayRaw = String(rows[r][dayIdx]);
        const day = DAY_LABELS.find(d => dayRaw.startsWith(d));
        if (!day) continue;
        weekCols.forEach(({ week, col }) => {
          const combo = parseCellCombo(rows[r][col]);
          if (combo) { rawRotation[week] = rawRotation[week] || {}; rawRotation[week][day] = combo; }
        });
      }
    }
    const rawClothing = { Shirt: [], Pants: [], Shoes: [] };
    if (wb.SheetNames[1]) {
      const sheet2 = wb.Sheets[wb.SheetNames[1]];
      const rows2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
      const header2 = rows2[0] || [];
      const colMap = {};
      header2.forEach((c, i) => {
        const s = String(c || "").toLowerCase();
        if (s.startsWith("shirt")) colMap.Shirt = i;
        else if (s.startsWith("pant")) colMap.Pants = i;
        else if (s.startsWith("shoe")) colMap.Shoes = i;
      });
      for (let r = 1; r < rows2.length; r++) {
        CATEGORIES.forEach(cat => {
          const v = colMap[cat] != null ? rows2[r][colMap[cat]] : null;
          if (v) rawClothing[cat].push(String(v).trim());
        });
      }
    }
    setReimportPreview(buildSeedFromRotation(rawRotation, rawClothing));
  };

  const applyReimport = () => {
    if (!reimportPreview) return;
    setState(s => {
      if (reimportMode === "replace") {
        return {
          ...s,
          clothingItems: reimportPreview.clothingItems,
          looks: reimportPreview.looks,
          rotationSlots: reimportPreview.rotationSlots,
          rotationCursor: 0, lastProcessedDate: null, dailyPlans: {},
          originalSnapshot: deepClone(reimportPreview)
        };
      }
      // merge: keep existing items/looks, add new ones, keep existing rotation unless slot empty
      const clothingItems = { ...s.clothingItems, ...Object.fromEntries(Object.entries(reimportPreview.clothingItems).filter(([id]) => !s.clothingItems[id])) };
      const looks = { ...s.looks, ...reimportPreview.looks };
      const rotationSlots = s.rotationSlots.map((slot, i) => slot.lookId ? slot : reimportPreview.rotationSlots[i]);
      return { ...s, clothingItems, looks, rotationSlots };
    });
    setReimportPreview(null); setReimportFile(null);
  };

  return (
    <div className="dd-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 className="dd-heading" style={{ fontSize: 30, margin: 0 }}>Settings</h1>

      <div className="dd-glass" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Theme</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="dd-btn dd-glass" style={{ flex: 1, background: state.settings.theme === "dark" ? "var(--panel-strong)" : undefined, color: state.settings.theme === "dark" ? "var(--lime)" : "var(--text)" }}
            onClick={() => setState(s => ({ ...s, settings: { ...s.settings, theme: "dark" } }))}><Moon size={15} /> Dark</div>
          <div className="dd-btn dd-glass" style={{ flex: 1, background: state.settings.theme === "light" ? "var(--panel-strong)" : undefined, color: state.settings.theme === "light" ? "var(--lime)" : "var(--text)" }}
            onClick={() => setState(s => ({ ...s, settings: { ...s.settings, theme: "light" } }))}><Sun size={15} /> Light</div>
        </div>
      </div>

      <div className="dd-glass" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Sound effects</div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Subtle tones for entering the app, confirming a Look, and switching outfits. Off by default.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <div className="dd-btn dd-glass" style={{ padding: "8px 14px", fontSize: 12, background: !state.settings.soundEnabled ? "var(--panel-strong)" : undefined, color: !state.settings.soundEnabled ? "var(--lime)" : "var(--text)" }}
              onClick={() => setState(s => ({ ...s, settings: { ...s.settings, soundEnabled: false } }))}>Off</div>
            <div className="dd-btn dd-glass" style={{ padding: "8px 14px", fontSize: 12, background: state.settings.soundEnabled ? "var(--panel-strong)" : undefined, color: state.settings.soundEnabled ? "var(--lime)" : "var(--text)" }}
              onClick={() => setState(s => ({ ...s, settings: { ...s.settings, soundEnabled: true } }))}>On</div>
          </div>
        </div>
      </div>

      <div className="dd-glass" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Office days</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DOW_NAMES.map((n, i) => (
            <div key={n} className="dd-chip" style={{ cursor: "pointer", padding: "8px 14px", background: state.settings.officeDays.includes(i) ? "var(--panel-strong)" : "transparent", color: state.settings.officeDays.includes(i) ? "var(--lime)" : "var(--muted)", borderColor: state.settings.officeDays.includes(i) ? "var(--lime)" : "var(--border)" }}
              onClick={() => toggleOfficeDay(i)}>{n}</div>
          ))}
        </div>
      </div>

      <div className="dd-glass" style={{ padding: 18, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setShowRotationMgmt(true)}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Rotation Management</div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>View and edit the full 4-week sequence, drag to reorder, replace or retire Looks.</p>
        </div>
        <ChevronRight size={18} color="var(--muted2)" />
      </div>

      <div className="dd-glass" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Re-import Excel</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>Upload an updated rotation workbook. You'll choose Merge or Replace before anything is applied.</p>
        <div className="dd-btn dd-btn-ghost dd-glass" onClick={() => fileRef.current?.click()}><Upload size={15} /> Choose file…</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleReimportFile(e.target.files[0])} />
      </div>

      <div className="dd-glass" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Backup</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>Your data lives only in this browser and isn't synced between devices. Export a backup file now and then, and keep it somewhere safe.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="dd-btn dd-btn-ghost dd-glass" onClick={exportBackup}><Download size={15} /> Export backup</div>
          <div className="dd-btn dd-btn-ghost dd-glass" onClick={() => backupFileRef.current?.click()}><FileUp size={15} /> Import backup</div>
        </div>
        <input ref={backupFileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={e => e.target.files?.[0] && importBackup(e.target.files[0])} />
        {backupMsg && <p style={{ fontSize: 12, marginTop: 8, color: backupMsg.ok ? "var(--lime)" : "var(--pink)" }}>{backupMsg.text}</p>}
      </div>

      <div className="dd-glass" style={{ padding: 18, borderColor: "var(--pink)" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Reset</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>Restores your wardrobe and rotation to the originally imported state. Wear history is preserved.</p>
        {!confirmReset
          ? <div className="dd-btn dd-btn-pink" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setConfirmReset(true)}><RotateCcw size={13} /> Reset to imported state</div>
          : (
            <div style={{ display: "flex", gap: 8 }}>
              <div className="dd-btn dd-btn-pink" style={{ padding: "8px 14px", fontSize: 13 }} onClick={doReset}>Yes, reset</div>
              <div className="dd-btn dd-btn-ghost dd-glass" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setConfirmReset(false)}>Cancel</div>
            </div>
          )}
      </div>

      <Modal open={!!reimportPreview} onClose={() => setReimportPreview(null)} title="Confirm re-import">
        {reimportPreview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Found {Object.keys(reimportPreview.clothingItems).length} items and {Object.values(reimportPreview.looks).length} Looks.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="dd-btn dd-glass" style={{ flex: 1, background: reimportMode === "merge" ? "var(--panel-strong)" : undefined }} onClick={() => setReimportMode("merge")}>Merge</div>
              <div className="dd-btn dd-glass" style={{ flex: 1, background: reimportMode === "replace" ? "var(--panel-strong)" : undefined }} onClick={() => setReimportMode("replace")}>Replace</div>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)" }}>{reimportMode === "merge" ? "Keeps your current wardrobe, Looks and rotation, adding anything new. Wear history is untouched." : "Replaces wardrobe, Looks and rotation with the new file. Wear history is preserved."}</p>
            <div className="dd-btn dd-btn-primary" onClick={applyReimport}>Apply re-import</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
function LandingScreen({ onEnter, exiting, state }) {
  const sampleLook = useMemo(() => Object.values(state.looks).find(l => l.status === "active" && lookIsAvailable(l, state.clothingItems)), [state.looks, state.clothingItems]);
  const s = sampleLook ? state.clothingItems[sampleLook.shirtId] : null;
  const p = sampleLook ? state.clothingItems[sampleLook.pantsId] : null;
  const sh = sampleLook ? state.clothingItems[sampleLook.shoesId] : null;

  return (
    <div className={`dd-landing${exiting ? " exiting" : ""}`}>
      <div className="dd-landing-logo" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 38 }}>
        DAILY<span style={{ color: "var(--lime)" }}>DROBE</span>
      </div>
      <div className="dd-landing-line" style={{ width: 64 }} />
      {sampleLook && (
        <div className="dd-landing-visual" style={{ display: "flex", gap: 12 }}>
          <GarmentVisual item={s} size={56} /><GarmentVisual item={p} size={56} /><GarmentVisual item={sh} size={56} />
        </div>
      )}
      <div className="dd-landing-copy">
        <div style={{ fontSize: 11.5, letterSpacing: 1.5, color: "var(--muted)", fontWeight: 700, marginBottom: 16 }}>YOUR STYLE. SMARTER. EVERYDAY.</div>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
          Your wardrobe. Your rotation.<br />Your everyday system.
        </p>
      </div>
      <div className="dd-landing-cta" style={{ marginTop: 8 }}>
        <div className="dd-btn dd-btn-primary" style={{ padding: "15px 32px", fontSize: 15 }} onClick={onEnter}>Enter DailyDrobe</div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "today", label: "Today", icon: Home },
  { id: "wardrobe", label: "Wardrobe", icon: ShirtIcon },
  { id: "looks", label: "Looks", icon: LayoutGrid },
  { id: "rotation", label: "Rotation", icon: Shuffle },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon }
];

export default function App() {
  const [state, setStateRaw] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [missingDay, setMissingDay] = useState(null);
  const [missingDismissed, setMissingDismissed] = useState(false);
  const [missingElseDate, setMissingElseDate] = useState(null);
  const [entered, setEntered] = useState(false);
  const [entering, setEntering] = useState(false);
  const saveTimer = useRef(null);

  const setState = useCallback((updater) => {
    setStateRaw(prev => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  // load
  useEffect(() => {
    (async () => {
      let loadedState = null;
      try {
        const res = await storage.get("state");
        if (res && res.value) loadedState = JSON.parse(res.value);
      } catch (e) { /* no saved state yet */ }
      if (!loadedState) loadedState = buildInitialState();
      // migrate older saved states
      loadedState.attendance = loadedState.attendance || {};
      loadedState.settings = { soundEnabled: false, ...loadedState.settings };
      loadedState = advanceStateToDate(loadedState, todayStr());
      setStateRaw(loadedState);
      setLoaded(true);
    })();
  }, []);

  // advance to today whenever the date might have rolled over
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => {
      setStateRaw(s => s ? advanceStateToDate(s, todayStr()) : s);
    }, 60000);
    return () => clearInterval(id);
  }, [loaded]);

  // persist
  useEffect(() => {
    if (!loaded || !state) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      storage.set("state", JSON.stringify(state)).catch(() => {});
    }, 400);
  }, [state, loaded]);

  // detect missing prior office day
  useEffect(() => {
    if (!loaded || !state || missingDismissed) return;
    const t = todayStr();
    let d = addDays(t, -1);
    let found = null;
    for (let i = 0; i < 14; i++) {
      const plan = state.dailyPlans[d];
      if (plan && plan.status === "office" && !state.actualWear[d]) { found = d; break; }
      if (plan && plan.status === "office" && state.actualWear[d]) break; // most recent office day already resolved
      d = addDays(d, -1);
    }
    setMissingDay(found);
  }, [loaded, state, missingDismissed]);

  if (!loaded || !state) {
    return (
      <div className="dd-root" data-theme="dark" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <style>{GLOBAL_STYLE}</style>
        <div style={{ color: "var(--muted)", fontFamily: "'Inter'" }}>Loading DailyDrobe…</div>
      </div>
    );
  }

  const handleResolveMissing = (dateStr, action) => {
    setMissingDismissed(true);
    if (action === "wore-this") {
      setState(s => recordWoreThis(s, dateStr));
    } else {
      setMissingElseDate(dateStr);
    }
  };

  const handleEnter = () => {
    playSfx("enter", state.settings.soundEnabled);
    setEntering(true);
    setTimeout(() => setEntered(true), 300);
  };

  if (!entered) {
    return (
      <div className="dd-root" data-theme={state.settings.theme}>
        <style>{GLOBAL_STYLE}</style>
        <LandingScreen onEnter={handleEnter} exiting={entering} state={state} />
      </div>
    );
  }

  const screens = {
    today: <TodayScreen state={state} setState={setState} missingDay={!missingDismissed ? missingDay : null}
      onResolveMissing={handleResolveMissing} dismissMissing={() => setMissingDismissed(true)} />,
    wardrobe: <WardrobeScreen state={state} setState={setState} />,
    looks: <LooksScreen state={state} setState={setState} />,
    rotation: <RotationScreen state={state} setState={setState} />,
    insights: <InsightsScreen state={state} />,
    settings: <SettingsScreen state={state} setState={setState} />
  };

  return (
    <div className="dd-root" data-theme={state.settings.theme}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ display: "flex", minHeight: "100%" }}>
        <div className="dd-scrollbar" style={{ width: 230, flexShrink: 0, padding: 20, display: "none", flexDirection: "column" }} id="dd-sidebar">
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, marginBottom: 2 }}>DAILY<span style={{ color: "var(--lime)" }}>DROBE</span></div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 24, letterSpacing: 0.3 }}>Your Style. Smarter. Everyday.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map(n => (
              <div key={n.id} className={`dd-nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
                <n.icon size={17} /> {n.label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "var(--muted2)", fontWeight: 700 }}>WARDROBE</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{Object.values(state.clothingItems).filter(i => i.status !== "Retired").length} items</div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "var(--muted2)", fontWeight: 700 }}>LOOKS</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{Object.values(state.looks).filter(l => l.status === "active").length} approved</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: "28px 32px 100px", maxWidth: 1280, margin: "0 auto", width: "100%" }} className="dd-scrollbar">
          {screens[tab]}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-around", padding: "8px 4px calc(8px + env(safe-area-inset-bottom))", background: "var(--bg2)", borderTop: "1px solid var(--border)", backdropFilter: "blur(20px)", zIndex: 50 }} id="dd-bottomnav">
        {NAV_ITEMS.map(n => (
          <div key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 6px", color: tab === n.id ? "var(--lime)" : "var(--muted)", cursor: "pointer" }}>
            <n.icon size={19} />
            <span style={{ fontSize: 9, fontWeight: 600 }}>{n.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 860px) {
          #dd-sidebar { display: flex !important; flex-direction: column; border-right: 1px solid var(--border); }
          #dd-bottomnav { display: none !important; }
        }
      `}</style>

      <OutfitPickerModal open={!!missingElseDate} state={state}
        onClose={() => setMissingElseDate(null)}
        onSubmit={(sel) => { setState(s => recordWoreSomethingElse(s, missingElseDate, sel)); setMissingElseDate(null); }} />
    </div>
  );
}
