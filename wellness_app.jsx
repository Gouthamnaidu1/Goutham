import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Sun, Moon, Heart } from "lucide-react";

// WellnessApp.jsx
// Single-file React component for a responsive mental health / wellness app.
// - Tailwind CSS for styling (assumes Tailwind is configured)
// - Recharts for charts
// - LocalStorage for persistence (replace with backend API integration as needed)
// - Simple lexicon-based sentiment analysis and recommendation engine
// Default export is the main App component.

// --------------------- Utilities ---------------------
const STORAGE_KEY = "wellness_app_entries_v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Simple sentiment analysis: lexicon-based.
// This is intentionally lightweight — swap for a server-side ML model or API for production.
const POSITIVE_WORDS = [
  "happy",
  "joy",
  "great",
  "good",
  "content",
  "excited",
  "calm",
  "relaxed",
  "hope",
  "love",
  "grateful",
];
const NEGATIVE_WORDS = [
  "sad",
  "depressed",
  "angry",
  "anxious",
  "stressed",
  "upset",
  "lonely",
  "worried",
  "tired",
  "hopeless",
];

function scoreSentiment(text) {
  if (!text) return 0;
  const normalized = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) if (normalized.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (normalized.includes(w)) score -= 1;
  // Map to -1..1
  if (score > 0) return Math.min(1, score / POSITIVE_WORDS.length);
  if (score < 0) return Math.max(-1, score / NEGATIVE_WORDS.length);
  // fallback: check punctuation-based heuristics
  if (normalized.includes("!") && normalized.length < 50) return 0.5;
  return 0;
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Ensure dates exist
    return parsed.map((p) => ({ ...p, date: p.date || todayISO() }));
  } catch (e) {
    console.error("Failed loading entries", e);
    return [];
  }
}

// --------------------- Recommendation Engine ---------------------
function generateRecommendations(recentEntries) {
  // recentEntries is array sorted newest->oldest
  // Use simple heuristics:
  // - If average mood < 3 recommend grounding / talk to friend
  // - If sentiment negative frequently recommend breathing, journaling
  // - If sleep notes mention "tired" recommend sleep hygiene
  const out = [];
  if (!recentEntries || recentEntries.length === 0) {
    out.push({ id: "r_default", text: "Try a short 5-minute breathing exercise to start your day." });
    out.push({ id: "r_walk", text: "Go for a 10-minute walk outside — nature helps mood." });
    return out;
  }

  const moods = recentEntries.map((e) => e.mood || 3);
  const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;

  const sentiments = recentEntries.map((e) => e.sentiment ?? 0);
  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

  if (avgMood <= 2.5) {
    out.push({ id: "r_ground", text: "Try a grounding exercise: name 5 things you can see, 4 you can touch, 3 you can hear." });
    out.push({ id: "r_talk", text: "Consider reaching out to a friend or family for emotional support." });
  } else if (avgMood <= 3.5) {
    out.push({ id: "r_breathe", text: "Try a 3-4-5 breathing cycle for 3 minutes." });
    out.push({ id: "r_walk2", text: "Short physical activity (walk/stretch) can improve mood." });
  } else {
    out.push({ id: "r_keep", text: "You're doing well — keep your current routines and celebrate small wins." });
  }

  if (avgSentiment < -0.1) {
    out.push({ id: "r_journal", text: "Try journaling: write one honest paragraph about what's on your mind." });
    out.push({ id: "r_sleep", text: "Focus on sleep hygiene: limit screens 1 hour before bed." });
  }

  // De-duplicate
  const seen = new Set();
  return out.filter((r) => {
    if (seen.has(r.text)) return false;
    seen.add(r.text);
    return true;
  });
}

// --------------------- Components ---------------------
function Header({ title }) {
  return (
    <header className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white shadow-md">
      <div className="flex items-center gap-3">
        <Heart className="w-8 h-8" />
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-xs opacity-90">Daily mood check-ins • Trends • Personalized wellness</p>
        </div>
      </div>
      <div className="text-sm opacity-90">{new Date().toLocaleDateString()}</div>
    </header>
  );
}

function MoodPill({ val }) {
  const label = ["😞 Low", "😐 Meh", "🙂 Okay", "😊 Good", "😁 Great"][Math.min(4, Math.max(0, val - 1))];
  return (
    <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
      <span className="font-medium">{label}</span>
      <div className="text-xs opacity-80">{val}/5</div>
    </div>
  );
}

