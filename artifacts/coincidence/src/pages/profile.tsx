import { useState, useRef } from "react";
import { myProfile, type Match, type CheckIn } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MapPin, Zap, Wine, Beer, Coffee, Sparkles,
  ShoppingBag, X, Pencil, Plus, Home, Ruler, ChevronUp, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StringIcon } from "@/components/StringIcon";

/* ─── constants ─────────────────────────────── */
const MAX_CREDITS   = 5;
const BOOST_DURATION_MS = 30 * 60 * 1000;
const RADIUS_OPTIONS = [1, 5, 10, 25];

const STRING_PACKS = [
  { id: "s3",  count: 3,  label: "3 strings",  price: "$0.99",  tag: "" },
  { id: "s5",  count: 5,  label: "5 strings",  price: "$1.49",  tag: "Popular" },
  { id: "s10", count: 10, label: "10 strings", price: "$2.49",  tag: "Best value" },
];

const HEIGHT_OPTIONS: string[] = [];
for (let ft = 4; ft <= 7; ft++) {
  const maxIn = ft === 7 ? 0 : 11;
  for (let inch = ft === 4 ? 9 : 0; inch <= maxIn; inch++) {
    HEIGHT_OPTIONS.push(`${ft}'${inch}"`);
  }
}

const HOBBY_SUGGESTIONS = [
  "Reading", "Cooking", "Gaming", "Yoga", "Photography", "Travel",
  "Music", "Hiking", "Dancing", "Art", "Film", "Cycling", "Running",
  "Swimming", "Climbing", "Tennis", "Skiing", "Surfing", "Writing", "Coffee",
];

const locationIconMap: Record<string, React.ReactNode> = {
  wine:     <Wine className="w-4 h-4" />,
  beer:     <Beer className="w-4 h-4" />,
  coffee:   <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

/* ─── helpers ───────────────────────────────── */
function formatCheckInTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const d = new Date(ts);
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 60_000) return "Just now";
  if (diff < 86_400_000) return `Today, ${timeStr}`;
  if (diff < 172_800_000) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}

function formatStringTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── types ─────────────────────────────────── */
interface EditableProfile {
  name: string;
  age: number;
  bio: string;
  hometown: string;
  height: string;
  hobbies: string[];
}

interface ProfilePageProps {
  matches: Match[];
  checkIns: CheckIn[];
  boostCredits: number;
  isBoostActive: boolean;
  boostTimeLeft: number;
  boostRadius: number;
  onBoostRadiusChange: (r: number) => void;
  onActivateBoost: () => void;
}

/* ─── persistence ───────────────────────────── */
const STORAGE_KEY = "coincidence_profile";

function loadProfile(): EditableProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as EditableProfile;
  } catch {}
  return {
    name:     myProfile.name,
    age:      myProfile.age,
    bio:      myProfile.bio,
    hometown: "",
    height:   "5'8\"",
    hobbies:  [...myProfile.interests],
  };
}

function saveProfile(p: EditableProfile) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

