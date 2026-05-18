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
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

// FIX #1: Local timezone date helper — avoids UTC mismatch for late-night loggers
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MAX_VALUE = 9999; // FIX #7: Cap input values

const SEED_DATA = {
  familyName: "倪 Family Leaderboard",
  members: [
    { id: "m1", name: "Dad", color: "#D95525", emoji: "🦁" },
    { id: "m2", name: "Mom", color: "#2A9D8F", emoji: "⚡" },
    { id: "m3", name: "Liam", color: "#3D7ABF", emoji: "🦈" },
    { id: "m4", name: "Sofia", color: "#C2558A", emoji: "🔥" },
  ],
  activities: [
    { id: "a1", name: "Plank Hold", unit: "sec", type: "time", icon: "🏋️" },
    { id: "a2", name: "Push-ups", unit: "reps", type: "count", icon: "💪" },
    { id: "a3", name: "Wall Sit", unit: "sec", type: "time", icon: "🧱" },
    { id: "a4", name: "Soccer Juggles", unit: "streak", type: "count", icon: "⚽" },
    { id: "a5", name: "Puck Shots", unit: "made", type: "count", icon: "🏒" },
    { id: "a6", name: "Sit-ups", unit: "reps", type: "count", icon: "🔄" },
  ],
  entries: generateSeedEntries(),
};

function generateSeedEntries() {
  const entries = [];
  const today = new Date();
  const members = ["m1", "m2", "m3", "m4"];
  const activities = {
    a1: { base: [60, 90, 35, 45], growth: [2, 1.5, 3, 2.5] },
    a2: { base: [30, 25, 15, 18], growth: [1, 0.8, 1.5, 1.2] },
    a3: { base: [45, 60, 30, 35], growth: [1.5, 1, 2, 1.8] },
    a4: { base: [20, 15, 40, 35], growth: [0.5, 0.3, 2, 1.5] },
    a5: { base: [5, 3, 8, 6], growth: [0.3, 0.2, 0.5, 0.4] },
    a6: { base: [35, 30, 20, 25], growth: [1, 0.8, 1.5, 1] },
  };
  let id = 0;
  for (let d = 20; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const ds = localDateStr(date); // FIX #1
    members.forEach((m, mi) => {
      Object.entries(activities).forEach(([aId, cfg]) => {
        if (Math.random() < 0.2) return;
        const val = Math.round(
          cfg.base[mi] + cfg.growth[mi] * (20 - d) + (Math.random() - 0.3) * cfg.base[mi] * 0.3
        );
        entries.push({ id: `e${id++}`, memberId: m, activityId: aId, value: Math.max(1, val), date: ds });
      });
    });
  }
  return entries;
}

// FIX #2: Badges are now dynamic — no hardcoded activity IDs
function getBadges(activities) {
  const actCount = activities.length;
  return [
    { id: "b1", name: "First Log", desc: "Log your first activity", icon: "🌟", check: (s) => s.totalEntries >= 1 },
    { id: "b2", name: "Week Warrior", desc: "7-day streak", icon: "⚔️", check: (s) => s.maxStreak >= 7 },
    { id: "b3", name: "Iron Will", desc: "Best score of 120+ on any activity", icon: "🛡️", check: (s) => s.bestAnyActivity >= 120 },
    { id: "b4", name: "Century Club", desc: "100+ total reps on any activity", icon: "💯", check: (s) => s.topTotalActivity >= 100 },
    { id: "b5", name: "Consistent", desc: "5 days in a row", icon: "📅", check: (s) => s.maxStreak >= 5 },
    { id: "b6", name: "Triple Threat", desc: "3 activities in one day", icon: "🎯", check: (s) => s.maxActivitiesInDay >= 3 },
    { id: "b7", name: "Record Breaker", desc: "Beat your PB 3 times", icon: "🏆", check: (s) => s.pbCount >= 3 },
    { id: "b8", name: "All-Rounder", desc: `Try every activity (${actCount})`, icon: "🌈", check: (s) => s.uniqueActivities >= actCount && actCount > 0 },
  ];
}

// --- Theme ---
const T = {
  bg: "#FBF7F2", card: "#FFFFFF", cardBorder: "#EDE5DA",
  text1: "#3D2E1F", text2: "#8A7B6B", text3: "#A89280",
  navBg: "#F0E9E0", navActive: "#FFFFFF",
  inputBg: "#F5F0EA", inputBorder: "#DDD4C8",
  overlay: "rgba(45,32,20,0.45)", pbOverlay: "rgba(45,32,20,0.88)",
  tickerBg: "#FFF3E0", tickerBorder: "#FFDCAB",
  gold: "#BF6C00", silver: "#8A7B6B", bronze: "#A0714A",
  calOff: "#F0E9E0", badgeBg: "#F7F2EC", badgeBorder: "#EDE5DA",
  warn: "#DC2626", warnBg: "#FEF2F2",
};