function MoodCheckIn({ onSave }) {
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  function handleSubmit(e) {
    e.preventDefault();
    const sentiment = scoreSentiment(note);
    const entry = {
      id: uid(),
      date,
      mood: Number(mood),
      note,
      sentiment,
      createdAt: new Date().toISOString(),
    };
    onSave(entry);
    setNote("");
    setMood(3);
    setDate(todayISO());
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="font-medium">How are you feeling today?</label>
          <MoodPill val={mood} />
        </div>

        <input
          type="range"
          min="1"
          max="5"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="w-full"
        />

        <label className="font-medium">Notes (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write a sentence or two about what's on your mind..."
          className="w-full border rounded-md p-2 min-h-[80px]"
        />

        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded-md" />

          <button type="submit" className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:opacity-95">
            Save check-in
          </button>
        </div>
      </div>
    </form>
  );
}

function RecentEntries({ entries, onDelete }) {
  return (
    <div className="space-y-3">
      {entries.length === 0 && <div className="p-4 text-sm text-gray-600">No entries yet — make your first check-in!</div>}
      {entries.map((e) => (
        <div key={e.id} className="p-3 bg-white rounded-md shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <div className="font-semibold">{e.date}</div>
              <div className="text-sm text-gray-600">Mood: {e.mood}/5</div>
              <div className="text-sm text-gray-600">Sentiment: {Math.round((e.sentiment ?? 0) * 100) / 100}</div>
            </div>
            {e.note && <div className="mt-2 text-sm">"{e.note}"</div>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onDelete(e.id)} className="text-sm text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendCharts({ entries }) {
  // Prepare data aggregated by date (ascending by date)
  const dataMap = {};
  entries.forEach((e) => {
    const d = e.date;
    if (!dataMap[d]) dataMap[d] = { date: d, moodSum: 0, count: 0, sentimentSum: 0 };
    dataMap[d].moodSum += e.mood;
    dataMap[d].sentimentSum += e.sentiment ?? 0;
    dataMap[d].count += 1;
  });
  const data = Object.values(dataMap)
    .map((d) => ({ date: d.date, mood: +(d.moodSum / d.count).toFixed(2), sentiment: +(d.sentimentSum / d.count).toFixed(2) }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  if (data.length === 0) {
    return <div className="p-4 text-sm text-gray-600">No trends to show yet — add a few check-ins.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <h3 className="font-semibold mb-2">Mood over time</h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 5]} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="mood" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-sm">
        <h3 className="font-semibold mb-2">Sentiment trend</h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[-1, 1]} />
              <Tooltip />
              <Line type="monotone" dataKey="sentiment" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Recommendations({ entries }) {
  const recent = entries.slice(0, 10);
  const recs = generateRecommendations(recent);

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="font-semibold mb-2">Personalized recommendations</h3>
      <ul className="space-y-2">
        {recs.map((r) => (
          <li key={r.id} className="text-sm">• {r.text}</li>
        ))}
      </ul>
    </div>
  );
}

// --------------------- Main App ---------------------
export default function WellnessApp() {
  const [entries, setEntries] = useState(() => loadEntries().sort((a, b) => (a.date < b.date ? 1 : -1)));

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  function handleSave(entry) {
    setEntries((prev) => [entry, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1)));
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((p) => p.id !== id));
  }

  // stats
  const stats = useMemo(() => {
    if (!entries.length) return { avgMood: null, avgSentiment: null };
    const avgMood = entries.reduce((a, b) => a + b.mood, 0) / entries.length;
    const avgSentiment = entries.reduce((a, b) => a + (b.sentiment ?? 0), 0) / entries.length;
    return { avgMood: +(avgMood.toFixed(2)), avgSentiment: +(avgSentiment.toFixed(2)) };
  }, [entries]);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness-entries-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    if (!confirm("Delete all entries? This cannot be undone.")) return;
    setEntries([]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto py-6 px-4">
        <Header title="Wellness — Daily Check-ins" />

        <main className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="md:col-span-1 space-y-4">
            <MoodCheckIn onSave={handleSave} />

            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold">Quick stats</h3>
              <div className="mt-3 text-sm space-y-2">
                <div>Entries: <strong>{entries.length}</strong></div>
                <div>Average mood: <strong>{stats.avgMood ?? "—"}</strong></div>
                <div>Average sentiment: <strong>{stats.avgSentiment ?? "—"}</strong></div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={exportJSON} className="px-3 py-2 bg-gray-100 rounded-md text-sm">Export</button>
                <button onClick={clearAll} className="px-3 py-2 bg-red-50 text-red-600 rounded-md text-sm">Clear all</button>
              </div>
            </div>

            <Recommendations entries={entries} />
          </section>

          <section className="md:col-span-2 space-y-4">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Recent check-ins</h3>
              <RecentEntries entries={entries.slice(0, 6)} onDelete={handleDelete} />
            </div>

            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Trends</h3>
              <TrendCharts entries={entries} />
            </div>
          </section>
        </main>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Built with care • This demo uses simple client-side sentiment heuristics — replace with a secure backend & model for production.
        </footer>
      </div>
    </div>
  );
}
