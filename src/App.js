import { useState, useEffect, useRef, useCallback } from "react";

// ─── RANKS ────────────────────────────────────────────────────────────────────
const RANKS = [
  { name: "Initiate",    min: 0,    max: 25,   icon: "○" },
  { name: "Apprentice",  min: 25,   max: 125,  icon: "◈" },
  { name: "Journeyman",  min: 125,  max: 325,  icon: "◆" },
  { name: "Adept",       min: 325,  max: 725,  icon: "✦" },
  { name: "Expert",      min: 725,  max: 1325, icon: "❋" },
  { name: "Master",      min: 1325, max: 2125, icon: "⬟" },
  { name: "Grandmaster", min: 2125, max: 3125, icon: "✵" },
  { name: "Legend",      min: 3125, max: 4625, icon: "⟐" },
  { name: "Challenger",  min: 4625, max: 9999, icon: "⚔" },
];

// ─── GYM BODY PART RANKS ──────────────────────────────────────────────────────
// Thresholds = cumulative workouts per body part
// 15 → 35 → 60 → 90 → 125 → 165 → 210 → 260 (each tier adds 5 more than last, then +10,+15,+20)
const GYM_RANKS = [
  { name: "Initiate",    min: 0,   icon: "○" },
  { name: "Apprentice",  min: 10,  icon: "◈" },
  { name: "Journeyman",  min: 30,  icon: "◆" },
  { name: "Adept",       min: 55,  icon: "✦" },
  { name: "Expert",      min: 85,  icon: "❋" },
  { name: "Master",      min: 120, icon: "⬟" },
  { name: "Grandmaster", min: 160, icon: "✵" },
  { name: "Legend",      min: 205, icon: "⟐" },
  { name: "Challenger",  min: 255, icon: "⚔" },
];
const GYM_PARTS = ["Legs", "Arms", "Shoulders", "Back", "Chest", "Abs"];
const getGymRank    = (n) => { for (let i = GYM_RANKS.length-1; i>=0; i--) if (n >= GYM_RANKS[i].min) return {...GYM_RANKS[i], index: i}; return {...GYM_RANKS[0], index: 0}; };
const getGymRankPct = (n) => { const r = getGymRank(n); const nx = GYM_RANKS[r.index+1]; if (!nx) return 100; return ((n - r.min) / (nx.min - r.min)) * 100; };

const getRank    = (h) => { for (let i = RANKS.length - 1; i >= 0; i--) if (h >= RANKS[i].min) return { ...RANKS[i], index: i }; return { ...RANKS[0], index: 0 }; };
const getRankPct = (h) => { const r = getRank(h); const n = RANKS[r.index + 1]; if (!n) return 100; return ((h - r.min) / (n.min - r.min)) * 100; };

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EXPENSE_CATS = ["🍔 Food & Drink","🛒 Groceries","🏠 Housing","🚗 Transport","💊 Health","🎮 Entertainment","📚 Education","💼 Business","✈️ Travel","👗 Clothing","💡 Utilities","🌀 Other"];
const TASK_CATS    = ["Health","Work","Learning","Personal","Finance","Social","Creative"];
const GOAL_CATS    = ["Career","Health & Fitness","Finance","Education","Relationships","Personal Growth","Travel","Creative"];
const INCOME_CATS  = ["💼 Salary","🧾 Freelance","📈 Investment","🎁 Gift","🛍️ Sale","💡 Side Project","🌀 Other"];