function computeStats(entries, memberId) {
  const mine = entries.filter((e) => e.memberId === memberId);
  const totalEntries = mine.length;
  const bestByActivity = {}, totalByActivity = {}, entriesByActivity = {};
  mine.forEach((e) => {
    bestByActivity[e.activityId] = Math.max(bestByActivity[e.activityId] || 0, e.value);
    totalByActivity[e.activityId] = (totalByActivity[e.activityId] || 0) + e.value;
    if (!entriesByActivity[e.activityId]) entriesByActivity[e.activityId] = [];
    entriesByActivity[e.activityId].push(e);
  });
  const uniqueActivities = Object.keys(entriesByActivity).length;
  // FIX #2: Dynamic best/total across all activities
  const bestAnyActivity = Math.max(0, ...Object.values(bestByActivity));
  const topTotalActivity = Math.max(0, ...Object.values(totalByActivity));
  let maxStreak = 0;
  Object.values(entriesByActivity).forEach((acts) => {
    const dates = [...new Set(acts.map((a) => a.date))].sort();
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      if ((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000 === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 1;
    }
    maxStreak = Math.max(maxStreak, streak);
  });
  let pbCount = 0;
  Object.values(entriesByActivity).forEach((acts) => {
    const sorted = [...acts].sort((a, b) => a.date.localeCompare(b.date));
    let best = 0;
    sorted.forEach((e) => { if (e.value > best) { if (best > 0) pbCount++; best = e.value; } });
  });
  const byDate = {};
  mine.forEach((e) => { if (!byDate[e.date]) byDate[e.date] = new Set(); byDate[e.date].add(e.activityId); });
  const maxActivitiesInDay = Math.max(0, ...Object.values(byDate).map((s) => s.size));
  return { totalEntries, bestByActivity, totalByActivity, uniqueActivities, maxStreak, pbCount, maxActivitiesInDay, bestAnyActivity, topTotalActivity };
}

function getStreaks(entries, memberId, activityId) {
  const dates = [...new Set(entries.filter((e) => e.memberId === memberId && e.activityId === activityId).map((e) => e.date))].sort();
  if (!dates.length) return { current: 0, best: 0, dates: new Set() };
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    if ((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000 === 1) current++; else current = 1;
    best = Math.max(best, current);
  }
  const today = localToday(); // FIX #1
  if ((new Date(today) - new Date(dates[dates.length - 1])) / 86400000 > 1) current = 0;
  return { current, best, dates: new Set(dates) };
}

function getRecentPBs(entries, members) {
  const pbs = [];
  members.forEach((m) => {
    const byAct = {};
    entries.filter((e) => e.memberId === m.id).forEach((e) => { if (!byAct[e.activityId]) byAct[e.activityId] = []; byAct[e.activityId].push(e); });
    Object.entries(byAct).forEach(([aId, acts]) => {
      let best = 0;
      [...acts].sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
        if (e.value > best) { if (best > 0) pbs.push({ member: m, activityId: aId, value: e.value, prev: best, date: e.date }); best = e.value; }
      });
    });
  });
  return pbs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
}

function MiniCalendar({ dates, color }) {
  const today = new Date();
  const todayStr = localToday(); // FIX #1
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = localDateStr(d); // FIX #1
    days.push({ date: ds, active: dates.has(ds), day: d.getDate() });
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
      {days.map((d, i) => (
        <div key={i} style={{
          width: 22, height: 22, borderRadius: 5,
          background: d.active ? color : T.calOff,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700,
          color: d.active ? "#fff" : T.text3,
          border: d.date === todayStr ? `2px solid ${T.text2}` : "none",
        }}>{d.day}</div>
      ))}
    </div>
  );
}

