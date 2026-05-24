window.storage = {
  get: async (key) => {
    const val = localStorage.getItem(key);
    return val ? { value: val } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};
import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return localDateStr(d);
}
function getWeekLabel(mondayStr) {
  const d = new Date(mondayStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const MAX_VALUE = 9999;

const SEED_GROUPS = [
  { id: "g1", name: "Hockey", icon: "🏒" },
  { id: "g2", name: "Soccer", icon: "⚽" },
  { id: "g3", name: "Fitness", icon: "💪" },
];

const SEED_ACTIVITIES = [
  { id: "a1", name: "Plank Hold", unit: "sec", type: "time", icon: "🏋️", mode: "pr", groupId: "g3" },
  { id: "a2", name: "Push-ups", unit: "reps", type: "count", icon: "💪", mode: "pr", groupId: "g3" },
  { id: "a3", name: "Wall Sit", unit: "sec", type: "time", icon: "🧱", mode: "pr", groupId: "g3" },
  { id: "a4", name: "Soccer Juggles", unit: "streak", type: "count", icon: "⚽", mode: "pr", groupId: "g2" },
  { id: "a5", name: "Puck Shots", unit: "made", type: "count", icon: "🏒", mode: "cumulative", groupId: "g1" },
  { id: "a6", name: "Sit-ups", unit: "reps", type: "count", icon: "🔄", mode: "pr", groupId: "g3" },
];

const SEED_MEMBERS = [
  { id: "m1", name: "Dad", color: "#D95525", emoji: "🦁" },
  { id: "m2", name: "Mom", color: "#2A9D8F", emoji: "⚡" },
  { id: "m3", name: "Liam", color: "#3D7ABF", emoji: "🦈" },
  { id: "m4", name: "Sofia", color: "#C2558A", emoji: "🔥" },
];

function generateSeedEntries() {
  const entries = [];
  const today = new Date();
  const mIds = ["m1", "m2", "m3", "m4"];
  const cfg = {
    a1: { base: [60, 90, 35, 45], growth: [2, 1.5, 3, 2.5], members: [0, 1, 2, 3] },
    a2: { base: [30, 25, 15, 18], growth: [1, 0.8, 1.5, 1.2], members: [0, 1, 2, 3] },
    a3: { base: [45, 60, 30, 35], growth: [1.5, 1, 2, 1.8], members: [0, 1, 2, 3] },
    a4: { base: [20, 15, 40, 35], growth: [0.5, 0.3, 2, 1.5], members: [1, 3] },
    a5: { base: [50, 0, 80, 0], growth: [5, 0, 8, 0], members: [0, 2] },
    a6: { base: [35, 30, 20, 25], growth: [1, 0.8, 1.5, 1], members: [0, 1, 2, 3] },
  };
  let id = 0;
  for (let d = 28; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const ds = localDateStr(date);
    Object.entries(cfg).forEach(([aId, c]) => {
      c.members.forEach((mi) => {
        if (Math.random() < 0.2) return;
        const val = Math.round(c.base[mi] + c.growth[mi] * (28 - d) + (Math.random() - 0.3) * c.base[mi] * 0.3);
        if (val > 0) entries.push({ id: `e${id++}`, memberId: mIds[mi], activityId: aId, value: Math.max(1, val), date: ds });
      });
    });
  }
  return entries;
}

const SEED_DATA = {
  familyName: "倪 Family Leaderboard",
  members: SEED_MEMBERS,
  groups: SEED_GROUPS,
  activities: SEED_ACTIVITIES,
  entries: generateSeedEntries(),
};

const T = {
  bg: "#FBF7F2", card: "#FFFFFF", cardBorder: "#EDE5DA",
  text1: "#3D2E1F", text2: "#8A7B6B", text3: "#A89280",
  navBg: "#F0E9E0", navActive: "#FFFFFF",
  inputBg: "#F5F0EA", inputBorder: "#DDD4C8",
  overlay: "rgba(45,32,20,0.45)", pbOverlay: "rgba(45,32,20,0.88)",
  tickerBg: "#FFF3E0", tickerBorder: "#FFDCAB",
  gold: "#BF6C00", silver: "#8A7B6B", bronze: "#A0714A",
  calOff: "#F0E9E0", badgeBg: "#F7F2EC", badgeBorder: "#EDE5DA",
  warn: "#DC2626",
};

function getCurrentWeekTotal(entries, memberId, activityId) {
  const mon = getMonday(localToday());
  return entries.filter((e) => e.memberId === memberId && e.activityId === activityId && e.date >= mon)
    .reduce((sum, e) => sum + e.value, 0);
}

function getWeeklyTotals(entries, memberId, activityId) {
  const mine = entries.filter((e) => e.memberId === memberId && e.activityId === activityId);
  const byWeek = {};
  mine.forEach((e) => { const w = getMonday(e.date); byWeek[w] = (byWeek[w] || 0) + e.value; });
  return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).map(([week, total]) => ({ week: getWeekLabel(week), total }));
}

function getBestScore(entries, memberId, activityId) {
  return entries.filter((e) => e.memberId === memberId && e.activityId === activityId).reduce((max, e) => Math.max(max, e.value), 0);
}

function getGroupStreak(entries, memberId, groupId, activities) {
  const actIds = new Set(activities.filter((a) => a.groupId === groupId).map((a) => a.id));
  const dates = [...new Set(entries.filter((e) => e.memberId === memberId && actIds.has(e.activityId)).map((e) => e.date))].sort();
  if (!dates.length) return { current: 0, best: 0, dates: new Set() };
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    if ((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000 === 1) current++; else current = 1;
    best = Math.max(best, current);
  }
  if ((new Date(localToday()) - new Date(dates[dates.length - 1])) / 86400000 > 1) current = 0;
  return { current, best, dates: new Set(dates) };
}

function getStandaloneStreak(entries, memberId, activityId) {
  const dates = [...new Set(entries.filter((e) => e.memberId === memberId && e.activityId === activityId).map((e) => e.date))].sort();
  if (!dates.length) return { current: 0, best: 0, dates: new Set() };
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    if ((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000 === 1) current++; else current = 1;
    best = Math.max(best, current);
  }
  if ((new Date(localToday()) - new Date(dates[dates.length - 1])) / 86400000 > 1) current = 0;
  return { current, best, dates: new Set(dates) };
}

function getRecentPBs(entries, members, activities) {
  const pbs = [];
  const prActs = new Set(activities.filter((a) => a.mode === "pr").map((a) => a.id));
  members.forEach((m) => {
    const byAct = {};
    entries.filter((e) => e.memberId === m.id && prActs.has(e.activityId)).forEach((e) => {
      if (!byAct[e.activityId]) byAct[e.activityId] = [];
      byAct[e.activityId].push(e);
    });
    Object.entries(byAct).forEach(([aId, acts]) => {
      let best = 0;
      [...acts].sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
        if (e.value > best) { if (best > 0) pbs.push({ member: m, activityId: aId, value: e.value, prev: best, date: e.date }); best = e.value; }
      });
    });
  });
  return pbs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
}