const todayStr  = () => new Date().toISOString().split("T")[0];
const monthStr  = () => new Date().toISOString().slice(0, 7);
const weekStart = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(new Date().setDate(diff)).toISOString().split("T")[0]; };
const fmtMoney  = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate   = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime   = (t) => { if (!t) return ""; const [h, m] = t.split(":"); const hr = +h; return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`; };
const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLOR  = { high: "#c0392b", medium: "#d4720a", low: "#2e7d52" };
const PRIORITY_BG     = { high: "#fdecea", medium: "#fef3e2", low: "#e8f5ee" };
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 1;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return da - db;
  });
}

// ─── DEFAULT STATE ────────────────────────────────────────────────────────────
const DEFAULTS = {
  expenses: [],
  income: [],
  tasks: { daily: [], weekly: [], monthly: [] },
  goals: [],
  effortLogs: [],
  totalHours: 0,
  dailyRoutines: [
    { id: "gym",   label: "🏋️ Gym",   targetHours: 1.5 },
    { id: "study", label: "📚 Study", targetHours: 5 },
    { id: "work",  label: "💼 Work",  targetHours: 3 },
    { id: "meals", label: "🍽️ Meals", targetHours: 1 },
  ],
  dailyLogs: {},   // { "2026-03-10": { gym: 1.5, study: 4.0, ... } }
  gymWorkouts: {}, // { "Legs": 12, "Arms": 5, ... } — cumulative workout count per body part
  mealLogs: {},    // { "2026-03-10": { breakfast: true, lunch: true, dinner: false, snacks: 2, shakes: 1 } }
  committedDays: [], // date strings where routine hours have been committed to rank
};

// ─── PERSISTENCE LAYER ────────────────────────────────────────────────────────
// Uses Electron's file system bridge when available, falls back to localStorage
// for browser-based development.

const isElectron = typeof window !== 'undefined' && window.electronAPI;

function safeMerge(saved) {
  if (!saved || typeof saved !== 'object') return { ...DEFAULTS };
  return {
    ...DEFAULTS,
    expenses:      Array.isArray(saved.expenses)      ? saved.expenses      : [],
    income:        Array.isArray(saved.income)         ? saved.income        : [],
    goals:         Array.isArray(saved.goals)          ? saved.goals         : [],
    effortLogs:    Array.isArray(saved.effortLogs)     ? saved.effortLogs    : [],
    committedDays: Array.isArray(saved.committedDays)  ? saved.committedDays : [],
    totalHours:    typeof saved.totalHours === 'number' ? saved.totalHours   : 0,
    dailyRoutines: Array.isArray(saved.dailyRoutines)  ? saved.dailyRoutines : DEFAULTS.dailyRoutines,
    dailyLogs:     (saved.dailyLogs  && typeof saved.dailyLogs  === 'object') ? saved.dailyLogs  : {},
    gymWorkouts:   (saved.gymWorkouts && typeof saved.gymWorkouts === 'object') ? saved.gymWorkouts : {},
    mealLogs:      (saved.mealLogs   && typeof saved.mealLogs   === 'object') ? saved.mealLogs   : {},
    tasks: {
      daily:   Array.isArray(saved.tasks?.daily)   ? saved.tasks.daily   : [],
      weekly:  Array.isArray(saved.tasks?.weekly)  ? saved.tasks.weekly  : [],
      monthly: Array.isArray(saved.tasks?.monthly) ? saved.tasks.monthly : [],
    },
  };
}

async function loadFromDisk() {
  try {
    if (isElectron) {
      const saved = await window.electronAPI.readData();
      return safeMerge(saved);
    } else {
      const raw = localStorage.getItem('lt_data');
      const saved = raw ? JSON.parse(raw) : null;
      return safeMerge(saved);
    }
  } catch (e) {
    console.error('loadFromDisk error:', e);
    return { ...DEFAULTS };
  }
}

async function saveToDisk(data) {
  if (isElectron) {
    await window.electronAPI.writeData(data);
  } else {
    localStorage.setItem('lt_data', JSON.stringify(data));
  }
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]     = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab]       = useState("dashboard");
  const [modal, setModal]   = useState(null);
  const [rankUp, setRankUp] = useState(null);
  const [toast, setToast]   = useState(null);
  const [dataPath, setDataPath] = useState('');
  const prevRank = useRef(getRank(DEFAULTS.totalHours).name);
  const saveTimer = useRef(null);

  // Load from disk on startup
  useEffect(() => {
    loadFromDisk()
      .then(d => { setData(d); prevRank.current = getRank(d.totalHours).name; setLoaded(true); })
      .catch(() => { setData({ ...DEFAULTS }); setLoaded(true); });
    if (isElectron) {
      window.electronAPI.getDataPath().then(p => setDataPath(p)).catch(() => {});
    }
  }, []);

  // Save to disk whenever data changes (debounced 500ms to batch rapid updates)
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToDisk(data), 500);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);

  // Rank-up detection
  useEffect(() => {
    if (!loaded) return;
    const nr = getRank(data.totalHours).name;
    if (nr !== prevRank.current) {
      setRankUp(nr);
      prevRank.current = nr;
      setTimeout(() => setRankUp(null), 4000);
    }
  }, [data.totalHours, loaded]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const upd = useCallback((fn) => setData(d => ({ ...fn(d) })), []);

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
  const addExpense  = (e)       => { upd(d => ({ ...d, expenses: [{ id: Date.now(), ...e, date: todayStr() }, ...d.expenses] })); showToast("Expense saved ✓"); };
  const delExpense  = (id)      => upd(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  const addIncome   = (e)       => { upd(d => ({ ...d, income: [{ id: Date.now(), ...e, date: todayStr() }, ...d.income] })); showToast("Income saved ✓"); };
  const delIncome   = (id)      => upd(d => ({ ...d, income: d.income.filter(i => i.id !== id) }));
  const addTask     = (p, t)    => { upd(d => ({ ...d, tasks: { ...d.tasks, [p]: [...d.tasks[p], { id: Date.now(), ...t, done: false, created: todayStr() }] } })); showToast("Task saved ✓"); };
  const toggleTask  = (p, id)   => upd(d => ({ ...d, tasks: { ...d.tasks, [p]: d.tasks[p].map(t => t.id === id ? { ...t, done: !t.done } : t) } }));
  const delTask     = (p, id)   => upd(d => ({ ...d, tasks: { ...d.tasks, [p]: d.tasks[p].filter(t => t.id !== id) } }));
  const addGoal     = (g)       => { upd(d => ({ ...d, goals: [...d.goals, { id: Date.now(), ...g, progress: 0, done: false, created: todayStr() }] })); showToast("Goal saved ✓"); };
  const setGoalPct  = (id, v)   => upd(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, progress: Math.min(100, Math.max(0, v)), done: v >= 100 } : g) }));
  const delGoal     = (id)      => upd(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }));
  const logEffort   = (h, note) => { upd(d => ({ ...d, totalHours: +(d.totalHours + h).toFixed(2), effortLogs: [{ id: Date.now(), hours: h, note, date: todayStr() }, ...d.effortLogs] })); showToast(`+${h}h saved ✓`); };

  const logGymWorkout = (part) => {
    upd(d => {
      const prev = d.gymWorkouts[part] || 0;
      return { ...d, gymWorkouts: { ...d.gymWorkouts, [part]: prev + 1 } };
    });
    showToast(`${part} workout logged ✓`);
  };

  const logMeal = (type) => {
    upd(d => {
      const today = todayStr();
      const log = d.mealLogs[today] || {};
      let updated;
      if (type === "snack")  updated = { ...log, snacks: (log.snacks || 0) + 1 };
      else if (type === "shake") updated = { ...log, shakes: (log.shakes || 0) + 1 };
      else updated = { ...log, [type]: true };
      return { ...d, mealLogs: { ...d.mealLogs, [today]: updated } };
    });
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} logged ✓`);
  };

  const commitDay = () => {
    const today = todayStr();
    upd(d => {
      const alreadyDone = Array.isArray(d.committedDays) && d.committedDays.includes(today);
      if (alreadyDone) return d;
      const dayLog = d.dailyLogs[today] || {};
      const hoursToAdd = d.dailyRoutines
        .filter(r => r.id !== 'meals')
        .reduce((sum, r) => sum + (dayLog[r.id] || 0), 0);
      if (hoursToAdd === 0) return { ...d, committedDays: [...(d.committedDays || []), today] };
      return {
        ...d,
        totalHours: +(d.totalHours + hoursToAdd).toFixed(2),
        effortLogs: [{ id: Date.now(), hours: +hoursToAdd.toFixed(2), note: "Daily routines", date: today }, ...d.effortLogs],
        committedDays: [...(d.committedDays || []), today],
      };
    });
    showToast("Day committed to rank ✓");
  };

  const logRoutineHours = (routineId, hours) => {
    upd(d => {
      const today = todayStr();
      const dayLog = d.dailyLogs[today] || {};
      const next = Math.max(0, +((dayLog[routineId] || 0) + hours).toFixed(2));
      return { ...d, dailyLogs: { ...d.dailyLogs, [today]: { ...dayLog, [routineId]: next } } };
    });
    showToast(`+${hours}h saved ✓`);
  };
  const resetRoutineHours = (routineId) => {
    upd(d => {
      const today = todayStr();
      const dayLog = { ...(d.dailyLogs[today] || {}) };
      delete dayLog[routineId];
      return { ...d, dailyLogs: { ...d.dailyLogs, [today]: dayLog } };
    });
  };
  const addRoutine = (r)  => { upd(d => ({ ...d, dailyRoutines: [...d.dailyRoutines, { id: Date.now().toString(), ...r }] })); showToast("Routine saved ✓"); };
  const delRoutine = (id) => upd(d => ({ ...d, dailyRoutines: d.dailyRoutines.filter(r => r.id !== id) }));

  // ─── DERIVED VALUES ────────────────────────────────────────────────────────
  const todayLog     = data.dailyLogs[todayStr()] || {};
  const todayCommitted = Array.isArray(data.committedDays) && data.committedDays.includes(todayStr());
  const todayMealLog = data.mealLogs[todayStr()] || {};
  const mealCount    = (todayMealLog.breakfast ? 1 : 0) + (todayMealLog.lunch ? 1 : 0) +
                       (todayMealLog.dinner ? 1 : 0) + (todayMealLog.snacks || 0) + (todayMealLog.shakes || 0);
  const totalTargetHours = data.dailyRoutines.filter(r => r.id !== 'meals').reduce((a, r) => a + r.targetHours, 0);
  const totalLoggedHours = data.dailyRoutines.filter(r => r.id !== 'meals').reduce((a, r) => a + (todayLog[r.id] || 0), 0);
  const overallDayPct    = totalTargetHours > 0 ? Math.min(100, (totalLoggedHours / totalTargetHours) * 100) : 0;

  const rank    = getRank(data.totalHours);
  const rankPct = getRankPct(data.totalHours);
  const nextR   = RANKS[rank.index + 1];

  const todaySpend  = data.expenses.filter(e => e.date === todayStr()).reduce((a, e) => a + +e.amount, 0);
  const weekSpend   = data.expenses.filter(e => e.date >= weekStart()).reduce((a, e) => a + +e.amount, 0);
  const monthSpend  = data.expenses.filter(e => e.date.startsWith(monthStr())).reduce((a, e) => a + +e.amount, 0);
  const totalIncome = data.income.reduce((a, i) => a + +i.amount, 0);
  const monthIncome = data.income.filter(i => i.date.startsWith(monthStr())).reduce((a, i) => a + +i.amount, 0);
  const netBalance  = totalIncome - data.expenses.reduce((a, e) => a + +e.amount, 0);
  const allTasks    = Object.values(data.tasks).flat();
  const doneTasks   = allTasks.filter(t => t.done).length;

  const NAV = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "spending",  icon: "◎", label: "Spending" },
    { id: "income",    icon: "◈", label: "Income" },
    { id: "tasks",     icon: "☰", label: "Tasks" },
    { id: "goals",     icon: "◉", label: "Goals" },
    { id: "rank",      icon: "✦", label: "Progress" },
  ];

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f0e8", fontFamily: "'Playfair Display', serif", color: "#1a1a1a", fontSize: 16 }}>
        Loading your data…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f0e8", color: "#1a1a1a", fontFamily: "'Playfair Display', Georgia, serif", overflow: "hidden", WebkitAppRegion: "no-drag" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #c8bfaa; border-radius: 3px; }
        input, select, textarea { font-family: 'Source Serif 4', serif; background: #e8e2d8; border: 1px solid #c8bfaa; color: #1a1a1a; padding: 9px 14px; border-radius: 8px; width: 100%; font-size: 14px; outline: none; transition: border-color 0.2s; }
        input:focus, select:focus, textarea:focus { border-color: #5a4a2a; box-shadow: 0 0 0 2px rgba(90,74,42,0.1); }
        select option { background: #e8e2d8; color: #1a1a1a; }
        button { cursor: pointer; font-family: 'Playfair Display', serif; transition: all 0.15s; }
        button:active { transform: scale(0.97); }
        .hover-row:hover { background: #e4ddd0; border-radius: 6px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rankPop { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.6); } 60% { transform: translate(-50%,-50%) scale(1.05); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .anim { animation: fadeIn 0.3s ease forwards; }
        .progress-bar { transition: width 0.9s cubic-bezier(0.4,0,0.2,1); }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; cursor: pointer; transition: all 0.15s; color: #1a1a1a; font-size: 13px; letter-spacing: 0.5px; border: 1px solid transparent; background: none; width: 100%; text-align: left; }
        .nav-item:hover { background: #e4ddd0; }
        .nav-item.active { background: #e0d8c8; border-color: #c0b090; font-weight: 700; }
        .nav-icon { font-size: 15px; width: 20px; text-align: center; }
        .card { background: #ede8de; border: 1px solid #d8d0be; border-radius: 14px; padding: 20px; }
        .stat-card { background: #ede8de; border: 1px solid #d8d0be; border-radius: 12px; padding: 18px 20px; }
        .label { font-size: 10px; letter-spacing: 2px; color: #1a1a1a; text-transform: uppercase; margin-bottom: 6px; font-family: 'Playfair Display', serif; }
        .section-title { font-size: 11px; letter-spacing: 2.5px; color: #1a1a1a; text-transform: uppercase; margin-bottom: 16px; font-family: 'Playfair Display', serif; }
        .btn-primary { background: #1a1a1a; color: #f5f0e8; border: none; padding: 10px 22px; border-radius: 9px; font-size: 12px; letter-spacing: 1px; font-weight: 700; }
        .btn-primary:hover { background: #333; }
        .btn-ghost { background: #e4ddd0; color: #1a1a1a; border: 1px solid #c8bfaa; padding: 8px 16px; border-radius: 8px; font-size: 12px; letter-spacing: 0.5px; }
        .btn-ghost:hover { background: #d8d0be; border-color: #8a7a5a; }
        .btn-danger { background: transparent; color: #1a1a1a; border: none; font-size: 13px; padding: 4px 8px; border-radius: 6px; opacity: 0.3; }
        .btn-danger:hover { opacity: 1; background: #e4d8d0; }
        .btn-sm-log { background: #e4ddd0; color: #1a1a1a; border: 1px solid #c8bfaa; border-radius: 6px; font-size: 11px; padding: 4px 9px; font-family: 'Playfair Display', serif; }
        .btn-sm-log:hover { background: #d8d0be; }
        .check { width: 18px; height: 18px; border: 1.5px solid #b0a090; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 11px; transition: all 0.15s; color: #1a1a1a; }
        .check.done { background: #1a1a1a; border-color: #1a1a1a; color: #f5f0e8; }
        .tag { display: inline-block; padding: 2px 9px; background: #e0d8c8; border-radius: 20px; font-size: 10px; color: #1a1a1a; letter-spacing: 0.5px; font-family: 'Source Serif 4', serif; border: 1px solid #c8bfaa; }
        .row-divider { border-bottom: 1px solid #d8d0be; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: "#ede8de", borderRight: "1px solid #d0c8b8", display: "flex", flexDirection: "column", padding: "28px 14px", flexShrink: 0, WebkitAppRegion: "drag" }}>
        {/* Spacer for macOS traffic light buttons — also serves as drag region */}
        <div style={{ height: 28, WebkitAppRegion: "drag", marginBottom: 8 }} />

        <div style={{ padding: "0 4px 24px", WebkitAppRegion: "no-drag" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#1a1a1a", marginBottom: 3 }}>LIFETRACKER</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a1a" }}>Chronicles</div>
        </div>

        {/* Rank badge */}
        <div style={{ background: "#e4ddd0", border: "1px solid #c8bfaa", borderRadius: 12, padding: 14, marginBottom: 24, WebkitAppRegion: "no-drag" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{rank.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{rank.name}</div>
              <div style={{ fontSize: 10, color: "#1a1a1a", fontFamily: "'Source Serif 4'", opacity: 0.7 }}>{data.totalHours.toFixed(1)}h total</div>
            </div>
          </div>
          <div style={{ background: "#c8bfaa", borderRadius: 4, height: 5, overflow: "hidden" }}>
            <div className="progress-bar" style={{ height: "100%", width: `${rankPct}%`, background: "#1a1a1a", borderRadius: 4 }} />
          </div>
          {nextR && <div style={{ fontSize: 9, color: "#1a1a1a", marginTop: 5, opacity: 0.6 }}>{(nextR.min - data.totalHours).toFixed(1)}h → {nextR.name}</div>}
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, WebkitAppRegion: "no-drag" }}>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid #c8bfaa", paddingTop: 16, marginTop: 16, WebkitAppRegion: "no-drag" }}>
          <button className="btn-primary" style={{ width: "100%", padding: 11, fontSize: 11, letterSpacing: 1.5 }} onClick={() => setModal({ type: "effort" })}>
            ⚡ LOG EFFORT
          </button>
          {dataPath && (
            <div style={{ fontSize: 9, color: "#1a1a1a", opacity: 0.4, marginTop: 10, wordBreak: "break-all", lineHeight: 1.4, fontFamily: "'Source Serif 4'" }}>
              💾 {dataPath}
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", background: "#f5f0e8", position: "relative" }}>
        {/* Invisible drag bar across the full top — drag the window from anywhere up here */}
        <div style={{ position: "fixed", top: 0, left: 220, right: 0, height: 28, WebkitAppRegion: "drag", zIndex: 999 }} />

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="anim">
            <PageHeader title="Dashboard" sub={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Today's Spend", value: fmtMoney(todaySpend) },
                { label: "Month Spend",   value: fmtMoney(monthSpend) },
                { label: "Month Income",  value: fmtMoney(monthIncome) },
                { label: "Tasks Done",    value: `${doneTasks} / ${allTasks.length}` },
                { label: "Hours Logged",  value: `${data.totalHours.toFixed(1)}h` },
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ animation: `fadeIn 0.3s ease ${i * 0.06}s both` }}>
                  <div className="label">{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Net balance bar */}
            <div className="card" style={{ marginBottom: 20, display: "flex", gap: 36, alignItems: "center", flexWrap: "wrap" }}>
              <div><div className="label">Total Earned</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmtMoney(totalIncome)}</div></div>
              <div style={{ color: "#a0907a", fontSize: 20 }}>−</div>
              <div><div className="label">Total Spent</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmtMoney(data.expenses.reduce((a, e) => a + +e.amount, 0))}</div></div>
              <div style={{ color: "#a0907a", fontSize: 20 }}>=</div>
              <div><div className="label">Net Balance</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmtMoney(netBalance)}</div></div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setModal({ type: "income" })}>+ Log Income</button>
                <button className="btn-ghost" onClick={() => setModal({ type: "expense" })}>+ Log Expense</button>
              </div>
            </div>

            {/* Daily Time Goals */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="section-title" style={{ margin: 0 }}>Today's Time Goals</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 12, color: "#1a1a1a", fontFamily: "'Source Serif 4'" }}>
                    {totalLoggedHours.toFixed(1)}h / {totalTargetHours.toFixed(1)}h · Meals {mealCount}/3
                  </div>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setModal({ type: "routine" })}>+ Add Routine</button>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ background: "#d0c8b8", borderRadius: 6, height: 10, overflow: "hidden", marginBottom: 5 }}>
                  <div className="progress-bar" style={{ height: "100%", width: `${overallDayPct}%`, background: "#1a1a1a", borderRadius: 6 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: "#1a1a1a", fontFamily: "'Source Serif 4'", opacity: 0.6 }}>
                    Overall — {overallDayPct.toFixed(0)}% complete · resets at midnight
                  </div>
                  {todayCommitted
                    ? <div style={{ fontSize: 11, color: "#4a7a4a", fontFamily: "'Source Serif 4'", fontWeight: 600 }}>✓ Day committed to rank</div>
                    : <button className="btn-primary" style={{ fontSize: 11, padding: "6px 16px", letterSpacing: 0.8 }} onClick={commitDay}>⚑ End of Day — Commit to Rank</button>
                  }
                </div>
              </div>
              {data.dailyRoutines.length === 0 ? (
                <Empty msg="No daily routines set. Add one to start tracking!" />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {data.dailyRoutines.map(r => {
                    const isMeals = r.id === "meals";
                    const isGym   = r.id === "gym";

                    if (isMeals) {
                      const mealDone = mealCount >= 3;
                      const mealPct  = Math.min(100, (mealCount / 3) * 100);
                      return (
                        <div key={r.id} style={{ background: "#e8e2d8", borderRadius: 10, padding: "14px 16px", border: `1px solid ${mealDone ? "#b0c0b0" : "#d0c8b8"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{r.label}</div>
                              <div style={{ fontSize: 11, color: "#1a1a1a", fontFamily: "'Source Serif 4'", marginTop: 1, opacity: 0.7 }}>
                                {mealCount} / 3 meals {mealDone && "✓"}
                              </div>
                            </div>
                            <button className="btn-danger" onClick={() => delRoutine(r.id)}>✕</button>
                          </div>
                          <div style={{ background: "#d0c8b8", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 10 }}>
                            <div className="progress-bar" style={{ height: "100%", width: `${mealPct}%`, background: mealDone ? "#4a7a4a" : "#1a1a1a", borderRadius: 6 }} />
                          </div>
                          <MealLogger mealLog={todayMealLog} onLog={logMeal} />
                        </div>
                      );
                    }

                    const logged = todayLog[r.id] || 0;
                    const pct    = Math.min(100, r.targetHours > 0 ? (logged / r.targetHours) * 100 : 0);
                    const done   = pct >= 100;
                    return (
                      <div key={r.id} style={{ background: "#e8e2d8", borderRadius: 10, padding: "14px 16px", border: `1px solid ${done ? "#b0c0b0" : "#d0c8b8"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: "#1a1a1a", fontFamily: "'Source Serif 4'", marginTop: 1, opacity: 0.7 }}>
                              {logged.toFixed(2)}h / {r.targetHours}h {done && "✓"}
                            </div>
                          </div>
                          <button className="btn-danger" onClick={() => delRoutine(r.id)}>✕</button>
                        </div>
                        <div style={{ background: "#d0c8b8", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 10 }}>
                          <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: done ? "#4a7a4a" : "#1a1a1a", borderRadius: 6 }} />
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[0.25, 0.5, 1].map(h => (
                            <button key={h} className="btn-sm-log" onClick={() => logRoutineHours(r.id, h)}>+{h}h</button>
                          ))}
                          {logged > 0 && (
                            <button className="btn-sm-log" style={{ opacity: 0.5 }} onClick={() => resetRoutineHours(r.id)}>Reset</button>
                          )}
                        </div>
                        {isGym && (
                          <GymWorkoutLogger gymWorkouts={data.gymWorkouts} onLog={logGymWorkout} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="section-title" style={{ margin: 0 }}>Priority Tasks</div>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setTab("tasks")}>View all</button>
                </div>
                {(() => {
                  const pending = sortTasks([
                    ...data.tasks.weekly.map(t => ({ ...t, _period: "weekly" })),
                    ...data.tasks.monthly.map(t => ({ ...t, _period: "monthly" })),
                  ].filter(t => !t.done));
                  const daily = data.tasks.daily.filter(t => !t.done).map(t => ({ ...t, _period: "daily" }));
                  const all = [...pending, ...daily].slice(0, 7);
                  if (all.length === 0) return <Empty msg="No pending tasks" />;
                  return all.map(t => {
                    const daysLeft = t.deadline ? Math.ceil((new Date(t.deadline + "T23:59:59") - new Date()) / 86400000) : null;
                    const overdue  = daysLeft !== null && daysLeft < 0;
                    return (
                      <div key={t.id} className="row-divider" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0" }}>
                        <div className={`check ${t.done ? "done" : ""}`} style={{ marginTop: 2, flexShrink: 0 }} onClick={() => toggleTask(t._period, t.id)}>{t.done && "✓"}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'", lineHeight: 1.4 }}>{t.title}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                            {t.priority && PRIORITY_COLOR[t.priority] && (
                              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "1px 6px", borderRadius: 20,
                                background: PRIORITY_BG[t.priority], color: PRIORITY_COLOR[t.priority], border: `1px solid ${PRIORITY_COLOR[t.priority]}` }}>
                                {t.priority.toUpperCase()}
                              </span>
                            )}
                            <span className="tag" style={{ fontSize: 9 }}>{t._period}</span>
                            {t.deadline && (
                              <span style={{ fontSize: 10, fontFamily: "'Source Serif 4'",
                                color: overdue ? "#c0392b" : daysLeft <= 2 ? "#d4720a" : "#888", fontWeight: overdue ? 700 : 400 }}>
                                {overdue ? "⚠ Overdue" : `⏱ ${daysLeft}d left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="section-title" style={{ margin: 0 }}>Active Goals</div>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setTab("goals")}>View all</button>
                </div>
                {data.goals.length === 0 ? <Empty msg="No goals set yet" /> :
                  data.goals.slice(0, 5).map(g => (
                    <div key={g.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'", color: "#1a1a1a", opacity: g.done ? 0.5 : 1 }}>{g.title}</div>
                        <div style={{ fontSize: 12 }}>{g.progress}%</div>
                      </div>
                      <div style={{ background: "#c8bfaa", borderRadius: 4, height: 5, overflow: "hidden" }}>
                        <div className="progress-bar" style={{ height: "100%", width: `${g.progress}%`, background: "#1a1a1a", borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div className="card">
                <div className="section-title">Recent Expenses</div>
                {data.expenses.length === 0 ? <Empty msg="No expenses logged" /> :
                  data.expenses.slice(0, 5).map(e => (
                    <div key={e.id} className="row-divider" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                      <div>
                        <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'" }}>{e.desc || e.category}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{e.category} · {fmtDate(e.date)}</div>
                      </div>
                      <div style={{ fontSize: 14 }}>−{fmtMoney(e.amount)}</div>
                    </div>
                  ))}
              </div>
              <div className="card">
                <div className="section-title">Recent Income</div>
                {data.income.length === 0 ? <Empty msg="No income logged yet" /> :
                  data.income.slice(0, 5).map(i => (
                    <div key={i.id} className="row-divider" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                      <div>
                        <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'" }}>{i.desc || i.category}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{i.category} · {fmtDate(i.date)}</div>
                      </div>
                      <div style={{ fontSize: 14 }}>+{fmtMoney(i.amount)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* SPENDING */}
        {tab === "spending" && (
          <div className="anim">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <PageHeader title="Spending Tracker" sub="Track every dollar you spend" />
              <button className="btn-primary" onClick={() => setModal({ type: "expense" })}>+ Add Expense</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
              {[{ l: "Today", v: todaySpend }, { l: "This Week", v: weekSpend }, { l: "This Month", v: monthSpend }].map((s, i) => (
                <div key={i} className="stat-card" style={{ textAlign: "center" }}>
                  <div className="label">{s.l}</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{fmtMoney(s.v)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {EXPENSE_CATS.map(cat => {
                const items = data.expenses.filter(e => e.category === cat);
                if (!items.length) return null;
                const total = items.reduce((a, e) => a + +e.amount, 0);
                return (
                  <div key={cat} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{cat}</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtMoney(total)}</div>
                    </div>
                    {items.map(e => (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #d0c8b8" }}>
                        <div>
                          <span style={{ fontSize: 13, fontFamily: "'Source Serif 4'" }}>{e.desc || "—"}</span>
                          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{fmtDate(e.date)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13 }}>{fmtMoney(e.amount)}</span>
                          <button className="btn-danger" onClick={() => delExpense(e.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {data.expenses.length === 0 && <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: 60 }}><Empty msg="No expenses yet." /></div>}
            </div>
          </div>
        )}

        {/* INCOME */}
        {tab === "income" && (
          <div className="anim">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <PageHeader title="Income Tracker" sub="Every dollar earned, recorded" />
              <button className="btn-primary" onClick={() => setModal({ type: "income" })}>+ Log Income</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
              {[{ l: "Total Earned", v: totalIncome }, { l: "This Month", v: monthIncome }, { l: "Net Balance", v: netBalance }].map((s, i) => (
                <div key={i} className="stat-card" style={{ textAlign: "center" }}>
                  <div className="label">{s.l}</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{fmtMoney(s.v)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {INCOME_CATS.map(cat => {
                const items = data.income.filter(i => i.category === cat);
                if (!items.length) return null;
                const total = items.reduce((a, i) => a + +i.amount, 0);
                return (
                  <div key={cat} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{cat}</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtMoney(total)}</div>
                    </div>
                    {items.map(i => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #d0c8b8" }}>
                        <div>
                          <span style={{ fontSize: 13, fontFamily: "'Source Serif 4'" }}>{i.desc || "—"}</span>
                          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{fmtDate(i.date)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13 }}>+{fmtMoney(i.amount)}</span>
                          <button className="btn-danger" onClick={() => delIncome(i.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {data.income.length === 0 && <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: 60 }}><Empty msg="No income logged yet." /></div>}
            </div>
          </div>
        )}

        {/* TASKS */}
        {tab === "tasks" && (
          <div className="anim">
            <PageHeader title="Task Manager" sub="Sorted by priority and deadline" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              {["daily", "weekly", "monthly"].map(period => {
                const isScheduled = period !== "daily";
                const pt     = data.tasks[period];
                const sorted = isScheduled ? sortTasks(pt) : pt;
                const done   = pt.filter(t => t.done).length;
                return (
                  <div key={period} className="card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {period === "daily" ? "📅 Daily" : period === "weekly" ? "📆 Weekly" : "🗓 Monthly"}
                      </div>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setModal({ type: "task", period })}>+ Add</button>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "'Source Serif 4'", marginBottom: 10, opacity: 0.6 }}>{done}/{pt.length} complete</div>
                    <div style={{ background: "#c8bfaa", borderRadius: 4, height: 4, overflow: "hidden", marginBottom: 14 }}>
                      <div className="progress-bar" style={{ height: "100%", width: `${pt.length ? (done / pt.length) * 100 : 0}%`, background: "#1a1a1a", borderRadius: 4 }} />
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", maxHeight: 560 }}>
                      {sorted.length === 0 ? <Empty msg={`No ${period} tasks yet`} /> :
                        sorted.map(t => {
                          const daysLeft = t.deadline ? Math.ceil((new Date(t.deadline + "T23:59:59") - new Date()) / 86400000) : null;
                          const overdue  = daysLeft !== null && daysLeft < 0 && !t.done;
                          const urgent   = !overdue && daysLeft !== null && daysLeft <= 2 && !t.done;
                          return (
                            <div key={t.id} className="hover-row" style={{ padding: "9px 6px", borderBottom: "1px solid #d8d0be", opacity: t.done ? 0.5 : 1 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <div className={`check ${t.done ? "done" : ""}`} style={{ marginTop: 2, flexShrink: 0 }} onClick={() => toggleTask(period, t.id)}>{t.done && "✓"}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                                    {isScheduled && t.priority && (
                                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                                        background: PRIORITY_BG[t.priority], color: PRIORITY_COLOR[t.priority], border: `1px solid ${PRIORITY_COLOR[t.priority]}` }}>
                                        {t.priority.toUpperCase()}
                                      </span>
                                    )}
                                    <span style={{ fontSize: 13, fontFamily: "'Source Serif 4'", textDecoration: t.done ? "line-through" : "none", lineHeight: 1.4 }}>{t.title}</span>
                                  </div>
                                  {isScheduled && (t.startBy || t.deadline) && (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                                      {t.startBy && <span style={{ fontSize: 10, opacity: 0.55, fontFamily: "'Source Serif 4'" }}>▶ Start {fmtDate(t.startBy)}</span>}
                                      {t.deadline && (
                                        <span style={{ fontSize: 10, fontFamily: "'Source Serif 4'", fontWeight: overdue ? 700 : 400,
                                          color: overdue ? "#c0392b" : urgent ? "#d4720a" : "#888" }}>
                                          {overdue ? "⚠ Overdue" : `⏱ Due ${fmtDate(t.deadline)}${t.finishByTime ? " by " + fmtTime(t.finishByTime) : ""} (${daysLeft}d)`}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <span className="tag">{t.category}</span>
                                    {t.notes && <span style={{ fontSize: 10, opacity: 0.45, fontFamily: "'Source Serif 4'", fontStyle: "italic" }}>{t.notes}</span>}
                                  </div>
                                </div>
                                <button className="btn-danger" style={{ flexShrink: 0 }} onClick={() => delTask(period, t.id)}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GOALS */}
        {tab === "goals" && (
          <div className="anim">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <PageHeader title="Long-Term Goals" sub="The horizon you are moving toward" />
              <button className="btn-primary" onClick={() => setModal({ type: "goal" })}>+ New Goal</button>
            </div>
            {data.goals.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "80px 40px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>◉</div>
                <div style={{ fontSize: 17, fontStyle: "italic", fontFamily: "'Source Serif 4'", opacity: 0.6 }}>Your goals await definition.<br />What do you wish to become?</div>
                <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => setModal({ type: "goal" })}>Set First Goal</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {data.goals.map(g => (
                  <div key={g.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ flex: 1, paddingRight: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{g.title}</div>
                        {g.desc && <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'", fontStyle: "italic", lineHeight: 1.5, opacity: 0.7 }}>{g.desc}</div>}
                      </div>
                      <button className="btn-danger" onClick={() => delGoal(g.id)}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <span className="tag">{g.category || "General"}</span>
                      {g.deadline && <span className="tag">📅 {g.deadline}</span>}
                      {g.done && <span style={{ padding: "2px 9px", background: "#d8e8d8", borderRadius: 20, fontSize: 10, border: "1px solid #b0c8b0" }}>✓ Complete</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1, background: "#c8bfaa", borderRadius: 6, height: 8, overflow: "hidden" }}>
                        <div className="progress-bar" style={{ height: "100%", width: `${g.progress}%`, background: "#1a1a1a", borderRadius: 6 }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 38, textAlign: "right" }}>{g.progress}%</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[0, 10, 25, 50, 75, 100].map(v => (
                        <button key={v} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11, fontWeight: g.progress === v ? 700 : 400, borderColor: g.progress === v ? "#5a4a2a" : "#c8bfaa" }}
                          onClick={() => setGoalPct(g.id, v)}>{v}%</button>
                      ))}
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => { const v = prompt("Enter progress (0–100):", g.progress); if (v !== null && !isNaN(+v)) setGoalPct(g.id, +v); }}>Custom</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RANK */}
        {tab === "rank" && (
          <div className="anim">
            <PageHeader title="Progress & Rank" sub="Every hour of effort is recorded in the chronicles" />
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
              <div>
                <div className="card" style={{ textAlign: "center", padding: "36px 24px", marginBottom: 16 }}>
                  <div style={{ fontSize: 52, marginBottom: 8 }}>{rank.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }}>{rank.name.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'", fontStyle: "italic", opacity: 0.6, marginBottom: 20 }}>{data.totalHours.toFixed(2)} hours of recorded effort</div>
                  <div style={{ background: "#c8bfaa", borderRadius: 8, height: 12, overflow: "hidden", marginBottom: 8 }}>
                    <div className="progress-bar" style={{ height: "100%", width: `${rankPct}%`, background: "#1a1a1a", borderRadius: 8 }} />
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {nextR ? `${(nextR.min - data.totalHours).toFixed(1)} hours until ${nextR.name}` : "Maximum rank achieved"}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">Effort History</div>
                  {data.effortLogs.length === 0 ? <Empty msg="No effort logged yet" /> :
                    data.effortLogs.slice(0, 10).map(l => (
                      <div key={l.id} className="row-divider" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                        <div>
                          <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'" }}>{l.note || "Work session"}</div>
                          <div style={{ fontSize: 11, opacity: 0.5 }}>{fmtDate(l.date)}</div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>+{l.hours}h</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="card">
                <div className="section-title">Rank Progression</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {RANKS.map(r => {
                    const unlocked = data.totalHours >= r.min;
                    const current  = r.name === rank.name;
                    return (
                      <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", borderRadius: 10, background: current ? "#e4ddd0" : "transparent", border: current ? "1px solid #c0b090" : "1px solid transparent", opacity: unlocked ? 1 : 0.4 }}>
                        <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{r.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: current ? 700 : 400 }}>{r.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "'Source Serif 4'" }}>{r.min}h – {r.max === 9999 ? "∞" : r.max + "h"}</div>
                        </div>
                        {current  && <span style={{ fontSize: 10, padding: "3px 10px", background: "#d8d0be", borderRadius: 20, letterSpacing: 1 }}>CURRENT</span>}
                        {unlocked && !current && <span style={{ fontSize: 14 }}>✓</span>}
                        {!unlocked && <span style={{ fontSize: 12, opacity: 0.5 }}>{(r.min - data.totalHours).toFixed(0)}h away</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GYM BODY PART RANKS */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 2.5, color: "#1a1a1a", textTransform: "uppercase", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>Gym — Body Part Progression</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {GYM_PARTS.map(part => {
                  const count   = data.gymWorkouts[part] || 0;
                  const gr      = getGymRank(count);
                  const grPct   = getGymRankPct(count);
                  const nextGR  = GYM_RANKS[gr.index + 1];
                  return (
                    <div key={part} className="card" style={{ padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{part}</div>
                          <div style={{ fontSize: 11, opacity: 0.55, fontFamily: "'Source Serif 4'" }}>{count} workouts logged</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20 }}>{gr.icon}</div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{gr.name}</div>
                        </div>
                      </div>
                      <div style={{ background: "#c8bfaa", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 6 }}>
                        <div className="progress-bar" style={{ height: "100%", width: `${grPct}%`, background: "#1a1a1a", borderRadius: 6 }} />
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.5, fontFamily: "'Source Serif 4'" }}>
                        {nextGR ? `${nextGR.min - count} more to ${nextGR.name}` : "Max rank — Challenger!"}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                        {GYM_RANKS.map((r, i) => {
                          const unlocked = count >= r.min;
                          const isCur    = r.name === gr.name;
                          return (
                            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 6, background: isCur ? "#e0d8c8" : "transparent", opacity: unlocked ? 1 : 0.35 }}>
                              <span style={{ fontSize: 12, width: 18, textAlign: "center" }}>{r.icon}</span>
                              <span style={{ fontSize: 11, flex: 1, fontWeight: isCur ? 700 : 400 }}>{r.name}</span>
                              <span style={{ fontSize: 10, opacity: 0.5, fontFamily: "'Source Serif 4'" }}>{r.min}+</span>
                              {isCur && <span style={{ fontSize: 9, background: "#d8d0be", padding: "1px 6px", borderRadius: 10, letterSpacing: 0.5 }}>NOW</span>}
                              {unlocked && !isCur && <span style={{ fontSize: 11 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#f0ebe0", border: "1px solid #c8bfaa", borderRadius: 18, padding: "32px 36px", width: 460, maxWidth: "90vw", animation: "fadeIn 0.25s ease" }}>
            {modal.type === "expense" && <ExpenseModal onSave={e => { addExpense(e); setModal(null); }} onClose={() => setModal(null)} />}
            {modal.type === "income"  && <IncomeModal  onSave={i => { addIncome(i);  setModal(null); }} onClose={() => setModal(null)} />}
            {modal.type === "task"    && <TaskModal period={modal.period} onSave={t => { addTask(modal.period, t); setModal(null); }} onClose={() => setModal(null)} />}
            {modal.type === "goal"    && <GoalModal onSave={g => { addGoal(g); setModal(null); }} onClose={() => setModal(null)} />}
            {modal.type === "effort"  && <EffortModal onSave={(h, n) => { logEffort(h, n); setModal(null); }} onClose={() => setModal(null)} />}
            {modal.type === "routine" && <RoutineModal onSave={r => { addRoutine(r); setModal(null); }} onClose={() => setModal(null)} />}
          </div>
        </div>
      )}

      {rankUp && (
        <div style={{ position: "fixed", top: "50%", left: "50%", zIndex: 300, background: "#f0ebe0", border: "2px solid #1a1a1a", borderRadius: 24, padding: "40px 60px", textAlign: "center", boxShadow: "0 8px 60px rgba(0,0,0,0.15)", animation: "rankPop 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, marginBottom: 12, opacity: 0.6 }}>RANK ACHIEVED</div>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{getRank(data.totalHours).icon}</div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 3 }}>{rankUp.toUpperCase()}</div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 32, right: 32, background: "#e8e0d0", border: "1px solid #c0b090", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontFamily: "'Source Serif 4'", animation: "toastIn 0.25s ease", zIndex: 400, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", marginBottom: 4 }}>{title}</h1>
      <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'", fontStyle: "italic", opacity: 0.6 }}>{sub}</div>
    </div>
  );
}

function Empty({ msg }) {
  return <div style={{ fontSize: 13, fontFamily: "'Source Serif 4'", fontStyle: "italic", padding: "12px 0", opacity: 0.45 }}>{msg}</div>;
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div style={{ fontSize: 11, letterSpacing: 2.5, fontFamily: "'Playfair Display'", fontWeight: 700 }}>{title}</div>
      <button style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", opacity: 0.5 }} onClick={onClose}>✕</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, marginBottom: 6, fontFamily: "'Playfair Display'", opacity: 0.6 }}>{label}</div>
      {children}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function ExpenseModal({ onSave, onClose }) {
  const [f, setF] = useState({ amount: "", category: EXPENSE_CATS[0], desc: "" });
  return (
    <>
      <ModalHeader title="ADD EXPENSE" onClose={onClose} />
      <Field label="Amount ($)"><input type="number" placeholder="0.00" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} autoFocus /></Field>
      <Field label="Category"><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Description"><input placeholder="e.g. Lunch, Netflix..." value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></Field>
      <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => f.amount && onSave(f)}>Save Expense</button>
    </>
  );
}

function IncomeModal({ onSave, onClose }) {
  const [f, setF] = useState({ amount: "", category: INCOME_CATS[0], desc: "" });
  return (
    <>
      <ModalHeader title="LOG INCOME" onClose={onClose} />
      <Field label="Amount ($)"><input type="number" placeholder="0.00" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} autoFocus /></Field>
      <Field label="Category"><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{INCOME_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Description"><input placeholder="e.g. Paycheck, Client payment..." value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></Field>
      <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => f.amount && onSave(f)}>Save Income</button>
    </>
  );
}

function TaskModal({ period, onSave, onClose }) {
  const isScheduled = period !== "daily";
  const [f, setF] = useState({ title: "", category: TASK_CATS[0], notes: "", priority: "medium", startBy: "", deadline: "", finishByTime: "" });
  return (
    <>
      <ModalHeader title={`ADD ${period.toUpperCase()} TASK`} onClose={onClose} />
      <Field label="Task"><input placeholder="What needs to be done?" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} autoFocus /></Field>
      <Field label="Category"><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{TASK_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      {isScheduled && (
        <>
          <Field label="Priority">
            <div style={{ display: "flex", gap: 8 }}>
              {["high","medium","low"].map(p => (
                <button key={p} type="button" onClick={() => setF({ ...f, priority: p })}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8,
                    border: `2px solid ${f.priority === p ? PRIORITY_COLOR[p] : "#c8bfaa"}`,
                    background: f.priority === p ? PRIORITY_COLOR[p] : "#e8e2d8",
                    color: f.priority === p ? "#fff" : "#1a1a1a",
                    fontFamily: "'Playfair Display'", fontSize: 12, fontWeight: 700,
                    letterSpacing: 1, cursor: "pointer", transition: "all 0.15s" }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Start By"><input type="date" value={f.startBy} onChange={e => setF({ ...f, startBy: e.target.value })} /></Field>
            <Field label="Deadline"><input type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></Field>
          </div>
          <Field label="Finish By Time (optional)"><input type="time" value={f.finishByTime} onChange={e => setF({ ...f, finishByTime: e.target.value })} /></Field>
        </>
      )}
      <Field label="Notes (optional)"><input placeholder="Additional context..." value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
      <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => f.title && onSave(f)}>Add Task</button>
    </>
  );
}

function GoalModal({ onSave, onClose }) {
  const [f, setF] = useState({ title: "", desc: "", category: GOAL_CATS[0], deadline: "" });
  return (
    <>
      <ModalHeader title="CREATE GOAL" onClose={onClose} />
      <Field label="Goal Title"><input placeholder="e.g. Run a marathon, Write a novel..." value={f.title} onChange={e => setF({ ...f, title: e.target.value })} autoFocus /></Field>
      <Field label="Category"><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{GOAL_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Description"><textarea placeholder="Describe what achieving this looks like..." value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} style={{ resize: "none", height: 80 }} /></Field>
      <Field label="Target Date (optional)"><input type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></Field>
      <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => f.title && onSave(f)}>Create Goal</button>
    </>
  );
}

function EffortModal({ onSave, onClose }) {
  const [h, setH] = useState("");
  const [note, setNote] = useState("");
  return (
    <>
      <ModalHeader title="LOG EFFORT" onClose={onClose} />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, marginBottom: 10, fontFamily: "'Playfair Display'", opacity: 0.6 }}>QUICK SELECT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {[0.5, 1, 1.5, 2, 3, 4].map(p => (
            <button key={p} className="btn-ghost" style={{ padding: "10px 4px", fontSize: 13, textAlign: "center", fontWeight: h == p ? 700 : 400, borderColor: h == p ? "#5a4a2a" : "#c8bfaa" }}
              onClick={() => setH(String(p))}>{p}h</button>
          ))}
        </div>
      </div>
      <Field label="Custom Hours"><input type="number" step="0.25" min="0.25" placeholder="e.g. 2.5" value={h} onChange={e => setH(e.target.value)} /></Field>
      <Field label="What did you work on?"><input placeholder="e.g. Deep work session, Gym, Studying..." value={note} onChange={e => setNote(e.target.value)} /></Field>
      <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => h && +h > 0 && onSave(+h, note)}>Log {h || "?"} Hours</button>
    </>
  );
}

function RoutineModal({ onSave, onClose }) {
  const [f, setF] = useState({ label: "", targetHours: "" });
  return (
    <>
      <ModalHeader title="ADD DAILY ROUTINE" onClose={onClose} />
      <Field label="Activity Name"><input placeholder="e.g. 🏋️ Gym, 📚 Study, 💼 Work..." value={f.label} onChange={e => setF({ ...f, label: e.target.value })} autoFocus /></Field>
      <Field label="Daily Target (hours)"><input type="number" step="0.25" min="0.25" placeholder="e.g. 1.5" value={f.targetHours} onChange={e => setF({ ...f, targetHours: e.target.value })} /></Field>
      <div style={{ fontSize: 12, fontFamily: "'Source Serif 4'", marginBottom: 16, opacity: 0.55, fontStyle: "italic" }}>
        Tip: Include an emoji — e.g. "🏋️ Gym", "🍽️ Meals", "📚 Study"
      </div>
      <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => f.label && f.targetHours && +f.targetHours > 0 && onSave({ label: f.label, targetHours: +f.targetHours })}>Add Routine</button>
    </>
  );
}

// ─── MEAL LOGGER ─────────────────────────────────────────────────────────────
// Shown inside the Meals routine card. Breakfast/lunch/dinner only log once per day.
// Snack and protein shake can be logged multiple times.

const MEAL_ITEMS = [
  { id: "breakfast", label: "🌅 Breakfast", multi: false },
  { id: "lunch",     label: "☀️ Lunch",     multi: false },
  { id: "dinner",    label: "🌙 Dinner",    multi: false },
  { id: "snack",     label: "🍎 Snack",     multi: true  },
  { id: "shake",     label: "🥤 Protein Shake", multi: true },
];

function MealLogger({ mealLog, onLog }) {
  return (
    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
      {MEAL_ITEMS.map(m => {
        const logged   = m.multi ? false : !!mealLog[m.id];
        const count    = m.id === "snack" ? (mealLog.snacks || 0) : m.id === "shake" ? (mealLog.shakes || 0) : 0;
        const disabled = !m.multi && logged;
        return (
          <button key={m.id}
            className="btn-sm-log"
            disabled={disabled}
            onClick={() => !disabled && onLog(m.id === "shake" ? "shake" : m.id)}
            style={{
              opacity: disabled ? 0.35 : 1,
              cursor: disabled ? "default" : "pointer",
              background: logged ? "#d8e8d8" : undefined,
              borderColor: logged ? "#b0c8b0" : undefined,
              textDecoration: disabled ? "line-through" : "none",
            }}>
            {m.label}{m.multi && count > 0 ? ` ×${count}` : ""}{logged ? " ✓" : ""}
          </button>
        );
      })}
    </div>
  );
}

// ─── GYM WORKOUT LOGGER ───────────────────────────────────────────────────────
// Shown inside the Gym routine card on the dashboard

function GymWorkoutLogger({ gymWorkouts, onLog }) {
  const [selected, setSelected] = useState("");
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #c8bfaa" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6, fontFamily: "'Playfair Display'", marginBottom: 8 }}>LOG WORKOUT</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {GYM_PARTS.map(part => {
          const count = gymWorkouts[part] || 0;
          const gr    = getGymRank(count);
          const isOn  = selected === part;
          return (
            <button key={part} onClick={() => setSelected(isOn ? "" : part)}
              style={{
                background: isOn ? "#1a1a1a" : "#e4ddd0",
                color: isOn ? "#f5f0e8" : "#1a1a1a",
                border: `1px solid ${isOn ? "#1a1a1a" : "#c8bfaa"}`,
                borderRadius: 7, fontSize: 11, padding: "5px 11px",
                fontFamily: "'Playfair Display', serif", cursor: "pointer",
                transition: "all 0.15s"
              }}>
              {part} <span style={{ opacity: 0.6, fontSize: 10 }}>{gr.icon}{count}</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <button className="btn-primary" style={{ width: "100%", padding: "9px", fontSize: 12, letterSpacing: 1 }}
          onClick={() => { onLog(selected); setSelected(""); }}>
          ✓ Log {selected} Session
        </button>
      )}
    </div>
  );
}