// FIX #5: Progress chart deduplicates same-day entries (takes max per day)
function ProgressChart({ entries, member, activityId }) {
  const raw = entries
    .filter((e) => e.memberId === member.id && e.activityId === activityId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const byDay = {};
  raw.forEach((e) => { byDay[e.date] = Math.max(byDay[e.date] || 0, e.value); });
  const data = Object.entries(byDay).map(([date, val]) => ({ date: date.slice(5), val }));
  if (data.length < 2) return <div style={{ fontSize: 11, color: T.text3, padding: 8 }}>Not enough data</div>;
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="val" stroke={member.color} strokeWidth={2.5} dot={false} />
        <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 11, color: T.text1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} labelStyle={{ color: T.text2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// FIX #8: Reusable empty state component
function EmptyState({ emoji, message }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: T.text3 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}

const VIEWS = ["Leaderboard", "Streaks", "Progress", "Badges"];

export default function FamilyLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("Leaderboard");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinMember, setCheckinMember] = useState(null);
  const [checkinActivity, setCheckinActivity] = useState(null);
  const [checkinValue, setCheckinValue] = useState("");
  const [checkinError, setCheckinError] = useState(""); // FIX #7
  const [pbFlash, setPbFlash] = useState(null);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmoji, setNewMemberEmoji] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [showManageActivities, setShowManageActivities] = useState(false);
  const [newActName, setNewActName] = useState("");
  const [newActUnit, setNewActUnit] = useState("reps");
  const [newActIcon, setNewActIcon] = useState("");
  const [confirmRemoveAct, setConfirmRemoveAct] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false); // FIX #3
  const [addError, setAddError] = useState(""); // FIX #9
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilterMember, setHistoryFilterMember] = useState("all");
  const [historyFilterActivity, setHistoryFilterActivity] = useState("all");
  const [editingEntry, setEditingEntry] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.storage.get("family-leaderboard-data");
        if (stored?.value) setData(JSON.parse(stored.value));
        else { await window.storage.set("family-leaderboard-data", JSON.stringify(SEED_DATA)); setData(SEED_DATA); }
      } catch { setData(SEED_DATA); }
      setLoading(false);
    })();
  }, []);

  const saveData = async (nd) => { setData(nd); try { await window.storage.set("family-leaderboard-data", JSON.stringify(nd)); } catch {} };

  // FIX #6: Reset check-in selections when opening modal
  const openCheckin = () => {
    setCheckinMember(null);
    setCheckinActivity(null);
    setCheckinValue("");
    setCheckinError("");
    setShowCheckin(true);
  };

  const handleCheckin = async () => {
    if (!checkinMember || !checkinActivity || !checkinValue) return;
    const val = parseInt(checkinValue);
    if (isNaN(val) || val <= 0) return;
    // FIX #7: Validate max value
    if (val > MAX_VALUE) {
      setCheckinError(`Maximum value is ${MAX_VALUE.toLocaleString()}`);
      return;
    }
    const today = localToday(); // FIX #1
    const newEntry = { id: `e${Date.now()}`, memberId: checkinMember, activityId: checkinActivity, value: val, date: today };
    const prevBest = data.entries.filter((e) => e.memberId === checkinMember && e.activityId === checkinActivity).reduce((max, e) => Math.max(max, e.value), 0);
    const newData = { ...data, entries: [...data.entries, newEntry] };
    await saveData(newData);
    const m = data.members.find((x) => x.id === checkinMember);
    const a = data.activities.find((x) => x.id === checkinActivity);
    // FIX #4: Celebrate first entry OR new PB
    if (val > prevBest) {
      const isFirst = prevBest === 0;
      setPbFlash({ member: m, activity: a, value: val, prev: prevBest, isFirst });
      setTimeout(() => setPbFlash(null), 4000);
    }
    setShowCheckin(false); setCheckinValue(""); setCheckinError("");
  };

  // FIX #3: Reset now requires confirmation
  const handleReset = async () => {
    await saveData({ ...SEED_DATA, entries: generateSeedEntries() });
    setConfirmReset(false);
  };

  const MEMBER_COLORS = ["#D95525", "#2A9D8F", "#3D7ABF", "#C2558A", "#BF6C00", "#7B5EA7", "#2E8B85", "#C44D70", "#3A8550", "#D4713A"];
  const MEMBER_EMOJIS = ["🦁", "⚡", "🦈", "🔥", "🐻", "🦅", "🐺", "🌟", "🎯", "🚀", "🦊", "🐲", "💎", "🌊", "⭐"];

  // FIX #9: Duplicate name check for members
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    const nameExists = data.members.some((m) => m.name.toLowerCase() === newMemberName.trim().toLowerCase());
    if (nameExists) { setAddError("A member with that name already exists"); return; }
    const usedColors = new Set(data.members.map((m) => m.color));
    const color = MEMBER_COLORS.find((c) => !usedColors.has(c)) || MEMBER_COLORS[data.members.length % MEMBER_COLORS.length];
    const emoji = newMemberEmoji || MEMBER_EMOJIS[data.members.length % MEMBER_EMOJIS.length];
    await saveData({ ...data, members: [...data.members, { id: `m${Date.now()}`, name: newMemberName.trim(), color, emoji }] });
    setNewMemberName(""); setNewMemberEmoji(""); setAddError("");
  };

  const handleRemoveMember = async (memberId) => {
    await saveData({ ...data, members: data.members.filter((m) => m.id !== memberId), entries: data.entries.filter((e) => e.memberId !== memberId) });
    setConfirmRemove(null);
  };

  const ACTIVITY_ICONS = ["💪", "🏋️", "🏃", "⚽", "🏒", "🏀", "🎾", "🏊", "🚴", "🧘", "⛷️", "🤸", "🥊", "🎯", "🔄"];
  const UNIT_OPTIONS = [
    { value: "reps", label: "Reps (count)" },
    { value: "sec", label: "Seconds (time)" },
    { value: "min", label: "Minutes (time)" },
    { value: "streak", label: "Streak (consecutive)" },
    { value: "made", label: "Made (shots/goals)" },
    { value: "laps", label: "Laps" },
    { value: "ft", label: "Feet (distance)" },
    { value: "m", label: "Meters (distance)" },
  ];

  // FIX #9: Duplicate name check for activities
  const handleAddActivity = async () => {
    if (!newActName.trim()) return;
    const nameExists = data.activities.some((a) => a.name.toLowerCase() === newActName.trim().toLowerCase());
    if (nameExists) { setAddError("An activity with that name already exists"); return; }
    const icon = newActIcon || ACTIVITY_ICONS[data.activities.length % ACTIVITY_ICONS.length];
    const type = ["sec", "min"].includes(newActUnit) ? "time" : "count";
    const newAct = { id: `a${Date.now()}`, name: newActName.trim(), unit: newActUnit, type, icon };
    await saveData({ ...data, activities: [...data.activities, newAct] });
    setNewActName(""); setNewActIcon(""); setNewActUnit("reps"); setAddError("");
  };

  const handleRemoveActivity = async (actId) => {
    await saveData({ ...data, activities: data.activities.filter((a) => a.id !== actId), entries: data.entries.filter((e) => e.activityId !== actId) });
    setConfirmRemoveAct(null);
    if (selectedActivity === actId) setSelectedActivity(null);
  };

  const handleEditEntry = async () => {
    if (!editingEntry || !editValue) return;
    const val = parseInt(editValue);
    if (isNaN(val) || val <= 0 || val > MAX_VALUE) return;
    const newEntries = data.entries.map((e) => e.id === editingEntry ? { ...e, value: val, editedAt: localToday() } : e);
    await saveData({ ...data, entries: newEntries });
    setEditingEntry(null); setEditValue("");
  };

  const handleDeleteEntry = async (entryId) => {
    await saveData({ ...data, entries: data.entries.filter((e) => e.id !== entryId) });
    setConfirmDeleteEntry(null);
  };

  if (loading) return <div style={{ ...S.container, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 48, animation: "pulse 1.5s infinite" }}>🏆</div></div>;
  if (!data) return null;

  const { members, activities, entries } = data;
  const selAct = selectedActivity || activities[0]?.id;
  const badges = getBadges(activities); // FIX #2

  const leaderboard = activities.map((act) => ({
    activity: act,
    scores: members.map((m) => ({
      member: m,
      best: entries.filter((e) => e.memberId === m.id && e.activityId === act.id).reduce((max, e) => Math.max(max, e.value), 0),
    })).sort((a, b) => b.best - a.best),
  }));

  const streakBoard = members.map((m) => {
    let bestCurrent = 0, bestActivity = null;
    activities.forEach((a) => { const s = getStreaks(entries, m.id, a.id); if (s.current > bestCurrent) { bestCurrent = s.current; bestActivity = a; } });
    return { member: m, streak: bestCurrent, activity: bestActivity };
  }).sort((a, b) => b.streak - a.streak);

  const recentPBs = getRecentPBs(entries, members);

  // FIX #5: Hint about same-day logging
  const hasTodayEntry = checkinMember && checkinActivity && entries.some(
    (e) => e.memberId === checkinMember && e.activityId === checkinActivity && e.date === localToday()
  );

  return (
    <div style={S.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pbFlash { 0% { transform: scale(0.8); opacity: 0; } 20% { transform: scale(1.05); opacity: 1; } 80% { opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* PB / FIRST ENTRY CELEBRATION — FIX #4 */}
      {pbFlash && (
        <div style={S.pbOverlay}>
          <div style={{ animation: "pbFlash 4s ease-out forwards", textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>{pbFlash.isFirst ? "🌟" : "🎉"}</div>
            <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 3, color: "rgba(255,255,255,0.7)", fontFamily: "'Barlow Condensed', sans-serif" }}>
              {pbFlash.isFirst ? "First Entry!" : "New Personal Best"}
            </div>
            <div style={{ fontSize: 40, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: pbFlash.member.color, marginTop: 4 }}>{pbFlash.member.emoji} {pbFlash.member.name}</div>
            <div style={{ fontSize: 22, fontFamily: "'Nunito', sans-serif", fontWeight: 600, color: "#fff", marginTop: 4 }}>{pbFlash.activity.icon} {pbFlash.activity.name}</div>
            <div style={{ fontSize: 56, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: "#FFD700", marginTop: 8 }}>
              {pbFlash.value}
              {!pbFlash.isFirst && <span style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}> was {pbFlash.prev}</span>}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏆</span>
          <div>
            <h1 style={S.title}>{data.familyName}</h1>
            <div style={S.date}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={openCheckin} style={S.checkinBtn}>+ Log Activity</button>
          <button onClick={() => { setShowHistory(true); setHistoryFilterMember("all"); setHistoryFilterActivity("all"); setEditingEntry(null); setConfirmDeleteEntry(null); }} style={S.manageBtn}>📋 History</button>
          <button onClick={() => { setShowManageMembers(true); setAddError(""); }} style={S.manageBtn}>👥 Members</button>
          <button onClick={() => { setShowManageActivities(true); setAddError(""); }} style={S.manageBtn}>🏅 Activities</button>
          {/* FIX #3: Reset with confirmation */}
          {confirmReset ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: T.warn, fontWeight: 600 }}>Erase everything?</span>
              <button onClick={handleReset} style={{ ...S.resetBtn, color: T.warn, borderColor: T.warn }}>Yes</button>
              <button onClick={() => setConfirmReset(false)} style={S.resetBtn}>No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={S.resetBtn}>↻ Reset</button>
          )}
        </div>
      </div>

      {/* NAV */}
      <div style={S.nav}>
        {VIEWS.map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ ...S.navBtn, ...(view === v ? S.navBtnActive : {}) }}>{v}</button>
        ))}
      </div>

      {/* PBs TICKER */}
      {recentPBs.length > 0 && (
        <div style={S.ticker}>
          <span style={{ color: T.gold, marginRight: 8, fontWeight: 800 }}>🔥 RECENT PBs</span>
          {recentPBs.slice(0, 4).map((pb, i) => {
            const act = activities.find((a) => a.id === pb.activityId);
            return (
              <span key={i} style={{ marginRight: 16, color: T.text2 }}>
                <span style={{ color: pb.member.color, fontWeight: 700 }}>{pb.member.emoji} {pb.member.name}</span>
                {" "}{act?.icon} {pb.value} {act?.unit}
                <span style={{ color: T.text3, fontSize: 11 }}> (was {pb.prev})</span>
              </span>
            );
          })}
        </div>
      )}

      {/* CONTENT */}
      <div style={S.content}>

        {/* LEADERBOARD — FIX #8: Empty states */}
        {view === "Leaderboard" && (
          members.length === 0 || activities.length === 0 ? (
            <EmptyState emoji="🏠" message={members.length === 0 ? "Add some family members to get started!\nTap 👥 Members above." : "Create some activities to track!\nTap 🏅 Activities above."} />
          ) : (
            <div style={S.grid}>
              {leaderboard.map((lb, idx) => (
                <div key={lb.activity.id} style={{ ...S.card, animationDelay: `${idx * 0.08}s` }}>
                  <div style={S.cardHeader}>
                    <span style={{ fontSize: 24 }}>{lb.activity.icon}</span>
                    <div>
                      <div style={S.cardTitle}>{lb.activity.name}</div>
                      <div style={S.cardUnit}>{lb.activity.unit}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {lb.scores.map((s, rank) => (
                      <div key={s.member.id} style={{
                        ...S.scoreRow,
                        background: rank === 0 && s.best > 0 ? `${s.member.color}0C` : "transparent",
                        borderLeft: rank === 0 && s.best > 0 ? `3px solid ${s.member.color}` : "3px solid transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, width: 24, textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: s.best === 0 ? T.text3 : rank === 0 ? T.gold : rank === 1 ? T.silver : rank === 2 ? T.bronze : T.text3 }}>
                            {s.best === 0 ? "—" : rank === 0 ? "👑" : `#${rank + 1}`}
                          </span>
                          <span style={{ fontSize: 16 }}>{s.member.emoji}</span>
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: s.member.color }}>{s.member.name}</span>
                        </div>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: rank === 0 && s.best > 0 ? 28 : 20, color: rank === 0 && s.best > 0 ? T.text1 : T.text2 }}>
                          {s.best || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* STREAKS — FIX #8 */}
        {view === "Streaks" && (
          members.length === 0 || activities.length === 0 ? (
            <EmptyState emoji="🔥" message={members.length === 0 ? "Add family members to start tracking streaks!\nTap 👥 Members above." : "Create activities to start building streaks!\nTap 🏅 Activities above."} />
          ) : (
            <div>
              <div style={{ ...S.card, marginBottom: 20 }}>
                <div style={{ ...S.cardTitle, marginBottom: 16, fontSize: 18 }}>🔥 Active Streak Rankings</div>
                {streakBoard.map((s) => (
                  <div key={s.member.id} style={{ ...S.scoreRow, borderLeft: `3px solid ${s.member.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{s.member.emoji}</span>
                      <div>
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: s.member.color }}>{s.member.name}</span>
                        {s.activity && <span style={{ fontSize: 12, color: T.text3, marginLeft: 8 }}>{s.activity.icon} {s.activity.name}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: s.streak > 0 ? T.gold : T.text3 }}>{s.streak}</span>
                      <span style={{ fontSize: 12, color: T.text3 }}>days</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={S.grid}>
                {members.map((m) => (
                  <div key={m.id} style={S.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>{m.emoji}</span>
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: m.color }}>{m.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, marginBottom: 8, fontFamily: "'Nunito', sans-serif" }}>Select activity:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {activities.map((a) => {
                        const st = getStreaks(entries, m.id, a.id);
                        return (
                          <button key={a.id} onClick={() => setSelectedActivity(a.id)} style={{
                            ...S.miniBtn,
                            background: selAct === a.id ? `${m.color}14` : T.calOff,
                            border: selAct === a.id ? `1px solid ${m.color}` : `1px solid ${T.cardBorder}`,
                            color: selAct === a.id ? m.color : T.text2,
                          }}>{a.icon} {st.current > 0 ? `${st.current}d` : "—"}</button>
                        );
                      })}
                    </div>
                    <MiniCalendar dates={getStreaks(entries, m.id, selAct).dates} color={m.color} />
                    <div style={{ marginTop: 8, fontSize: 11, color: T.text3, fontFamily: "'Nunito', sans-serif" }}>
                      Best streak: <span style={{ color: m.color, fontWeight: 700 }}>{getStreaks(entries, m.id, selAct).best} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* PROGRESS — FIX #8 */}
        {view === "Progress" && (
          members.length === 0 || activities.length === 0 ? (
            <EmptyState emoji="📈" message={members.length === 0 ? "Add family members to see progress!\nTap 👥 Members above." : "Create activities to start tracking progress!\nTap 🏅 Activities above."} />
          ) : (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {activities.map((a) => (
                  <button key={a.id} onClick={() => setSelectedActivity(a.id)} style={{
                    ...S.miniBtn, fontSize: 13, padding: "6px 14px",
                    background: selAct === a.id ? T.navActive : T.calOff,
                    border: selAct === a.id ? `1px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                    color: selAct === a.id ? T.text1 : T.text2,
                    boxShadow: selAct === a.id ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  }}>{a.icon} {a.name}</button>
                ))}
              </div>
              <div style={S.grid}>
                {members.map((m) => (
                  <div key={m.id} style={S.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{m.emoji}</span>
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: m.color }}>{m.name}</span>
                      <span style={{ marginLeft: "auto", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: m.color }}>
                        Best: {entries.filter((e) => e.memberId === m.id && e.activityId === selAct).reduce((mx, e) => Math.max(mx, e.value), 0) || "—"}
                      </span>
                    </div>
                    <ProgressChart entries={entries} member={m} activityId={selAct} />
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* BADGES — FIX #2 dynamic + FIX #8 empty state */}
        {view === "Badges" && (
          members.length === 0 ? (
            <EmptyState emoji="🏅" message={"Add family members to start earning badges!\nTap 👥 Members above."} />
          ) : (
            <div style={S.grid}>
              {members.map((m) => {
                const stats = computeStats(entries, m.id);
                const earned = badges.filter((b) => b.check(stats));
                const locked = badges.filter((b) => !b.check(stats));
                return (
                  <div key={m.id} style={S.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 24 }}>{m.emoji}</span>
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: m.color, fontSize: 18 }}>{m.name}</span>
                      <span style={{ marginLeft: "auto", fontFamily: "'Barlow Condensed', sans-serif", color: T.gold, fontWeight: 700 }}>{earned.length}/{badges.length}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {earned.map((b) => (
                        <div key={b.id} style={S.badge} title={b.desc}>
                          <span style={{ fontSize: 24 }}>{b.icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.text1, textAlign: "center", lineHeight: 1.2 }}>{b.name}</span>
                        </div>
                      ))}
                      {locked.map((b) => (
                        <div key={b.id} style={{ ...S.badge, opacity: 0.35 }} title={b.desc}>
                          <span style={{ fontSize: 24, filter: "grayscale(1)" }}>🔒</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, textAlign: "center", lineHeight: 1.2 }}>{b.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* CHECK-IN MODAL — FIX #5, #6, #7 */}
      {showCheckin && (
        <div style={S.modal}>
          <div style={S.modalContent}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: T.text1, marginBottom: 20, textTransform: "uppercase", letterSpacing: 1 }}>Log Activity</div>
            {/* FIX #8: Empty state if no members or activities */}
            {members.length === 0 || activities.length === 0 ? (
              <div>
                <div style={{ textAlign: "center", color: T.text3, padding: 20, fontSize: 14 }}>
                  {members.length === 0 ? "Add members first via 👥 Members" : "Add activities first via 🏅 Activities"}
                </div>
                <button onClick={() => setShowCheckin(false)} style={{ ...S.cancelBtn, width: "100%" }}>Close</button>
              </div>
            ) : (
              <>
                <div style={S.fieldLabel}>Who?</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {members.map((m) => (
                    <button key={m.id} onClick={() => setCheckinMember(m.id)} style={{
                      ...S.selectBtn,
                      background: checkinMember === m.id ? `${m.color}14` : T.inputBg,
                      borderColor: checkinMember === m.id ? m.color : T.inputBorder,
                      color: checkinMember === m.id ? m.color : T.text2,
                    }}>{m.emoji} {m.name}</button>
                  ))}
                </div>
                <div style={S.fieldLabel}>What?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {activities.map((a) => (
                    <button key={a.id} onClick={() => setCheckinActivity(a.id)} style={{
                      ...S.selectBtn,
                      background: checkinActivity === a.id ? T.navActive : T.inputBg,
                      borderColor: checkinActivity === a.id ? T.text2 : T.inputBorder,
                      color: checkinActivity === a.id ? T.text1 : T.text2,
                    }}>{a.icon} {a.name}</button>
                  ))}
                </div>
                <div style={S.fieldLabel}>
                  How much? {checkinActivity && <span style={{ fontWeight: 400 }}>({activities.find((a) => a.id === checkinActivity)?.unit})</span>}
                  <span style={{ fontWeight: 400, color: T.text3, marginLeft: 8 }}>max {MAX_VALUE.toLocaleString()}</span>
                </div>
                <input type="number" value={checkinValue} onChange={(e) => { setCheckinValue(e.target.value); setCheckinError(""); }} placeholder="Enter value..." style={S.input} max={MAX_VALUE} />
                {/* FIX #7: Error message */}
                {checkinError && <div style={{ color: T.warn, fontSize: 12, marginTop: 6, fontWeight: 600 }}>{checkinError}</div>}
                {/* FIX #5: Same-day hint */}
                {hasTodayEntry && <div style={{ color: T.gold, fontSize: 12, marginTop: 6, fontWeight: 600 }}>ℹ️ Already logged today — your best score counts on the leaderboard</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={handleCheckin} style={S.submitBtn}>Log It! 🚀</button>
                  <button onClick={() => setShowCheckin(false)} style={S.cancelBtn}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MANAGE MEMBERS MODAL — FIX #9 */}
      {showManageMembers && (
        <div style={S.modal}>
          <div style={{ ...S.modalContent, maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: T.text1, textTransform: "uppercase", letterSpacing: 1 }}>👥 Manage Members</div>
              <button onClick={() => { setShowManageMembers(false); setConfirmRemove(null); setAddError(""); }} style={{ ...S.cancelBtn, padding: "6px 12px", fontSize: 12 }}>✕</button>
            </div>
            <div style={S.fieldLabel}>Current Members</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {members.map((m) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 10,
                  background: `${m.color}08`, border: `1px solid ${m.color}25`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: m.color, fontSize: 16 }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: T.text3 }}>{entries.filter((e) => e.memberId === m.id).length} logs</span>
                  </div>
                  {confirmRemove === m.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>Delete all data?</span>
                      <button onClick={() => handleRemoveMember(m.id)} style={{ ...S.selectBtn, borderColor: T.warn, color: T.warn, padding: "4px 10px", fontSize: 12 }}>Yes</button>
                      <button onClick={() => setConfirmRemove(null)} style={{ ...S.selectBtn, padding: "4px 10px", fontSize: 12 }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRemove(m.id)} style={{ ...S.selectBtn, borderColor: T.inputBorder, color: T.text3, padding: "4px 12px", fontSize: 12 }}>Remove</button>
                  )}
                </div>
              ))}
              {members.length === 0 && <div style={{ textAlign: "center", color: T.text3, padding: 20, fontSize: 14 }}>No members yet — add someone below!</div>}
            </div>
            <div style={S.fieldLabel}>Add New Member</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: "0 0 60px" }}>
                <input type="text" value={newMemberEmoji} onChange={(e) => setNewMemberEmoji(e.target.value)} placeholder="😀" maxLength={2} style={{ ...S.input, fontSize: 22, textAlign: "center", padding: "10px 4px" }} />
              </div>
              <input type="text" value={newMemberName} onChange={(e) => { setNewMemberName(e.target.value); setAddError(""); }} placeholder="Name..." maxLength={20} style={{ ...S.input, fontSize: 16, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && handleAddMember()} />
            </div>
            {/* FIX #9: Duplicate error */}
            {addError && showManageMembers && <div style={{ color: T.warn, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>{addError}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
              {MEMBER_EMOJIS.slice(0, 10).map((em) => (
                <button key={em} onClick={() => setNewMemberEmoji(em)} style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: newMemberEmoji === em ? `2px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                  background: newMemberEmoji === em ? T.navActive : T.inputBg,
                  fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: newMemberEmoji === em ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                }}>{em}</button>
              ))}
            </div>
            <button onClick={handleAddMember} disabled={!newMemberName.trim()} style={{
              ...S.submitBtn, width: "100%", opacity: newMemberName.trim() ? 1 : 0.4, cursor: newMemberName.trim() ? "pointer" : "not-allowed",
            }}>Add Member 🎉</button>
          </div>
        </div>
      )}

      {/* MANAGE ACTIVITIES MODAL — FIX #9 */}
      {showManageActivities && (
        <div style={S.modal}>
          <div style={{ ...S.modalContent, maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: T.text1, textTransform: "uppercase", letterSpacing: 1 }}>🏅 Manage Activities</div>
              <button onClick={() => { setShowManageActivities(false); setConfirmRemoveAct(null); setAddError(""); }} style={{ ...S.cancelBtn, padding: "6px 12px", fontSize: 12 }}>✕</button>
            </div>
            <div style={S.fieldLabel}>Current Activities</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, maxHeight: 260, overflowY: "auto" }}>
              {activities.map((a) => {
                const logCount = entries.filter((e) => e.activityId === a.id).length;
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10,
                    background: T.badgeBg, border: `1px solid ${T.badgeBorder}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{a.icon}</span>
                      <div>
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: T.text1, fontSize: 14 }}>{a.name}</span>
                        <span style={{ fontSize: 11, color: T.text3, marginLeft: 8 }}>{a.unit}</span>
                      </div>
                      <span style={{ fontSize: 11, color: T.text3 }}>({logCount} logs)</span>
                    </div>
                    {confirmRemoveAct === a.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>Delete all logs?</span>
                        <button onClick={() => handleRemoveActivity(a.id)} style={{ ...S.selectBtn, borderColor: T.warn, color: T.warn, padding: "4px 10px", fontSize: 12 }}>Yes</button>
                        <button onClick={() => setConfirmRemoveAct(null)} style={{ ...S.selectBtn, padding: "4px 10px", fontSize: 12 }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRemoveAct(a.id)} style={{ ...S.selectBtn, borderColor: T.inputBorder, color: T.text3, padding: "4px 12px", fontSize: 12 }}>Remove</button>
                    )}
                  </div>
                );
              })}
              {activities.length === 0 && <div style={{ textAlign: "center", color: T.text3, padding: 20, fontSize: 14 }}>No activities yet — add one below!</div>}
            </div>
            <div style={S.fieldLabel}>Add New Activity</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: "0 0 60px" }}>
                <input type="text" value={newActIcon} onChange={(e) => setNewActIcon(e.target.value)} placeholder="💪" maxLength={2} style={{ ...S.input, fontSize: 22, textAlign: "center", padding: "10px 4px" }} />
              </div>
              <input type="text" value={newActName} onChange={(e) => { setNewActName(e.target.value); setAddError(""); }} placeholder="Activity name..." maxLength={24} style={{ ...S.input, fontSize: 16, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && handleAddActivity()} />
            </div>
            {/* FIX #9: Duplicate error */}
            {addError && showManageActivities && <div style={{ color: T.warn, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>{addError}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {ACTIVITY_ICONS.slice(0, 12).map((ic) => (
                <button key={ic} onClick={() => setNewActIcon(ic)} style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: newActIcon === ic ? `2px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                  background: newActIcon === ic ? T.navActive : T.inputBg,
                  fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: newActIcon === ic ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                }}>{ic}</button>
              ))}
            </div>
            <div style={S.fieldLabel}>Unit of measurement</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {UNIT_OPTIONS.map((u) => (
                <button key={u.value} onClick={() => setNewActUnit(u.value)} style={{
                  ...S.selectBtn, fontSize: 12, padding: "6px 12px",
                  background: newActUnit === u.value ? `${T.gold}14` : T.inputBg,
                  borderColor: newActUnit === u.value ? T.gold : T.inputBorder,
                  color: newActUnit === u.value ? T.gold : T.text2,
                }}>{u.label}</button>
              ))}
            </div>
            <button onClick={handleAddActivity} disabled={!newActName.trim()} style={{
              ...S.submitBtn, width: "100%", opacity: newActName.trim() ? 1 : 0.4, cursor: newActName.trim() ? "pointer" : "not-allowed",
            }}>Add Activity 🎉</button>
          </div>
        </div>
      )}

      {/* HISTORY / EDIT ENTRIES MODAL */}
      {showHistory && (
        <div style={S.modal}>
          <div style={{ ...S.modalContent, maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: T.text1, textTransform: "uppercase", letterSpacing: 1 }}>📋 Entry History</div>
              <button onClick={() => { setShowHistory(false); setEditingEntry(null); setConfirmDeleteEntry(null); }} style={{ ...S.cancelBtn, padding: "6px 12px", fontSize: 12 }}>✕</button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>WHO:</span>
                <button onClick={() => setHistoryFilterMember("all")} style={{
                  ...S.miniBtn, fontSize: 12, padding: "4px 10px",
                  background: historyFilterMember === "all" ? T.navActive : T.calOff,
                  border: historyFilterMember === "all" ? `1px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                  color: historyFilterMember === "all" ? T.text1 : T.text2,
                }}>All</button>
                {members.map((m) => (
                  <button key={m.id} onClick={() => setHistoryFilterMember(m.id)} style={{
                    ...S.miniBtn, fontSize: 12, padding: "4px 10px",
                    background: historyFilterMember === m.id ? `${m.color}14` : T.calOff,
                    border: historyFilterMember === m.id ? `1px solid ${m.color}` : `1px solid ${T.cardBorder}`,
                    color: historyFilterMember === m.id ? m.color : T.text2,
                  }}>{m.emoji}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>WHAT:</span>
                <button onClick={() => setHistoryFilterActivity("all")} style={{
                  ...S.miniBtn, fontSize: 12, padding: "4px 10px",
                  background: historyFilterActivity === "all" ? T.navActive : T.calOff,
                  border: historyFilterActivity === "all" ? `1px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                  color: historyFilterActivity === "all" ? T.text1 : T.text2,
                }}>All</button>
                {activities.map((a) => (
                  <button key={a.id} onClick={() => setHistoryFilterActivity(a.id)} style={{
                    ...S.miniBtn, fontSize: 12, padding: "4px 10px",
                    background: historyFilterActivity === a.id ? T.navActive : T.calOff,
                    border: historyFilterActivity === a.id ? `1px solid ${T.text2}` : `1px solid ${T.cardBorder}`,
                    color: historyFilterActivity === a.id ? T.text1 : T.text2,
                  }}>{a.icon}</button>
                ))}
              </div>
            </div>

            {/* Entry list */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {(() => {
                const filtered = entries
                  .filter((e) => historyFilterMember === "all" || e.memberId === historyFilterMember)
                  .filter((e) => historyFilterActivity === "all" || e.activityId === historyFilterActivity)
                  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
                if (filtered.length === 0) return (
                  <div style={{ textAlign: "center", color: T.text3, padding: 32, fontSize: 14 }}>No entries found</div>
                );
                return filtered.slice(0, 50).map((e) => {
                  const m = members.find((x) => x.id === e.memberId);
                  const a = activities.find((x) => x.id === e.activityId);
                  if (!m || !a) return null;
                  const isEditing = editingEntry === e.id;
                  const isDeleting = confirmDeleteEntry === e.id;
                  return (
                    <div key={e.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8,
                      background: isEditing ? `${T.gold}08` : T.badgeBg,
                      border: `1px solid ${isEditing ? T.gold : T.badgeBorder}`,
                      gap: 8, flexWrap: "wrap",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: 11, color: T.text3, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, whiteSpace: "nowrap" }}>{e.date}</span>
                        <span style={{ fontSize: 16 }}>{m.emoji}</span>
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: m.color, fontSize: 13 }}>{m.name}</span>
                        <span style={{ fontSize: 14 }}>{a.icon}</span>
                        <span style={{ fontSize: 12, color: T.text2 }}>{a.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(ev) => setEditValue(ev.target.value)}
                              style={{ ...S.input, width: 80, fontSize: 16, padding: "4px 8px", textAlign: "center" }}
                              max={MAX_VALUE}
                              autoFocus
                              onKeyDown={(ev) => ev.key === "Enter" && handleEditEntry()}
                            />
                            <button onClick={handleEditEntry} style={{ ...S.selectBtn, borderColor: "#059669", color: "#059669", padding: "4px 8px", fontSize: 11 }}>Save</button>
                            <button onClick={() => { setEditingEntry(null); setEditValue(""); }} style={{ ...S.selectBtn, padding: "4px 8px", fontSize: 11 }}>Cancel</button>
                          </>
                        ) : isDeleting ? (
                          <>
                            <span style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>Delete?</span>
                            <button onClick={() => handleDeleteEntry(e.id)} style={{ ...S.selectBtn, borderColor: T.warn, color: T.warn, padding: "4px 8px", fontSize: 11 }}>Yes</button>
                            <button onClick={() => setConfirmDeleteEntry(null)} style={{ ...S.selectBtn, padding: "4px 8px", fontSize: 11 }}>No</button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: T.text1, minWidth: 40, textAlign: "right" }}>{e.value}</span>
                            <span style={{ fontSize: 11, color: T.text3 }}>{a.unit}</span>
                            {e.editedAt && <span style={{ fontSize: 9, color: T.gold, fontWeight: 700, background: `${T.gold}12`, padding: "1px 5px", borderRadius: 4 }}>edited</span>}
                            <button onClick={() => { setEditingEntry(e.id); setEditValue(String(e.value)); setConfirmDeleteEntry(null); }} style={{ ...S.selectBtn, padding: "4px 8px", fontSize: 11, color: T.text3, borderColor: T.inputBorder }}>Edit</button>
                            <button onClick={() => { setConfirmDeleteEntry(e.id); setEditingEntry(null); }} style={{ ...S.selectBtn, padding: "4px 8px", fontSize: 11, color: T.text3, borderColor: T.inputBorder }}>🗑</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
              {entries.filter((e) => (historyFilterMember === "all" || e.memberId === historyFilterMember) && (historyFilterActivity === "all" || e.activityId === historyFilterActivity)).length > 50 && (
                <div style={{ textAlign: "center", color: T.text3, padding: 12, fontSize: 12 }}>Showing most recent 50 entries. Use filters to narrow down.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  container: { minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'Nunito', sans-serif", padding: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 32, textTransform: "uppercase", letterSpacing: 2,
    background: "linear-gradient(90deg, #D95525, #C2558A, #3D7ABF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1,
  },
  date: { fontFamily: "'Nunito', sans-serif", fontSize: 13, color: T.text3, fontWeight: 600 },
  checkinBtn: {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: 1,
    padding: "10px 20px", background: "linear-gradient(135deg, #D95525, #BF6C00)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 2px 8px rgba(217,85,37,0.25)",
  },
  manageBtn: {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: 1,
    padding: "10px 16px", background: T.card, color: T.text2, border: `1px solid ${T.cardBorder}`, borderRadius: 10, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  resetBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 13, padding: "10px 14px", background: T.card, color: T.text3, border: `1px solid ${T.cardBorder}`, borderRadius: 10, cursor: "pointer" },
  nav: { display: "flex", gap: 4, marginBottom: 16, background: T.navBg, borderRadius: 12, padding: 4 },
  navBtn: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 1, padding: "8px 16px", background: "transparent", color: T.text3, border: "none", borderRadius: 8, cursor: "pointer", flex: 1, transition: "all 0.2s" },
  navBtnActive: { background: T.navActive, color: T.text1, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  ticker: { padding: "10px 16px", background: T.tickerBg, borderRadius: 10, marginBottom: 16, fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 600, overflowX: "auto", whiteSpace: "nowrap", border: `1px solid ${T.tickerBorder}` },
  content: { animation: "slideUp 0.3s ease-out" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: { background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.cardBorder}`, animation: "slideUp 0.4s ease-out both", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  cardHeader: { display: "flex", alignItems: "center", gap: 12 },
  cardTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.5, color: T.text1 },
  cardUnit: { fontFamily: "'Nunito', sans-serif", fontSize: 11, color: T.text3, fontWeight: 600 },
  scoreRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, marginBottom: 4 },
  miniBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid transparent", background: "transparent" },
  badge: { width: 72, height: 72, borderRadius: 12, background: T.badgeBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 6, border: `1px solid ${T.badgeBorder}` },
  pbOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: T.pbOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modalContent: { background: T.card, borderRadius: 20, padding: 28, maxWidth: 480, width: "90%", border: `1px solid ${T.cardBorder}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  fieldLabel: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: T.text3, marginBottom: 8 },
  selectBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, cursor: "pointer", background: "transparent" },
  input: { width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.text1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, outline: "none" },
  submitBtn: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: "uppercase", letterSpacing: 1, padding: "12px 28px", background: "linear-gradient(135deg, #D95525, #BF6C00)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", flex: 1, boxShadow: "0 2px 8px rgba(217,85,37,0.25)" },
  cancelBtn: { fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 20px", background: T.inputBg, color: T.text2, border: `1px solid ${T.cardBorder}`, borderRadius: 10, cursor: "pointer" },
};