function getBadges(activities, entries, memberId) {
  const mine = entries.filter((e) => e.memberId === memberId);
  const totalEntries = mine.length;
  const bestByAct = {}, totalByAct = {}, actSet = new Set();
  mine.forEach((e) => {
    bestByAct[e.activityId] = Math.max(bestByAct[e.activityId] || 0, e.value);
    totalByAct[e.activityId] = (totalByAct[e.activityId] || 0) + e.value;
    actSet.add(e.activityId);
  });
  const bestAny = Math.max(0, ...Object.values(bestByAct));
  const topTotal = Math.max(0, ...Object.values(totalByAct));
  const byDate = {};
  mine.forEach((e) => { if (!byDate[e.date]) byDate[e.date] = new Set(); byDate[e.date].add(e.activityId); });
  const maxInDay = Math.max(0, ...Object.values(byDate).map((s) => s.size));
  let maxStreak = 0;
  const allDates = [...new Set(mine.map((e) => e.date))].sort();
  let streak = 1;
  for (let i = 1; i < allDates.length; i++) {
    if ((new Date(allDates[i]) - new Date(allDates[i - 1])) / 86400000 === 1) streak++; else streak = 1;
    maxStreak = Math.max(maxStreak, streak);
  }
  maxStreak = Math.max(maxStreak, streak);
  let pbCount = 0;
  const byAct = {};
  mine.forEach((e) => { if (!byAct[e.activityId]) byAct[e.activityId] = []; byAct[e.activityId].push(e); });
  Object.values(byAct).forEach((acts) => {
    let b = 0;
    [...acts].sort((a, bb) => a.date.localeCompare(bb.date)).forEach((e) => { if (e.value > b) { if (b > 0) pbCount++; b = e.value; } });
  });
  return [
    { id: "b1", name: "First Log", icon: "🌟", earned: totalEntries >= 1 },
    { id: "b2", name: "Week Warrior", icon: "⚔️", earned: maxStreak >= 7 },
    { id: "b3", name: "Iron Will", icon: "🛡️", earned: bestAny >= 120 },
    { id: "b4", name: "Century Club", icon: "💯", earned: topTotal >= 100 },
    { id: "b5", name: "Consistent", icon: "📅", earned: maxStreak >= 5 },
    { id: "b6", name: "Triple Threat", icon: "🎯", earned: maxInDay >= 3 },
    { id: "b7", name: "Record Breaker", icon: "🏆", earned: pbCount >= 3 },
    { id: "b8", name: "All-Rounder", icon: "🌈", earned: actSet.size >= activities.length && activities.length > 0 },
  ];
}

function MiniCalendar({ dates, color }) {
  const today = new Date();
  const todayStr = localToday();
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    days.push({ date: ds, active: dates.has(ds), day: d.getDate() });
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
      {days.map((d, i) => (
        <div key={i} style={{
          width: 18, height: 18, borderRadius: 4, background: d.active ? color : T.calOff,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, fontWeight: 700, color: d.active ? "#fff" : T.text3,
          border: d.date === todayStr ? `2px solid ${T.text2}` : "none",
        }}>{d.day}</div>
      ))}
    </div>
  );
}