/* ─── component ─────────────────────────────── */
export default function ProfilePage({
  matches, checkIns,
  boostCredits, isBoostActive, boostTimeLeft,
  boostRadius, onBoostRadiusChange, onActivateBoost,
}: ProfilePageProps) {

  const [editable, setEditable] = useState<EditableProfile>(loadProfile);
  const [draft, setDraft]     = useState<EditableProfile>(editable);
  const [showEdit, setShowEdit] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [purchasedPack, setPurchasedPack] = useState<string | null>(null);
  const [hobbyInput, setHobbyInput] = useState("");
  const hobbyRef = useRef<HTMLInputElement>(null);

  const totalMatches       = matches.length;
  const coincidenceMatches = matches.filter(m => m.source !== "swipe").length;
  const matchesByLocation  = matches.reduce<Record<string, number>>((acc, m) => {
    if (m.source !== "swipe") acc[m.source] = (acc[m.source] ?? 0) + 1;
    return acc;
  }, {});

  /* edit helpers */
  function openEdit() { setDraft({ ...editable }); setShowEdit(true); }
  function saveEdit() {
    const saved = { ...draft };
    setEditable(saved);
    saveProfile(saved);
    setShowEdit(false);
  }
  function cancelEdit() { setShowEdit(false); }

  function addHobby(h: string) {
    const trimmed = h.trim();
    if (!trimmed || draft.hobbies.includes(trimmed)) return;
    setDraft(d => ({ ...d, hobbies: [...d.hobbies, trimmed] }));
  }
  function removeHobby(h: string) {
    setDraft(d => ({ ...d, hobbies: d.hobbies.filter(x => x !== h) }));
  }

  const heightIdx = HEIGHT_OPTIONS.indexOf(draft.height);
  function stepHeight(dir: 1 | -1) {
    const next = HEIGHT_OPTIONS[heightIdx + dir];
    if (next) setDraft(d => ({ ...d, height: next }));
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-8 max-w-md mx-auto w-full">

      {/* ── Avatar + name ── */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <AnimatePresence>
            {isBoostActive && (
              <motion.div
                key="aura"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.6, 0.2, 0.6], scale: [1, 1.08, 1] }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-foreground"
                style={{ margin: "-6px" }}
              />
            )}
          </AnimatePresence>
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-foreground text-background text-3xl font-bold z-10">
            {myProfile.avatar}
            {isBoostActive && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-foreground flex items-center justify-center z-20"
              >
                <StringIcon className="w-3.5 h-3.5" />
              </motion.div>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold">{editable.name}</h1>
        <p className="text-muted-foreground text-sm">{editable.age} years old</p>

        {/* Detail badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {editable.hometown ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <Home className="w-3 h-3" /> {editable.hometown}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <Ruler className="w-3 h-3" /> {editable.height}
          </span>
        </div>

        <p className="text-sm mt-3 max-w-xs text-foreground/80 leading-relaxed">{editable.bio}</p>

        {/* Edit button */}
        <button
          onClick={openEdit}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/40 px-3 py-1.5 rounded-full transition-all"
        >
          <Pencil className="w-3 h-3" /> Edit profile
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="p-4 text-center">
          <Heart className="w-5 h-5 mx-auto mb-1 fill-foreground" />
          <p className="text-2xl font-bold">{totalMatches}</p>
          <p className="text-xs text-muted-foreground">Matches</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 fill-foreground" />
          <p className="text-2xl font-bold">{coincidenceMatches}</p>
          <p className="text-xs text-muted-foreground">Coincidences</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 fill-foreground" />
          <p className="text-2xl font-bold">{checkIns.length}</p>
          <p className="text-xs text-muted-foreground">Check-ins</p>
        </CardContent></Card>
      </div>

      {/* ── String section ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">String</h2>
          <button onClick={() => setShowStore(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingBag className="w-3.5 h-3.5" /> Get more
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: MAX_CREDITS }).map((_, i) => (
            <motion.div key={i}
              animate={isBoostActive && i === 0 ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
            >
              <StringIcon className={`w-5 h-5 transition-colors ${i < boostCredits ? "text-foreground" : "text-muted-foreground/25"}`} />
            </motion.div>
          ))}
          <span className="ml-1 text-sm text-muted-foreground">
            {boostCredits} / {MAX_CREDITS} string{boostCredits !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-2 mb-3">
          <p className="text-xs text-muted-foreground">
            {isBoostActive ? `Visible to everyone within ${boostRadius} mi` : `Visible radius · select before pulling`}
          </p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button key={r}
                onClick={() => !isBoostActive && onBoostRadiusChange(r)}
                disabled={isBoostActive}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  boostRadius === r ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                } disabled:cursor-default`}
              >{r} mi</button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isBoostActive ? (
            <motion.div key="active" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between p-4 rounded-xl bg-foreground text-background">
              <div className="flex items-center gap-2">
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  <StringIcon className="w-4 h-4" />
                </motion.div>
                <span className="text-sm font-semibold">Reaching {boostRadius} mi radius</span>
              </div>
              <span className="text-sm font-mono tabular-nums">{formatStringTime(boostTimeLeft)}</span>
            </motion.div>
          ) : (
            <motion.button key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              onClick={onActivateBoost} disabled={boostCredits === 0}
              className="w-full py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-35 hover:bg-foreground/85 active:scale-[0.98] transition-all">
              <StringIcon className="w-4 h-4" />
              Pull your string
              {boostCredits > 0 && <span className="ml-1 text-background/60 text-xs font-normal">· {boostRadius} mi · uses 1 of {boostCredits}</span>}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {isBoostActive ? "You're appearing to 3× more people nearby"
            : boostCredits < MAX_CREDITS ? "Earn strings by checking into new places"
            : "Strings full — start swiping!"}
        </p>

        {isBoostActive && (
          <motion.div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full bg-foreground rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: `${(boostTimeLeft / BOOST_DURATION_MS) * 100}%` }}
              transition={{ duration: 0.5, ease: "linear" }} />
          </motion.div>
        )}
      </div>

      {/* ── Hobbies ── */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Hobbies</h2>
        {editable.hobbies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hobbies yet — edit your profile to add some.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {editable.hobbies.map(h => (
              <span key={h} className="px-3 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium">{h}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Places I've been ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Places I've been</h2>
        {checkIns.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed text-muted-foreground">
            <MapPin className="w-5 h-5 opacity-40 shrink-0" />
            <p className="text-sm">Check in at locations to build your history</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...checkIns].reverse().map(ci => {
              const metCount = matchesByLocation[ci.locationId] ?? 0;
              return (
                <div key={`${ci.locationId}-${ci.checkedInAt}`} className="flex items-center gap-3 p-3.5 rounded-xl border bg-card">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground shrink-0">
                    {locationIconMap[ci.locationIcon] ?? <MapPin className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ci.locationName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCheckInTime(ci.checkedInAt)}</p>
                  </div>
                  {metCount > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-foreground text-background px-2 py-1 rounded-full shrink-0">
                      <Heart className="w-2.5 h-2.5 fill-background" />{metCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tagline ── */}
      <div className="mt-auto pt-8 flex flex-col items-center gap-3">
        <img src="/logo.jpeg" alt="Coincidence" className="w-10 h-10 rounded-xl opacity-60" />
        <p className="text-xs text-muted-foreground italic">making the invisible string – visible</p>
      </div>

      {/* ══════════════════════════════════════
          EDIT PROFILE SHEET
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) cancelEdit(); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-md bg-background rounded-t-3xl overflow-hidden flex flex-col"
              style={{ maxHeight: "90vh" }}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
                <div className="w-10 h-1 rounded-full bg-muted absolute left-1/2 -translate-x-1/2 top-3" />
                <h2 className="text-lg font-bold">Edit profile</h2>
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={saveEdit} className="text-sm font-semibold text-foreground border border-foreground px-3 py-1 rounded-full hover:bg-foreground hover:text-background transition-all">Save</button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto px-6 pb-10 space-y-6">

                {/* Name */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">Name</label>
                  <input
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border bg-muted/40 text-sm font-medium outline-none focus:border-foreground transition-colors"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">Age</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setDraft(d => ({ ...d, age: Math.max(18, d.age - 1) }))}
                      className="w-10 h-10 rounded-full border flex items-center justify-center text-lg hover:bg-muted transition-colors">−</button>
                    <span className="text-2xl font-bold w-10 text-center tabular-nums">{draft.age}</span>
                    <button onClick={() => setDraft(d => ({ ...d, age: Math.min(99, d.age + 1) }))}
                      className="w-10 h-10 rounded-full border flex items-center justify-center text-lg hover:bg-muted transition-colors">+</button>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">Bio</label>
                  <textarea
                    value={draft.bio}
                    onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                    rows={3}
                    maxLength={160}
                    className="w-full px-4 py-3 rounded-xl border bg-muted/40 text-sm outline-none focus:border-foreground transition-colors resize-none leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{draft.bio.length}/160</p>
                </div>

                {/* Hometown */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">Hometown</label>
                  <div className="relative">
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={draft.hometown}
                      onChange={e => setDraft(d => ({ ...d, hometown: e.target.value }))}
                      placeholder="e.g. London, UK"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border bg-muted/40 text-sm outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                </div>

                {/* Height */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">Height</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => stepHeight(-1)} disabled={heightIdx === 0}
                      className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 flex-1 justify-center">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xl font-bold tabular-nums">{draft.height}</span>
                    </div>
                    <button onClick={() => stepHeight(1)} disabled={heightIdx === HEIGHT_OPTIONS.length - 1}
                      className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hobbies */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">Hobbies</label>

                  {/* Current tags */}
                  {draft.hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {draft.hobbies.map(h => (
                        <button key={h} onClick={() => removeHobby(h)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-sm font-medium">
                          {h}
                          <X className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add custom */}
                  <div className="flex gap-2 mb-3">
                    <input
                      ref={hobbyRef}
                      value={hobbyInput}
                      onChange={e => setHobbyInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { addHobby(hobbyInput); setHobbyInput(""); } }}
                      placeholder="Add your own…"
                      className="flex-1 px-4 py-2.5 rounded-xl border bg-muted/40 text-sm outline-none focus:border-foreground transition-colors"
                    />
                    <button onClick={() => { addHobby(hobbyInput); setHobbyInput(""); }}
                      className="w-10 h-10 rounded-xl border flex items-center justify-center hover:bg-muted transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Suggestions */}
                  <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {HOBBY_SUGGESTIONS.filter(s => !draft.hobbies.includes(s)).map(s => (
                      <button key={s} onClick={() => addHobby(s)}
                        className="px-3 py-1.5 rounded-full border text-sm text-muted-foreground hover:border-foreground/60 hover:text-foreground transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          STRING STORE SHEET
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showStore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowStore(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="w-full max-w-md bg-background rounded-t-3xl px-6 pt-5 pb-10 space-y-6"
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto" />

              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">Get more string</h2>
                  <p className="text-sm text-muted-foreground italic mt-0.5">see what fate already started</p>
                </div>
                <button onClick={() => setShowStore(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-center">
                <svg viewBox="0 0 120 40" className="w-48 opacity-70">
                  <path d="M10 28 C 20 14, 30 10, 40 18 C 50 26, 50 34, 60 34 C 70 34, 70 18, 80 14 C 90 10, 100 18, 110 24"
                    stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M10 28 C 20 14, 30 10, 40 18 C 50 26, 50 34, 60 34 C 70 34, 70 18, 80 14 C 90 10, 100 18, 110 24"
                    stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" fill="none" strokeLinecap="round" transform="translate(0, 3)" />
                </svg>
              </div>

              <div className="space-y-3">
                {STRING_PACKS.map(pack => (
                  <motion.button key={pack.id} whileTap={{ scale: 0.98 }}
                    onClick={() => setPurchasedPack(pack.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      purchasedPack === pack.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex gap-0.5 ${purchasedPack === pack.id ? "text-background" : "text-foreground"}`}>
                        {Array.from({ length: Math.min(pack.count, 5) }).map((_, i) => (
                          <StringIcon key={i} className="w-4 h-4" />
                        ))}
                        {pack.count > 5 && <span className="text-xs font-bold ml-1">×{pack.count}</span>}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{pack.label}</p>
                        {pack.tag && <p className={`text-xs ${purchasedPack === pack.id ? "text-background/70" : "text-muted-foreground"}`}>{pack.tag}</p>}
                      </div>
                    </div>
                    <span className="font-bold text-sm">{pack.price}</span>
                  </motion.button>
                ))}
              </div>

              <motion.button whileTap={{ scale: 0.97 }} disabled={!purchasedPack}
                className="w-full py-4 rounded-2xl bg-foreground text-background font-semibold text-sm disabled:opacity-30 transition-opacity"
                onClick={() => setShowStore(false)}>
                {purchasedPack ? `Get ${STRING_PACKS.find(p => p.id === purchasedPack)?.label}` : "Choose a pack"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
