import { useState, useRef, useEffect, useCallback } from "react";
import * as db from "@/lib/db";
import { myProfile, type Match, type CheckIn } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MapPin, Wine, Beer, Coffee, Sparkles,
  ShoppingBag, X, Pencil, Plus, Home, Ruler, ChevronUp, ChevronDown,
  Settings, LogOut, Trash2, RotateCcw, Shield, FileText, ChevronRight, Bell, ImagePlus, Star, User, ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StringIcon } from "@/components/StringIcon";

/* ─── constants ─────────────────────────────── */
const MAX_CREDITS   = 5;
const BOOST_DURATION_MS = 30 * 60 * 1000;
const RADIUS_OPTIONS = [1, 5, 10, 25];

const STRING_PACKS = [
  { id: "s1",  count: 1,  label: "1 string",   price: "£3.99",  tag: "" },
  { id: "s5",  count: 5,  label: "5 strings",  price: "£18.99", tag: "Popular" },
  { id: "s10", count: 10, label: "10 strings", price: "£34.99", tag: "Best value" },
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
const LOOKING_FOR_OPTIONS = ["Everyone", "Women", "Men", "Non-binary"];

interface EditableProfile {
  name: string;
  age: number;
  bio: string;
  hometown: string;
  height: string;
  hobbies: string[];
  lookingFor?: string;
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
  onAddCredits: (count: number) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onProfileUpdate?: (updated: EditableProfile) => void;
  account?: { email: string; phone: string } | null;
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
  db.upsertProfile({
    name: p.name, age: p.age, bio: p.bio,
    hometown: p.hometown, height: p.height,
    hobbies: p.hobbies,
    looking_for: p.lookingFor ?? "Everyone",
    setup_complete: true,
  });
}

/* ─── component ─────────────────────────────── */
export default function ProfilePage({
  matches, checkIns,
  boostCredits, isBoostActive, boostTimeLeft,
  boostRadius, onBoostRadiusChange, onActivateBoost, onAddCredits,
  onLogout, onDeleteAccount, onProfileUpdate, account,
}: ProfilePageProps) {

  const [editable, setEditable] = useState<EditableProfile>(loadProfile);
  const [draft, setDraft]     = useState<EditableProfile>(editable);
  const [isSaving, setIsSaving] = useState(false);
  const [photos, setPhotos]       = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError]         = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto]   = useState<string | null>(null);
  const [gender, setGender]                 = useState<string>("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.getProfile().then((data) => {
      if (!data) return;
      const p: EditableProfile = {
        name:     data.name ?? myProfile.name,
        age:      data.age  ?? myProfile.age,
        bio:      data.bio  ?? myProfile.bio,
        hometown: data.hometown ?? "",
        height:   data.height  ?? "5'8\"",
        hobbies:  data.hobbies ?? [...myProfile.interests],
        lookingFor: data.looking_for ?? "Everyone",
      };
      setEditable(p);
      setDraft(p);
      setPhotos(data.photos ?? []);
      setGender(data.gender ?? "");
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
    });
  }, []);

  const handleAddPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 6) return;
    setPhotoUploading(true);
    setPhotoError(null);
    const { url, error } = await db.uploadPhoto(file);
    if (url) {
      const next = [...photos, url];
      setPhotos(next);
      await db.savePhotos(next);
    } else {
      setPhotoError(error ?? "Upload failed");
    }
    setPhotoUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, [photos]);

  const handleDeletePhoto = useCallback(async (url: string) => {
    setDeletingPhoto(url);
    const next = await db.deletePhoto(url, photos);
    setPhotos(next);
    setDeletingPhoto(null);
  }, [photos]);

  const handleSetProfilePhoto = useCallback(async (url: string) => {
    const next = [url, ...photos.filter(p => p !== url)];
    setPhotos(next);
    await db.savePhotos(next);
  }, [photos]);
  const [showEdit, setShowEdit] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [purchasedPack, setPurchasedPack] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [hobbyInput, setHobbyInput] = useState("");
  const hobbyRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"reason" | "confirm">("reason");
  const [deleteReason, setDeleteReason] = useState<string | null>(null);
  const [showSettings, setShowSettings]     = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [showMyDetails, setShowMyDetails]   = useState(false);
  const [showPrivacy, setShowPrivacy]       = useState(false);
  const [showTerms, setShowTerms]           = useState(false);

  const initials = editable.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");

  const totalMatches       = matches.length;
  const coincidenceMatches = matches.filter(m => m.source !== "swipe").length;
  const matchesByLocation  = matches.reduce<Record<string, number>>((acc, m) => {
    if (m.source !== "swipe") acc[m.source] = (acc[m.source] ?? 0) + 1;
    return acc;
  }, {});

  /* edit helpers */
  function openEdit() { setDraft({ ...editable }); setShowEdit(true); }
  async function saveEdit() {
    setIsSaving(true);
    const saved = { ...draft };
    setEditable(saved);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {}
    await db.upsertProfile({
      name: saved.name, age: saved.age, bio: saved.bio,
      hometown: saved.hometown, height: saved.height,
      hobbies: saved.hobbies,
      looking_for: saved.lookingFor ?? "Everyone",
      setup_complete: true,
    });
    onProfileUpdate?.(saved);
    setIsSaving(false);
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
    <div className="flex flex-col px-4 pt-4 pb-28 max-w-md mx-auto w-full">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</span>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

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
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-foreground text-background text-3xl font-bold z-10 overflow-hidden">
            {photos[0] ? (
              <img src={photos[0]} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
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

      {/* ── Photos ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Photos</h2>
          <span className="text-xs text-muted-foreground">{photos.length}/6</span>
        </div>
        {photoError && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            <span className="text-red-400 text-xs leading-snug flex-1">{photoError}</span>
            <button onClick={() => setPhotoError(null)} className="text-red-400/60 hover:text-red-400 shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAddPhoto}
        />
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, idx) => (
            <motion.div
              key={url}
              layout
              className="relative aspect-square rounded-xl overflow-hidden bg-muted"
            >
              <img src={url} alt="Profile photo" className="w-full h-full object-cover" />

              {/* Profile photo badge on first */}
              {idx === 0 && (
                <div className="absolute bottom-1.5 left-1.5 bg-black/65 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-tight">
                  Profile photo
                </div>
              )}

              {/* Set as profile photo on others */}
              {idx > 0 && (
                <button
                  onClick={() => handleSetProfilePhoto(url)}
                  className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  title="Set as profile photo"
                >
                  <Star className="w-3 h-3 text-yellow-300" />
                </button>
              )}

              <button
                onClick={() => handleDeletePhoto(url)}
                disabled={deletingPhoto === url}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center transition-opacity hover:bg-black/80"
              >
                {deletingPhoto === url ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border border-white/60 border-t-white rounded-full" />
                ) : (
                  <X className="w-3 h-3 text-white" />
                )}
              </button>
            </motion.div>
          ))}
          {photos.length < 6 && (
            <motion.button
              layout
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-foreground/40 flex flex-col items-center justify-center gap-1.5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {photoUploading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-muted-foreground/40 border-t-foreground rounded-full" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Add photo</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="p-4 text-center">
          <Heart className="w-5 h-5 mx-auto mb-1 fill-foreground" />
          <p className="text-2xl font-bold">{totalMatches}</p>
          <p className="text-xs text-muted-foreground">Matches</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <StringIcon className="w-5 h-5 mx-auto mb-1 text-foreground" />
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

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {Array.from({ length: Math.min(Math.max(MAX_CREDITS, boostCredits), 8) }).map((_, i) => (
            <motion.div key={i}
              animate={isBoostActive && i === 0 ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
            >
              <StringIcon className={`w-5 h-5 transition-colors ${i < boostCredits ? "text-foreground" : "text-muted-foreground/25"}`} />
            </motion.div>
          ))}
          {boostCredits > 8 && (
            <span className="text-xs font-semibold text-foreground">+{boostCredits - 8}</span>
          )}
          <span className="ml-1 text-sm text-muted-foreground">
            {boostCredits} string{boostCredits !== 1 ? "s" : ""}
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
            : boostCredits === 0 ? "Check into new places to earn strings"
            : boostCredits < MAX_CREDITS ? "Earn more strings by checking into new places"
            : "You're well stocked — start swiping!"}
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
      <div className="pt-8 flex flex-col items-center gap-2 pb-2">
        <div className="w-10 h-10 rounded-xl overflow-hidden opacity-60">
          <img src="/logo.png" alt="Coincidence" className="w-full h-full object-cover scale-[1.35]" />
        </div>
        <p className="text-xs text-muted-foreground italic">making the invisible string – visible</p>
      </div>

      {/* ── Delete account overlay (2-step) ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) { setShowDeleteConfirm(false); setDeleteStep("reason"); setDeleteReason(null); } }}
          >
            <motion.div
              key={deleteStep}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-lg bg-card rounded-3xl px-6 pt-6 pb-6 overflow-y-auto"
              style={{ maxHeight: "80vh" }}
            >

              {deleteStep === "reason" ? (
                <>
                  {/* Step 1 — Reason */}
                  <div className="flex flex-col items-center gap-2 text-center mb-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Before you go</p>
                    <h2 className="text-xl font-bold">Why are you leaving?</h2>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                      Your feedback helps us build something better for everyone.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {[
                      { label: "Met by coincidence", emoji: "🪢" },
                      { label: "Found what I was looking for", emoji: "✨" },
                      { label: "Not enough people nearby", emoji: "📍" },
                      { label: "Taking a break", emoji: "🌿" },
                      { label: "Privacy concerns", emoji: "🔒" },
                      { label: "App didn't work for me", emoji: "🤷" },
                      { label: "Too many notifications", emoji: "🔔" },
                      { label: "Other", emoji: "💬" },
                    ].map(({ label, emoji }) => (
                      <button
                        key={label}
                        onClick={() => setDeleteReason(label)}
                        className={`flex items-start gap-2 px-3.5 py-3 rounded-2xl border-2 text-left text-sm font-medium transition-all active:scale-[0.97] ${
                          deleteReason === label
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-muted/30 text-foreground hover:border-foreground/30"
                        }`}
                      >
                        <span className="text-base leading-tight shrink-0">{emoji}</span>
                        <span className="leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2.5">
                    <button
                      disabled={!deleteReason}
                      onClick={() => setDeleteStep("confirm")}
                      className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm disabled:opacity-30 active:scale-[0.98] transition-all"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteReason(null); }}
                      className="w-full py-3.5 rounded-2xl border-2 border-border text-foreground font-semibold text-sm hover:bg-muted active:scale-[0.98] transition-all"
                    >
                      Never mind
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2 — Final confirm */}
                  <div className="flex flex-col items-center gap-3 text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold">Delete your account?</h2>
                    {deleteReason && (
                      <div className="px-4 py-2 rounded-xl bg-muted text-sm text-muted-foreground italic">
                        "{deleteReason}"
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                      This will permanently erase your profile, matches, messages, and check-in history.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteStep("reason");
                        setDeleteReason(null);
                        onDeleteAccount();
                      }}
                      className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-[0.98] transition-all"
                    >
                      Yes, delete everything
                    </button>
                    <button
                      onClick={() => setDeleteStep("reason")}
                      className="w-full py-3.5 rounded-2xl border-2 border-border text-foreground font-semibold text-sm hover:bg-muted active:scale-[0.98] transition-all"
                    >
                      Go back
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          SETTINGS SHEET
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-lg bg-card rounded-3xl overflow-hidden overflow-y-auto"
              style={{ maxHeight: "80vh" }}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Settings</h2>
                  <button onClick={() => setShowSettings(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 pt-3 space-y-1">

                {/* ── Account section ── */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-1 pt-2">Account</p>

                {/* My Details */}
                <button onClick={() => { setShowSettings(false); setTimeout(() => setShowMyDetails(true), 150); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-muted transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">My details</p>
                    <p className="text-xs text-muted-foreground">View your account information</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Edit profile */}
                <button onClick={() => { setShowSettings(false); openEdit(); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-muted transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Pencil className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Edit profile</p>
                    <p className="text-xs text-muted-foreground">Update your name, bio, hobbies</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Notifications */}
                <div className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-xs text-muted-foreground">New matches and messages</p>
                  </div>
                  <button
                    onClick={() => setNotificationsOn(n => !n)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notificationsOn ? "bg-foreground" : "bg-muted-foreground/30"}`}
                  >
                    <motion.div
                      animate={{ x: notificationsOn ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm"
                    />
                  </button>
                </div>

                {/* Log out */}
                <button onClick={() => { setShowSettings(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-muted transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Log out</p>
                    <p className="text-xs text-muted-foreground">Sign out of your account</p>
                  </div>
                </button>

                {/* ── Legal section ── */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-1 pt-3">About</p>

                <button onClick={() => { setShowSettings(false); setTimeout(() => setShowPrivacy(true), 150); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-muted transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Privacy Policy</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button onClick={() => { setShowSettings(false); setTimeout(() => setShowTerms(true), 150); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-muted transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Terms of Service</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* ── Danger zone ── */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-1 pt-3">Danger zone</p>

                <button onClick={() => { setShowSettings(false); setDeleteStep("reason"); setDeleteReason(null); setTimeout(() => setShowDeleteConfirm(true), 200); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-red-50 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-500">Delete account</p>
                    <p className="text-xs text-red-400/70">Permanently erase all your data</p>
                  </div>
                </button>

                {/* Version */}
                <p className="text-center text-[10px] text-muted-foreground/40 pt-4">Coincidence v1.0.0</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          MY DETAILS OVERLAY
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showMyDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowMyDetails(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3 shrink-0">
                <button onClick={() => setShowMyDetails(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold flex-1">My details</h2>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                {[
                  { label: "Email", value: account?.email || "—" },
                  { label: "Phone", value: account?.phone || "—" },
                  { label: "Name", value: editable.name || "—" },
                  { label: "Age", value: editable.age ? String(editable.age) : "—" },
                  { label: "Gender", value: gender || "—" },
                  { label: "Looking for", value: editable.lookingFor || "—" },
                  { label: "Hometown", value: editable.hometown || "—" },
                  { label: "Height", value: editable.height || "—" },
                  { label: "Bio", value: editable.bio || "—" },
                  { label: "Hobbies", value: editable.hobbies.length ? editable.hobbies.join(", ") : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl bg-muted/50 px-4 py-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-medium text-foreground break-words">{value}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center pb-4 pt-2">
                  To update your details, use <span className="font-semibold">Edit profile</span> in Settings.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          PRIVACY POLICY OVERLAY
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowPrivacy(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3 shrink-0">
                <button onClick={() => setShowPrivacy(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold flex-1">Privacy Policy</h2>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm text-foreground/80 leading-relaxed">
                <p className="text-xs text-muted-foreground">Last updated: May 2026</p>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">1. Who we are</h3>
                  <p>Coincidence is a location-based connection app operated by Coincidence Ltd. We are committed to protecting your personal information and your right to privacy.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">2. Information we collect</h3>
                  <p>We collect information you provide directly to us, including:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/70">
                    <li>Account data: name, email address, phone number, date of birth</li>
                    <li>Profile data: photos, bio, gender, height, hometown, hobbies, preferences</li>
                    <li>Location data: check-in locations you voluntarily share within the app</li>
                    <li>Usage data: swipes, matches, messages, and interaction history</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">3. How we use your information</h3>
                  <p>We use your information to:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/70">
                    <li>Provide, maintain, and improve the Coincidence service</li>
                    <li>Show your profile to potential matches based on your preferences</li>
                    <li>Enable location-based coincidence matching when you opt in</li>
                    <li>Send notifications about matches and messages</li>
                    <li>Detect and prevent fraud, abuse, and safety incidents</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">4. Sharing your information</h3>
                  <p>We do not sell your personal data. We share information only:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/70">
                    <li>With other users — your profile is visible to potential matches as you configure it</li>
                    <li>With service providers who assist us in operating the app (e.g. Supabase for database and storage)</li>
                    <li>When required by law or to protect the safety of users</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">5. Location data</h3>
                  <p>Location is used only when you actively check in using Coincidence Mode. We do not track your location in the background. You can disable location access at any time in your device settings.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">6. Your photos</h3>
                  <p>Photos you upload are stored securely and displayed only to other users of Coincidence. You can delete your photos at any time from your profile page. Deleting your account removes all stored photos.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">7. Data retention</h3>
                  <p>We retain your data for as long as your account is active. When you delete your account, we permanently erase your profile, photos, messages, and match history within 30 days, unless we are required by law to retain certain records.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">8. Your rights</h3>
                  <p>You have the right to access, correct, or delete your personal data at any time. You can manage most of this directly in the app. For additional requests, contact us at privacy@coincidenceapp.co.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">9. Security</h3>
                  <p>We use industry-standard encryption and security practices to protect your data. All data is transmitted over HTTPS and stored with row-level security controls.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">10. Changes to this policy</h3>
                  <p>We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of Coincidence after changes constitutes acceptance of the updated policy.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">11. Contact</h3>
                  <p>Questions about this policy? Email us at privacy@coincidenceapp.co or write to: Coincidence Ltd, London, United Kingdom.</p>
                </section>

                <div className="pb-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          TERMS OF SERVICE OVERLAY
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowTerms(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3 shrink-0">
                <button onClick={() => setShowTerms(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold flex-1">Terms of Service</h2>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm text-foreground/80 leading-relaxed">
                <p className="text-xs text-muted-foreground">Last updated: May 2026</p>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">1. Acceptance of terms</h3>
                  <p>By creating an account or using Coincidence, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the app.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">2. Eligibility</h3>
                  <p>You must be at least 18 years old to use Coincidence. By registering, you confirm that you meet this age requirement. We reserve the right to terminate accounts if we determine a user is under 18.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">3. Your account</h3>
                  <p>You are responsible for keeping your account credentials secure. You must provide accurate, truthful information when creating your profile. You may not create accounts for others or maintain multiple accounts.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">4. Acceptable use</h3>
                  <p>You agree not to:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/70">
                    <li>Harass, abuse, or harm other users</li>
                    <li>Post false, misleading, or fraudulent information</li>
                    <li>Upload photos of anyone other than yourself as your profile photo</li>
                    <li>Use the app for commercial solicitation or spam</li>
                    <li>Attempt to reverse-engineer, scrape, or exploit the platform</li>
                    <li>Share any illegal, obscene, or harmful content</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">5. Coincidence Mode and location</h3>
                  <p>Coincidence Mode lets you check in to real-world locations to discover potential matches nearby. You control when and where you check in. We do not share your precise location with other users — only that you are at the same general venue.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">6. Strings (premium feature)</h3>
                  <p>Strings are a premium in-app feature that can be purchased. All purchases are final and non-refundable unless required by law. Strings have no cash value and cannot be transferred between accounts.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">7. Content you share</h3>
                  <p>You retain ownership of content you post. By uploading photos or text, you grant Coincidence a non-exclusive, royalty-free licence to display that content to other users for the purpose of operating the service. We will not sell or use your content for advertising without your consent.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">8. Safety</h3>
                  <p>While we work hard to create a safe environment, we cannot guarantee the conduct of other users. Always meet new people in public places and trust your instincts. Report any concerning behaviour using the in-app block and report features.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">9. Termination</h3>
                  <p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time via Settings. Upon termination, your data will be removed in accordance with our Privacy Policy.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">10. Disclaimers</h3>
                  <p>Coincidence is provided "as is." We do not guarantee you will find a match or that the service will be uninterrupted. To the fullest extent permitted by law, we disclaim all warranties and liability for damages arising from your use of the app.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">11. Governing law</h3>
                  <p>These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-foreground">12. Contact</h3>
                  <p>Questions about these Terms? Contact us at legal@coincidenceapp.co.</p>
                </section>

                <div className="pb-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              style={{ maxHeight: "calc(90vh - 80px)", marginBottom: 80 }}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
                <div className="w-10 h-1 rounded-full bg-muted absolute left-1/2 -translate-x-1/2 top-3" />
                <h2 className="text-lg font-bold">Edit profile</h2>
                <div className="flex gap-2">
                  <button onClick={cancelEdit} disabled={isSaving} className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">Cancel</button>
                  <button onClick={saveEdit} disabled={isSaving} className="text-sm font-semibold text-foreground border border-foreground px-3 py-1 rounded-full hover:bg-foreground hover:text-background transition-all disabled:opacity-60 flex items-center gap-1.5">
                    {isSaving ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="w-3 h-3 border border-foreground/40 border-t-foreground rounded-full" />Saving…</>
                    ) : "Save"}
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto px-6 pb-8 space-y-6">

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

                {/* Looking for */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Looking for</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOOKING_FOR_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setDraft(d => ({ ...d, lookingFor: opt }))}
                        className={`py-3 rounded-2xl text-sm font-semibold transition-all border-2 ${
                          (draft.lookingFor ?? "Everyone") === opt
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {opt}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowStore(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-md bg-background rounded-3xl px-6 pt-6 pb-6 space-y-6 overflow-y-auto"
              style={{ maxHeight: "80vh" }}
            >
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
                onClick={() => {
                  if (!purchasedPack) return;
                  const pack = STRING_PACKS.find(p => p.id === purchasedPack);
                  if (pack) {
                    onAddCredits(pack.count);
                    setPurchaseSuccess(true);
                    setTimeout(() => {
                      setPurchaseSuccess(false);
                      setPurchasedPack(null);
                      setShowStore(false);
                    }, 1200);
                  }
                }}>
                {purchaseSuccess
                  ? `✦ ${STRING_PACKS.find(p => p.id === purchasedPack)?.label} added!`
                  : purchasedPack
                  ? `Get ${STRING_PACKS.find(p => p.id === purchasedPack)?.label}`
                  : "Choose a pack"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