function ProgressChartPR({ entries, member, activityId }) {
  const raw = entries.filter((e) => e.memberId === member.id && e.activityId === activityId).sort((a, b) => a.date.localeCompare(b.date));
  const byDay = {};
  raw.forEach((e) => { byDay[e.date] = Math.max(byDay[e.date] || 0, e.value); });
  const data = Object.entries(byDay).map(([date, val]) => ({ date: date.slice(5), val }));
  if (data.length < 2) return <div style={{ fontSize: 11, color: T.text3, padding: 8 }}>Not enough data</div>;
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="val" stroke={member.color} strokeWidth={2.5} dot={false} />
        <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 11 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ProgressChartCumulative({ entries, member, activityId }) {
  const data = getWeeklyTotals(entries, member.id, activityId);
  if (data.length < 1) return <div style={{ fontSize: 11, color: T.text3, padding: 8 }}>Not enough data</div>;
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data}>
        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
        <Bar dataKey="total" fill={member.color} radius={[3, 3, 0, 0]} />
        <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function FamilyLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [profileTab, setProfileTab] = useState("Overview");
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinMember, setCheckinMember] = useState(null);
  const [checkinActivity, setCheckinActivity] = useState(null);
  const [checkinValue, setCheckinValue] = useState("");
  const [checkinError, setCheckinError] = useState("");
  const [pbFlash, setPbFlash] = useState(null);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showManageActivities, setShowManageActivities] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmoji, setNewMemberEmoji] = useState("");
  const [newActName, setNewActName] = useState("");
  const [newActUnit, setNewActUnit] = useState("reps");
  const [newActIcon, setNewActIcon] = useState("");
  const [newActMode, setNewActMode] = useState("pr");
  const [newActGroup, setNewActGroup] = useState("none");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmRemoveAct, setConfirmRemoveAct] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [addError, setAddError] = useState("");
  const [historyFilterMember, setHistoryFilterMember] = useState("all");
  const [historyFilterActivity, setHistoryFilterActivity] = useState("all");
  const [editingEntry, setEditingEntry] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.storage.get("family-leaderboard-v2");
        if (stored?.value) setData(JSON.parse(stored.value));
        else { await window.storage.set("family-leaderboard-v2", JSON.stringify(SEED_DATA)); setData(SEED_DATA); }
      } catch { setData(SEED_DATA); }
      setLoading(false);
    })();
  }, []);

  const save = async (nd) => { setData(nd); try { await window.storage.set("family-leaderboard-v2", JSON.stringify(nd)); } catch {} };

  const openCheckin = () => { setCheckinMember(null); setCheckinActivity(null); setCheckinValue(""); setCheckinError(""); setShowCheckin(true); };

  const handleCheckin = async () => {
    if (!checkinMember || !checkinActivity || !checkinValue) return;
    const val = parseInt(checkinValue);
    if (isNaN(val) || val <= 0) return;
    if (val > MAX_VALUE) { setCheckinError(`Maximum value is ${MAX_VALUE.toLocaleString()}`); return; }
    const today = localToday();
    const entry = { id: `e${Date.now()}`, memberId: checkinMember, activityId: checkinActivity, value: val, date: today };
    const act = data.activities.find((a) => a.id === checkinActivity);
    const prevBest = getBestScore(data.entries, checkinMember, checkinActivity);
    const nd = { ...data, entries: [...data.entries, entry] };
    await save(nd);
    if (act?.mode === "pr" && val > prevBest) {
      const m = data.members.find((x) => x.id === checkinMember);
      setPbFlash({ member: m, activity: act, value: val, prev: prevBest, isFirst: prevBest === 0 });
      setTimeout(() => setPbFlash(null), 4000);
    }
    setShowCheckin(false); setCheckinValue(""); setCheckinError("");
  };

  const handleReset = async () => { await save({ ...SEED_DATA, entries: generateSeedEntries() }); setConfirmReset(false); setScreen("home"); setSelectedMember(null); };

  const MEMBER_COLORS = ["#D95525", "#2A9D8F", "#3D7ABF", "#C2558A", "#BF6C00", "#7B5EA7", "#2E8B85", "#C44D70"];
  const MEMBER_EMOJIS = ["🦁", "⚡", "🦈", "🔥", "🐻", "🦅", "🐺", "🌟", "🎯", "🚀"];

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    if (data.members.some((m) => m.name.toLowerCase() === newMemberName.trim().toLowerCase())) { setAddError("Name already exists"); return; }
    const usedC = new Set(data.members.map((m) => m.color));
    const color = MEMBER_COLORS.find((c) => !usedC.has(c)) || MEMBER_COLORS[data.members.length % MEMBER_COLORS.length];
    const emoji = newMemberEmoji || MEMBER_EMOJIS[data.members.length % MEMBER_EMOJIS.length];
    await save({ ...data, members: [...data.members, { id: `m${Date.now()}`, name: newMemberName.trim(), color, emoji }] });
    setNewMemberName(""); setNewMemberEmoji(""); setAddError("");
  };

  const handleRemoveMember = async (id) => { await save({ ...data, members: data.members.filter((m) => m.id !== id), entries: data.entries.filter((e) => e.memberId !== id) }); setConfirmRemove(null); };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    if (data.groups.some((g) => g.name.toLowerCase() === newGroupName.trim().toLowerCase())) { setAddError("Group already exists"); return; }
    const icon = newGroupIcon || "🏅";
    await save({ ...data, groups: [...data.groups, { id: `g${Date.now()}`, name: newGroupName.trim(), icon }] });
    setNewGroupName(""); setNewGroupIcon(""); setAddError("");
  };

  const handleRemoveGroup = async (gId) => {
    const updatedActs = data.activities.map((a) => a.groupId === gId ? { ...a, groupId: null } : a);
    await save({ ...data, groups: data.groups.filter((g) => g.id !== gId), activities: updatedActs });
  };

  const UNIT_OPTIONS = [
    { value: "reps", label: "Reps" }, { value: "sec", label: "Seconds" }, { value: "min", label: "Minutes" },
    { value: "streak", label: "Streak" }, { value: "made", label: "Made" }, { value: "laps", label: "Laps" },
  ];

  const handleAddActivity = async () => {
    if (!newActName.trim()) return;
    if (data.activities.some((a) => a.name.toLowerCase() === newActName.trim().toLowerCase())) { setAddError("Activity already exists"); return; }
    const icon = newActIcon || "💪";
    const type = ["sec", "min"].includes(newActUnit) ? "time" : "count";
    const groupId = newActGroup === "none" ? null : newActGroup;
    await save({ ...data, activities: [...data.activities, { id: `a${Date.now()}`, name: newActName.trim(), unit: newActUnit, type, icon, mode: newActMode, groupId }] });
    setNewActName(""); setNewActIcon(""); setNewActUnit("reps"); setNewActMode("pr"); setNewActGroup("none"); setAddError("");
  };

  const handleRemoveActivity = async (id) => { await save({ ...data, activities: data.activities.filter((a) => a.id !== id), entries: data.entries.filter((e) => e.activityId !== id) }); setConfirmRemoveAct(null); };

  const handleEditEntry = async () => {
    if (!editingEntry || !editValue) return;
    const val = parseInt(editValue);
    if (isNaN(val) || val <= 0 || val > MAX_VALUE) return;
    await save({ ...data, entries: data.entries.map((e) => e.id === editingEntry ? { ...e, value: val, editedAt: localToday() } : e) });
    setEditingEntry(null); setEditValue("");
  };

  const handleDeleteEntry = async (id) => { await save({ ...data, entries: data.entries.filter((e) => e.id !== id) }); setConfirmDeleteEntry(null); };

  if (loading) return <div style={{ ...S.container, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ fontSize: 48 }}>🏆</div></div>;
  if (!data) return null;

  const { members, groups, activities, entries } = data;
  const recentPBs = getRecentPBs(entries, members, activities);
  const today = localToday();

  // All group streaks sorted
  const allStreaks = [];
  members.forEach((m) => {
    groups.forEach((g) => {
      const s = getGroupStreak(entries, m.id, g.id, activities);
      if (s.current > 0) allStreaks.push({ member: m, group: g, streak: s.current });
    });
    activities.filter((a) => !a.groupId).forEach((a) => {
      const s = getStandaloneStreak(entries, m.id, a.id);
      if (s.current > 0) allStreaks.push({ member: m, group: { name: a.name, icon: a.icon }, streak: s.current });
    });
  });
  allStreaks.sort((a, b) => b.streak - a.streak);

  const openProfile = (mId) => { setSelectedMember(mId); setProfileTab("Overview"); setScreen("profile"); };

  const sel = members.find((m) => m.id === selectedMember);

  const hasTodayEntry = (mId) => entries.some((e) => e.memberId === mId && e.date === today);

  return (
    <div style={S.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes pbFlash { 0% { transform: scale(0.8); opacity: 0; } 20% { transform: scale(1.05); opacity: 1; } 80% { opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* PB CELEBRATION */}
      {pbFlash && (
        <div style={S.pbOverlay}>
          <div style={{ animation: "pbFlash 4s ease-out forwards", textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>{pbFlash.isFirst ? "🌟" : "🎉"}</div>
            <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 3, color: "rgba(255,255,255,0.7)", fontFamily: "'Barlow Condensed', sans-serif" }}>{pbFlash.isFirst ? "First entry!" : "New personal best"}</div>
            <div style={{ fontSize: 40, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: pbFlash.member.color, marginTop: 4 }}>{pbFlash.member.emoji} {pbFlash.member.name}</div>
            <div style={{ fontSize: 22, fontFamily: "'Nunito', sans-serif", fontWeight: 600, color: "#fff", marginTop: 4 }}>{pbFlash.activity.icon} {pbFlash.activity.name}</div>
            <div style={{ fontSize: 56, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: "#FFD700", marginTop: 8 }}>
              {pbFlash.value}{!pbFlash.isFirst && <span style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}> was {pbFlash.prev}</span>}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={S.header}>
        {screen === "profile" ? (
          <div onClick={() => setScreen("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#D95525", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>← Back</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <h1 style={S.title}>{data.familyName}</h1>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={openCheckin} style={S.checkinBtn}>+ Log</button>
          <button onClick={() => { setShowHistory(true); setHistoryFilterMember("all"); setHistoryFilterActivity("all"); setEditingEntry(null); setConfirmDeleteEntry(null); }} style={S.manageBtn}>📋</button>
          <button onClick={() => { setShowManageMembers(true); setAddError(""); }} style={S.manageBtn}>👥</button>
          <button onClick={() => { setShowManageActivities(true); setAddError(""); }} style={S.manageBtn}>🏅</button>
          {confirmReset ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>Erase all?</span>
              <button onClick={handleReset} style={{ ...S.resetBtn, color: T.warn, borderColor: T.warn }}>Yes</button>
              <button onClick={() => setConfirmReset(false)} style={S.resetBtn}>No</button>
            </div>
          ) : <button onClick={() => setConfirmReset(true)} style={S.resetBtn}>↻</button>}
        </div>
      </div>

      {/* === HOME SCREEN === */}
      {screen === "home" && (
        <div>
          {/* Avatar chips */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {members.map((m) => (
              <div key={m.id} onClick={() => openProfile(m.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
                border: `1px solid ${m.color}30`, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, color: m.color,
              }}>
                {m.emoji} {m.name}
                {hasTodayEntry(m.id) && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2A9D8F" }} />}
              </div>
            ))}
          </div>

          {/* Recent PBs ticker */}
          {recentPBs.length > 0 && (
            <div style={S.ticker}>
              <span style={{ color: T.gold, fontWeight: 800, marginRight: 8 }}>🔥</span>
              {recentPBs.slice(0, 3).map((pb, i) => {
                const act = activities.find((a) => a.id === pb.activityId);
                return <span key={i} style={{ marginRight: 14, color: T.text2 }}><span style={{ color: pb.member.color, fontWeight: 700 }}>{pb.member.emoji} {pb.member.name}</span> {act?.icon} {pb.value} {act?.unit} <span style={{ color: T.text3, fontSize: 11 }}>(was {pb.prev})</span></span>;
              })}
            </div>
          )}

          {/* GROUP FILTER */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            <button onClick={() => setSelectedGroup("all")} style={{
              ...S.selectBtn, fontSize: 13, padding: "6px 14px",
              background: selectedGroup === "all" ? T.navActive : T.calOff,
              border: selectedGroup === "all" ? `1px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
              color: selectedGroup === "all" ? T.text1 : T.text2,
              boxShadow: selectedGroup === "all" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}>All</button>
            {groups.map((g) => (
              <button key={g.id} onClick={() => setSelectedGroup(g.id)} style={{
                ...S.selectBtn, fontSize: 13, padding: "6px 14px",
                background: selectedGroup === g.id ? T.navActive : T.calOff,
                border: selectedGroup === g.id ? `1px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                color: selectedGroup === g.id ? T.text1 : T.text2,
                boxShadow: selectedGroup === g.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
              }}>{g.icon} {g.name}</button>
            ))}
          </div>

          {/* FILTERED LEADERBOARDS */}
          {(() => {
            const filteredActs = selectedGroup === "all" ? activities : activities.filter((a) => a.groupId === selectedGroup);
            const filteredPR = filteredActs.filter((a) => a.mode === "pr");
            const filteredCum = filteredActs.filter((a) => a.mode === "cumulative");
            const filteredStreaks = selectedGroup === "all" ? allStreaks : allStreaks.filter((s) => {
              const g = groups.find((x) => x.id === selectedGroup);
              return g && s.group.name === g.name;
            });

            return (
              <>
                {/* PR LEADERBOARDS */}
                {filteredPR.length > 0 && <div style={S.sectionLabel}>PR activities</div>}
                <div style={S.grid}>
                  {filteredPR.map((act) => {
                    const scores = members.map((m) => ({ member: m, best: getBestScore(entries, m.id, act.id) })).filter((s) => s.best > 0).sort((a, b) => b.best - a.best);
                    if (scores.length === 0) return null;
                    return (
                      <div key={act.id} style={S.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{act.icon} {act.name}</div>
                          <span style={{ fontSize: 10, color: T.text3 }}>all-time best</span>
                        </div>
                        {scores.map((s, rank) => (
                          <div key={s.member.id} style={{
                            ...S.scoreRow, background: rank === 0 ? `${s.member.color}0C` : "transparent",
                            borderLeft: rank === 0 ? `3px solid ${s.member.color}` : "3px solid transparent",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, width: 22, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: rank === 0 ? T.gold : rank === 1 ? T.silver : rank === 2 ? T.bronze : T.text3 }}>
                                {rank === 0 ? "👑" : `#${rank + 1}`}
                              </span>
                              <span onClick={() => openProfile(s.member.id)} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: s.member.color, cursor: "pointer", fontSize: 14 }}>{s.member.emoji} {s.member.name}</span>
                            </div>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: rank === 0 ? 24 : 18, color: rank === 0 ? T.text1 : T.text2 }}>{s.best} <span style={{ fontSize: 11, fontWeight: 500, color: T.text3 }}>{act.unit}</span></span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* CUMULATIVE LEADERBOARDS */}
                {filteredCum.length > 0 && <div style={{ ...S.sectionLabel, marginTop: 20 }}>Cumulative activities (this week)</div>}
                <div style={S.grid}>
                  {filteredCum.map((act) => {
                    const scores = members.map((m) => ({ member: m, total: getCurrentWeekTotal(entries, m.id, act.id) })).filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
                    if (scores.length === 0) return null;
                    return (
                      <div key={act.id} style={S.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{act.icon} {act.name}</div>
                          <span style={{ fontSize: 10, color: T.text3 }}>weekly total · resets Mon</span>
                        </div>
                        {scores.map((s, rank) => (
                          <div key={s.member.id} style={{
                            ...S.scoreRow, background: rank === 0 ? `${s.member.color}0C` : "transparent",
                            borderLeft: rank === 0 ? `3px solid ${s.member.color}` : "3px solid transparent",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, width: 22, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: rank === 0 ? T.gold : rank === 1 ? T.silver : T.text3 }}>
                                {rank === 0 ? "👑" : `#${rank + 1}`}
                              </span>
                              <span onClick={() => openProfile(s.member.id)} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: s.member.color, cursor: "pointer", fontSize: 14 }}>{s.member.emoji} {s.member.name}</span>
                            </div>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: rank === 0 ? 24 : 18, color: rank === 0 ? T.text1 : T.text2 }}>{s.total} <span style={{ fontSize: 11, fontWeight: 500, color: T.text3 }}>{act.unit}</span></span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* GROUP STREAKS */}
                {filteredStreaks.length > 0 && (
                  <>
                    <div style={{ ...S.sectionLabel, marginTop: 20 }}>Streaks</div>
                    <div style={S.card}>
                      {filteredStreaks.slice(0, 8).map((s, i) => (
                        <div key={i} style={{ ...S.scoreRow, borderLeft: `3px solid ${s.member.color}` }}>
                          <span onClick={() => openProfile(s.member.id)} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: s.member.color, cursor: "pointer", fontSize: 14 }}>
                            {s.member.emoji} {s.member.name} <span style={{ color: T.text3, fontWeight: 500 }}>· {s.group.icon} {s.group.name}</span>
                          </span>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: T.gold }}>🔥 {s.streak}d</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {filteredActs.length === 0 && selectedGroup !== "all" && (
                  <div style={{ textAlign: "center", color: T.text3, padding: 32, fontSize: 14 }}>No activities in this group yet. Add some via 🏅 Activities.</div>
                )}
              </>
            );
          })()}

          {members.length === 0 && <div style={{ textAlign: "center", color: T.text3, padding: 40, fontSize: 15 }}>Add family members with 👥 to get started!</div>}
        </div>
      )}

      {/* === PROFILE SCREEN === */}
      {screen === "profile" && sel && (
        <div>
          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${sel.color}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{sel.emoji}</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: sel.color, textTransform: "uppercase" }}>{sel.name}</div>
              <div style={{ fontSize: 13, color: T.text3 }}>{entries.filter((e) => e.memberId === sel.id).length} total logs</div>
            </div>
          </div>

          {/* Profile tabs */}
          <div style={S.nav}>
            {["Overview", "Progress", "Badges"].map((t) => (
              <button key={t} onClick={() => setProfileTab(t)} style={{ ...S.navBtn, ...(profileTab === t ? S.navBtnActive : {}) }}>{t}</button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {profileTab === "Overview" && (
            <div>
              {groups.filter((g) => {
                const gActs = activities.filter((a) => a.groupId === g.id);
                return gActs.some((a) => entries.some((e) => e.memberId === sel.id && e.activityId === a.id));
              }).map((g) => {
                const gActs = activities.filter((a) => a.groupId === g.id);
                const streak = getGroupStreak(entries, sel.id, g.id, activities);
                return (
                  <div key={g.id} style={{ ...S.card, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{g.icon} {g.name}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: T.gold }}>🔥 {streak.current}d</span>
                    </div>
                    {gActs.filter((a) => entries.some((e) => e.memberId === sel.id && e.activityId === a.id)).map((a) => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                        <span style={{ color: T.text2 }}>{a.icon} {a.name} <span style={{ fontSize: 10, color: T.text3 }}>{a.mode}</span></span>
                        <span style={{ fontWeight: 700 }}>
                          {a.mode === "pr" ? getBestScore(entries, sel.id, a.id) : getCurrentWeekTotal(entries, sel.id, a.id)}
                          <span style={{ fontSize: 11, fontWeight: 400, color: T.text3 }}> {a.mode === "pr" ? "best" : "this wk"}</span>
                        </span>
                      </div>
                    ))}
                    <MiniCalendar dates={streak.dates} color={sel.color} />
                    <div style={{ marginTop: 6, fontSize: 11, color: T.text3 }}>Best streak: <span style={{ color: sel.color, fontWeight: 700 }}>{streak.best} days</span></div>
                  </div>
                );
              })}
              {/* Standalone activities */}
              {activities.filter((a) => !a.groupId && entries.some((e) => e.memberId === sel.id && e.activityId === a.id)).map((a) => {
                const streak = getStandaloneStreak(entries, sel.id, a.id);
                return (
                  <div key={a.id} style={{ ...S.card, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{a.icon} {a.name}</span>
                      {streak.current > 0 && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: T.gold }}>🔥 {streak.current}d</span>}
                    </div>
                    <div style={{ fontSize: 13, color: T.text2 }}>
                      {a.mode === "pr" ? `Best: ${getBestScore(entries, sel.id, a.id)} ${a.unit}` : `This week: ${getCurrentWeekTotal(entries, sel.id, a.id)} ${a.unit}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PROGRESS TAB */}
          {profileTab === "Progress" && (
            <div>
              {activities.filter((a) => entries.some((e) => e.memberId === sel.id && e.activityId === a.id)).map((a) => (
                <div key={a.id} style={{ ...S.card, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>{a.icon} {a.name}</span>
                    <span style={{ fontSize: 11, color: T.text3 }}>{a.mode === "pr" ? "all-time progression" : "weekly volume"}</span>
                  </div>
                  {a.mode === "pr" ? <ProgressChartPR entries={entries} member={sel} activityId={a.id} /> : <ProgressChartCumulative entries={entries} member={sel} activityId={a.id} />}
                </div>
              ))}
              {!activities.some((a) => entries.some((e) => e.memberId === sel.id && e.activityId === a.id)) && (
                <div style={{ textAlign: "center", color: T.text3, padding: 32 }}>No activity data yet</div>
              )}
            </div>
          )}

          {/* BADGES TAB */}
          {profileTab === "Badges" && (
            <div style={S.card}>
              {(() => {
                const badges = getBadges(activities, entries, sel.id);
                const earned = badges.filter((b) => b.earned);
                const locked = badges.filter((b) => !b.earned);
                return (
                  <>
                    <div style={{ marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: T.gold }}>{earned.length}/{badges.length} earned</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {earned.map((b) => (
                        <div key={b.id} style={S.badge} title={b.name}><span style={{ fontSize: 24 }}>{b.icon}</span><span style={{ fontSize: 10, fontWeight: 700, color: T.text1, textAlign: "center", lineHeight: 1.2 }}>{b.name}</span></div>
                      ))}
                      {locked.map((b) => (
                        <div key={b.id} style={{ ...S.badge, opacity: 0.35 }} title={b.name}><span style={{ fontSize: 24, filter: "grayscale(1)" }}>🔒</span><span style={{ fontSize: 10, fontWeight: 700, color: T.text3, textAlign: "center", lineHeight: 1.2 }}>{b.name}</span></div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* === MODALS === */}

      {/* CHECK-IN */}
      {showCheckin && (
        <div style={S.modal}><div style={S.modalContent}>
          <div style={S.modalTitle}>Log activity</div>
          {members.length === 0 || activities.length === 0 ? (
            <div><div style={{ textAlign: "center", color: T.text3, padding: 20 }}>{members.length === 0 ? "Add members first" : "Add activities first"}</div><button onClick={() => setShowCheckin(false)} style={{ ...S.cancelBtn, width: "100%" }}>Close</button></div>
          ) : (
            <>
              <div style={S.fieldLabel}>Who?</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {members.map((m) => <button key={m.id} onClick={() => setCheckinMember(m.id)} style={{ ...S.selectBtn, background: checkinMember === m.id ? `${m.color}14` : T.inputBg, borderColor: checkinMember === m.id ? m.color : T.inputBorder, color: checkinMember === m.id ? m.color : T.text2 }}>{m.emoji} {m.name}</button>)}
              </div>
              <div style={S.fieldLabel}>What?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {activities.map((a) => <button key={a.id} onClick={() => setCheckinActivity(a.id)} style={{ ...S.selectBtn, background: checkinActivity === a.id ? T.navActive : T.inputBg, borderColor: checkinActivity === a.id ? T.text2 : T.inputBorder, color: checkinActivity === a.id ? T.text1 : T.text2 }}>{a.icon} {a.name} <span style={{ fontSize: 10, color: T.text3 }}>({a.mode})</span></button>)}
              </div>
              <div style={S.fieldLabel}>How much? <span style={{ fontWeight: 400, color: T.text3 }}>max {MAX_VALUE.toLocaleString()}</span></div>
              <input type="number" value={checkinValue} onChange={(e) => { setCheckinValue(e.target.value); setCheckinError(""); }} placeholder="Value..." style={S.input} />
              {checkinError && <div style={{ color: T.warn, fontSize: 12, marginTop: 6, fontWeight: 600 }}>{checkinError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleCheckin} style={S.submitBtn}>Log it! 🚀</button>
                <button onClick={() => setShowCheckin(false)} style={S.cancelBtn}>Cancel</button>
              </div>
            </>
          )}
        </div></div>
      )}

      {/* MANAGE MEMBERS */}
      {showManageMembers && (
        <div style={S.modal}><div style={{ ...S.modalContent, maxWidth: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={S.modalTitle}>👥 Members</div><button onClick={() => { setShowManageMembers(false); setConfirmRemove(null); }} style={{ ...S.cancelBtn, padding: "4px 10px", fontSize: 12 }}>✕</button></div>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: `${m.color}08`, border: `1px solid ${m.color}20`, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: m.color }}>{m.emoji} {m.name} <span style={{ fontSize: 11, color: T.text3, fontWeight: 400 }}>{entries.filter((e) => e.memberId === m.id).length} logs</span></span>
              {confirmRemove === m.id ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}><span style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>Delete?</span><button onClick={() => handleRemoveMember(m.id)} style={{ ...S.selectBtn, borderColor: T.warn, color: T.warn, padding: "2px 8px", fontSize: 11 }}>Yes</button><button onClick={() => setConfirmRemove(null)} style={{ ...S.selectBtn, padding: "2px 8px", fontSize: 11 }}>No</button></div>
              ) : <button onClick={() => setConfirmRemove(m.id)} style={{ ...S.selectBtn, color: T.text3, padding: "2px 8px", fontSize: 11 }}>Remove</button>}
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={S.fieldLabel}>Add new member</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="text" value={newMemberEmoji} onChange={(e) => setNewMemberEmoji(e.target.value)} placeholder="😀" maxLength={2} style={{ ...S.input, width: 50, textAlign: "center", fontSize: 20, padding: "8px 4px" }} />
              <input type="text" value={newMemberName} onChange={(e) => { setNewMemberName(e.target.value); setAddError(""); }} placeholder="Name..." maxLength={20} style={{ ...S.input, flex: 1, fontSize: 15 }} onKeyDown={(e) => e.key === "Enter" && handleAddMember()} />
            </div>
            {addError && showManageMembers && <div style={{ color: T.warn, fontSize: 12, marginTop: 4, fontWeight: 600 }}>{addError}</div>}
            <button onClick={handleAddMember} disabled={!newMemberName.trim()} style={{ ...S.submitBtn, width: "100%", marginTop: 8, opacity: newMemberName.trim() ? 1 : 0.4 }}>Add member</button>
          </div>
        </div></div>
      )}

      {/* MANAGE ACTIVITIES + GROUPS */}
      {showManageActivities && (
        <div style={S.modal}><div style={{ ...S.modalContent, maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={S.modalTitle}>🏅 Activities & groups</div><button onClick={() => { setShowManageActivities(false); setConfirmRemoveAct(null); setAddError(""); }} style={{ ...S.cancelBtn, padding: "4px 10px", fontSize: 12 }}>✕</button></div>

          {/* Groups section */}
          <div style={S.fieldLabel}>Groups</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {groups.map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: T.badgeBg, border: `1px solid ${T.badgeBorder}`, fontSize: 13 }}>
                {g.icon} {g.name}
                <span onClick={() => handleRemoveGroup(g.id)} style={{ cursor: "pointer", color: T.text3, fontSize: 12 }}>✕</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <input type="text" value={newGroupIcon} onChange={(e) => setNewGroupIcon(e.target.value)} placeholder="🏅" maxLength={2} style={{ ...S.input, width: 44, textAlign: "center", fontSize: 18, padding: "6px 2px" }} />
            <input type="text" value={newGroupName} onChange={(e) => { setNewGroupName(e.target.value); setAddError(""); }} placeholder="Group name..." maxLength={20} style={{ ...S.input, flex: 1, fontSize: 14 }} onKeyDown={(e) => e.key === "Enter" && handleAddGroup()} />
            <button onClick={handleAddGroup} disabled={!newGroupName.trim()} style={{ ...S.selectBtn, borderColor: T.gold, color: T.gold, opacity: newGroupName.trim() ? 1 : 0.4 }}>Add</button>
          </div>

          {/* Activities section */}
          <div style={S.fieldLabel}>Activities</div>
          {activities.map((a) => {
            const g = groups.find((x) => x.id === a.groupId);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: T.badgeBg, border: `1px solid ${T.badgeBorder}`, marginBottom: 6, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{a.icon} {a.name}</span>
                  <span style={{ fontSize: 10, color: T.text3, padding: "1px 5px", borderRadius: 4, background: T.calOff }}>{a.mode}</span>
                  {g && <span style={{ fontSize: 10, color: T.text3 }}>{g.icon} {g.name}</span>}
                </div>
                {confirmRemoveAct === a.id ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}><button onClick={() => handleRemoveActivity(a.id)} style={{ ...S.selectBtn, borderColor: T.warn, color: T.warn, padding: "2px 8px", fontSize: 11 }}>Yes</button><button onClick={() => setConfirmRemoveAct(null)} style={{ ...S.selectBtn, padding: "2px 8px", fontSize: 11 }}>No</button></div>
                ) : <button onClick={() => setConfirmRemoveAct(a.id)} style={{ ...S.selectBtn, color: T.text3, padding: "2px 8px", fontSize: 11 }}>Remove</button>}
              </div>
            );
          })}

          {/* Add activity form */}
          <div style={{ marginTop: 14 }}>
            <div style={S.fieldLabel}>Add new activity</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input type="text" value={newActIcon} onChange={(e) => setNewActIcon(e.target.value)} placeholder="💪" maxLength={2} style={{ ...S.input, width: 44, textAlign: "center", fontSize: 18, padding: "6px 2px" }} />
              <input type="text" value={newActName} onChange={(e) => { setNewActName(e.target.value); setAddError(""); }} placeholder="Activity name..." maxLength={24} style={{ ...S.input, flex: 1, fontSize: 14 }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Mode</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setNewActMode("pr")} style={{ ...S.selectBtn, fontSize: 12, padding: "4px 10px", background: newActMode === "pr" ? `${T.gold}14` : T.inputBg, borderColor: newActMode === "pr" ? T.gold : T.inputBorder, color: newActMode === "pr" ? T.gold : T.text2, flex: 1 }}>PR</button>
                  <button onClick={() => setNewActMode("cumulative")} style={{ ...S.selectBtn, fontSize: 12, padding: "4px 10px", background: newActMode === "cumulative" ? `${T.gold}14` : T.inputBg, borderColor: newActMode === "cumulative" ? T.gold : T.inputBorder, color: newActMode === "cumulative" ? T.gold : T.text2, flex: 1 }}>Cumulative</button>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Unit</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {UNIT_OPTIONS.map((u) => <button key={u.value} onClick={() => setNewActUnit(u.value)} style={{ ...S.selectBtn, fontSize: 11, padding: "3px 8px", background: newActUnit === u.value ? `${T.gold}14` : T.inputBg, borderColor: newActUnit === u.value ? T.gold : T.inputBorder, color: newActUnit === u.value ? T.gold : T.text2 }}>{u.label}</button>)}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Group</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button onClick={() => setNewActGroup("none")} style={{ ...S.selectBtn, fontSize: 12, padding: "4px 10px", background: newActGroup === "none" ? T.navActive : T.inputBg, borderColor: newActGroup === "none" ? T.text2 : T.inputBorder, color: newActGroup === "none" ? T.text1 : T.text2 }}>None</button>
                {groups.map((g) => <button key={g.id} onClick={() => setNewActGroup(g.id)} style={{ ...S.selectBtn, fontSize: 12, padding: "4px 10px", background: newActGroup === g.id ? T.navActive : T.inputBg, borderColor: newActGroup === g.id ? T.text2 : T.inputBorder, color: newActGroup === g.id ? T.text1 : T.text2 }}>{g.icon} {g.name}</button>)}
              </div>
            </div>
            {addError && showManageActivities && <div style={{ color: T.warn, fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{addError}</div>}
            <button onClick={handleAddActivity} disabled={!newActName.trim()} style={{ ...S.submitBtn, width: "100%", opacity: newActName.trim() ? 1 : 0.4 }}>Add activity</button>
          </div>
        </div></div>
      )}

      {/* HISTORY */}
      {showHistory && (
        <div style={S.modal}><div style={{ ...S.modalContent, maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><div style={S.modalTitle}>📋 History</div><button onClick={() => setShowHistory(false)} style={{ ...S.cancelBtn, padding: "4px 10px", fontSize: 12 }}>✕</button></div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <button onClick={() => setHistoryFilterMember("all")} style={{ ...S.selectBtn, fontSize: 11, padding: "3px 8px", background: historyFilterMember === "all" ? T.navActive : T.inputBg, borderColor: historyFilterMember === "all" ? T.text2 : T.inputBorder }}>All</button>
            {members.map((m) => <button key={m.id} onClick={() => setHistoryFilterMember(m.id)} style={{ ...S.selectBtn, fontSize: 11, padding: "3px 8px", background: historyFilterMember === m.id ? `${m.color}14` : T.inputBg, borderColor: historyFilterMember === m.id ? m.color : T.inputBorder, color: historyFilterMember === m.id ? m.color : T.text2 }}>{m.emoji}</button>)}
            <span style={{ color: T.text3 }}>|</span>
            <button onClick={() => setHistoryFilterActivity("all")} style={{ ...S.selectBtn, fontSize: 11, padding: "3px 8px", background: historyFilterActivity === "all" ? T.navActive : T.inputBg, borderColor: historyFilterActivity === "all" ? T.text2 : T.inputBorder }}>All</button>
            {activities.map((a) => <button key={a.id} onClick={() => setHistoryFilterActivity(a.id)} style={{ ...S.selectBtn, fontSize: 11, padding: "3px 8px", background: historyFilterActivity === a.id ? T.navActive : T.inputBg, borderColor: historyFilterActivity === a.id ? T.text2 : T.inputBorder }}>{a.icon}</button>)}
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {(() => {
              const filtered = entries.filter((e) => (historyFilterMember === "all" || e.memberId === historyFilterMember) && (historyFilterActivity === "all" || e.activityId === historyFilterActivity)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
              if (!filtered.length) return <div style={{ textAlign: "center", color: T.text3, padding: 20 }}>No entries found</div>;
              return filtered.slice(0, 50).map((e) => {
                const m = members.find((x) => x.id === e.memberId);
                const a = activities.find((x) => x.id === e.activityId);
                if (!m || !a) return null;
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, background: editingEntry === e.id ? `${T.gold}08` : T.badgeBg, border: `1px solid ${editingEntry === e.id ? T.gold : T.badgeBorder}`, fontSize: 12, gap: 6, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: T.text3, fontSize: 11 }}>{e.date}</span>
                      <span style={{ color: m.color, fontWeight: 700 }}>{m.emoji} {m.name}</span>
                      <span>{a.icon} {a.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {editingEntry === e.id ? (
                        <>
                          <input type="number" value={editValue} onChange={(ev) => setEditValue(ev.target.value)} style={{ ...S.input, width: 70, fontSize: 14, padding: "3px 6px", textAlign: "center" }} autoFocus onKeyDown={(ev) => ev.key === "Enter" && handleEditEntry()} />
                          <button onClick={handleEditEntry} style={{ ...S.selectBtn, borderColor: "#059669", color: "#059669", padding: "2px 6px", fontSize: 11 }}>Save</button>
                          <button onClick={() => setEditingEntry(null)} style={{ ...S.selectBtn, padding: "2px 6px", fontSize: 11 }}>✕</button>
                        </>
                      ) : confirmDeleteEntry === e.id ? (
                        <>
                          <span style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>Delete?</span>
                          <button onClick={() => handleDeleteEntry(e.id)} style={{ ...S.selectBtn, borderColor: T.warn, color: T.warn, padding: "2px 6px", fontSize: 11 }}>Yes</button>
                          <button onClick={() => setConfirmDeleteEntry(null)} style={{ ...S.selectBtn, padding: "2px 6px", fontSize: 11 }}>No</button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{e.value}</span>
                          <span style={{ color: T.text3 }}>{a.unit}</span>
                          {e.editedAt && <span style={{ fontSize: 9, color: T.gold, fontWeight: 700, background: `${T.gold}12`, padding: "1px 4px", borderRadius: 3 }}>edited</span>}
                          <button onClick={() => { setEditingEntry(e.id); setEditValue(String(e.value)); setConfirmDeleteEntry(null); }} style={{ ...S.selectBtn, padding: "2px 6px", fontSize: 11, color: T.text3 }}>Edit</button>
                          <button onClick={() => { setConfirmDeleteEntry(e.id); setEditingEntry(null); }} style={{ ...S.selectBtn, padding: "2px 6px", fontSize: 11, color: T.text3 }}>🗑</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div></div>
      )}
    </div>
  );
}

const S = {
  container: { minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'Nunito', sans-serif", padding: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 },
  title: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, textTransform: "uppercase", letterSpacing: 1, background: "linear-gradient(90deg, #D95525, #C2558A, #3D7ABF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 },
  checkinBtn: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, padding: "8px 16px", background: "linear-gradient(135deg, #D95525, #BF6C00)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  manageBtn: { fontSize: 14, padding: "7px 12px", background: T.card, color: T.text2, border: `1px solid ${T.cardBorder}`, borderRadius: 8, cursor: "pointer" },
  resetBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 13, padding: "7px 12px", background: T.card, color: T.text3, border: `1px solid ${T.cardBorder}`, borderRadius: 8, cursor: "pointer" },
  sectionLabel: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: T.text3, marginBottom: 8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  card: { background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.cardBorder}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  scoreRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 6, marginBottom: 3 },
  nav: { display: "flex", gap: 3, marginBottom: 14, background: T.navBg, borderRadius: 10, padding: 3 },
  navBtn: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, padding: "7px 8px", background: "transparent", color: T.text3, border: "none", borderRadius: 7, cursor: "pointer", flex: 1, transition: "all 0.2s" },
  navBtnActive: { background: T.navActive, color: T.text1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  ticker: { padding: "8px 14px", background: T.tickerBg, borderRadius: 8, marginBottom: 14, fontSize: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 600, overflowX: "auto", whiteSpace: "nowrap", border: `1px solid ${T.tickerBorder}` },
  badge: { width: 64, height: 64, borderRadius: 10, background: T.badgeBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 4, border: `1px solid ${T.badgeBorder}` },
  pbOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: T.pbOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modalContent: { background: T.card, borderRadius: 16, padding: 24, maxWidth: 480, width: "92%", border: `1px solid ${T.cardBorder}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: T.text1, textTransform: "uppercase", letterSpacing: 1 },
  fieldLabel: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: T.text3, marginBottom: 6 },
  selectBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${T.inputBorder}`, cursor: "pointer", background: "transparent" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.text1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, outline: "none" },
  submitBtn: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase", letterSpacing: 1, padding: "10px 24px", background: "linear-gradient(135deg, #D95525, #BF6C00)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", flex: 1 },
  cancelBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 13, padding: "10px 16px", background: T.inputBg, color: T.text2, border: `1px solid ${T.cardBorder}`, borderRadius: 8, cursor: "pointer" },
};
